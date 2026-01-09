/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  GraduationCap, 
  ClipboardList, 
  Trophy,
  LogOut,
  Clock,
  CheckCircle2,
  Play,
  User,
  BarChart3,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "@/lib/envs";

interface DashboardAnalytics {
  total_exams_attempted: number;
  total_exams_completed: number;
  average_score: number;
  highest_score: number;
  overall_accuracy: number;
  best_rank?: number;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [examCode, setExamCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);
      await fetchDashboardAnalytics(session.access_token);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        await fetchDashboardAnalytics(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDashboardAnalytics = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/student/dashboard-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate('/auth');
  };

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode.trim()) {
      toast.error("Please enter an exam code");
      return;
    }
    
    setIsJoining(true);
    // TODO: Validate exam code and redirect to exam
    toast.info("Exam joining will be available once exams are created");
    setIsJoining(false);
  };

  const stats = [
    { 
      label: "Exams Taken", 
      value: loading ? "..." : analytics?.total_exams_completed?.toString() || "0", 
      icon: ClipboardList, 
      color: "bg-primary/10 text-primary" 
    },
    { 
      label: "Avg Score", 
      value: loading ? "..." : analytics?.average_score ? `${analytics.average_score}` : "0", 
      icon: BarChart3, 
      color: "bg-secondary/10 text-secondary" 
    },
    { 
      label: "Best Rank", 
      value: loading ? "..." : analytics?.best_rank ? `#${analytics.best_rank}` : "-", 
      icon: Trophy, 
      color: "bg-success/10 text-success" 
    },
    { 
      label: "Pending", 
      value: loading ? "..." : analytics ? (analytics.total_exams_attempted - analytics.total_exams_completed).toString() : "0", 
      icon: Clock, 
      color: "bg-warning/10 text-warning" 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground">ExamPro</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/student/join">
              <Button variant="ghost" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Join Exam
              </Button>
            </Link>
            <Link to="/student/results">
              <Button variant="ghost" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                My Results
              </Button>
            </Link>
            <Link to="/student/leaderboard">
              <Button variant="ghost" size="sm">
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
            <Link to="/student/profile">
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Welcome back, {user?.user_metadata?.full_name || "Student"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Ready to take your next exam?
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Join Exam Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-2">
                  <Play className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle>Join an Exam</CardTitle>
                <CardDescription>
                  Enter the exam code provided by your instructor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinExam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="exam-code">Exam Code</Label>
                    <Input
                      id="exam-code"
                      type="text"
                      placeholder="Enter exam code (e.g., JEE-2024-001)"
                      value={examCode}
                      onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={isJoining}>
                    {isJoining ? "Joining..." : "Join Exam"}
                  </Button>
                </form>
                <div className="mt-4">
                  <Link to="/student/join">
                    <Button variant="outline" className="w-full">
                      <Search className="w-4 h-4 mr-2" />
                      Browse Available Exams
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* My Results Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-success" />
                </div>
                <CardTitle>My Results</CardTitle>
                <CardDescription>
                  Your latest exam results and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading results...</p>
                  </div>
                ) : analytics?.total_exams_completed === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No exams taken yet</p>
                    <p className="text-sm">Join an exam to see your results here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Highest Score:</span>
                      <span className="font-semibold">{analytics?.highest_score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Accuracy:</span>
                      <span className="font-semibold">{analytics?.overall_accuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completed:</span>
                      <span className="font-semibold">{analytics?.total_exams_completed}</span>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Link to="/student/results">
                    <Button variant="outline" className="w-full">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View All Results
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-2">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>
                  See how you rank against other students
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading rankings...</p>
                  </div>
                ) : analytics?.total_exams_completed === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No rankings yet</p>
                    <p className="text-sm">Complete exams to see your ranking</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {analytics?.best_rank ? `#${analytics.best_rank}` : 'N/A'}
                      </div>
                      <p className="text-sm text-muted-foreground">Best Rank</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Score:</span>
                      <span className="font-semibold">{analytics?.average_score}%</span>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Link to="/student/leaderboard">
                    <Button variant="outline" className="w-full">
                      <Trophy className="w-4 h-4 mr-2" />
                      View Leaderboards
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Exams */}
          <Card className="border-0 shadow-lg mt-6">
            <CardHeader>
              <CardTitle>Upcoming Exams</CardTitle>
              <CardDescription>
                Exams scheduled for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming exams</p>
                <p className="text-sm">Check back later or join using an exam code</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
