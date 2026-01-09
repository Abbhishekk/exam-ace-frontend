import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  const menuItems = [
    {
      title: "Dashboard",
      description: "Overview and statistics",
      icon: BarChart3,
      href: "/admin",
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Manage Classes",
      description: "Add, edit, or remove classes (11, 12)",
      icon: GraduationCap,
      href: "/admin/classes",
      color: "bg-secondary/10 text-secondary"
    },
    {
      title: "Manage Subjects",
      description: "Organize subjects by class",
      icon: BookOpen,
      href: "/admin/subjects",
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Manage Chapters",
      description: "Organize chapters by subject",
      icon: FolderOpen,
      href: "/admin/chapters",
      color: "bg-purple-100 text-purple-600"
    },
    {
      title: "Manage Topics",
      description: "Organize topics by chapter",
      icon: Hash,
      href: "/admin/topics",
      color: "bg-green-100 text-green-600"
    },
    {
      title: "Question Bank",
      description: "Add and manage MCQ questions",
      icon: FileQuestion,
      href: "/admin/questions",
      color: "bg-success/10 text-success"
    },
    {
      title: "Manage Exams",
      description: "View and manage all exams",
      icon: Settings,
      href: "/admin/exams",
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      title: "Create Exam",
      description: "Create new exams with question selection",
      icon: Plus,
      href: "/admin/exams/create",
      color: "bg-warning/10 text-warning"
    },
    {
      title: "Rule-Based Exam",
      description: "Auto-generate exams using rules",
      icon: Wand2,
      href: "/admin/exams/rule-based",
      color: "bg-orange-100 text-orange-600"
    },
    {
      title: "Leaderboards",
      description: "View top performers across exams",
      icon: Trophy,
      href: "/admin/leaderboard",
      color: "bg-destructive/10 text-destructive"
    }
  ];

  const stats = [
    { label: "Total Students", value: "0", icon: Users },
    { label: "Total Exams", value: "0", icon: ClipboardList },
    { label: "Questions", value: "0", icon: FileQuestion },
    { label: "Avg Score", value: "0%", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border p-6 hidden lg:block">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-foreground">ExamPro</h1>
            <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item, index) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={index}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-foreground font-medium' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Welcome back, Admin
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your exams and students from here
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/exams/create">
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Exam
                </Button>
              </Link>
              <Link to="/admin/exams/rule-based">
                <Button variant="outline">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Rule-Based
                </Button>
              </Link>
              <Button variant="outline" className="lg:hidden" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
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

          {/* Quick Actions */}
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item, index) => (
              <Link key={index} to={item.href}>
                <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
