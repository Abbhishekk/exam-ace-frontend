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

    const { exam_id } = await req.json()
    if (!exam_id) {
      return new Response(JSON.stringify({ error: 'exam_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch all submitted attempts with student profiles
    const { data: attempts, error } = await supabaseAdmin
      .from('student_exam_attempts')
      .select(`
        student_id,
        score,
        correct_answers,
        submitted_at,
        profiles!inner(full_name)
      `)
      .eq('exam_id', exam_id)
      .not('submitted_at', 'is', null)
      .order('score', { ascending: false })
      .order('correct_answers', { ascending: false })
      .order('submitted_at', { ascending: true })

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Add rank to each attempt
    const rankedAttempts = attempts.map((attempt, index) => ({
      rank: index + 1,
      student_name: attempt.profiles.full_name,
      score: attempt.score,
      correct_answers: attempt.correct_answers,
      student_id: attempt.student_id
    }))

    // Get top 3
    const top3 = rankedAttempts.slice(0, 3).map(({ student_id, ...rest }) => rest)

    // Find current user's rank
    const studentRank = rankedAttempts.find(attempt => attempt.student_id === user.id)
    const student_rank = studentRank ? {
      rank: studentRank.rank,
      student_name: studentRank.student_name,
      score: studentRank.score,
      correct_answers: studentRank.correct_answers
    } : null

    return new Response(JSON.stringify({
      top3,
      student_rank,
      total_participants: rankedAttempts.length
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