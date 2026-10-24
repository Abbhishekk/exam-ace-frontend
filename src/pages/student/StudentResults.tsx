import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  CheckCircle2, 
  Trophy, 
  Target, 
  XCircle, 
  ChevronDown, 
  Loader2, 
  Eye, 
  Calendar, 
  Award,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Clock,
  MinusCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/lib/envs'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { EmptyState } from '@/components/common/EmptyState'

interface ExamResult {
  attempt_id: string
  exam_id: string
  exam_name: string
  exam_code: string
  score: number
  correct_answers: number
  wrong_answers: number
  unattempted_answers: number
  total_questions: number
  submitted_at: string
  rank: number | null
  percentage: number
}

interface QuestionReview {
  question_id: string
  question_text: string
  image_url?: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  selected_option: string | null
  correct_option: string
  is_correct: boolean
  explanation: string | null
}

interface ExamReview {
  exam_id: string
  attempt_id: string
  submitted_at: string
  total_questions: number
  questions: QuestionReview[]
}

const StudentResults = () => {
  const navigate = useNavigate()
  const [results, setResults] = useState<ExamResult[]>([])
  const [selectedExamReview, setSelectedExamReview] = useState<ExamReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)

  useEffect(() => {
    fetchAllResults()
  }, [])

  const fetchAllResults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/auth')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/student/all-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      toast.error('Failed to fetch results')
    } finally {
      setLoading(false)
    }
  }

  const fetchExamReview = async (examId: string) => {
    setReviewLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/student/exam-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ exam_id: examId })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch exam review')
      }

      const data = await response.json()
      setSelectedExamReview(data)
    } catch (error: any) {
      toast.error('Failed to load review: ' + error.message)
    } finally {
      setReviewLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs font-medium">Loading scorecard records...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/student" className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                Performance Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              My Exam Results & Scorecards
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Analyze your past test scores, answer precision, batch rank, and question solutions.
            </p>
          </div>

          <Link to="/student/join">
            <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
              Take Another Exam
            </Button>
          </Link>
        </div>

        {/* Results List */}
        {results.length === 0 ? (
          <div className="py-12 bg-white rounded-xl border border-slate-200/80">
            <EmptyState
              icon={Trophy}
              title="No exam attempts found"
              description="You have not submitted any examination tests yet. When you complete an exam, your detailed scorecard will appear here."
              actionLabel="Join an Exam Now"
              onAction={() => navigate('/student/join')}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.attempt_id} className="border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {result.exam_name}
                        </h2>
                        {result.rank && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Rank #{result.rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {result.exam_code}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(result.submitted_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchExamReview(result.exam_id)}
                      disabled={reviewLoading}
                      className="text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 self-start sm:self-auto"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      {reviewLoading ? 'Loading...' : 'Review Solutions'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-center">
                      <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Score</p>
                      <p className="text-xl font-display font-bold text-blue-900 mt-0.5">{result.score}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Correct</p>
                      <p className="text-xl font-display font-bold text-emerald-800 mt-0.5">{result.correct_answers}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-center">
                      <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Incorrect</p>
                      <p className="text-xl font-display font-bold text-rose-800 mt-0.5">{result.wrong_answers}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Skipped</p>
                      <p className="text-xl font-display font-bold text-slate-700 mt-0.5">{result.unattempted_answers}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">
                      <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Accuracy</p>
                      <p className="text-xl font-display font-bold text-indigo-900 mt-0.5">{result.percentage}%</p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-center">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Rank</p>
                      <p className="text-xl font-display font-bold text-amber-900 mt-0.5">
                        {result.rank ? `#${result.rank}` : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detailed Solutions Review Panel */}
        {selectedExamReview && (
          <Card className="border-blue-200 shadow-md bg-white rounded-xl overflow-hidden mt-8">
            <CardHeader className="py-4 px-5 border-b border-blue-100 bg-blue-50/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-blue-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Detailed Question-by-Question Solution Key
                </CardTitle>
                <p className="text-xs text-blue-700 mt-0.5">
                  Showing all {selectedExamReview.questions.length} questions, your selected answer, and official answer explanations.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedExamReview(null)}
                className="text-xs border-blue-200 text-blue-800 hover:bg-white"
              >
                Close Review
              </Button>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {selectedExamReview.questions.map((question, index) => {
                const isCorrect = question.is_correct
                const isUnattempted = !question.selected_option

                return (
                  <Collapsible key={question.question_id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCorrect 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : isUnattempted 
                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {index + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Question {index + 1}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                              isCorrect 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : isUnattempted 
                                ? 'bg-slate-100 text-slate-600' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isCorrect ? 'Correct (+4)' : isUnattempted ? 'Unattempted (0)' : 'Incorrect (-1)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-lg mt-0.5">
                            {renderMathText(question.question_text)}
                          </p>
                        </div>
                      </div>

                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="p-5 border-t border-slate-100 bg-slate-50/30 space-y-4">
                      {/* Full Question Text */}
                      <div className="text-sm font-medium text-slate-900 leading-relaxed">
                        {renderMathText(question.question_text)}
                      </div>

                      {/* Question Image */}
                      {question.image_url && (
                        <div className="p-2 bg-white rounded-lg border border-slate-200 max-w-md">
                          <img
                            src={question.image_url}
                            alt="Question Diagram"
                            className="max-h-60 w-auto object-contain mx-auto"
                          />
                        </div>
                      )}

                      {/* Options */}
                      <div className="space-y-2 pt-2">
                        {Object.entries(question.options).map(([key, text]) => {
                          const isUserAnswer = question.selected_option === key
                          const isCorrectOption = question.correct_option === key

                          let optionStyle = "bg-white border-slate-200 text-slate-800"
                          if (isCorrectOption) {
                            optionStyle = "bg-emerald-50/70 border-emerald-300 text-emerald-900 font-medium"
                          } else if (isUserAnswer && !isCorrect) {
                            optionStyle = "bg-rose-50/70 border-rose-300 text-rose-900"
                          }

                          return (
                            <div key={key} className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${optionStyle}`}>
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold w-5">{key}.</span>
                                <span>{renderMathText(text)}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {isUserAnswer && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                  }`}>
                                    Your Choice
                                  </span>
                                )}
                                {isCorrectOption && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Solution / Explanation */}
                      {question.explanation && (
                        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs sm:text-sm space-y-1.5">
                          <p className="font-bold text-blue-900 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            Official Solution & Step-by-Step Explanation:
                          </p>
                          <div className="text-slate-800 leading-relaxed pt-1">
                            {renderMathText(question.explanation)}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default StudentResults