import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search,
  Filter,
  Edit,
  Trash2,
  FileQuestion
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  marks: number;
  negative_marks: number;
  difficulty: string;
  class_id: string;
  subject_id: string;
  chapter_id: string | null;
  topic_id: string | null;
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  class_id: string;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
}

const QuestionBank = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    explanation: "",
    marks: 4,
    negative_marks: 1,
    difficulty: "medium",
    class_id: "",
    subject_id: "",
    chapter_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [classesRes, subjectsRes, chaptersRes, questionsRes] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('chapters').select('*').order('name'),
      supabase.from('questions').select('*').order('created_at', { ascending: false }),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (chaptersRes.data) setChapters(chaptersRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data);
    setIsLoading(false);
  };

  const filteredQuestions = questions.filter((q) => {
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterClass !== "all" && q.class_id !== filterClass) return false;
    if (filterSubject !== "all" && q.subject_id !== filterSubject) return false;
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  const filteredSubjectsForFilter = filterClass === "all" 
    ? subjects 
    : subjects.filter(s => s.class_id === filterClass);

  const filteredSubjectsForForm = formData.class_id
    ? subjects.filter(s => s.class_id === formData.class_id)
    : [];

  const filteredChaptersForForm = formData.subject_id
    ? chapters.filter(c => c.subject_id === formData.subject_id)
    : [];

  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || "";
  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || "";

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_option: "A",
      explanation: "",
      marks: 4,
      negative_marks: 1,
      difficulty: "medium",
      class_id: "",
      subject_id: "",
      chapter_id: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class_id || !formData.subject_id) {
      toast.error("Please select class and subject");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('questions').insert({
      question_text: formData.question_text,
      option_a: formData.option_a,
      option_b: formData.option_b,
      option_c: formData.option_c,
      option_d: formData.option_d,
      correct_option: formData.correct_option,
      explanation: formData.explanation || null,
      marks: formData.marks,
      negative_marks: formData.negative_marks,
      difficulty: formData.difficulty as "easy" | "medium" | "hard",
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      chapter_id: formData.chapter_id || null,
      topic_id: null,
      created_by: user?.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Question added successfully");
      resetForm();
      setIsDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Question deleted");
      fetchData();
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Question Bank</h1>
            <p className="text-muted-foreground mt-1">
              {questions.length} questions in total
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
                <DialogDescription>
                  Fill in the question details below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Class *</Label>
                    <Select 
                      value={formData.class_id} 
                      onValueChange={(v) => setFormData({ ...formData, class_id: v, subject_id: "", chapter_id: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>Class {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select 
                      value={formData.subject_id} 
                      onValueChange={(v) => setFormData({ ...formData, subject_id: v, chapter_id: "" })}
                      disabled={!formData.class_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubjectsForForm.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Chapter</Label>
                    <Select 
                      value={formData.chapter_id} 
                      onValueChange={(v) => setFormData({ ...formData, chapter_id: v })}
                      disabled={!formData.subject_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select chapter" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredChaptersForForm.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Question *</Label>
                  <Textarea
                    placeholder="Enter the question text..."
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Option A *</Label>
                    <Input
                      value={formData.option_a}
                      onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Option B *</Label>
                    <Input
                      value={formData.option_b}
                      onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Option C *</Label>
                    <Input
                      value={formData.option_c}
                      onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Option D *</Label>
                    <Input
                      value={formData.option_d}
                      onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Correct Option *</Label>
                    <Select 
                      value={formData.correct_option} 
                      onValueChange={(v) => setFormData({ ...formData, correct_option: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Difficulty *</Label>
                    <Select 
                      value={formData.difficulty} 
                      onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Marks</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: parseFloat(e.target.value) || 4 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Negative Marks</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.25}
                      value={formData.negative_marks}
                      onChange={(e) => setFormData({ ...formData, negative_marks: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Explanation</Label>
                  <Textarea
                    placeholder="Explain the correct answer..."
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="hero">
                    Add Question
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterClass} onValueChange={(v) => { setFilterClass(v); setFilterSubject("all"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>Class {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {filteredSubjectsForFilter.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <FileQuestion className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-6">
                {questions.length === 0 
                  ? "Add your first question to the bank" 
                  : "Try adjusting your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((question, index) => (
              <Card key={question.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
                      {index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm mb-3">{question.question_text}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                        <div>A. {question.option_a}</div>
                        <div>B. {question.option_b}</div>
                        <div>C. {question.option_c}</div>
                        <div>D. {question.option_d}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Class {getClassName(question.class_id)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getSubjectName(question.subject_id)}
                        </Badge>
                        <Badge className={cn("text-xs", getDifficultyColor(question.difficulty))}>
                          {question.difficulty}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Answer: {question.correct_option}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {question.marks} / -{question.negative_marks}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(question.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default QuestionBank;
