import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, Hash, FileText, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ManualQuestionSelector } from "@/components/admin/ManualQuestionSelector";
import { RuleBasedSelector } from "@/components/admin/RuleBasedSelector";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface SelectedQuestion {
  id: string;
  question_text: string;
  subject_name: string;
  difficulty: string;
  marks: number;
}

const CreateExam = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Exam details
  const [examName, setExamName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [examDate, setExamDate] = useState<Date>();
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [negativeMarking, setNegativeMarking] = useState(true);
  
  // Question selection
  const [selectionMode, setSelectionMode] = useState<"manual" | "rules">("manual");
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);

  const generateExamCode = () => {
    const prefix = examName.slice(0, 3).toUpperCase() || "EXM";
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setExamCode(`${prefix}-${year}-${random}`);
  };

  const validateStep1 = () => {
    if (!examName.trim()) {
      toast.error("Please enter exam name");
      return false;
    }
    if (!examCode.trim()) {
      toast.error("Please generate or enter exam code");
      return false;
    }
    if (!examDate) {
      toast.error("Please select exam date");
      return false;
    }
    if (!startTime) {
      toast.error("Please enter start time");
      return false;
    }
    if (durationMinutes < 1) {
      toast.error("Duration must be at least 1 minute");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate('/admin');
    }
  };

  const handleCreateExam = async () => {
    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Create exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          name: examName,
          code: examCode.toUpperCase(),
          exam_date: format(examDate!, 'yyyy-MM-dd'),
          start_time: startTime,
          duration_minutes: durationMinutes,
          negative_marking_enabled: negativeMarking,
          created_by: user.id,
        })
        .select()
        .single();

      if (examError) {
        if (examError.message.includes('duplicate')) {
          toast.error("Exam code already exists. Please use a different code.");
        } else {
          toast.error(examError.message);
        }
        return;
      }

      // Fetch full question data for snapshot
      const questionIds = selectedQuestions.map(q => q.id);
      const { data: fullQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (questionsError) {
        toast.error("Failed to fetch question details");
        return;
      }

      // Create exam questions with snapshots
      const examQuestions = selectedQuestions.map((sq, index) => {
        const fullQ = fullQuestions?.find(q => q.id === sq.id);
        return {
          exam_id: exam.id,
          question_id: sq.id,
          order_index: index + 1,
          question_snapshot: fullQ || {},
        };
      });

      const { error: eqError } = await supabase
        .from('exam_questions')
        .insert(examQuestions);

      if (eqError) {
        toast.error("Failed to add questions to exam");
        return;
      }

      toast.success("Exam created successfully!");
      navigate('/admin/exams');
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Create New Exam</h1>
            <p className="text-muted-foreground">
              Step {step} of 2: {step === 1 ? "Exam Details" : "Select Questions"}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-4 mb-8">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <FileText className="w-4 h-4" />
            Details
          </div>
          <div className="h-0.5 w-12 bg-border" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <CheckCircle2 className="w-4 h-4" />
            Questions
          </div>
        </div>

        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Exam Details</CardTitle>
              <CardDescription>
                Enter the basic information about your exam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exam Name */}
              <div className="space-y-2">
                <Label htmlFor="exam-name">Exam Name</Label>
                <Input
                  id="exam-name"
                  placeholder="e.g., JEE Main Mock Test 1"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                />
              </div>

              {/* Exam Code */}
              <div className="space-y-2">
                <Label htmlFor="exam-code">Exam Code</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="exam-code"
                      placeholder="JEE-2025-001"
                      value={examCode}
                      onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                      className="pl-10 uppercase"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={generateExamCode}>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Students will use this code to join the exam
                </p>
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exam Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !examDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {examDate ? format(examDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={examDate}
                        onSelect={setExamDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={360}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 180)}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
                </p>
              </div>

              {/* Negative Marking */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="negative-marking" className="font-medium">
                    Negative Marking
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Deduct marks for wrong answers
                  </p>
                </div>
                <Switch
                  id="negative-marking"
                  checked={negativeMarking}
                  onCheckedChange={setNegativeMarking}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="hero" onClick={handleNext}>
                  Continue to Questions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="border-0 shadow-md bg-primary/5">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Exam:</span>{" "}
                    <span className="font-medium">{examName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Code:</span>{" "}
                    <span className="font-mono font-medium">{examCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    <span className="font-medium">{examDate ? format(examDate, "PP") : "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    <span className="font-medium">{durationMinutes} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Selection */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Select Questions</CardTitle>
                <CardDescription>
                  Choose questions manually or use rule-based selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as "manual" | "rules")}>
                  <TabsList className="mb-6">
                    <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                    <TabsTrigger value="rules">Rule-Based</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual">
                    <ManualQuestionSelector
                      selectedQuestions={selectedQuestions}
                      onSelectionChange={setSelectedQuestions}
                    />
                  </TabsContent>

                  <TabsContent value="rules">
                    <RuleBasedSelector
                      onQuestionsGenerated={setSelectedQuestions}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Selected Questions Summary */}
            {selectedQuestions.length > 0 && (
              <Card className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {selectedQuestions.length} questions selected
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Marks: {totalMarks}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button 
                        variant="hero" 
                        onClick={handleCreateExam}
                        disabled={isLoading}
                      >
                        {isLoading ? "Creating..." : "Create Exam"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CreateExam;
