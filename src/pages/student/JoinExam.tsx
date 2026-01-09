import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, BookOpen, Clock, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const JoinExam = () => {
  const navigate = useNavigate()
  const [examCode, setExamCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!examCode.trim()) {
      toast.error('Please enter an exam code')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please login to join the exam')
        navigate('/auth')
        return
      }

      const response = await fetch('http://localhost:3001/api/start-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ examCode: examCode.trim() })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.error?.includes('not found')) {
          toast.error('Invalid exam code. Please check and try again.')
        } else if (error.error?.includes('not started')) {
          toast.error('Exam has not started yet. Please wait for the scheduled time.')
        } else if (error.error?.includes('expired')) {
          toast.error('Exam time has expired.')
        } else {
          toast.error(error.error || 'Failed to join exam')
        }
        return
      }

      const data = await response.json()
      
      // Success - redirect to exam page with data
      toast.success('Exam started successfully!')
      navigate('/student/exam', { 
        state: { 
          examData: data,
          examCode: examCode.trim()
        }
      })

    } catch (error) {
      toast.error('Network error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join Exam</CardTitle>
            <p className="text-muted-foreground">
              Enter your exam code to start the test
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinExam} className="space-y-4">
              <div>
                <Input
                  placeholder="Enter exam code"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono"
                  disabled={loading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !examCode.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining Exam...
                  </>
                ) : (
                  'Join Exam'
                )}
              </Button>
            </form>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                Instructions
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Enter the exam code provided by your instructor</li>
                <li>• Make sure you have a stable internet connection</li>
                <li>• The exam will start automatically once you join</li>
                <li>• You cannot pause or restart the exam once started</li>
              </ul>
            </div>

            {/* Common Error Messages */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Exam not started?</p>
                  <p>Wait for the scheduled start time or contact your instructor</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default JoinExam