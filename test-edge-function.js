// Test script to verify Edge Function deployment
// Run this in browser console or as a separate test

const testStartExam = async () => {
  try {
    const response = await fetch('https://znjwcyuwvqiklwiakdvw.supabase.co/functions/v1/start-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ examCode: 'TEST123' })
    })
    
    console.log('Response status:', response.status)
    const data = await response.json()
    console.log('Response data:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

testStartExam()