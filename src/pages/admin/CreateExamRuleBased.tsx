import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface Subject {
  id: string
  name: string
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

const CreateExam = () => {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [rules, setRules] = useState<Rules>({})
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '',
    duration_minutes: 180
  })

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters(selectedSubject)
    }
  }, [selectedSubject])

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name')

      if (error) throw error
      setSubjects(data || [])
    } catch (error: any) {
      toast.error('Failed to fetch subjects: ' + error.message)
    } finally {
      setLoading(false)
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

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId)
    setRules({})
    setChapters([])
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
      
      const response = await fetch('http://localhost:3001/api/admin/create-rule-based-exam', {
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
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        {/* Subject Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subject Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSubject} onValueChange={handleSubjectChange}>
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
          </CardContent>
        </Card>

        {/* Chapter Rules */}
        {selectedSubject && chapters.length > 0 && (
          <Card className="mb-6">
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

        {/* Summary */}
        {getTotalQuestions() > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total Questions: {getTotalQuestions()} • Duration: {formData.duration_minutes} minutes
                </div>
                <Button type="submit" onClick={handleSubmit} disabled={submitting || getTotalQuestions() === 0}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Rule-Based Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rule-Based Logic Explanation */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🎯 Rule-Based Exam Creation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Select a subject and configure question counts per chapter and difficulty</li>
              <li>System randomly selects questions matching your criteria</li>
              <li>Questions are automatically distributed across topics within each chapter</li>
              <li>All selected questions are snapshotted to preserve exam integrity</li>
              <li>No duplicate questions will be selected</li>
            </ul>
            <p><strong>Example Rule JSON:</strong></p>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{JSON.stringify({
  "Physics": {
    "Kinematics": { "easy": 3, "medium": 5, "hard": 2 },
    "Laws of Motion": { "easy": 2, "medium": 3 }
  }
}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateExam