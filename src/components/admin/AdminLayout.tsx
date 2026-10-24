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
  Settings,
  Upload
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
  { title: "Bulk Import", icon: Upload, href: "/admin/questions/import" },
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
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200/80 p-5 hidden lg:flex lg:flex-col justify-between z-40 shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
        <div>
          <Link to="/admin" className="flex items-center gap-3 px-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold overflow-hidden">
              <img 
                src="/exam-ace-logo.jpeg" 
                alt="Exam Ace Logo" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-bold text-slate-900 text-base tracking-tight">Exam Ace</h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/60">SaaS</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Institute Portal</p>
            </div>
          </Link>

          <div className="px-2 mb-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Navigation</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item, index) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={index}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-blue-50 text-blue-600 shadow-sm font-semibold border border-blue-100"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  )}
                >
                  <item.icon className={cn("w-4.5 h-4.5 transition-colors", active ? "text-blue-600" : "text-slate-400")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.email || "Admin"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] text-slate-500 font-medium">Active Admin</span>
              </div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            EA
          </div>
          <div>
            <span className="font-display font-bold text-slate-900 text-sm">Exam Ace</span>
            <span className="text-[10px] text-slate-500 block">Admin Portal</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/admin/questions/import">
            <Button size="sm" variant="outline" className="text-xs h-8">
              <Upload className="w-3.5 h-3.5 mr-1" /> Import
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-rose-600" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
};
