import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  MoreVertical,
  Eye,
  Play,
  CheckCircle2,
  FileQuestion
} from "lucide-react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Exam {
  id: string;
  name: string;
  code: string;
  exam_date: string;
  start_time: string;
  duration_minutes: number;
  is_published: boolean;
  results_published: boolean;
  created_at: string;
}

const ExamsList = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('exam_date', { ascending: false });

    if (data) setExams(data);
    setIsLoading(false);
  };

  const togglePublish = async (exam: Exam) => {
    const { error } = await supabase
      .from('exams')
      .update({ is_published: !exam.is_published })
      .eq('id', exam.id);

    if (error) {
      toast.error("Failed to update exam");
    } else {
      toast.success(exam.is_published ? "Exam unpublished" : "Exam published");
      fetchExams();
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const examDateTime = new Date(`${exam.exam_date}T${exam.start_time}`);
    const endTime = new Date(examDateTime.getTime() + exam.duration_minutes * 60000);

    if (!exam.is_published) return { label: "Draft", color: "bg-muted text-muted-foreground" };
    if (now < examDateTime) return { label: "Scheduled", color: "bg-primary/10 text-primary" };
    if (now >= examDateTime && now <= endTime) return { label: "Live", color: "bg-success/10 text-success" };
    if (exam.results_published) return { label: "Completed", color: "bg-secondary/10 text-secondary" };
    return { label: "Ended", color: "bg-warning/10 text-warning" };
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Exams</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your exams
            </p>
          </div>
          <Link to="/admin/exams/create">
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Create Exam
            </Button>
          </Link>
        </div>

        {exams.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <FileQuestion className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No exams yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first exam to get started
              </p>
              <Link to="/admin/exams/create">
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Exam
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => {
              const status = getExamStatus(exam);
              return (
                <Card key={exam.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{exam.name}</h3>
                          <Badge className={cn("text-xs", status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono mb-4">
                          Code: {exam.code}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(exam.exam_date), "PPP")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {exam.start_time} ({exam.duration_minutes} min)
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePublish(exam)}>
                            {exam.is_published ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ExamsList;
