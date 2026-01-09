import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CheckCircle, Trophy, Target, XCircle, ChevronDown, Loader2, Eye, Calendar, Award } from 'lucide-react'
import { toast } from 'sonner'

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

      const response = await fetch('http://localhost:3001/api/student/all-results', {
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

      const response = await fetch('http://localhost:3001/api/student/exam-review', {
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

      const reviewData = await response.json()
      setSelectedExamReview(reviewData)
    } catch (error) {
      toast.error('Failed to fetch exam review')
    } finally {
      setReviewLoading(false)
    }
  }

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null
    if (rank === 1) return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">🥇 1st</span>
    if (rank === 2) return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">🥈 2nd</span>
    if (rank === 3) return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-medium">🥉 3rd</span>
    return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">#{rank}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No exam results found</p>
            <p className="text-muted-foreground mb-4">Take an exam to see your results here</p>
            <Button onClick={() => navigate('/student')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Exam Results</h1>
          <p className="text-muted-foreground">View all your exam performances and detailed reviews</p>
        </div>

        <div className="grid gap-6">
          {results.map((result) => (
            <Card key={result.attempt_id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {result.exam_name}
                      {getRankBadge(result.rank)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(result.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchExamReview(result.exam_id)}
                    disabled={reviewLoading}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {reviewLoading ? 'Loading...' : 'Review'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="text-xl font-bold text-primary">{result.score}</div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{result.correct_answers}</div>
                    <div className="text-xs text-green-700">Correct</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">{result.wrong_answers}</div>
                    <div className="text-xs text-red-700">Wrong</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold text-gray-600">{result.unattempted_answers}</div>
                    <div className="text-xs text-gray-700">Skipped</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{result.percentage}%</div>
                    <div className="text-xs text-blue-700">Accuracy</div>
                  </div>
                  {result.rank && (
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-xl font-bold text-purple-600">#{result.rank}</div>
                      <div className="text-xs text-purple-700">Rank</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Exam Review Modal */}
        {selectedExamReview && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Detailed Question Review
                </CardTitle>
                <Button variant="outline" onClick={() => setSelectedExamReview(null)}>
                  Close Review
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedExamReview.questions.map((question, index) => (
                  <Collapsible key={question.question_id}>
                    <CollapsibleTrigger className={`flex items-center justify-between w-full p-4 rounded-lg transition-colors ${
                      question.is_correct 
                        ? 'bg-green-50 hover:bg-green-100 border border-green-200' 
                        : question.selected_option 
                          ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}>
                      <div className="text-left flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          question.is_correct 
                            ? 'bg-green-600 text-white' 
                            : question.selected_option 
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-400 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">
                            {question.is_correct ? '✓' : question.selected_option ? '✗' : '—'} Question {index + 1}
                          </p>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {question.question_text}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 border-l border-r border-b rounded-b-lg">
                      <div className="space-y-4">
                        <p className="font-medium text-lg">{question.question_text}</p>
                        
                        {question.image_url && (
                          <div className="mb-4">
                            <img
                              src={question.image_url}
                              alt="Question image"
                              loading="lazy"
                              className="w-full max-w-2xl mx-auto h-auto object-contain rounded-lg border shadow-sm"
                              style={{ maxHeight: '300px' }}
                            />
                          </div>
                        )}
                        
                        <div className="grid gap-2">
                          {Object.entries(question.options).map(([key, text]) => (
                            <div key={key} className={`p-3 rounded border ${
                              question.selected_option === key && !question.is_correct
                                ? 'bg-red-100 border-red-300'
                                : question.correct_option === key
                                  ? 'bg-green-100 border-green-300'
                                  : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span>
                                  <span className="font-medium">{key}. </span>{text}
                                </span>
                                <div className="flex gap-2">
                                  {question.selected_option === key && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      question.is_correct ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                    }`}>
                                      Your answer
                                    </span>
                                  )}
                                  {question.correct_option === key && (
                                    <span className="text-xs px-2 py-1 rounded bg-green-600 text-white">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {!question.selected_option && (
                          <div className="p-3 bg-gray-100 border border-gray-300 rounded">
                            <p className="text-gray-700 font-medium">Not Attempted</p>
                          </div>
                        )}

                        {question.explanation && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                            <p className="font-medium text-blue-800 mb-2">Explanation:</p>
                            <p className="text-blue-700">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <Button onClick={() => navigate('/student')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

export default StudentResults