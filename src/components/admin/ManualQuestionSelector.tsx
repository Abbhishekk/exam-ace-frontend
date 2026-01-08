import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  subject_id: string;
  class_id: string;
}

interface Subject {
  id: string;
  name: string;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
}

interface SelectedQuestion {
  id: string;
  question_text: string;
  subject_name: string;
  difficulty: string;
  marks: number;
}

interface ManualQuestionSelectorProps {
  selectedQuestions: SelectedQuestion[];
  onSelectionChange: (questions: SelectedQuestion[]) => void;
}

export const ManualQuestionSelector = ({
  selectedQuestions,
  onSelectionChange,
}: ManualQuestionSelectorProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [classesRes, subjectsRes, questionsRes] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('questions').select('*').order('created_at', { ascending: false }),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data);
    
    setIsLoading(false);
  };

  const filteredQuestions = questions.filter((q) => {
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterClass !== "all" && q.class_id !== filterClass) {
      return false;
    }
    if (filterSubject !== "all" && q.subject_id !== filterSubject) {
      return false;
    }
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) {
      return false;
    }
    return true;
  });

  const filteredSubjects = filterClass === "all" 
    ? subjects 
    : subjects.filter(s => s.class_id === filterClass);

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || "Unknown";
  };

  const isSelected = (questionId: string) => {
    return selectedQuestions.some(q => q.id === questionId);
  };

  const toggleQuestion = (question: Question) => {
    if (isSelected(question.id)) {
      onSelectionChange(selectedQuestions.filter(q => q.id !== question.id));
    } else {
      onSelectionChange([
        ...selectedQuestions,
        {
          id: question.id,
          question_text: question.question_text,
          subject_name: getSubjectName(question.subject_id),
          difficulty: question.difficulty,
          marks: question.marks,
        },
      ]);
    }
  };

  const selectAll = () => {
    const newSelections = filteredQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      subject_name: getSubjectName(q.subject_id),
      difficulty: q.difficulty,
      marks: q.marks,
    }));
    onSelectionChange(newSelections);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'hard': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No questions available in the question bank.</p>
        <p className="text-sm mt-2">Add questions first before creating an exam.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
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
        
        <Select value={filterClass} onValueChange={setFilterClass}>
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
            {filteredSubjects.map((s) => (
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

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredQuestions.length} questions found
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {filteredQuestions.map((question) => (
          <div
            key={question.id}
            className={cn(
              "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
              isSelected(question.id) && "bg-primary/5"
            )}
            onClick={() => toggleQuestion(question)}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected(question.id)}
                onCheckedChange={() => toggleQuestion(question)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{question.question_text}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {getSubjectName(question.subject_id)}
                  </Badge>
                  <Badge className={cn("text-xs", getDifficultyColor(question.difficulty))}>
                    {question.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {question.marks} marks
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
