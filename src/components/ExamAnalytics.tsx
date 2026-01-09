import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, TrendingUp, Award, Target, BookOpen, BarChart3 } from 'lucide-react'
import { getExamAnalytics, type ExamAnalytics } from '@/lib/examAnalytics'

interface ExamAnalyticsProps {
  examId: string
}

export const ExamAnalyticsComponent = ({ examId }: ExamAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const data = await getExamAnalytics(examId)
        setAnalytics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [examId])

  if (loading) {
    return <div className="p-6">Loading analytics...</div>
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>
  }

  if (!analytics) {
    return <div className="p-6">No analytics data available</div>
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'hard': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Exam Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {analytics.exam_details.name} Analytics
          </CardTitle>
          <CardDescription>
            Code: {analytics.exam_details.code} | Total Questions: {analytics.exam_details.total_questions}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Students Appeared</p>
                <p className="text-2xl font-bold">{analytics.overall_metrics.total_students_appeared}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{analytics.overall_metrics.average_score}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Highest Score</p>
                <p className="text-2xl font-bold">{analytics.overall_metrics.highest_score}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Lowest Score</p>
                <p className="text-2xl font-bold">{analytics.overall_metrics.lowest_score}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                <p className="text-2xl font-bold">{analytics.overall_metrics.accuracy_percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Difficulty Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Difficulty-wise Performance</CardTitle>
          <CardDescription>Performance breakdown by question difficulty</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.difficulty_analysis.map((item) => (
              <div key={item.difficulty} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getDifficultyColor(item.difficulty)} text-white`}>
                      {item.difficulty.toUpperCase()}
                    </Badge>
                    <span className="text-sm">
                      {item.correct_answers}/{item.total_questions} correct
                    </span>
                  </div>
                  <span className="font-semibold">{item.accuracy.toFixed(1)}%</span>
                </div>
                <Progress value={item.accuracy} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chapter Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Chapter-wise Performance
          </CardTitle>
          <CardDescription>Performance breakdown by chapter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.chapter_analysis.map((item) => (
              <div key={item.chapter_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.chapter_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.correct_answers}/{item.total_questions} correct
                    </p>
                  </div>
                  <span className="font-semibold">{item.accuracy.toFixed(1)}%</span>
                </div>
                <Progress value={item.accuracy} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}