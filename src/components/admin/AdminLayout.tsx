import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  BookOpen, 
  FileQuestion, 
  ClipboardList, 
  Users, 
  Trophy,
  LogOut,
  LayoutDashboard,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { title: "Classes & Subjects", icon: GraduationCap, href: "/admin/classes" },
  { title: "Question Bank", icon: FileQuestion, href: "/admin/questions" },
  { title: "Exams", icon: ClipboardList, href: "/admin/exams" },
  { title: "Submissions", icon: Users, href: "/admin/submissions" },
  { title: "Leaderboard", icon: Trophy, href: "/admin/leaderboard" },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!roleData || roleData.role !== 'admin') {
        toast.error("Access denied. Admin only.");
        navigate('/student');
        return;
      }

      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate('/auth');
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border p-6 hidden lg:block z-50">
        <Link to="/admin" className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
            <img 
              src="/exam-ace-logo.jpeg" 
              alt="Exam Ace Logo" 
              className=" rounded-lg" 
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-foreground">Exam Ace</h1>
            <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
          </div>
        </Link>

        <nav className="space-y-1">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.title}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">ExamPro</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
