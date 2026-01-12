import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Users, Target, TrendingUp, Award } from 'lucide-react'
import { getExamAnalytics, ExamAnalytics as ExamAnalyticsType } from '@/lib/examAnalytics'
import { toast } from 'sonner'

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
    return <div className="p-6">Loading analytics...</div>
  }

  if (!analytics || analytics.overview.total_students === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/exams">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exams
            </Link>
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No submissions found for this exam</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/exams">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exams
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Exam Analytics</h1>
          <p className="text-muted-foreground">ID: {analytics.exam_id}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Appeared</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.total_students}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.average_score}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.overall_accuracy.toFixed(1)}% accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.highest_score}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lowest Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.lowest_score}</div>
          </CardContent>
        </Card>
      </div>

      {/* Difficulty Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Difficulty-wise Performance</CardTitle>
          <CardDescription>Accuracy breakdown by question difficulty</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Difficulty Level</TableHead>
                <TableHead>Total Questions</TableHead>
                <TableHead>Correct Answers</TableHead>
                <TableHead>Accuracy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(analytics.difficulty_wise).map(([difficulty, stats]) => (
                <TableRow key={difficulty}>
                  <TableCell className="font-medium capitalize">{difficulty}</TableCell>
                  <TableCell>{stats.total}</TableCell>
                  <TableCell>{stats.correct}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${stats.accuracy}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{stats.accuracy.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chapter Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Chapter-wise Performance</CardTitle>
          <CardDescription>Accuracy breakdown by chapter/subject</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chapter/Subject</TableHead>
                <TableHead>Total Questions</TableHead>
                <TableHead>Correct Answers</TableHead>
                <TableHead>Accuracy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(analytics.chapter_wise).map(([chapter, stats]) => (
                <TableRow key={chapter}>
                  <TableCell className="font-medium">{chapter}</TableCell>
                  <TableCell>{stats.total}</TableCell>
                  <TableCell>{stats.correct}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${stats.accuracy}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{stats.accuracy.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExamAnalytics