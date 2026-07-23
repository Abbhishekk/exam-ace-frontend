import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Eye, FileText, BarChart3, Calendar, Clock, Users, Download, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { generateQuestionPaper } from '@/lib/generateQuestionPaper'
import { SelectGroup } from '@radix-ui/react-select'

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
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [resultLoading, setresultLoading] = useState<Record<string, boolean>>({});


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

  const handleGeneratePDF = async (examId: string) => {
    setPdfLoading(prev => ({
      ...prev,
      [examId]: true,
    }));

    try {
      await generateQuestionPaper(examId);
    } catch (error) {
      toast.error('Failed to generate Question paper PDF')
    } finally {
      setPdfLoading(prev => ({
        ...prev,
        [examId]: false,
      }));
    }
  };

  const handleGenerateResultsPDF = async (examId: string) => {
    setresultLoading(prev => ({
      ...prev,
      [examId]: true,
    }));

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate results PDF');
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
      );
    } finally {
      setresultLoading(prev => ({
        ...prev,
        [examId]: false,
      }));
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getExamStatus = (startTime: string) => {
    const now = new Date()
    const start = new Date(startTime)

    if (now < start) {
      return <Badge variant="outline">Upcoming</Badge>
    } else {
      return <Badge variant="default">Active</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-lg font-medium text-gray-600 animate-pulse">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin">
            <Button variant="outline" className='mb-5' size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Manage Exams</h1>
          <p className="text-muted-foreground">Create and manage examination sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/admin/exams/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Exam
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/exams/rule-based">
              <Plus className="w-4 h-4 mr-2" />
              Rule-Based Creation
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>Manage your examination sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No exams created yet</p>
              <Button asChild>
                <Link to="/admin/exams/create">Create Your First Exam</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Details</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exam.name}</p>
                        <p className="text-sm text-muted-foreground">Code: {exam.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        {formatDate(exam.start_time)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {exam.duration_minutes} minutes
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{exam.total_questions} questions</p>
                        <p className="text-muted-foreground">
                          +{exam.marks_per_question} / -{exam.negative_marks} marks
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getExamStatus(exam.start_time)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/exams/${exam.id}/submissions`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Submissions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePDF(exam.id)}
                          disabled={pdfLoading[exam.id]}

                        >
                          <FileText className="w-4 h-4 mr-1" />

                          {pdfLoading[exam.id] ? <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div> : "PDF"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateResultsPDF(exam.id)}
                          disabled={resultLoading[exam.id]}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {resultLoading[exam.id] ? <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div> : "Results"}

                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/exams/${exam.id}/analytics`)}
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Analytics
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ManageExams