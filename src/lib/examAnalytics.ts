import { supabase } from './supabase'

export interface ExamAnalytics {
  exam_id: string
  overview: {
    total_students: number
    average_score: number
    highest_score: number
    lowest_score: number
    overall_accuracy: number
  }
  difficulty_wise: Record<string, {
    total: number
    correct: number
    accuracy: number
  }>
  chapter_wise: Record<string, {
    total: number
    correct: number
    accuracy: number
  }>
}

export const getExamAnalytics = async (examId: string) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/exam-analytics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ exam_id: examId })
  })

  if (!response.ok) {
    throw new Error('Failed to fetch exam analytics')
  }

  return await response.json()
}
