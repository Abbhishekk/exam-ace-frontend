import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clock, Send, AlertTriangle } from 'lucide-react'
import { API_BASE_URL } from '@/lib/envs'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface Question {
  id: string
  question_text: string
  image_url?: string
  section_id: string
  section_name: string
  subject_name: string
  options: Array<{
    key: string
    text: string
  }>
}

interface ExamData {
  remaining_time_in_seconds: number
  questions: Question[]
  attempt_id: string
}

const StudentExam = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const examData = location.state?.examData as ExamData
  const examCode = location.state?.examCode as string

  const [timeLeft, setTimeLeft] = useState(examData?.remaining_time_in_seconds || 0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)

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

  // Timer countdown with server sync
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

    // Sync with server every 30 seconds
    const syncTimer = setInterval(() => {
      syncTimeWithServer()
    }, 30000)

    return () => {
      clearInterval(timer)
      clearInterval(syncTimer)
    }
  }, [timeLeft])

  // Anti-cheating: Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1
          // Send to backend
          updateTabSwitchCount(newCount)
          return newCount
        })
        toast.warning('Tab switch detected! This activity is being monitored.')
      }
    }

    const handleWindowBlur = () => {
      setTabSwitchCount(prev => {
        const newCount = prev + 1
        updateTabSwitchCount(newCount)
        return newCount
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [examData?.attempt_id])

  // Anti-cheating: Disable right click and text selection
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleSelectStart = (e: Event) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+C, Ctrl+V
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u') ||
          (e.ctrlKey && (e.key === 'c' || e.key === 'v'))) {
        e.preventDefault()
        toast.error('This action is disabled during the exam')
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleAutoSubmit = useCallback(async () => {
    toast.warning('Time expired! Auto-submitting exam...')
    await submitExam()
  }, [])

  const updateTabSwitchCount = async (count: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`${API_BASE_URL}/api/update-tab-switches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          attempt_id: examData.attempt_id,
          tab_switch_count: count
        })
      })
    } catch (error) {
      console.error('Failed to update tab switch count:', error)
    }
  }

  const syncTimeWithServer = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${API_BASE_URL}/api/exam-time-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          attempt_id: examData.attempt_id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTimeLeft(data.remaining_time_in_seconds)
      }
    } catch (error) {
      console.error('Failed to sync time with server:', error)
    }
  }

  const submitExam = async () => {
    if (submitting) return
    
    // Show confirmation alert
    const unattemptedCount = questions.length - Object.keys(answers).length
    const confirmMessage = unattemptedCount > 0 
      ? `Are you sure you want to submit the exam?\n\nYou have ${unattemptedCount} unattempted questions.`
      : 'Are you sure you want to submit the exam?'
    
    if (!window.confirm(confirmMessage)) {
      return
    }
    
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

      const response = await fetch(`${API_BASE_URL}/api/submit-exam`, {
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

  const renderMathText = (text: string) => {
    if (!text) return text
    
    // Debug log to see the actual text
    console.log('Rendering text:', text)
    
    try {
      // Handle both $$....$$ and $....$ patterns
      const parts = []
      let currentIndex = 0
      
      // First handle block math ($$...$$)
      const blockMathRegex = /\$\$([^$]+?)\$\$/g
      let match
      
      while ((match = blockMathRegex.exec(text)) !== null) {
        // Add text before the math
        if (match.index > currentIndex) {
          const beforeText = text.slice(currentIndex, match.index)
          parts.push(...renderInlineMath(beforeText))
        }
        
        // Add block math
        parts.push(<BlockMath key={`block-${match.index}`} math={match[1]} />)
        currentIndex = match.index + match[0].length
      }
      
      // Add remaining text
      if (currentIndex < text.length) {
        const remainingText = text.slice(currentIndex)
        parts.push(...renderInlineMath(remainingText))
      }
      
      return parts.length > 0 ? parts : text
    } catch (error) {
      console.error('Math rendering error:', error)
      return text
    }
  }
  
  const renderInlineMath = (text: string) => {
    if (!text) return []
    
    const parts = []
    let currentIndex = 0
    
    // Handle inline math ($...$)
    const inlineMathRegex = /\$([^$]+?)\$/g
    let match
    
    while ((match = inlineMathRegex.exec(text)) !== null) {
      // Add text before the math
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index))
      }
      
      // Add inline math
      parts.push(<InlineMath key={`inline-${match.index}`} math={match[1]} />)
      currentIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex))
    }
    
    return parts.length > 0 ? parts : [text]
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

  // Group questions by section
  const sections = questions.reduce((acc, q, index) => {
    const sectionId = q.section_id
    if (!acc[sectionId]) {
      acc[sectionId] = {
        name: q.section_name,
        subject: q.subject_name,
        questions: [],
        startIndex: index
      }
    }
    acc[sectionId].questions.push({ ...q, globalIndex: index })
    return acc
  }, {} as Record<string, { name: string; subject: string; questions: (Question & { globalIndex: number })[]; startIndex: number }>)

  const sectionArray = Object.values(sections)

  return (
    <div 
      className="min-h-screen bg-background p-4" 
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
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
                  {tabSwitchCount > 0 && (
                    <span className="text-red-600 ml-2">• Tab switches: {tabSwitchCount}</span>
                  )}
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
            <CardTitle className="flex items-center justify-between">
              <span>Question {currentQuestion + 1}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {question.subject_name} - {question.section_name}
              </span>
            </CardTitle>
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
            <div className="text-lg mb-6">{renderMathText(question.question_text)}</div>
            
            <RadioGroup
              value={answers[question.id] || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options.map((option) => (
                <div key={option.key} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value={option.key} id={`${question.id}_${option.key}`} />
                  <Label htmlFor={`${question.id}_${option.key}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{option.key}.</span>
                    <span>{renderMathText(option.text)}</span>
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

            {/* Section Navigator */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Sections:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {sectionArray.map((section, index) => {
                  const sectionAnswered = section.questions.filter(q => answers[q.id]).length
                  return (
                    <Button
                      key={section.name}
                      variant="outline"
                      size="sm"
                      className={`${currentQuestion >= section.startIndex && currentQuestion < section.startIndex + section.questions.length ? 'bg-blue-100 border-blue-300' : ''}`}
                      onClick={() => setCurrentQuestion(section.startIndex)}
                    >
                      {section.subject}
                      <span className="ml-1 text-xs">({sectionAnswered}/{section.questions.length})</span>
                    </Button>
                  )
                })}
              </div>
              
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