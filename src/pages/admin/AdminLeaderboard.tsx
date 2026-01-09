import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Award, Users, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/lib/envs'

interface Exam {
  id: string
  name: string
  code: string
}

interface LeaderboardEntry {
  student_id: string
  student_name: string
  score: number
  correct_answers: number
  wrong_answers: number
  unattempted_answers: number
  submitted_at: string
  rank: number
}

const AdminLeaderboard = () => {
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExam, setSelectedExam] = useState<string>('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchExams()
  }, [])

  useEffect(() => {
    if (selectedExam) {
      fetchLeaderboard(selectedExam)
    }
  }, [selectedExam])

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, name, code')
        .order('created_at', { ascending: false })

      if (error) throw error
      setExams(data || [])
      
      if (data && data.length > 0) {
        setSelectedExam(data[0].code)
      }
    } catch (error) {
      toast.error('Failed to fetch exams')
    }
  }

  const fetchLeaderboard = async (examId: string) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired. Please login again.')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ exam_id: examId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch leaderboard')
      }

      const data = await response.json()
      
      // Combine top3 and current_user into full leaderboard
      const allEntries = [...(data.top3 || [])]
      if (data.current_user && !data.top3?.find(t => t.is_current_user)) {
        allEntries.push(data.current_user)
      }
      
      const leaderboardData = allEntries.map(entry => ({
        student_id: entry.student_id || 'unknown',
        student_name: entry.student_name || 'Unknown',
        score: entry.score || 0,
        correct_answers: entry.correct_answers || 0,
        wrong_answers: entry.wrong_answers || 0,
        unattempted_answers: entry.unattempted_answers || 0,
        submitted_at: entry.submitted_at,
        rank: entry.rank
      }))

      setLeaderboard(leaderboardData)
    } catch (error) {
      toast.error('Failed to fetch leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      return <Badge variant="default">Top {rank}</Badge>
    } else if (rank <= 10) {
      return <Badge variant="secondary">Top 10</Badge>
    } else {
      return <Badge variant="outline">#{rank}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const selectedExamData = exams.find(exam => exam.code === selectedExam)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Leaderboard</h1>
        <p className="text-muted-foreground">View exam performance rankings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Exam Leaderboard
          </CardTitle>
          <CardDescription>Select an exam to view student rankings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.code} value={exam.code}>
                    {exam.name} ({exam.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedExamData && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">
                  {leaderboard.length} students participated
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No submissions found for this exam</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Badge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow key={entry.student_id}>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.student_name}</p>
                        <p className="text-sm text-muted-foreground">ID: {entry.student_id.slice(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-lg">{entry.score}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-green-600">✓ {entry.correct_answers}</span>
                          <span className="text-red-600">✗ {entry.wrong_answers}</span>
                          <span className="text-gray-500">— {entry.unattempted_answers}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(entry.submitted_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRankBadge(entry.rank)}
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

export default AdminLeaderboard