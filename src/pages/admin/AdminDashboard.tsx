import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  GraduationCap,
  BookOpen,
  FileQuestion,
  ClipboardList,
  Users,
  Trophy,
  LogOut,
  Plus,
  BarChart3,
  FolderOpen,
  Hash,
  Settings,
  Eye,
  Wand2,
  Upload,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight,
  Calendar,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface RecentExam {
  id: string;
  name: string;
  code: string;
  start_time: string;
  duration_minutes: number;
  total_questions: number;
  is_published: boolean;
  created_at: string;
}

interface RecentAttempt {
  id: string;
  score: number | null;
  submitted_at: string | null;
  exams: {
    name: string;
    code: string;
  } | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [statsValue, setStatsValue] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalExams: 0,
    averageScore: 0
  });

  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate('/auth');
  };

  const isActiveRoute = (href: string) => {
    if (href === '/admin' && location.pathname === '/admin') return true;
    if (href !== '/admin' && location.pathname.startsWith(href)) return true;
    return false;
  };

  const navMenuItems = [
    { title: "Dashboard", icon: BarChart3, href: "/admin" },
    { title: "Question Bank", icon: FileQuestion, href: "/admin/questions" },
    { title: "Bulk Import", icon: Upload, href: "/admin/questions/import" },
    { title: "Classes & Subjects", icon: GraduationCap, href: "/admin/classes" },
    { title: "Chapters & Topics", icon: FolderOpen, href: "/admin/chapters" },
    { title: "Manage Exams", icon: ClipboardList, href: "/admin/exams" },
    { title: "Create Exam", icon: Plus, href: "/admin/exams/create" },
    { title: "Multi-Subject Exam", icon: Wand2, href: "/admin/exams/multi-subject" },
    { title: "Leaderboard", icon: Trophy, href: "/admin/leaderboard" },
  ];

  const quickActionCards = [
    {
      title: "Create Multi-Subject Exam",
      description: "Auto-generate multi-subject exam papers with balanced topic distributions.",
      icon: Wand2,
      href: "/admin/exams/multi-subject",
      badge: "Popular",
      badgeColor: "bg-blue-50 text-primary border-blue-200"
    },
    {
      title: "Bulk Question Import",
      description: "Import hundreds of questions via Excel or CSV with automated column mapping.",
      icon: Upload,
      href: "/admin/questions/import",
      badge: "New",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    {
      title: "Question Bank",
      description: "Browse, filter, and edit 5,800+ categorized questions with LaTeX math rendering.",
      icon: FileQuestion,
      href: "/admin/questions",
      badge: "5,800+ Questions",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200"
    },
    {
      title: "Create Standard Exam",
      description: "Build custom mock exams by hand-picking questions from specific chapters.",
      icon: Plus,
      href: "/admin/exams/create",
      badge: "Manual Pick",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200"
    },
    {
      title: "Exam Submissions & Analytics",
      description: "Review student response sheets, tab infractions, and overall score rankings.",
      icon: BarChart3,
      href: "/admin/exams",
      badge: "Reporting",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200"
    },
    {
      title: "Student Leaderboards",
      description: "Compare student percentiles and performance benchmarks across institutes.",
      icon: Trophy,
      href: "/admin/leaderboard",
      badge: "Rankings",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200"
    }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        studentsRes,
        questionsRes,
        examsRes,
        attemptsRes,
        recentExamsRes,
        recentAttemptsRes
      ] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("exams").select("*", { count: "exact", head: true }),
        supabase.from("student_exam_attempts").select("score"),
        supabase
          .from("exams")
          .select("id, name, code, start_time, duration_minutes, total_questions, is_published, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("student_exam_attempts")
          .select("id, score, submitted_at, exams(name, code)")
          .not("submitted_at", "is", null)
          .order("submitted_at", { ascending: false })
          .limit(5)
      ]);

      const scores = attemptsRes.data ?? [];
      const averageScore = scores.length > 0
        ? scores.reduce((sum, item) => sum + (item.score ?? 0), 0) / scores.length
        : 0;

      setStatsValue({
        totalStudents: studentsRes.count ?? 0,
        totalQuestions: questionsRes.count ?? 0,
        totalExams: examsRes.count ?? 0,
        averageScore: Number(averageScore.toFixed(1))
      });

      setRecentExams((recentExamsRes.data as RecentExam[]) || []);
      setRecentAttempts((recentAttemptsRes.data as RecentAttempt[]) || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Sidebar - Clean Light Modern SaaS */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 p-6 hidden lg:flex lg:flex-col justify-between z-40">
        <div>
          {/* Logo & Brand */}
          <Link to="/admin" className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-base shadow-sm">
              EA
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-tight">Exam Ace</h1>
              <p className="text-[11px] text-slate-400 font-medium">Admin Workspace</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navMenuItems.map((item, index) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={index}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <p className="text-xs font-semibold text-slate-800">Institute Administrator</p>
            <p className="text-[11px] text-slate-500">NTA / JEE Conduction Active</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Top Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Admin Control Center
                </h1>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  System Live
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Oversee student batches, configure exams, and monitor real-time examination results.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link to="/admin/questions/import">
                <Button variant="outline" size="sm" className="h-9 text-xs">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Bulk Import
                </Button>
              </Link>
              <Link to="/admin/exams/create">
                <Button size="sm" className="h-9 text-xs bg-primary hover:bg-primary/95 text-white shadow-sm font-semibold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Exam
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="lg:hidden h-9" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Metric KPIs Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Enrolled Students"
              value={statsValue.totalStudents}
              icon={Users}
              subtext="Active in batches"
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatCard
              label="Conducted Exams"
              value={statsValue.totalExams}
              icon={ClipboardList}
              subtext="Published & draft tests"
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
            />
            <StatCard
              label="Question Bank"
              value={statsValue.totalQuestions}
              icon={FileQuestion}
              subtext="Categorized by topic"
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Average Score"
              value={statsValue.averageScore}
              icon={BarChart3}
              subtext="Out of 300 marks"
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
          </div>

          {/* Main 2-Col Layout: Quick Actions + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left 2 Cols: Quick Actions & Recent Exams */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Actions Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Examination Workflows</h2>
                  <span className="text-xs text-slate-500">Pick a creation mode or manage bank</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {quickActionCards.map((card, idx) => (
                    <Link key={idx} to={card.href}>
                      <Card className="h-full border border-slate-200/90 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-primary/10 text-slate-700 group-hover:text-primary transition-colors flex items-center justify-center">
                              <card.icon className="w-4 h-4" />
                            </div>
                            <Badge variant="outline" className={`text-[10px] font-medium ${card.badgeColor}`}>
                              {card.badge}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                              {card.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {card.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Exams Activity Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Recent Exam Series</h2>
                  <Link to="/admin/exams" className="text-xs text-primary font-semibold hover:underline flex items-center">
                    View All Exams <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </div>

                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading exams...</div>
                  ) : recentExams.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No exams created yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {recentExams.map(exam => (
                        <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{exam.name}</span>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                Code: {exam.code}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                              <span>{exam.total_questions || 0} Questions</span>
                              <span>•</span>
                              <span>{exam.duration_minutes} Mins</span>
                              <span>•</span>
                              <span>{new Date(exam.start_time).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusBadge status={exam.is_published ? "published" : "draft"} />
                            <Link to={`/admin/exams/${exam.id}/submissions`}>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-600 hover:text-slate-900">
                                Results
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Right Column (1/3 Width): Recent Submissions & System State */}
            <div className="space-y-6">
              {/* Recent Student Submissions */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Latest Submissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time student attempt activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {recentAttempts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No recent submissions recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {recentAttempts.map(attempt => (
                        <div key={attempt.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800">{attempt.exams?.name || "Mock Exam"}</p>
                            <p className="text-[10px] text-slate-400">
                              {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "In progress"}
                            </p>
                          </div>
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Score: {attempt.score ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Syllabus Classification Card */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Syllabus Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-medium">Standard Classes</span>
                    <Link to="/admin/classes" className="text-primary font-semibold hover:underline">Manage Classes</Link>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-medium">Subjects & Chapters</span>
                    <Link to="/admin/subjects" className="text-primary font-semibold hover:underline">Manage Subjects</Link>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-medium">Topics & Subtopics</span>
                    <Link to="/admin/topics" className="text-primary font-semibold hover:underline">Manage Topics</Link>
                  </div>
                </CardContent>
              </Card>

              {/* NTA Compliance Badge Card */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-primary" />
                  NTA Examination Engine Active
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  All exams apply real-time countdown, anti-tampering full-screen monitoring, and instant rank calculation with unattempted logic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
