import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Eye, 
  FileText, 
  BarChart3, 
  Calendar, 
  Clock, 
  Users, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Layers, 
  Sparkles,
  ClipboardList
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { generateQuestionPaper } from '@/lib/generateQuestionPaper'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { EmptyState } from '@/components/common/EmptyState'
import { StatCard } from '@/components/common/StatCard'

interface Exam {
  id: string
  name: string
  code: string
  start_time: string
  duration_minutes: number
  total_questions: number
  marks_per_question: number
  negative_marks: number
  created_at: string
}

const ManageExams = () => {
  const navigate = useNavigate()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming'>('all')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({})
  const [resultLoading, setResultLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setExams(data || [])
    } catch (error) {
      toast.error('Failed to fetch exams')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Exam code "${code}" copied to clipboard`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleGeneratePDF = async (examId: string) => {
    setPdfLoading(prev => ({ ...prev, [examId]: true }))
    try {
      await generateQuestionPaper(examId)
    } catch (error) {
      toast.error('Failed to generate Question paper PDF')
    } finally {
      setPdfLoading(prev => ({ ...prev, [examId]: false }))
    }
  }

  const handleGenerateResultsPDF = async (examId: string) => {
    setResultLoading(prev => ({ ...prev, [examId]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/generate-exam-results-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ exam_id: examId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate results PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exam-results-${examId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Results PDF generated successfully')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate results PDF'
      )
    } finally {
      setResultLoading(prev => ({ ...prev, [examId]: false }))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const isExamUpcoming = (startTime: string) => {
    return new Date() < new Date(startTime)
  }

  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'upcoming') {
      return isExamUpcoming(exam.start_time)
    }
    if (statusFilter === 'active') {
      return !isExamUpcoming(exam.start_time)
    }
    return true
  })

  const upcomingCount = exams.filter(e => isExamUpcoming(e.start_time)).length
  const activeCount = exams.length - upcomingCount

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                Examination Conduction
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {exams.length} Total Sessions
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              Manage Exams
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, configure, monitor live submissions and export printable question papers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/admin/exams/rule-based">
              <Button variant="outline" size="sm" className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Rule-Based Setup
              </Button>
            </Link>
            <Link to="/admin/exams/multi-subject">
              <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Multi-Subject Exam
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Exam Sessions"
            value={exams.length}
            icon={ClipboardList}
            subtext="Configured in institute"
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Active / Concluded"
            value={activeCount}
            icon={Users}
            subtext="Open or finished test papers"
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Upcoming Scheduled"
            value={upcomingCount}
            icon={Clock}
            subtext="Awaiting start schedule"
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by exam title or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({exams.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'upcoming'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
          </div>
        </div>

        {/* Exams Table Card */}
        <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">
              Exam Directory
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredExams.length} sessions
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3"></div>
                <p className="text-xs font-medium">Loading exams...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={ClipboardList}
                  title="No exam sessions found"
                  description={searchQuery ? "No exams matched your search criteria." : "Create your first examination to begin conducting tests."}
                  actionLabel="Create Multi-Subject Exam"
                  onAction={() => navigate('/admin/exams/multi-subject')}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200/80">
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Exam Title & Access Code</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Schedule & Window</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Question Structure</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExams.map((exam) => {
                      const upcoming = isExamUpcoming(exam.start_time)
                      return (
                        <TableRow key={exam.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                          <TableCell className="py-3.5">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900">{exam.name}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {exam.code}
                                </span>
                                <button
                                  onClick={() => handleCopyCode(exam.code)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors"
                                  title="Copy Exam Code"
                                >
                                  {copiedCode === exam.code ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDate(exam.start_time)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{exam.duration_minutes} Minutes Duration</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="space-y-1 text-xs">
                              <p className="font-semibold text-slate-800">{exam.total_questions} Questions</p>
                              <p className="text-slate-500">
                                <span className="text-emerald-600 font-medium">+{exam.marks_per_question}</span>
                                <span className="text-slate-400"> / </span>
                                <span className="text-rose-500 font-medium">-{exam.negative_marks}</span>
                                <span className="text-slate-400 ml-1">marks/q</span>
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              upcoming 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${upcoming ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                              {upcoming ? 'Upcoming' : 'Active'}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/exams/${exam.id}/submissions`)}
                                className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Submissions
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/exams/${exam.id}/analytics`)}
                                className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                              >
                                <BarChart3 className="w-3.5 h-3.5 mr-1" />
                                Analytics
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGeneratePDF(exam.id)}
                                disabled={pdfLoading[exam.id]}
                                className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
                                title="Download Question Paper PDF"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                {pdfLoading[exam.id] ? "Paper..." : "Paper"}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateResultsPDF(exam.id)}
                                disabled={resultLoading[exam.id]}
                                className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
                                title="Download Results PDF"
                              >
                                <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                {resultLoading[exam.id] ? "Results..." : "Results"}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/exams/multi-subject?cloneExamId=${exam.id}`)}
                                className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Clone exam blueprint"
                              >
                                <Copy className="w-3.5 h-3.5 mr-1" />
                                Clone
                              </Button>
                            </div>
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
      </div>
    </AdminLayout>
  )
}

export default ManageExams