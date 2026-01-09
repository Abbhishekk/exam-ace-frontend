import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { ArrowLeft, Users, Loader2, FileText } from 'lucide-react'
import { API_BASE_URL } from '@/lib/envs'

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
  name: string
  code: string
  total_questions: number
}

const AdminExamSubmissions = () => {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([])
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAuthAndFetchData()
  }, [examId, navigate])

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/auth')
        return
      }

      // Check if user is admin
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

      setUser(session.user)

      if (!examId) {
        toast.error('Invalid exam ID')
        navigate('/admin')
        return
      }

      await fetchData()
    } catch (error) {
      toast.error('Authentication error: ' + error.message)
      navigate('/auth')
    }
  }

  const fetchData = async () => {
    try {
      // Fetch exam info
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('name, code, total_questions')
        .eq('id', examId)
        .single()

      if (examError) throw examError
      setExamInfo(exam)

      // Use Node.js backend API for submissions
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${API_BASE_URL}/api/admin/exam-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ exam_id: examId })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch submissions')
      }

      const data = await response.json()
      
      // Transform backend response to match frontend interface
      const transformedSubmissions = data.submissions.map((submission: any) => ({
        id: submission.student_id, // Use student_id as id for key
        student_id: submission.student_id,
        score: submission.score,
        correct_answers: submission.correct_answers,
        wrong_answers: submission.wrong_answers,
        unattempted_answers: submission.unattempted_answers,
        submitted_at: submission.submitted_at,
        profiles: {
          full_name: submission.student_name
        }
      }))

      setSubmissions(transformedSubmissions)
    } catch (error: any) {
      toast.error('Failed to fetch data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculatePercentage = (correct: number, total: number) => {
    return total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Exam Submissions</h1>
            {examInfo && (
              <p className="text-muted-foreground">
                {examInfo.name} ({examInfo.code}) • {submissions.length} submissions
              </p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {examInfo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{submissions.length}</p>
                    <p className="text-sm text-muted-foreground">Total Submissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {submissions.length > 0 
                        ? (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1)
                        : '0'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">%</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {submissions.length > 0 
                        ? (submissions.reduce((sum, s) => sum + (s.correct_answers / examInfo.total_questions * 100), 0) / submissions.length).toFixed(1)
                        : '0'
                      }%
                    </p>
                    <p className="text-sm text-muted-foreground">Average Accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold">Q</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{examInfo.total_questions}</p>
                    <p className="text-sm text-muted-foreground">Total Questions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
                <p>No students have submitted this exam yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Wrong</TableHead>
                      <TableHead>Unattempted</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.profiles.full_name}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary">
                            {submission.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">
                            {submission.correct_answers}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">
                            {submission.wrong_answers}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600">
                            {submission.unattempted_answers}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {calculatePercentage(submission.correct_answers, examInfo?.total_questions || 0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(submission.submitted_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminExamSubmissions