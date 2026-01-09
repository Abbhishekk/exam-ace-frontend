import { supabase } from './supabase'

export interface ExamAnalytics {
  exam_details: {
    id: string
    name: string
    code: string
    total_questions: number
  }
  overall_metrics: {
    total_students_appeared: number
    average_score: number
    highest_score: number
    lowest_score: number
    accuracy_percentage: number
  }
  difficulty_analysis: Array<{
    difficulty: string
    accuracy: number
    total_questions: number
    correct_answers: number
  }>
  chapter_analysis: Array<{
    chapter_name: string
    accuracy: number
    total_questions: number
    correct_answers: number
  }>
}

export const getExamAnalytics = async (examId: string) => {
  const { data, error } = await supabase.functions.invoke(
    'exam-analytics',
    {
      body: { exam_id: examId }
    }
  )

  if (error) {
    console.error(error)
    throw new Error(error.message)
  }

  return data
}
