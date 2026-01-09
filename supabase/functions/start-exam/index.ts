import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create client with SERVICE ROLE key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create client with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { examCode } = await req.json()
    if (!examCode) {
      return new Response(JSON.stringify({ error: 'examCode is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch exam by code using SERVICE ROLE (bypasses RLS)
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('code', examCode)
      .single()

    if (examError || !exam) {
      return new Response(JSON.stringify({ error: 'Invalid exam code' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if current time is before exam start time (server-side check)
    const now = new Date()
    const startTime = new Date(exam.start_time)
    if (now < startTime) {
      return new Response(JSON.stringify({ error: 'Exam has not started yet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create or fetch student exam attempt using SERVICE ROLE
    let { data: attempt } = await supabaseAdmin
      .from('student_exam_attempts')
      .select('*')
      .eq('exam_id', exam.id)
      .eq('student_id', user.id)
      .maybeSingle()

    if (!attempt) {
      const { data: newAttempt, error: attemptError } = await supabaseAdmin
        .from('student_exam_attempts')
        .insert({
          exam_id: exam.id,
          student_id: user.id,
          started_at: now.toISOString()
        })
        .select()
        .single()

      if (attemptError) {
        return new Response(JSON.stringify({ error: 'Failed to create exam attempt' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      attempt = newAttempt
    }

    // Calculate exam end time and remaining time
    const startedAt = new Date(attempt.started_at)
    const examEndTime = new Date(startedAt.getTime() + (exam.duration_minutes * 60 * 1000))
    const remainingMs = examEndTime.getTime() - now.getTime()
    const remainingTime = Math.max(0, Math.floor(remainingMs / 1000))

    // Check if exam time has expired
    if (remainingTime === 0) {
      return new Response(JSON.stringify({ error: 'Exam time has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch exam questions using SERVICE ROLE
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select(`
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        order_index
      `)
      .eq('exam_id', exam.id)
      .order('order_index')

    if (questionsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Shuffle questions and options
    const shuffledQuestions = questions.map(q => {
      const options = [
        { key: 'A', text: q.option_a },
        { key: 'B', text: q.option_b },
        { key: 'C', text: q.option_c },
        { key: 'D', text: q.option_d }
      ].sort(() => Math.random() - 0.5)

      return {
        id: q.id,
        question_text: q.question_text,
        options
      }
    }).sort(() => Math.random() - 0.5)

    return new Response(JSON.stringify({
      attempt_id: attempt.id,
      remaining_time_in_seconds: remainingTime,
      exam_end_time: examEndTime.toISOString(),
      questions: shuffledQuestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})