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

    // Check if user is admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
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

    // Get exam details
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', exam_id)
      .single()

    if (examError || !exam) {
      return new Response(JSON.stringify({ error: 'Exam not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get basic exam metrics
    const { data: attempts } = await supabaseAdmin
      .from('student_exam_attempts')
      .select('score, correct_answers, wrong_answers, unattempted_answers')
      .eq('exam_id', exam_id)
      .not('submitted_at', 'is', null)

    const totalStudents = attempts?.length || 0
    const scores = attempts?.map(a => a.score || 0) || []
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0

    // Calculate overall accuracy
    const totalCorrect = attempts?.reduce((sum, a) => sum + (a.correct_answers || 0), 0) || 0
    const totalAnswered = attempts?.reduce((sum, a) => sum + (a.correct_answers || 0) + (a.wrong_answers || 0), 0) || 0
    const accuracyPercentage = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0

    // Get difficulty-wise analysis
    const { data: difficultyData } = await supabaseAdmin
      .from('student_answers')
      .select(`
        is_correct,
        exam_questions!inner(difficulty)
      `)
      .in('attempt_id', attempts?.map(a => a.id) || [])
      .not('selected_option', 'is', null)

    const difficultyStats = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 }
    }

    difficultyData?.forEach(answer => {
      const difficulty = answer.exam_questions.difficulty
      difficultyStats[difficulty].total++
      if (answer.is_correct) {
        difficultyStats[difficulty].correct++
      }
    })

    const difficultyAnalysis = Object.entries(difficultyStats).map(([difficulty, stats]) => ({
      difficulty,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      total_questions: stats.total,
      correct_answers: stats.correct
    }))

    // Get chapter-wise performance
    const { data: chapterData } = await supabaseAdmin
      .from('student_answers')
      .select(`
        is_correct,
        exam_questions!inner(
          original_question_id,
          questions!inner(
            topic_id,
            topics!inner(
              chapter_id,
              chapters!inner(name)
            )
          )
        )
      `)
      .in('attempt_id', attempts?.map(a => a.id) || [])
      .not('selected_option', 'is', null)

    const chapterStats = {}
    chapterData?.forEach(answer => {
      const chapterName = answer.exam_questions.questions.topics.chapters.name
      if (!chapterStats[chapterName]) {
        chapterStats[chapterName] = { correct: 0, total: 0 }
      }
      chapterStats[chapterName].total++
      if (answer.is_correct) {
        chapterStats[chapterName].correct++
      }
    })

    const chapterAnalysis = Object.entries(chapterStats).map(([chapterName, stats]) => ({
      chapter_name: chapterName,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      total_questions: stats.total,
      correct_answers: stats.correct
    }))

    return new Response(JSON.stringify({
      exam_details: {
        id: exam.id,
        name: exam.name,
        code: exam.code,
        total_questions: exam.total_questions
      },
      overall_metrics: {
        total_students_appeared: totalStudents,
        average_score: Math.round(avgScore * 100) / 100,
        highest_score: highestScore,
        lowest_score: lowestScore,
        accuracy_percentage: Math.round(accuracyPercentage * 100) / 100
      },
      difficulty_analysis: difficultyAnalysis,
      chapter_analysis: chapterAnalysis
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