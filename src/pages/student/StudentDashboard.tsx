/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  ClipboardList,
  Trophy,
  LogOut,
  Clock,
  Play,
  User,
  BarChart3,
  Search,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/envs";
import { StatCard } from "@/components/common/StatCard";

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

  const handleJoinExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode.trim()) {
      toast.error("Please enter an exam code");
      return;
    }
    navigate(`/student/join?code=${encodeURIComponent(examCode.trim())}`);
  };

  const studentName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Student";

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link to="/student" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            EA
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-slate-900 text-base tracking-tight">Exam Ace</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/60">Candidate</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Student Test Portal</p>
          </div>
        </Link>

        {/* Center / Right Links */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/student/join">
            <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-blue-600">
              <Play className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Join Exam
            </Button>
          </Link>
          <Link to="/student/results">
            <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-blue-600">
              <BarChart3 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              My Results
            </Button>
          </Link>
          <Link to="/student/leaderboard">
            <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-blue-600">
              <Trophy className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Leaderboard
            </Button>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" /> NTA / JEE CBT Engine Ready
            </div>
            <h1 className="text-2xl sm:text-3xl text-white font-display font-bold tracking-tight">
              Welcome back, {studentName}!
            </h1>
            <p className="text-sm text-blue-100 font-light">
              Enter your instructor's test code to begin an assessment, or review your past scorecard analytics.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        </div>

        {/* 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tests Completed"
            value={loading ? "..." : analytics?.total_exams_completed?.toString() || "0"}
            icon={ClipboardList}
            subtext="Evaluated attempts"
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Average Score"
            value={loading ? "..." : analytics?.average_score ? `${analytics.average_score}` : "0"}
            icon={BarChart3}
            subtext="Across completed exams"
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <StatCard
            label="Best Institute Rank"
            value={loading ? "..." : analytics?.best_rank ? `#${analytics.best_rank}` : "-"}
            icon={Trophy}
            subtext="Highest rank achieved"
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Overall Accuracy"
            value={loading ? "..." : analytics?.overall_accuracy ? `${analytics.overall_accuracy}%` : "0%"}
            icon={Award}
            subtext="Correct answer ratio"
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
        </div>

        {/* 3 Core Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Join Exam Card */}
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Play className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Join an Examination
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Type the test session code given by your coaching institute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleJoinExam} className="space-y-3">
                <div className="space-y-1.5">
                  <Input
                    placeholder="Enter Exam Code (e.g. JEE-2026)"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                    className="h-10 font-mono uppercase text-sm bg-slate-50 border-slate-200"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                  Launch Test Session <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </form>

              <Link to="/student/join" className="block text-center pt-2">
                <span className="text-xs text-slate-500 hover:text-blue-600 font-medium">
                  Browse Active Public Exams →
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Past Performance / Results Card */}
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Performance Analytics
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Review your recent test answer sheets and mistakes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading performance summary...</div>
              ) : analytics?.total_exams_completed === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No completed exams recorded yet.
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Highest Score:</span>
                    <span className="font-bold text-slate-900">{analytics?.highest_score} Marks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Average Accuracy:</span>
                    <span className="font-bold text-emerald-600">{analytics?.overall_accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Attempts:</span>
                    <span className="font-bold text-slate-900">{analytics?.total_exams_attempted} Tests</span>
                  </div>
                </div>
              )}

              <Link to="/student/results">
                <Button variant="outline" className="w-full text-xs text-slate-700">
                  View Detailed Scorecards
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Institute Leaderboard Card */}
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Batch Leaderboard
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Compare your rank and percentile against peers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200/60 text-center space-y-1">
                <p className="text-xs text-amber-800 font-medium">Your Top Standing</p>
                <p className="text-2xl font-display font-bold text-amber-900">
                  {analytics?.best_rank ? `#${analytics.best_rank}` : "Pending"}
                </p>
                <p className="text-[11px] text-amber-700">Institute Batch Percentile</p>
              </div>

              <Link to="/student/leaderboard">
                <Button variant="outline" className="w-full text-xs text-slate-700">
                  View Institute Rankings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
