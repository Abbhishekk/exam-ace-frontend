import { supabase } from './supabase'

export const generateQuestionPaper = async (examId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/generate-exam-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ exam_id: examId })
    })

    if (!response.ok) {
      let errorMessage = 'Failed to generate question paper'
      try {
        const error = await response.json()
        errorMessage = error.error || errorMessage
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    // Check if response is PDF
    const contentType = response.headers.get('Content-Type')
    if (!contentType?.includes('application/pdf')) {
      throw new Error('Invalid response format - expected PDF')
    }

    // Get the PDF blob
    const blob = await response.blob()
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
      : 'Question_Paper.pdf'
    
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    console.error('Error generating question paper:', error)
    throw error
  }
}