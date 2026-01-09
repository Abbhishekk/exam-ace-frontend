import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Trash2,
  GraduationCap,
  BookOpen,
  FileText,
  Tag
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

interface Topic {
  id: string;
  name: string;
  chapter_id: string;
}

const ClassesManagement = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [chapterDialog, setChapterDialog] = useState(false);
  const [topicDialog, setTopicDialog] = useState(false);

  // Form states
  const [newSubject, setNewSubject] = useState({ name: "", class_id: "" });
  const [newChapter, setNewChapter] = useState({ name: "", subject_id: "" });
  const [newTopic, setNewTopic] = useState({ name: "", chapter_id: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [classesRes, subjectsRes, chaptersRes, topicsRes] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('chapters').select('*').order('name'),
      supabase.from('topics').select('*').order('name'),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (chaptersRes.data) setChapters(chaptersRes.data);
    if (topicsRes.data) setTopics(topicsRes.data);
    setIsLoading(false);
  };

  const addSubject = async () => {
    if (!newSubject.name || !newSubject.class_id) {
      toast.error("Please fill all fields");
      return;
    }

    const { error } = await supabase.from('subjects').insert(newSubject);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Subject added");
      setNewSubject({ name: "", class_id: "" });
      setSubjectDialog(false);
      fetchData();
    }
  };

  const addChapter = async () => {
    if (!newChapter.name || !newChapter.subject_id) {
      toast.error("Please fill all fields");
      return;
    }

    const { error } = await supabase.from('chapters').insert(newChapter);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Chapter added");
      setNewChapter({ name: "", subject_id: "" });
      setChapterDialog(false);
      fetchData();
    }
  };

  const addTopic = async () => {
    if (!newTopic.name || !newTopic.chapter_id) {
      toast.error("Please fill all fields");
      return;
    }

    const { error } = await supabase.from('topics').insert(newTopic);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Topic added");
      setNewTopic({ name: "", chapter_id: "" });
      setTopicDialog(false);
      fetchData();
    }
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success("Subject deleted"); fetchData(); }
  };

  const deleteChapter = async (id: string) => {
    const { error } = await supabase.from('chapters').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success("Chapter deleted"); fetchData(); }
  };

  const deleteTopic = async (id: string) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success("Topic deleted"); fetchData(); }
  };

  const getSubjectsForClass = (classId: string) => subjects.filter(s => s.class_id === classId);
  const getChaptersForSubject = (subjectId: string) => chapters.filter(c => c.subject_id === subjectId);
  const getTopicsForChapter = (chapterId: string) => topics.filter(t => t.chapter_id === chapterId);

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Classes & Subjects</h1>
            <p className="text-muted-foreground mt-1">
              Organize your question bank hierarchy
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Subject</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={newSubject.class_id} onValueChange={(v) => setNewSubject({ ...newSubject, class_id: v })}>
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
                    <Label>Subject Name</Label>
                    <Input
                      placeholder="e.g., Physics, Chemistry"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    />
                  </div>
                  <Button onClick={addSubject} className="w-full">Add Subject</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={chapterDialog} onOpenChange={setChapterDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Chapter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Chapter</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={newChapter.subject_id} onValueChange={(v) => setNewChapter({ ...newChapter, subject_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chapter Name</Label>
                    <Input
                      placeholder="e.g., Mechanics, Thermodynamics"
                      value={newChapter.name}
                      onChange={(e) => setNewChapter({ ...newChapter, name: e.target.value })}
                    />
                  </div>
                  <Button onClick={addChapter} className="w-full">Add Chapter</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Classes Accordion */}
        <Accordion type="multiple" className="space-y-4">
          {classes.map((cls) => (
            <AccordionItem key={cls.id} value={cls.id} className="border-0">
              <Card className="border-0 shadow-md">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Class {cls.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getSubjectsForClass(cls.id).length} subjects
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  {getSubjectsForClass(cls.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No subjects yet. Add your first subject.
                    </p>
                  ) : (
                    <div className="space-y-3 ml-4">
                      {getSubjectsForClass(cls.id).map((subject) => (
                        <Accordion key={subject.id} type="multiple">
                          <AccordionItem value={subject.id} className="border rounded-lg">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4 text-secondary" />
                                <span className="font-medium">{subject.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({getChaptersForSubject(subject.id).length} chapters)
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">Chapters:</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => deleteSubject(subject.id)}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete Subject
                                </Button>
                              </div>
                              {getChaptersForSubject(subject.id).length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">No chapters yet</p>
                              ) : (
                                <div className="space-y-2 ml-4">
                                  {getChaptersForSubject(subject.id).map((chapter) => (
                                    <div
                                      key={chapter.id}
                                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-sm">{chapter.name}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteChapter(chapter.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AdminLayout>
  );
};

export default ClassesManagement;
