import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clock, Send, AlertTriangle } from 'lucide-react'

interface Question {
  id: string
  question_text: string
  image_url?: string
  options: Array<{
    key: string
    text: string
  }>
}

interface ExamData {
  remaining_time: number
  questions: Question[]
  attempt_id: string
}

const StudentExam = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const examData = location.state?.examData as ExamData
  const examCode = location.state?.examCode as string

  const [timeLeft, setTimeLeft] = useState(examData?.remaining_time || 0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Load saved answers from localStorage
  useEffect(() => {
    if (examCode) {
      const saved = localStorage.getItem(`exam_${examCode}_answers`)
      if (saved) {
        setAnswers(JSON.parse(saved))
      }
    }
  }, [examCode])

  // Save answers to localStorage
  useEffect(() => {
    if (examCode && Object.keys(answers).length > 0) {
      localStorage.setItem(`exam_${examCode}_answers`, JSON.stringify(answers))
    }
  }, [answers, examCode])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const handleAutoSubmit = useCallback(async () => {
    toast.warning('Time expired! Auto-submitting exam...')
    await submitExam()
  }, [])

  const submitExam = async () => {
    if (submitting) return
    
    setSubmitting(true)
    console.log(Object.entries(answers).map(([questionId, selectedOption]) => ({
      question_id: questionId,
      selected_option: selectedOption
    })));
    
    try {
      const answersArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
        question_id: questionId,
        selected_option: selectedOption
      }))

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired. Please login again.')
        navigate('/auth')
        return
      }

      const response = await fetch('http://localhost:3001/api/submit-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          attempt_id: examData.attempt_id,
          answers: answersArray
        })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.error?.includes('already submitted')) {
          toast.error('Exam already submitted')
          navigate('/student')
          return
        }
        throw new Error(error.error || 'Failed to submit exam')
      }

      const data = await response.json()

      // Clear saved answers
      if (examCode) {
        localStorage.removeItem(`exam_${examCode}_answers`)
      }

      toast.success('Exam submitted successfully!')
      navigate('/student/results', { state: { results: data } })
    } catch (error) {
      toast.error('Failed to submit exam: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!examData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>No exam data found. Please join an exam first.</p>
            <Button onClick={() => navigate('/student/join')} className="mt-4">
              Join Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const questions = examData.questions
  const question = questions[currentQuestion]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Exam in Progress</h1>
                <p className="text-muted-foreground">
                  Question {currentQuestion + 1} of {questions.length} • 
                  Answered: {answeredCount}/{questions.length}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-primary'}`}>
                  <Clock className="w-5 h-5 inline mr-2" />
                  {formatTime(timeLeft)}
                </div>
                {timeLeft < 300 && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Less than 5 minutes left!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Question {currentQuestion + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            {question.image_url && (
              <div className="mb-6">
                <img
                  src={question.image_url}
                  alt="Question image"
                  loading="lazy"
                  className="w-full max-w-2xl mx-auto h-auto object-contain rounded-lg border shadow-sm"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
            <p className="text-lg mb-6">{question.question_text}</p>
            
            <RadioGroup
              value={answers[question.id] || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options.map((option) => (
                <div key={option.key} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value={option.key} id={`${question.id}_${option.key}`} />
                  <Label htmlFor={`${question.id}_${option.key}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{option.key}.</span>
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestion === questions.length - 1}
                >
                  Next
                </Button>
              </div>

              <Button
                onClick={submitExam}
                disabled={submitting || answeredCount === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </Button>
            </div>

            {/* Question Navigator */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Question Navigator:</p>
              <div className="grid grid-cols-10 gap-2">
                {questions.map((_, index) => (
                  <Button
                    key={index}
                    variant={currentQuestion === index ? 'default' : 'outline'}
                    size="sm"
                    className={`w-10 h-10 p-0 ${
                      answers[questions[index].id] 
                        ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200' 
                        : ''
                    }`}
                    onClick={() => setCurrentQuestion(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default StudentExam