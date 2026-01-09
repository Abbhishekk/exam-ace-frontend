import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Trophy, Medal, Award, Crown, Loader2, Search } from 'lucide-react'
import { API_BASE_URL } from '@/lib/envs'

interface LeaderboardEntry {
  rank: number
  student_name: string
  score: number
  correct_answers: number
}

interface LeaderboardData {
  top3: LeaderboardEntry[]
  student_rank: LeaderboardEntry | null
  total_participants: number
}

const Leaderboard = () => {
  const [examId, setExamId] = useState('')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchLeaderboard = async () => {
    if (!examId.trim()) {
      toast.error('Please enter an exam ID')
      return
    }

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
        body: JSON.stringify({ exam_id: examId.trim() })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch leaderboard')
      }

      const data = await response.json()
      
      // Transform data to match expected format
      const transformedData = {
        top3: data.top3 || [],
        student_rank: data.current_user,
        total_participants: (data.top3?.length || 0) + (data.current_user && !data.top3?.find(t => t.is_current_user) ? 1 : 0)
      }
      
      setLeaderboardData(transformedData)
    } catch (error) {
      toast.error('Failed to fetch leaderboard: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />
      case 2: return <Medal className="w-6 h-6 text-gray-400" />
      case 3: return <Award className="w-6 h-6 text-amber-600" />
      default: return <Trophy className="w-6 h-6 text-muted-foreground" />
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
      case 3: return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white'
      default: return 'bg-muted'
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Exam Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter exam ID"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={fetchLeaderboard} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                View Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {leaderboardData && (
          <>
            {/* Top 3 Podium */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>🏆 Top 3 Performers</CardTitle>
                <p className="text-muted-foreground">
                  Total Participants: {leaderboardData.total_participants}
                </p>
              </CardHeader>
              <CardContent>
                {leaderboardData.top3.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No submissions found for this exam
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {leaderboardData.top3.map((entry) => (
                      <Card key={entry.rank} className={`${getRankColor(entry.rank)} border-0`}>
                        <CardContent className="pt-6 text-center">
                          <div className="flex justify-center mb-3">
                            {getRankIcon(entry.rank)}
                          </div>
                          <div className="text-2xl font-bold mb-1">#{entry.rank}</div>
                          <div className="font-semibold mb-2">{entry.student_name}</div>
                          <div className="text-sm opacity-90">
                            {entry.score} points • {entry.correct_answers} correct
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student's Rank */}
            {leaderboardData.student_rank && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Your Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                        {getRankIcon(leaderboardData.student_rank.rank)}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">
                          {leaderboardData.student_rank.student_name}
                        </div>
                        <div className="text-muted-foreground">
                          Rank #{leaderboardData.student_rank.rank} out of {leaderboardData.total_participants}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {leaderboardData.student_rank.score}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {leaderboardData.student_rank.correct_answers} correct answers
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Insights */}
            {leaderboardData.student_rank && leaderboardData.top3.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {leaderboardData.student_rank.rank <= 3 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        🎉 Congratulations! You're in the top 3 performers!
                      </div>
                    )}
                    
                    {leaderboardData.student_rank.rank > 3 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        📈 You scored {leaderboardData.student_rank.score} points. 
                        The top scorer has {leaderboardData.top3[0]?.score || 0} points.
                      </div>
                    )}

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      📊 You answered {leaderboardData.student_rank.correct_answers} questions correctly.
                      {leaderboardData.top3[0] && (
                        <> The top performer answered {leaderboardData.top3[0].correct_answers} correctly.</>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Leaderboard