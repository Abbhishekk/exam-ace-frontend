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

    const { attempt_id, answers } = await req.json()
    if (!attempt_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'attempt_id and answers array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch attempt with exam details using SERVICE ROLE
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('student_exam_attempts')
      .select(`
        *,
        exams (
          id,
          duration_minutes,
          marks_per_question,
          negative_marks
        )
      `)
      .eq('id', attempt_id)
      .eq('student_id', user.id)
      .single()

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: 'Attempt not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (attempt.submitted_at) {
      return new Response(JSON.stringify({ error: 'Exam already submitted' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if exam time has expired (server-side validation)
    const now = new Date()
    const startedAt = new Date(attempt.started_at)
    const examEndTime = new Date(startedAt.getTime() + (attempt.exams.duration_minutes * 60 * 1000))
    const isTimeExpired = now > examEndTime

    // Fetch correct answers using SERVICE ROLE
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('id, correct_option')
      .eq('exam_id', attempt.exam_id)

    if (questionsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const correctAnswers = new Map(questions.map(q => [q.id, q.correct_option]))
    
    // Calculate score
    let correct = 0, wrong = 0, unattempted = 0
    const marksPerQuestion = attempt.exams.marks_per_question
    const negativeMarks = attempt.exams.negative_marks

    // If time expired, mark all unanswered questions as unattempted
    const processedAnswers = isTimeExpired 
      ? questions.map(q => {
          const userAnswer = answers.find(a => a.question_id === q.id)
          return {
            question_id: q.id,
            selected_option: userAnswer?.selected_option || null
          }
        })
      : answers

    const studentAnswers = processedAnswers.map(answer => {
      const isCorrect = correctAnswers.get(answer.question_id) === answer.selected_option
      if (answer.selected_option) {
        if (isCorrect) correct++
        else wrong++
      } else {
        unattempted++
      }

      return {
        attempt_id,
        question_id: answer.question_id,
        selected_option: answer.selected_option,
        is_correct: isCorrect
      }
    })

    const totalScore = (correct * marksPerQuestion) - (wrong * negativeMarks)

    // Save student answers using SERVICE ROLE
    const { error: answersError } = await supabaseAdmin
      .from('student_answers')
      .insert(studentAnswers)

    if (answersError) {
      return new Response(JSON.stringify({ error: 'Failed to save answers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update attempt with results using SERVICE ROLE
    const { error: updateError } = await supabaseAdmin
      .from('student_exam_attempts')
      .update({
        submitted_at: now.toISOString(),
        score: totalScore,
        correct_answers: correct,
        wrong_answers: wrong,
        unattempted_answers: unattempted
      })
      .eq('id', attempt_id)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update attempt' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      score: totalScore,
      correct_answers: correct,
      wrong_answers: wrong,
      unattempted_answers: unattempted,
      total_questions: questions.length,
      auto_submitted: isTimeExpired
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