import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Zap, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '@/lib/envs'

interface Class {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
  class_id: string
}

interface Chapter {
  id: string
  name: string
  subject_id: string
}

interface ChapterRule {
  easy: number
  medium: number
  hard: number
}

interface Rules {
  [subjectName: string]: {
    [chapterName: string]: ChapterRule
  }
}

interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

interface QuestionCounts {
  easy: number
  medium: number
  hard: number
}

const CreateExam = () => {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [rules, setRules] = useState<Rules>({})
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'subject' | 'chapter'>('subject')
  
  // Subject-level difficulty distribution
  const [difficultyDistribution, setDifficultyDistribution] = useState<DifficultyDistribution>({
    easy: 0,
    medium: 0,
    hard: 0
  })
  const [availableCounts, setAvailableCounts] = useState<QuestionCounts>({ easy: 0, medium: 0, hard: 0 })
  const [loadingCounts, setLoadingCounts] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '',
    duration_minutes: 180
  })

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects(selectedClass)
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedSubject) {
      if (mode === 'subject') {
        fetchQuestionCounts(selectedSubject)
      } else {
        fetchChapters(selectedSubject)
      }
    }
  }, [selectedSubject, mode])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (error: any) {
      toast.error('Failed to fetch classes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, class_id')
        .eq('class_id', classId)
        .order('name')

      if (error) throw error
      setSubjects(data || [])
    } catch (error: any) {
      toast.error('Failed to fetch subjects: ' + error.message)
    }
  }

  const fetchQuestionCounts = async (subjectId: string) => {
    setLoadingCounts(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}/api/admin/subject-question-counts/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch question counts')
      }

      const result = await response.json()
      setAvailableCounts(result.counts)
    } catch (error: any) {
      toast.error('Failed to fetch question counts: ' + error.message)
    } finally {
      setLoadingCounts(false)
    }
  }

  const fetchChapters = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subject_id')
        .eq('subject_id', subjectId)
        .order('name')

      if (error) throw error
      setChapters(data || [])
    } catch (error: any) {
      toast.error('Failed to fetch chapters: ' + error.message)
    }
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    setSelectedSubject('')
    setSubjects([])
    setChapters([])
    setRules({})
    setDifficultyDistribution({ easy: 0, medium: 0, hard: 0 })
    setAvailableCounts({ easy: 0, medium: 0, hard: 0 })
  }

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId)
    setRules({})
    setChapters([])
    setDifficultyDistribution({ easy: 0, medium: 0, hard: 0 })
  }

  const updateChapterRule = (subjectName: string, chapterName: string, difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    setRules(prev => ({
      ...prev,
      [subjectName]: {
        ...prev[subjectName],
        [chapterName]: {
          ...prev[subjectName]?.[chapterName],
          [difficulty]: count
        }
      }
    }))
  }

  const toggleChapterExpanded = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters)
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId)
    } else {
      newExpanded.add(chapterId)
    }
    setExpandedChapters(newExpanded)
  }

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.start_time) {
      toast.error('All fields are required')
      return
    }

    const totalQuestions = difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard
    if (totalQuestions === 0) {
      toast.error('Please specify at least one question')
      return
    }

    // Validate against available counts
    if (difficultyDistribution.easy > availableCounts.easy ||
        difficultyDistribution.medium > availableCounts.medium ||
        difficultyDistribution.hard > availableCounts.hard) {
      toast.error('Requested questions exceed available counts')
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}/api/admin/create-subject-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim(),
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          subject_id: selectedSubject,
          difficulty_distribution: difficultyDistribution
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create exam')
      }

      const result = await response.json()
      toast.success(`Exam created successfully! ${result.exam.total_questions} questions selected.`)
      navigate('/admin')
    } catch (error: any) {
      toast.error('Failed to create exam: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.start_time) {
      toast.error('All fields are required')
      return
    }

    if (Object.keys(rules).length === 0) {
      toast.error('Please configure at least one chapter rule')
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}/api/admin/create-rule-based-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim(),
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          rules
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create exam')
      }

      const result = await response.json()
      toast.success(`Exam created successfully! ${result.exam.total_questions} questions selected.`)
      navigate('/admin')
    } catch (error: any) {
      toast.error('Failed to create exam: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getTotalQuestions = () => {
    if (mode === 'subject') {
      return difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard
    }
    return Object.values(rules).reduce((total, chapters) => {
      return total + Object.values(chapters).reduce((chapterTotal, rule) => {
        return chapterTotal + (rule.easy || 0) + (rule.medium || 0) + (rule.hard || 0)
      }, 0)
    }, 0)
  }

  const selectedSubjectName = subjects.find(s => s.id === selectedSubject)?.name || ''

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Create Rule-Based Exam</h1>
        </div>

        {/* Exam Details Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === 'subject' ? handleSubjectSubmit : handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Exam name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              
              <Input
                placeholder="Exam code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
              
              <Input
                type="datetime-local"
                value={formData.start_time ? new Date(formData.start_time).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16) : ''}
                onChange={(e) => {
                  const localDateTime = e.target.value
                  const istDateTime = new Date(localDateTime + '+05:30').toISOString()
                  setFormData({ ...formData, start_time: istDateTime })
                }}
              />
              
              <Input
                type="number"
                placeholder="Duration (minutes)"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                min="1"
              />
            </form>
          </CardContent>
        </Card>

        {/* Class and Subject Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Hierarchy Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={handleSubjectChange} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mode Selection */}
        {selectedSubject && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Tabs value={mode} onValueChange={(value) => setMode(value as 'subject' | 'chapter')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="subject" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Quick Mode (Subject-level)
                  </TabsTrigger>
                  <TabsTrigger value="chapter" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Advanced Mode (Chapter-level)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="subject" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Difficulty Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingCounts ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-green-600">Easy Questions</label>
                              <div className="text-xs text-muted-foreground mb-1">
                                Available: {availableCounts.easy}
                              </div>
                              <Input
                                type="number"
                                min="0"
                                max={availableCounts.easy}
                                value={difficultyDistribution.easy || ''}
                                onChange={(e) => setDifficultyDistribution(prev => ({
                                  ...prev,
                                  easy: Math.min(Number(e.target.value) || 0, availableCounts.easy)
                                }))}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-yellow-600">Medium Questions</label>
                              <div className="text-xs text-muted-foreground mb-1">
                                Available: {availableCounts.medium}
                              </div>
                              <Input
                                type="number"
                                min="0"
                                max={availableCounts.medium}
                                value={difficultyDistribution.medium || ''}
                                onChange={(e) => setDifficultyDistribution(prev => ({
                                  ...prev,
                                  medium: Math.min(Number(e.target.value) || 0, availableCounts.medium)
                                }))}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-red-600">Hard Questions</label>
                              <div className="text-xs text-muted-foreground mb-1">
                                Available: {availableCounts.hard}
                              </div>
                              <Input
                                type="number"
                                min="0"
                                max={availableCounts.hard}
                                value={difficultyDistribution.hard || ''}
                                onChange={(e) => setDifficultyDistribution(prev => ({
                                  ...prev,
                                  hard: Math.min(Number(e.target.value) || 0, availableCounts.hard)
                                }))}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          
                          {getTotalQuestions() > 0 && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <div className="text-sm font-medium">Total Questions: {getTotalQuestions()}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Questions will be randomly selected from all chapters in this subject
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="chapter" className="mt-6">
                  {chapters.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Chapter Rules Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {chapters.map(chapter => {
                          const isExpanded = expandedChapters.has(chapter.id)
                          const chapterRule = rules[selectedSubjectName]?.[chapter.name] || { easy: 0, medium: 0, hard: 0 }
                          
                          return (
                            <Collapsible key={chapter.id} open={isExpanded} onOpenChange={() => toggleChapterExpanded(chapter.id)}>
                              <CollapsibleTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  <span>{chapter.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      Total: {(chapterRule.easy || 0) + (chapterRule.medium || 0) + (chapterRule.hard || 0)} questions
                                    </span>
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </div>
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-4 p-4 border rounded-lg">
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-green-600">Easy</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={chapterRule.easy || ''}
                                      onChange={(e) => updateChapterRule(selectedSubjectName, chapter.name, 'easy', Number(e.target.value) || 0)}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-yellow-600">Medium</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={chapterRule.medium || ''}
                                      onChange={(e) => updateChapterRule(selectedSubjectName, chapter.name, 'medium', Number(e.target.value) || 0)}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-red-600">Hard</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={chapterRule.hard || ''}
                                      onChange={(e) => updateChapterRule(selectedSubjectName, chapter.name, 'hard', Number(e.target.value) || 0)}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        })}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Summary and Submit */}
        {getTotalQuestions() > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total Questions: {getTotalQuestions()} • Duration: {formData.duration_minutes} minutes
                </div>
                <Button 
                  type="submit" 
                  onClick={mode === 'subject' ? handleSubjectSubmit : handleSubmit} 
                  disabled={submitting || getTotalQuestions() === 0}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Explanation */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🎯 Enhanced Rule-Based Exam Creation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <p><strong>Quick Mode (Subject-level):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Fast exam creation with difficulty distribution</li>
                <li>Shows available question counts per difficulty</li>
                <li>Randomly selects questions across all chapters in the subject</li>
                <li>Perfect for balanced exams without chapter-specific requirements</li>
              </ul>
            </div>
            
            <div>
              <p><strong>Advanced Mode (Chapter-level):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Granular control over chapter-wise question distribution</li>
                <li>Configure difficulty levels per chapter</li>
                <li>Questions distributed across topics within each chapter</li>
                <li>Ideal for comprehensive coverage of specific chapters</li>
              </ul>
            </div>

            <div className="bg-muted p-3 rounded">
              <p><strong>Example Quick Mode:</strong></p>
              <div className="text-xs mt-1">
                Physics → Easy: 10, Medium: 15, Hard: 5 = 30 total questions randomly selected from all Physics chapters
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateExam