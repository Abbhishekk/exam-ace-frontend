import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Clock, 
  Send, 
  AlertTriangle, 
  Bookmark, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  ShieldAlert, 
  Layers,
  HelpCircle,
  Eye
} from 'lucide-react'
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
  marks?: number
  negative_marks?: number
  options: Array<{
    key: string
    text: string
    image_url?: string | null
  }>
}

interface ExamData {
  remaining_time_in_seconds: number
  questions: Question[]
  attempt_id: string
  previous_answers?: Record<string, string | null>
  is_rejoin?: boolean
}

const StudentExam = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [examData, setExamData] = useState<ExamData | null>(location.state?.examData || null)
  const [examCode, setExamCode] = useState<string>(
    location.state?.examCode || localStorage.getItem('active_exam_code') || ''
  )
  const [restoringSession, setRestoringSession] = useState(
    !location.state?.examData && Boolean(localStorage.getItem('active_exam_code'))
  )

  const [timeLeft, setTimeLeft] = useState(examData?.remaining_time_in_seconds || 0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Auto-restore test session if student reloaded page or reopened tab
  useEffect(() => {
    if (!examData && examCode) {
      setRestoringSession(true)
      const restoreSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            navigate('/auth')
            return
          }

          const response = await fetch(`${API_BASE_URL}/api/start-exam`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ examCode: examCode.trim() })
          })

          if (!response.ok) {
            const err = await response.json()
            toast.error(err.error || 'Failed to restore test session')
            localStorage.removeItem('active_exam_code')
            navigate('/student/join')
            return
          }

          const data = await response.json()
          setExamData(data)
          setTimeLeft(data.remaining_time_in_seconds || 0)
          toast.success('Test session recovered successfully!')
        } catch (err: any) {
          toast.error('Network error during session recovery: ' + err.message)
          navigate('/student/join')
        } finally {
          setRestoringSession(false)
        }
      }
      restoreSession()
    }
  }, [examData, examCode, navigate])

  // Persist active exam code to localStorage
  useEffect(() => {
    if (examCode) {
      localStorage.setItem('active_exam_code', examCode)
    }
  }, [examCode])

  // Load saved answers: merge server previous_answers and localStorage
  useEffect(() => {
    let combinedAnswers: Record<string, string | null> = {}

    // 1. First, populate answers previously recorded on server
    if (examData?.previous_answers && typeof examData.previous_answers === 'object') {
      combinedAnswers = { ...examData.previous_answers }
    }

    // 2. Overlay localStorage if available on this device
    if (examCode) {
      const savedAnswers = localStorage.getItem(`exam_${examCode}_answers`)
      if (savedAnswers) {
        try {
          const parsed = JSON.parse(savedAnswers)
          combinedAnswers = { ...combinedAnswers, ...parsed }
        } catch (e) {
          console.error('Failed to parse cached answers:', e)
        }
      }
      const savedReview = localStorage.getItem(`exam_${examCode}_review`)
      if (savedReview) {
        try {
          setMarkedForReview(JSON.parse(savedReview))
        } catch (e) {
          console.error('Failed to parse cached review marks:', e)
        }
      }
    }

    if (Object.keys(combinedAnswers).length > 0) {
      setAnswers(combinedAnswers)
      if (examCode) {
        localStorage.setItem(`exam_${examCode}_answers`, JSON.stringify(combinedAnswers))
      }
    }
  }, [examCode, examData])

  // Save answers to localStorage
  useEffect(() => {
    if (examCode && Object.keys(answers).length > 0) {
      localStorage.setItem(`exam_${examCode}_answers`, JSON.stringify(answers))
    }
  }, [answers, examCode])

  // Save review flags to localStorage
  useEffect(() => {
    if (examCode && Object.keys(markedForReview).length > 0) {
      localStorage.setItem(`exam_${examCode}_review`, JSON.stringify(markedForReview))
    }
  }, [markedForReview, examCode])

  // Real-time server persistence for selected answers
  const persistAnswerToServer = async (questionId: string, value: string | null) => {
    if (!examData?.attempt_id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`${API_BASE_URL}/api/save-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          attempt_id: examData.attempt_id,
          question_id: questionId,
          selected_option: value
        })
      })
    } catch (err) {
      console.warn('Real-time answer save warning:', err)
    }
  }

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
          updateTabSwitchCount(newCount)
          return newCount
        })
        toast.warning('Warning: Tab switch detected! All focus departures are logged.')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Sync remaining time with backend
  const syncTimeWithServer = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`${API_BASE_URL}/api/student/sync-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          attempt_id: examData.attempt_id,
          remaining_time_in_seconds: timeLeft
        })
      })
    } catch (error) {
      console.error('Time sync error:', error)
    }
  }

  // Record tab switch in backend
  const updateTabSwitchCount = async (count: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`${API_BASE_URL}/api/student/log-infraction`, {
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
      console.error('Infraction logging error:', error)
    }
  }

  const handleAutoSubmit = useCallback(() => {
    toast.error('Time has expired! Submitting your test automatically...')
    submitExam()
  }, [])

  const submitExam = async () => {
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Session expired. Please log in again.')
        navigate('/auth')
        return
      }

      const answersArray = Object.entries(answers).map(([question_id, selected_option]) => ({
        question_id,
        selected_option: selected_option || null
      }))

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

      if (examCode) {
        localStorage.removeItem(`exam_${examCode}_answers`)
        localStorage.removeItem(`exam_${examCode}_review`)
        localStorage.removeItem('active_exam_code')
      }

      toast.success('Exam submitted successfully!')
      navigate('/student/results', { state: { results: data } })
    } catch (error: any) {
      toast.error('Failed to submit exam: ' + error.message)
    } finally {
      setSubmitting(false)
      setShowSubmitModal(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    persistAnswerToServer(questionId, value)
  }

  const clearResponse = (questionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: null }))
    persistAnswerToServer(questionId, null)
  }

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Math rendering helper
  const renderMathText = (text: string) => {
    if (!text) return null
    const parts = []
    let currentIndex = 0
    const inlineMathRegex = /\$([^\$]+)\$/g
    let match

    while ((match = inlineMathRegex.exec(text)) !== null) {
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index))
      }
      parts.push(<InlineMath key={`inline-${match.index}`} math={match[1]} />)
      currentIndex = match.index + match[0].length
    }

    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  if (restoringSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-sm text-center p-6 space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Restoring Active Exam Session</h2>
            <p className="text-xs text-slate-500 mt-1">
              Recovering your questions and previously selected answers...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (!examData || !examData.questions || examData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-sm text-center p-6">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Exam Session Unavailable</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            No questions could be loaded for this test. Please verify the exam code with your instructor.
          </p>
          <Button onClick={() => navigate('/student/join')} className="w-full bg-blue-600 hover:bg-blue-700">
            Return to Exam Join Portal
          </Button>
        </Card>
      </div>
    )
  }

  const questions = examData.questions
  const question = questions[currentQuestion]
  const answeredCount = Object.values(answers).filter(val => val !== null && val !== '').length
  const markedCount = Object.values(markedForReview).filter(Boolean).length
  const unansweredCount = questions.length - answeredCount

  // Group questions by section
  const sections = questions.reduce((acc, q, index) => {
    const sectionId = q.section_id || 'default'
    if (!acc[sectionId]) {
      acc[sectionId] = {
        name: q.section_name || 'Section',
        subject: q.subject_name || 'Subject',
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
      className="min-h-screen bg-slate-100/60 flex flex-col font-sans select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {/* Top Testing Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            EA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                Exam Ace Testing System
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/60">
                CBT Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Exam Code: <span className="font-mono font-semibold text-slate-700">{examCode || "Live Session"}</span>
            </p>
          </div>
        </div>

        {/* Timer and Header Actions */}
        <div className="flex items-center gap-3">
          {tabSwitchCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{tabSwitchCount} Infractions</span>
            </div>
          )}

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base ${
            timeLeft < 300 
              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse' 
              : 'bg-slate-50 text-slate-900 border-slate-200'
          }`}>
            <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-rose-600' : 'text-blue-600'}`} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <Button
            onClick={() => setShowSubmitModal(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Finish & Submit
          </Button>
        </div>
      </header>

      {/* Main Examination Body - 2 Columns */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Question Area (8 of 12 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Section Selector Tabs */}
          {sectionArray.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {sectionArray.map((sec) => {
                const isCurrentSec = currentQuestion >= sec.startIndex && currentQuestion < sec.startIndex + sec.questions.length
                const answeredInSec = sec.questions.filter(q => answers[q.id] !== null && answers[q.id] !== '').length
                return (
                  <button
                    key={sec.name}
                    onClick={() => setCurrentQuestion(sec.startIndex)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${
                      isCurrentSec
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{sec.subject}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isCurrentSec ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {answeredInSec}/{sec.questions.length}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Active Question Card */}
          <Card className="flex-1 border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  Q{currentQuestion + 1}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-900">
                    {question.subject_name || "General"}
                  </span>
                  <span className="text-xs text-slate-400 mx-1.5">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {question.section_name || "Section"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  +{question.marks || 4} Marks
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  -{question.negative_marks || 1} Neg
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6 flex-1">
              {/* Question Text */}
              <div className="text-sm sm:text-base text-slate-900 leading-relaxed font-sans font-medium">
                {renderMathText(question.question_text)}
              </div>

              {/* Question Diagram / Image */}
              {question.image_url && (
                <div className="my-4 p-2 bg-slate-50 rounded-xl border border-slate-200 max-w-xl mx-auto flex items-center justify-center">
                  <img
                    src={question.image_url}
                    alt="Question Diagram"
                    loading="lazy"
                    className="max-h-72 w-auto object-contain rounded-lg shadow-xs"
                  />
                </div>
              )}

              {/* Multiple Choice Options */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Select Correct Alternative:
                </p>
                <div className="space-y-2.5">
                  {question.options.map((option) => {
                    const isSelected = answers[question.id] === option.key
                    return (
                      <div
                        key={option.key}
                        onClick={() => handleAnswerChange(question.id, option.key)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {option.key}
                        </div>

                        <div className="flex-1 text-xs sm:text-sm text-slate-800 leading-relaxed pt-1">
                          {option.text && renderMathText(option.text)}
                          {option.image_url && (
                            <div className="mt-2">
                              <img
                                src={option.image_url}
                                alt={`Option ${option.key}`}
                                loading="lazy"
                                className="max-h-48 w-auto object-contain rounded border border-slate-200"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>

            {/* Bottom Question Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleMarkForReview(question.id)}
                  className={`text-xs ${
                    markedForReview[question.id]
                      ? 'bg-purple-50 text-purple-700 border-purple-300 font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  {markedForReview[question.id] ? "Marked for Review" : "Mark for Review"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearResponse(question.id)}
                  disabled={!answers[question.id]}
                  className="text-xs text-slate-500 hover:text-rose-600"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Clear Selection
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                  className="text-xs text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <Button
                  size="sm"
                  onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestion === questions.length - 1}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
                >
                  Save & Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Palette & Status (4 of 12 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
              <p className="text-xs text-slate-500">Jump to any question instantly</p>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-slate-100 font-medium">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded bg-slate-200"></span>
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded bg-purple-500"></span>
                <span>Marked ({markedCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded ring-2 ring-blue-600 bg-white"></span>
                <span>Current</span>
              </div>
            </div>

            {/* Interactive Question Grid */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, index) => {
                  const isCurrent = currentQuestion === index
                  const isAnswered = answers[q.id] !== null && answers[q.id] !== '' && answers[q.id] !== undefined
                  const isMarked = markedForReview[q.id]

                  let tileStyle = "bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80 shadow-xs"

                  if (isAnswered && isMarked) {
                    tileStyle = "bg-purple-100 text-purple-900 border-purple-400 font-bold relative shadow-xs"
                  } else if (isMarked) {
                    tileStyle = "bg-purple-50 text-purple-700 border-purple-300 font-semibold shadow-xs"
                  } else if (isAnswered) {
                    tileStyle = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-xs"
                  }

                  if (isCurrent) {
                    tileStyle += " ring-2 ring-blue-600 ring-offset-2 ring-offset-slate-50 font-bold"
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestion(index)}
                      className={`h-10 w-full rounded-lg text-xs font-mono font-semibold flex items-center justify-center border transition-all relative ${tileStyle}`}
                    >
                      {index + 1}
                      {isAnswered && isMarked && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section Summary breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Section Progress
              </p>
              {sectionArray.map((sec) => {
                const answered = sec.questions.filter(q => answers[q.id] !== null && answers[q.id] !== '').length
                const pct = Math.round((answered / sec.questions.length) * 100)
                return (
                  <div key={sec.name} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-700">
                      <span className="font-medium">{sec.subject}</span>
                      <span className="font-semibold text-slate-900">{answered}/{sec.questions.length} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Final Submit Button */}
            <div className="pt-2">
              <Button
                onClick={() => setShowSubmitModal(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 text-xs shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Complete Test
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Submit Dialog */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Examination Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please review your question response statistics before submitting. Once submitted, you cannot change your answers.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Total Questions</p>
              <p className="text-xl font-bold text-slate-900">{questions.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-700 font-medium">Answered</p>
              <p className="text-xl font-bold text-emerald-800">{answeredCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
              <p className="text-xs text-purple-700 font-medium">Marked for Review</p>
              <p className="text-xl font-bold text-purple-800">{markedCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-xs text-rose-700 font-medium">Unanswered</p>
              <p className="text-xl font-bold text-rose-800">{unansweredCount}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSubmitModal(false)}
              className="text-xs"
            >
              Continue Test
            </Button>
            <Button
              type="button"
              onClick={submitExam}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {submitting ? "Finalizing Submission..." : "Yes, Submit Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StudentExam