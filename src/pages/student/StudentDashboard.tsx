import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  User
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [examCode, setExamCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    { label: "Exams Taken", value: "0", icon: ClipboardList, color: "bg-primary/10 text-primary" },
    { label: "Avg Score", value: "0%", icon: Trophy, color: "bg-secondary/10 text-secondary" },
    { label: "Best Rank", value: "-", icon: Trophy, color: "bg-success/10 text-success" },
    { label: "Pending", value: "0", icon: Clock, color: "bg-warning/10 text-warning" },
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

          <div className="grid lg:grid-cols-2 gap-6">
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
              </CardContent>
            </Card>

            {/* Recent Results Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <CardTitle>Recent Results</CardTitle>
                <CardDescription>
                  Your latest exam results and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No exams taken yet</p>
                  <p className="text-sm">Join an exam to see your results here</p>
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
