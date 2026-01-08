import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
}

interface Rule {
  id: string;
  subjectId: string;
  difficulty: string;
  count: number;
}

interface SelectedQuestion {
  id: string;
  question_text: string;
  subject_name: string;
  difficulty: string;
  marks: number;
}

interface RuleBasedSelectorProps {
  onQuestionsGenerated: (questions: SelectedQuestion[]) => void;
}

export const RuleBasedSelector = ({ onQuestionsGenerated }: RuleBasedSelectorProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [classesRes, subjectsRes] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
  };

  const filteredSubjects = selectedClass
    ? subjects.filter(s => s.class_id === selectedClass)
    : subjects;

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: crypto.randomUUID(),
        subjectId: "",
        difficulty: "all",
        count: 10,
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, field: keyof Rule, value: string | number) => {
    setRules(rules.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const generateQuestions = async () => {
    if (rules.length === 0) {
      toast.error("Add at least one rule");
      return;
    }

    const invalidRules = rules.filter(r => !r.subjectId || r.count < 1);
    if (invalidRules.length > 0) {
      toast.error("Please complete all rules");
      return;
    }

    setIsGenerating(true);
    try {
      const allSelectedQuestions: SelectedQuestion[] = [];

      for (const rule of rules) {
        let query = supabase
          .from('questions')
          .select('*')
          .eq('subject_id', rule.subjectId);

        if (rule.difficulty !== "all") {
          query = query.eq('difficulty', rule.difficulty as "easy" | "medium" | "hard");
        }

        const { data: questions, error } = await query;

        if (error) {
          toast.error(`Failed to fetch questions: ${error.message}`);
          continue;
        }

        if (!questions || questions.length === 0) {
          const subjectName = subjects.find(s => s.id === rule.subjectId)?.name;
          toast.warning(`No questions found for ${subjectName} (${rule.difficulty})`);
          continue;
        }

        // Shuffle and pick random questions
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, rule.count);

        const subjectName = subjects.find(s => s.id === rule.subjectId)?.name || "Unknown";

        for (const q of selected) {
          if (!allSelectedQuestions.some(sq => sq.id === q.id)) {
            allSelectedQuestions.push({
              id: q.id,
              question_text: q.question_text,
              subject_name: subjectName,
              difficulty: q.difficulty,
              marks: q.marks,
            });
          }
        }
      }

      if (allSelectedQuestions.length === 0) {
        toast.error("No questions matched your rules");
      } else {
        onQuestionsGenerated(allSelectedQuestions);
        toast.success(`Selected ${allSelectedQuestions.length} questions`);
      }
    } catch (error) {
      toast.error("An error occurred while generating questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const totalQuestions = rules.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p>Define rules to automatically select questions based on subject and difficulty distribution.</p>
      </div>

      {/* Class Filter */}
      <div className="space-y-2">
        <Label>Select Class</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>Class {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Distribution Rules</Label>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>No rules defined yet</p>
            <p className="text-sm mt-1">Click "Add Rule" to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <Card key={rule.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground w-8">
                      #{index + 1}
                    </span>
                    
                    <div className="flex-1 grid md:grid-cols-3 gap-3">
                      <Select 
                        value={rule.subjectId} 
                        onValueChange={(v) => updateRule(rule.id, 'subjectId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSubjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={rule.difficulty} 
                        onValueChange={(v) => updateRule(rule.id, 'difficulty', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Difficulty</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={rule.count}
                          onChange={(e) => updateRule(rule.id, 'count', parseInt(e.target.value) || 1)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">questions</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(rule.id)}
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

      {/* Summary & Generate */}
      {rules.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
          <div>
            <p className="font-medium">Total: {totalQuestions} questions</p>
            <p className="text-sm text-muted-foreground">
              Based on {rules.length} rule{rules.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            variant="hero" 
            onClick={generateQuestions}
            disabled={isGenerating}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Questions"}
          </Button>
        </div>
      )}
    </div>
  );
};
