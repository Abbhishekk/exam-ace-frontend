import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Users, Target, TrendingUp, Award, BarChart3, CheckCircle2, BookOpen } from 'lucide-react'
import { getExamAnalytics, ExamAnalytics as ExamAnalyticsType } from '@/lib/examAnalytics'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'

const ExamAnalytics = () => {
  const { examId } = useParams<{ examId: string }>()
  const [analytics, setAnalytics] = useState<ExamAnalyticsType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (examId) {
      fetchAnalytics()
    }
  }, [examId])

  const fetchAnalytics = async () => {
    try {
      const data = await getExamAnalytics(examId!)
      setAnalytics(data)
    } catch (error) {
      toast.error('Failed to fetch exam analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3"></div>
          <p className="text-sm font-medium">Computing test psychometrics and analytics...</p>
        </div>
      </AdminLayout>
    )
  }

  if (!analytics || analytics.overview.total_students === 0) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200/80">
            <Link to="/admin/exams">
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Exams
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-900">Exam Analytics</h1>
              <p className="text-xs text-slate-500">Session ID: {examId}</p>
            </div>
          </div>
          <div className="py-12 bg-white rounded-xl border border-slate-200/80">
            <EmptyState
              icon={BarChart3}
              title="No candidate submissions yet"
              description="Analytics, chapter accuracy breakdown, and difficulty psychometrics will appear here once students submit their exam responses."
              actionLabel="Go to Exams"
              onAction={() => window.location.href = '/admin/exams'}
            />
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/admin/exams" className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Exams
              </Link>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                Session: {analytics.exam_id}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              Performance Analytics & Psychometrics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Detailed question difficulty, chapter-level mastery, and cohort score distribution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/admin/exams/${examId}/submissions`}>
              <Button variant="outline" size="sm" className="text-xs">
                <Users className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                View Candidate Submissions
              </Button>
            </Link>
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Candidates Appeared"
            value={analytics.overview.total_students}
            icon={Users}
            subtext="Total completed tests"
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Average Score"
            value={analytics.overview.average_score}
            icon={Target}
            subtext={`${analytics.overview.overall_accuracy.toFixed(1)}% cohort accuracy`}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <StatCard
            label="Highest Score"
            value={analytics.overview.highest_score}
            icon={TrendingUp}
            subtext="Cohort topper marks"
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Lowest Score"
            value={analytics.overview.lowest_score}
            icon={Award}
            subtext="Baseline cohort score"
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>

        {/* Difficulty Analysis Card */}
        <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Difficulty-Wise Performance
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cohort accuracy across Easy, Medium, and Hard tier questions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200/80">
                  <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Difficulty Level</TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Total Questions</TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Correct Responses</TableHead>
                  <TableHead className="w-[240px] text-xs font-semibold uppercase text-slate-500 tracking-wider">Accuracy Meter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(analytics.difficulty_wise).map(([difficulty, stats]) => {
                  const isEasy = difficulty.toLowerCase() === 'easy'
                  const isMed = difficulty.toLowerCase() === 'medium'
                  const barColor = isEasy ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500'
                  const badgeColor = isEasy 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : isMed 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'

                  return (
                    <TableRow key={difficulty} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                      <TableCell className="py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${badgeColor}`}>
                          {difficulty}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-xs font-semibold text-slate-800">
                        {stats.total}
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-xs font-semibold text-emerald-600">
                        {stats.correct}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${Math.min(stats.accuracy, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700 min-w-[45px]">
                            {stats.accuracy.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Chapter-Wise Analysis Card */}
        <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Chapter & Subject Mastery Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Student cohort accuracy organized by syllabus topics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200/80">
                  <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Chapter / Topic</TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Questions</TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Correct Answers</TableHead>
                  <TableHead className="w-[240px] text-xs font-semibold uppercase text-slate-500 tracking-wider">Cohort Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(analytics.chapter_wise).map(([chapter, stats]) => (
                  <TableRow key={chapter} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-900">{chapter}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-center text-xs font-semibold text-slate-800">
                      {stats.total}
                    </TableCell>
                    <TableCell className="py-3.5 text-center text-xs font-semibold text-emerald-600">
                      {stats.correct}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(stats.accuracy, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 min-w-[45px]">
                          {stats.accuracy.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default ExamAnalytics