import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Loader2, 
  ArrowLeft, 
  Plus, 
  X, 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Zap, 
  Settings, 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

interface ChapterCounts {
  easy: number
  medium: number
  hard: number
  total: number
}

interface ChapterItem {
  id: string
  name: string
  counts: ChapterCounts
}

interface ChapterRule {
  easy: number
  medium: number
  hard: number
}

interface ExamSection {
  subject_id: string
  section_name: string
  mode: 'chapter' | 'subject'
  difficulty_distribution: DifficultyDistribution
  available_counts?: QuestionCounts
  loading_counts?: boolean
  chapters?: ChapterItem[]
  loading_chapters?: boolean
  chapter_rules: {
    [chapterId: string]: ChapterRule
  }
  expanded_chapters: string[]
}

interface PreviousExamItem {
  id: string
  name: string
  code: string
  total_questions: number
  duration_minutes: number
  created_at: string
}

const CreateMultiSubjectExam = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const cloneExamIdParam = searchParams.get('cloneExamId')

  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Previous exams for cloning
  const [previousExams, setPreviousExams] = useState<PreviousExamItem[]>([])
  const [loadingPreviousExams, setLoadingPreviousExams] = useState(false)
  const [selectedCloneExamId, setSelectedCloneExamId] = useState<string>('')
  const [cloningLoading, setCloningLoading] = useState(false)
  const [clonedFromExamName, setClonedFromExamName] = useState<string>('')
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '',
    duration_minutes: 180
  })

  const [sections, setSections] = useState<ExamSection[]>([])

  useEffect(() => {
    fetchClasses()
    fetchPreviousExams()
  }, [])

  useEffect(() => {
    if (cloneExamIdParam) {
      setSelectedCloneExamId(cloneExamIdParam)
      loadExamConfig(cloneExamIdParam)
    }
  }, [cloneExamIdParam])

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects(selectedClass)
    } else {
      setSubjects([])
      setSections([])
    }
  }, [selectedClass])

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

  const fetchPreviousExams = async () => {
    setLoadingPreviousExams(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${API_BASE_URL}/api/admin/exams-list`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.exams)) {
          setPreviousExams(result.exams)
          return
        }
      }

      // Fallback directly to Supabase client
      const { data, error } = await supabase
        .from('exams')
        .select('id, name, code, total_questions, duration_minutes, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setPreviousExams(data)
      }
    } catch (err) {
      console.error('Failed to fetch previous exams list:', err)
    } finally {
      setLoadingPreviousExams(false)
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
      return data || []
    } catch (error: any) {
      toast.error('Failed to fetch subjects: ' + error.message)
      return []
    }
  }

  const fetchSubjectCountsAsync = async (subjectId: string): Promise<QuestionCounts> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}/api/admin/subject-question-counts/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.counts) return result.counts
      }
    } catch (err) {
      console.warn('Failed to fetch subject question counts from API', err)
    }
    return { easy: 0, medium: 0, hard: 0 }
  }

  const fetchSubjectChaptersAsync = async (subjectId: string): Promise<ChapterItem[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // 1. Try server endpoint first
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/subject-chapters-question-counts/${subjectId}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        if (response.ok) {
          const result = await response.json()
          if (result.success && Array.isArray(result.chapters)) {
            return result.chapters
          }
        }
      } catch (err) {
        console.warn('API fetch chapters failed, trying Supabase client directly', err)
      }

      // 2. Fallback to Supabase client query
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          id,
          chapters (
            id,
            name,
            topics (
              id,
              name,
              questions (
                id,
                difficulty
              )
            )
          )
        `)
        .eq('id', subjectId)
        .single()

      if (!error && data?.chapters) {
        return data.chapters.map((ch: any) => {
          let easy = 0
          let medium = 0
          let hard = 0
          ch.topics?.forEach((t: any) => {
            t.questions?.forEach((q: any) => {
              if (q.difficulty === 'easy') easy++
              else if (q.difficulty === 'medium') medium++
              else if (q.difficulty === 'hard') hard++
            })
          })
          return {
            id: ch.id,
            name: ch.name,
            counts: {
              easy,
              medium,
              hard,
              total: easy + medium + hard
            }
          }
        })
      }
    } catch (err) {
      console.error('Error fetching subject chapters:', err)
    }
    return []
  }

  const fetchQuestionCounts = async (subjectId: string, sectionIndex: number) => {
    setSections(prev => prev.map((s, idx) => idx === sectionIndex ? { ...s, loading_counts: true } : s))
    const counts = await fetchSubjectCountsAsync(subjectId)
    setSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { ...section, available_counts: counts, loading_counts: false }
        : section
    ))
  }

  const fetchSectionChapters = async (subjectId: string, sectionIndex: number) => {
    setSections(prev => prev.map((s, idx) => idx === sectionIndex ? { ...s, loading_chapters: true } : s))
    const chapterList = await fetchSubjectChaptersAsync(subjectId)
    setSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { ...section, chapters: chapterList, loading_chapters: false }
        : section
    ))
  }

  const loadExamConfig = async (examId: string) => {
    if (!examId) return
    setCloningLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${API_BASE_URL}/api/admin/exams/${examId}/config`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch exam configuration')
      }

      const { config } = await response.json()

      // 1. Set Class and fetch subjects
      if (config.class_id) {
        setSelectedClass(config.class_id)
        await fetchSubjects(config.class_id)
      }

      // 2. Set basic form details
      const randomSuffix = Math.floor(100 + Math.random() * 900)
      setFormData(prev => ({
        ...prev,
        name: config.name ? `${config.name} (Copy)` : '',
        code: config.code ? `${config.code}-${randomSuffix}` : '',
        duration_minutes: config.duration_minutes || 180
      }))

      // 3. Reconstruct sections and chapters
      const builtSections: ExamSection[] = []

      for (const secConfig of (config.sections || [])) {
        const chapterList = await fetchSubjectChaptersAsync(secConfig.subject_id)
        const counts = await fetchSubjectCountsAsync(secConfig.subject_id)

        const rulesMap: { [chapterId: string]: ChapterRule } = {}
        const expandedChapterIds: string[] = []

        if (Array.isArray(secConfig.chapter_rules)) {
          secConfig.chapter_rules.forEach((cr: any) => {
            const easy = cr.difficulty_distribution?.easy || cr.easy || 0
            const medium = cr.difficulty_distribution?.medium || cr.medium || 0
            const hard = cr.difficulty_distribution?.hard || cr.hard || 0

            rulesMap[cr.chapter_id] = { easy, medium, hard }

            if (easy > 0 || medium > 0 || hard > 0) {
              expandedChapterIds.push(cr.chapter_id)
            }
          })
        }

        builtSections.push({
          subject_id: secConfig.subject_id,
          section_name: secConfig.section_name,
          mode: secConfig.mode || 'chapter',
          difficulty_distribution: secConfig.difficulty_distribution || { easy: 0, medium: 0, hard: 0 },
          available_counts: counts,
          chapters: chapterList,
          chapter_rules: rulesMap,
          expanded_chapters: expandedChapterIds,
          loading_chapters: false,
          loading_counts: false
        })
      }

      setSections(builtSections)
      setClonedFromExamName(config.name || 'Previous Exam')

      const totalQ = builtSections.reduce((acc, s) => {
        return acc + Object.values(s.chapter_rules).reduce((cAcc, r) => cAcc + r.easy + r.medium + r.hard, 0)
      }, 0)

      toast.success(`Loaded configuration from "${config.name}" (${totalQ} questions across ${builtSections.length} sections)!`)
    } catch (error: any) {
      console.error('Failed to load exam configuration:', error)
      toast.error('Failed to load exam configuration: ' + error.message)
    } finally {
      setCloningLoading(false)
    }
  }

  const handleResetClonedConfig = () => {
    setSelectedCloneExamId('')
    setClonedFromExamName('')
    setFormData({
      name: '',
      code: '',
      start_time: '',
      duration_minutes: 180
    })
    setSections([])
    if (cloneExamIdParam) {
      setSearchParams({})
    }
    toast.info('Form cleared to blank')
  }

  const addSection = () => {
    setSections(prev => [...prev, {
      subject_id: '',
      section_name: '',
      mode: 'chapter',
      difficulty_distribution: { easy: 0, medium: 0, hard: 0 },
      chapter_rules: {},
      chapters: [],
      expanded_chapters: [],
      loading_chapters: false,
      loading_counts: false
    }])
  }

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index))
  }

  const updateSection = (index: number, field: keyof ExamSection, value: any) => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, [field]: value } : section
    ))

    if (field === 'subject_id' && value) {
      const subject = subjects.find(s => s.id === value)
      setSections(prev => prev.map((section, i) => 
        i === index ? { 
          ...section, 
          section_name: subject?.name || section.section_name,
          difficulty_distribution: { easy: 0, medium: 0, hard: 0 },
          chapter_rules: {},
          chapters: [],
          expanded_chapters: [],
          available_counts: { easy: 0, medium: 0, hard: 0 }
        } : section
      ))
      fetchQuestionCounts(value, index)
      fetchSectionChapters(value, index)
    }
  }

  const updateDifficulty = (sectionIndex: number, difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex 
        ? {
            ...section,
            difficulty_distribution: {
              ...section.difficulty_distribution,
              [difficulty]: count
            }
          }
        : section
    ))
  }

  const updateChapterRule = (
    sectionIndex: number,
    chapterId: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number
  ) => {
    setSections(prev => prev.map((section, i) => {
      if (i !== sectionIndex) return section

      const currentRule = section.chapter_rules[chapterId] || { easy: 0, medium: 0, hard: 0 }
      const newRule = {
        ...currentRule,
        [difficulty]: count
      }

      return {
        ...section,
        chapter_rules: {
          ...section.chapter_rules,
          [chapterId]: newRule
        }
      }
    }))
  }

  const toggleChapterExpanded = (sectionIndex: number, chapterId: string) => {
    setSections(prev => prev.map((section, i) => {
      if (i !== sectionIndex) return section

      const current = section.expanded_chapters || []
      const next = current.includes(chapterId)
        ? current.filter(id => id !== chapterId)
        : [...current, chapterId]

      return {
        ...section,
        expanded_chapters: next
      }
    }))
  }

  const toggleAllChapters = (sectionIndex: number, expand: boolean) => {
    setSections(prev => prev.map((section, i) => {
      if (i !== sectionIndex) return section
      return {
        ...section,
        expanded_chapters: expand ? (section.chapters || []).map(ch => ch.id) : []
      }
    }))
  }

  const getSectionTotalQuestions = (section: ExamSection) => {
    if (section.mode === 'subject') {
      return (section.difficulty_distribution?.easy || 0) +
             (section.difficulty_distribution?.medium || 0) +
             (section.difficulty_distribution?.hard || 0)
    }
    return Object.values(section.chapter_rules || {}).reduce((acc, rule) => {
      return acc + (rule.easy || 0) + (rule.medium || 0) + (rule.hard || 0)
    }, 0)
  }

  const getTotalQuestions = () => {
    return sections.reduce((total, section) => total + getSectionTotalQuestions(section), 0)
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    setSections([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.start_time) {
      toast.error('All exam fields are required (Name, Code, Start Time)')
      return
    }

    if (sections.length === 0) {
      toast.error('Please add at least one section')
      return
    }

    // Validate sections
    for (const section of sections) {
      if (!section.subject_id || !section.section_name.trim()) {
        toast.error('All sections must have a subject and section name')
        return
      }
      
      const total = getSectionTotalQuestions(section)
      if (total === 0) {
        toast.error(`Section "${section.section_name}" must have at least one question configured`)
        return
      }

      // Check available counts in subject mode
      if (section.mode === 'subject' && section.available_counts) {
        if (section.difficulty_distribution.easy > section.available_counts.easy ||
            section.difficulty_distribution.medium > section.available_counts.medium ||
            section.difficulty_distribution.hard > section.available_counts.hard) {
          toast.error(`Section "${section.section_name}" requested questions exceed available counts`)
          return
        }
      }
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const formattedSections = sections.map(section => {
        if (section.mode === 'chapter') {
          const formattedChapterRules = (section.chapters || [])
            .map(ch => {
              const rule = section.chapter_rules[ch.id] || { easy: 0, medium: 0, hard: 0 }
              return {
                chapter_id: ch.id,
                chapter_name: ch.name,
                difficulty_distribution: {
                  easy: rule.easy || 0,
                  medium: rule.medium || 0,
                  hard: rule.hard || 0
                }
              }
            })
            .filter(r => r.difficulty_distribution.easy + r.difficulty_distribution.medium + r.difficulty_distribution.hard > 0)

          const totalEasy = formattedChapterRules.reduce((sum, r) => sum + r.difficulty_distribution.easy, 0)
          const totalMedium = formattedChapterRules.reduce((sum, r) => sum + r.difficulty_distribution.medium, 0)
          const totalHard = formattedChapterRules.reduce((sum, r) => sum + r.difficulty_distribution.hard, 0)

          return {
            subject_id: section.subject_id,
            section_name: section.section_name.trim(),
            mode: 'chapter',
            difficulty_distribution: {
              easy: totalEasy,
              medium: totalMedium,
              hard: totalHard
            },
            chapter_rules: formattedChapterRules
          }
        } else {
          return {
            subject_id: section.subject_id,
            section_name: section.section_name.trim(),
            mode: 'subject',
            difficulty_distribution: section.difficulty_distribution,
            chapter_rules: []
          }
        }
      })
      
      const response = await fetch(`${API_BASE_URL}/api/admin/create-multi-subject-exam`, {
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
          sections: formattedSections
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create exam')
      }

      const result = await response.json()
      toast.success(`Multi-subject exam created! ${result.total_questions} questions across ${result.sections_created} sections.`)
      navigate('/admin/exams')
    } catch (error: any) {
      toast.error('Failed to create exam: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Multi-Subject Exam</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create an exam with custom chapter and difficulty rules or clone an exact previous configuration
            </p>
          </div>
        </div>

        {/* Clone / Reuse Previous Exam Config Card */}
        <Card className="border-primary/30 bg-primary/[0.02] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Reuse Previous Exam Configuration
                </CardTitle>
              </div>
              {clonedFromExamName && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5 text-xs bg-primary/10 text-primary border-primary/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Config Loaded: {clonedFromExamName}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleResetClonedConfig} 
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset Form
                  </Button>
                </div>
              )}
            </div>
            <CardDescription className="text-xs">
              Select any past exam to automatically copy its exact class, subjects, chapters, and difficulty distribution. New least-used questions will be selected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <Select 
                  value={selectedCloneExamId} 
                  onValueChange={(val) => {
                    setSelectedCloneExamId(val)
                    loadExamConfig(val)
                  }}
                  disabled={loadingPreviousExams || cloningLoading}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={loadingPreviousExams ? "Loading previous exams..." : "Select a previous exam to clone configuration..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {previousExams.map(ex => (
                      <SelectItem key={ex.id} value={ex.id}>
                        <span className="font-medium">{ex.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({ex.code}) • {ex.total_questions} questions • {ex.duration_minutes}m
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => selectedCloneExamId && loadExamConfig(selectedCloneExamId)}
                disabled={!selectedCloneExamId || cloningLoading}
                className="shrink-0"
              >
                {cloningLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading Config...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Apply Config
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exam Details Form */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Exam Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Exam Name</label>
                <Input
                  placeholder="e.g. JEE Main Mock Test 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Exam Code</label>
                <Input
                  placeholder="e.g. JEE-MAIN-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Start Time (IST)</label>
                <Input
                  type="datetime-local"
                  value={formData.start_time ? new Date(formData.start_time).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16) : ''}
                  onChange={(e) => {
                    const localDateTime = e.target.value
                    const istDateTime = new Date(localDateTime + '+05:30').toISOString()
                    setFormData({ ...formData, start_time: istDateTime })
                  }}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Duration (Minutes)</label>
                <Input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  min="1"
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Class Selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Class Selection</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading classes...
              </div>
            ) : (
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger className="max-w-md">
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
            )}
          </CardContent>
        </Card>

        {/* Sections */}
        {selectedClass && (
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Exam Sections</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add subjects as sections and configure chapter and difficulty rules
                  </p>
                </div>
                <Button onClick={addSection} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {sections.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No sections added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Add Section" above or load from a previous exam</p>
                  <Button onClick={addSection} size="sm" variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Section
                  </Button>
                </div>
              ) : (
                sections.map((section, index) => {
                  const sectionTotal = getSectionTotalQuestions(section)

                  return (
                    <Card key={index} className="border-2 shadow-sm overflow-hidden">
                      <CardHeader className="bg-muted/40 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <span className="font-semibold text-base">
                              Section {index + 1}: {section.section_name || 'Select Subject'}
                            </span>
                            {sectionTotal > 0 && (
                              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                                {sectionTotal} questions
                              </span>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            onClick={() => removeSection(index)}
                            title="Remove section"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Subject</label>
                            <Select
                              value={section.subject_id}
                              onValueChange={(value) => updateSection(index, 'subject_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
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

                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Section Display Name</label>
                            <Input
                              placeholder="e.g. Physics, Chemistry, Mathematics"
                              value={section.section_name}
                              onChange={(e) => updateSection(index, 'section_name', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Question Configuration when Subject is selected */}
                        {section.subject_id && (
                          <div className="mt-4 border rounded-lg p-4 bg-background">
                            <Tabs 
                              value={section.mode} 
                              onValueChange={(val) => updateSection(index, 'mode', val as 'chapter' | 'subject')}
                            >
                              <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="chapter" className="flex items-center gap-2 text-xs sm:text-sm">
                                  <Settings className="w-4 h-4" />
                                  Advanced Mode (Chapter-level)
                                </TabsTrigger>
                                <TabsTrigger value="subject" className="flex items-center gap-2 text-xs sm:text-sm">
                                  <Zap className="w-4 h-4" />
                                  Quick Mode (Subject-level)
                                </TabsTrigger>
                              </TabsList>

                              {/* Chapter-Level Selection (Enhanced) */}
                              <TabsContent value="chapter" className="space-y-4">
                                {section.loading_chapters ? (
                                  <div className="flex justify-center items-center py-8 text-muted-foreground text-sm gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Loading chapters and question counts...
                                  </div>
                                ) : section.chapters && section.chapters.length > 0 ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between pb-1">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        Select question count per chapter and difficulty:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs h-7 px-2 text-muted-foreground"
                                          onClick={() => toggleAllChapters(index, true)}
                                        >
                                          Expand All
                                        </Button>
                                        <span className="text-muted-foreground">•</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs h-7 px-2 text-muted-foreground"
                                          onClick={() => toggleAllChapters(index, false)}
                                        >
                                          Collapse All
                                        </Button>
                                      </div>
                                    </div>

                                    {section.chapters.map(chapter => {
                                      const isExpanded = section.expanded_chapters?.includes(chapter.id)
                                      const chapterRule = section.chapter_rules?.[chapter.id] || { easy: 0, medium: 0, hard: 0 }
                                      const chapterSelectedTotal = (chapterRule.easy || 0) + (chapterRule.medium || 0) + (chapterRule.hard || 0)
                                      const chapterAvailableTotal = chapter.counts.total

                                      return (
                                        <Collapsible 
                                          key={chapter.id} 
                                          open={isExpanded} 
                                          onOpenChange={() => toggleChapterExpanded(index, chapter.id)}
                                          className="border rounded-md transition-colors hover:border-primary/50"
                                        >
                                          <CollapsibleTrigger asChild>
                                            <Button 
                                              type="button"
                                              variant="ghost" 
                                              className="w-full justify-between h-auto py-2.5 px-3 hover:bg-muted/40"
                                            >
                                              <span className="font-medium text-left truncate mr-2 text-sm">{chapter.name}</span>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                  chapterSelectedTotal > 0 
                                                    ? 'bg-primary/10 text-primary font-semibold' 
                                                    : 'text-muted-foreground'
                                                }`}>
                                                  Selected: {chapterSelectedTotal}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  Total: {chapterAvailableTotal}
                                                </span>
                                                {isExpanded ? (
                                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                )}
                                              </div>
                                            </Button>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent className="p-4 border-t bg-muted/20">
                                            <div className="grid grid-cols-3 gap-4">
                                              <div>
                                                <label className="text-xs font-semibold text-green-600 block mb-0.5">Easy</label>
                                                <div className="text-[11px] text-muted-foreground mb-1.5">
                                                  Available: {chapter.counts.easy}
                                                </div>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max={chapter.counts.easy}
                                                  value={chapterRule.easy || ''}
                                                  onChange={(e) => updateChapterRule(
                                                    index, 
                                                    chapter.id, 
                                                    'easy', 
                                                    Math.max(0, Math.min(Number(e.target.value) || 0, chapter.counts.easy))
                                                  )}
                                                  placeholder="0"
                                                  disabled={chapter.counts.easy === 0}
                                                  className="h-9"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-xs font-semibold text-yellow-600 block mb-0.5">Medium</label>
                                                <div className="text-[11px] text-muted-foreground mb-1.5">
                                                  Available: {chapter.counts.medium}
                                                </div>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max={chapter.counts.medium}
                                                  value={chapterRule.medium || ''}
                                                  onChange={(e) => updateChapterRule(
                                                    index, 
                                                    chapter.id, 
                                                    'medium', 
                                                    Math.max(0, Math.min(Number(e.target.value) || 0, chapter.counts.medium))
                                                  )}
                                                  placeholder="0"
                                                  disabled={chapter.counts.medium === 0}
                                                  className="h-9"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-xs font-semibold text-red-600 block mb-0.5">Hard</label>
                                                <div className="text-[11px] text-muted-foreground mb-1.5">
                                                  Available: {chapter.counts.hard}
                                                </div>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max={chapter.counts.hard}
                                                  value={chapterRule.hard || ''}
                                                  onChange={(e) => updateChapterRule(
                                                    index, 
                                                    chapter.id, 
                                                    'hard', 
                                                    Math.max(0, Math.min(Number(e.target.value) || 0, chapter.counts.hard))
                                                  )}
                                                  placeholder="0"
                                                  disabled={chapter.counts.hard === 0}
                                                  className="h-9"
                                                />
                                              </div>
                                            </div>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-sm text-muted-foreground">
                                    No chapters found for this subject.
                                  </div>
                                )}
                              </TabsContent>

                              {/* Quick Subject-Level Mode */}
                              <TabsContent value="subject">
                                {section.loading_counts ? (
                                  <div className="flex justify-center items-center py-8 text-muted-foreground text-sm gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Loading question counts...
                                  </div>
                                ) : section.available_counts ? (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-sm font-medium text-green-600">Easy Questions</label>
                                        <div className="text-xs text-muted-foreground">
                                          Available: {section.available_counts.easy}
                                        </div>
                                        <Input
                                          type="number"
                                          min="0"
                                          max={section.available_counts.easy}
                                          value={section.difficulty_distribution.easy || ''}
                                          onChange={(e) => updateDifficulty(
                                            index, 
                                            'easy', 
                                            Math.max(0, Math.min(Number(e.target.value) || 0, section.available_counts?.easy || 0))
                                          )}
                                          placeholder="0"
                                          className="h-9"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-sm font-medium text-yellow-600">Medium Questions</label>
                                        <div className="text-xs text-muted-foreground">
                                          Available: {section.available_counts.medium}
                                        </div>
                                        <Input
                                          type="number"
                                          min="0"
                                          max={section.available_counts.medium}
                                          value={section.difficulty_distribution.medium || ''}
                                          onChange={(e) => updateDifficulty(
                                            index, 
                                            'medium', 
                                            Math.max(0, Math.min(Number(e.target.value) || 0, section.available_counts?.medium || 0))
                                          )}
                                          placeholder="0"
                                          className="h-9"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-sm font-medium text-red-600">Hard Questions</label>
                                        <div className="text-xs text-muted-foreground">
                                          Available: {section.available_counts.hard}
                                        </div>
                                        <Input
                                          type="number"
                                          min="0"
                                          max={section.available_counts.hard}
                                          value={section.difficulty_distribution.hard || ''}
                                          onChange={(e) => updateDifficulty(
                                            index, 
                                            'hard', 
                                            Math.max(0, Math.min(Number(e.target.value) || 0, section.available_counts?.hard || 0))
                                          )}
                                          placeholder="0"
                                          className="h-9"
                                        />
                                      </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Questions will be randomly picked from all chapters in this subject according to usage frequency.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-sm text-muted-foreground">
                                    Select a subject to load available question counts.
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>

                            <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Section Total: <strong className="text-foreground text-sm font-semibold">{sectionTotal}</strong> questions
                              </span>
                              <span className="bg-muted px-2 py-0.5 rounded text-[11px]">
                                {section.mode === 'chapter' ? 'Chapter-level mode' : 'Subject-level mode'}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary and Submit */}
        {getTotalQuestions() > 0 && (
          <Card className="shadow-sm border-primary/30 bg-primary/[0.02]">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">
                    Total Questions: {getTotalQuestions()} across {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Duration: {formData.duration_minutes} minutes • Marking: +4.0, -1.0
                  </div>
                </div>
                <Button 
                  type="button" 
                  size="lg"
                  onClick={handleSubmit} 
                  disabled={submitting || getTotalQuestions() === 0}
                  className="w-full sm:w-auto"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Multi-Subject Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">🎯 Multi-Subject Exam & Chapter Selection</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Features:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-xs sm:text-sm">
              <li><strong>Reuse Configuration:</strong> Clone the exact chapter and difficulty configuration from any previously created exam with one click.</li>
              <li><strong>Advanced Mode (Chapter-level):</strong> Select exactly how many Easy, Medium, and Hard questions come from each specific chapter.</li>
              <li><strong>Quick Mode (Subject-level):</strong> Specify overall difficulty distribution across the entire subject.</li>
              <li><strong>Usage-Aware Selection:</strong> Questions that have been least used in past exams are prioritized to ensure balanced question rotation.</li>
              <li><strong>Section Navigation:</strong> Students can navigate between sections during the exam, with results analyzed both overall and per-section.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateMultiSubjectExam