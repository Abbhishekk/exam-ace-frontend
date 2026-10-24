import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Users, Loader2, FileText, BarChart3, Download, Award, CheckCircle2, XCircle, MinusCircle, Layers } from 'lucide-react'
import { API_BASE_URL } from '@/lib/envs'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'

interface ExamSubmission {
  id: string
  student_id: string
  score: number
  correct_answers: number
  wrong_answers: number
  unattempted_answers: number
  submitted_at: string
  profiles: {
    full_name: string
  }
}

interface ExamInfo {
  id: string
  name: string
  code: string
  total_questions: number
}

const AdminExamSubmissions = () => {
  const { examId: routeExamId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [exams, setExams] = useState<ExamInfo[]>([])
  const [currentExamId, setCurrentExamId] = useState<string>(routeExamId || '')
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([])
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    checkAuthAndFetchExams()
  }, [routeExamId])

  const checkAuthAndFetchExams = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/auth')
        return
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!roleData || roleData.role !== 'admin') {
        toast.error('Access denied. Admin only.')
        navigate('/admin')
        return
      }

      // Fetch all available exams
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, name, code, total_questions')
        .order('created_at', { ascending: false })

      if (examsError) throw examsError

      const examList = examsData || []
      setExams(examList)

      // Decide which exam to load
      let targetExamId = routeExamId || ''
      if (!targetExamId && examList.length > 0) {
        targetExamId = examList[0].id
      }

      if (targetExamId) {
        setCurrentExamId(targetExamId)
        await fetchSubmissionsForExam(targetExamId)
      } else {
        setLoading(false)
      }
    } catch (error: any) {
      toast.error('Error loading submissions: ' + error.message)
      setLoading(false)
    }
  }

  const fetchSubmissionsForExam = async (targetId: string) => {
    setLoading(true)
    try {
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('id, name, code, total_questions')
        .eq('id', targetId)
        .single()

      if (examError) throw examError
      setExamInfo(exam)

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${API_BASE_URL}/api/admin/exam-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ exam_id: targetId })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch submissions')
      }

      const data = await response.json()
      
      const transformedSubmissions = (data.submissions || []).map((submission: any) => ({
        id: submission.student_id,
        student_id: submission.student_id,
        score: submission.score,
        correct_answers: submission.correct_answers,
        wrong_answers: submission.wrong_answers,
        unattempted_answers: submission.unattempted_answers,
        submitted_at: submission.submitted_at,
        profiles: {
          full_name: submission.student_name || 'Anonymous Student'
        }
      }))

      transformedSubmissions.sort((a: any, b: any) => b.score - a.score)
      setSubmissions(transformedSubmissions)
    } catch (error: any) {
      toast.error('Failed to fetch data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExamChange = (newExamId: string) => {
    setCurrentExamId(newExamId)
    navigate(`/admin/exams/${newExamId}/submissions`)
    fetchSubmissionsForExam(newExamId)
  }

  const handleDownloadResults = async () => {
    if (!currentExamId) return
    setDownloadingPdf(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${API_BASE_URL}/api/admin/generate-exam-results-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ exam_id: currentExamId })
      })

      if (!response.ok) throw new Error('PDF export failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `results-${examInfo?.code || currentExamId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Results PDF downloaded')
    } catch (err: any) {
      toast.error(err.message || 'Failed to download results PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const calculatePercentage = (correct: number, total: number) => {
    return total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0'
  }

  const avgScore = submissions.length > 0 
    ? (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1)
    : '0'

  const avgAccuracy = (submissions.length > 0 && examInfo?.total_questions)
    ? (submissions.reduce((sum, s) => sum + (s.correct_answers / examInfo.total_questions * 100), 0) / submissions.length).toFixed(1)
    : '0.0'

  const highestScore = submissions.length > 0 ? submissions[0].score : 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Exam Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/admin/exams" className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> All Exams
              </Link>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                Evaluation Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              Exam Submissions & Leaderboards
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live candidate test attempts, accuracy metrics, and downloadable result scorecards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {exams.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-500 hidden md:block">Session:</label>
                <Select value={currentExamId} onValueChange={handleExamChange}>
                  <SelectTrigger className="w-[240px] sm:w-[280px] h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Select Exam Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id} className="text-xs">
                        {ex.name} ({ex.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentExamId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadResults}
                  disabled={downloadingPdf || submissions.length === 0}
                  className="text-xs text-slate-700"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  {downloadingPdf ? "Generating..." : "Results PDF"}
                </Button>
                <Link to={`/admin/exams/${currentExamId}/analytics`}>
                  <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Analytics
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* If no exams exist in system */}
        {exams.length === 0 && !loading && (
          <div className="py-12 bg-white rounded-xl border border-slate-200/80">
            <EmptyState
              icon={Layers}
              title="No examinations created yet"
              description="Create your first exam session to conduct tests and evaluate student candidate submissions."
              actionLabel="Create an Exam"
              onAction={() => navigate('/admin/exams/multi-subject')}
            />
          </div>
        )}

        {/* Stats Summary */}
        {currentExamId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Submissions"
              value={submissions.length}
              icon={Users}
              subtext="Students completed test"
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatCard
              label="Average Score"
              value={avgScore}
              icon={FileText}
              subtext={`Highest score: ${highestScore}`}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
            />
            <StatCard
              label="Average Accuracy"
              value={`${avgAccuracy}%`}
              icon={Award}
              subtext="Across all test questions"
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Test Question Count"
              value={examInfo?.total_questions || 0}
              icon={CheckCircle2}
              subtext="Total items evaluated"
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
          </div>
        )}

        {/* Submissions Table Card */}
        {currentExamId && (
          <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  {examInfo?.name || "Candidate Submissions Leaderboard"}
                </CardTitle>
                {examInfo && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Code: <span className="font-mono font-semibold text-slate-700">{examInfo.code}</span> • {submissions.length} total submissions
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Ranked by total score descending
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-xs font-medium">Loading candidate submissions...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Users}
                    title="No submissions recorded yet for this exam"
                    description="When enrolled students start and submit this exam, their scores, accuracy, and submission timestamps will show here in real time."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200/80">
                        <TableHead className="w-[80px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Rank</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Candidate Name</TableHead>
                        <TableHead className="w-[110px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Score</TableHead>
                        <TableHead className="w-[90px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Correct</TableHead>
                        <TableHead className="w-[90px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Wrong</TableHead>
                        <TableHead className="w-[100px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Unattempted</TableHead>
                        <TableHead className="w-[100px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Accuracy</TableHead>
                        <TableHead className="w-[180px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-right">Submitted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission, index) => {
                        const rank = index + 1
                        return (
                          <TableRow key={submission.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                            <TableCell className="py-3.5 text-center">
                              {rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                                  🥇1
                                </span>
                              ) : rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs">
                                  🥈2
                                </span>
                              ) : rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs">
                                  🥉3
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-500">#{rank}</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center">
                                  {submission.profiles.full_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold text-slate-900">
                                  {submission.profiles.full_name}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 text-center">
                              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200/60">
                                {submission.score}
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 text-center">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {submission.correct_answers}
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 text-center">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-500" />
                                {submission.wrong_answers}
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 text-center">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                <MinusCircle className="w-3 h-3 text-slate-400" />
                                {submission.unattempted_answers}
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 text-center">
                              <span className="text-xs font-semibold text-slate-800">
                                {calculatePercentage(submission.correct_answers, examInfo?.total_questions || 0)}%
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 text-right text-xs text-slate-500">
                              {new Date(submission.submitted_at).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminExamSubmissions