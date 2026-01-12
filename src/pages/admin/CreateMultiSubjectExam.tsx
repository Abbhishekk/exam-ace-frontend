import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Plus, X, BookOpen } from 'lucide-react'
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

interface ExamSection {
  subject_id: string
  section_name: string
  difficulty_distribution: DifficultyDistribution
  available_counts?: QuestionCounts
}

const CreateMultiSubjectExam = () => {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '',
    duration_minutes: 180
  })

  const [sections, setSections] = useState<ExamSection[]>([])

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects(selectedClass)
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

  const fetchQuestionCounts = async (subjectId: string, sectionIndex: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}/api/admin/subject-question-counts/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch question counts')

      const result = await response.json()
      
      setSections(prev => prev.map((section, index) => 
        index === sectionIndex 
          ? { ...section, available_counts: result.counts }
          : section
      ))
    } catch (error: any) {
      toast.error('Failed to fetch question counts: ' + error.message)
    }
  }

  const addSection = () => {
    setSections(prev => [...prev, {
      subject_id: '',
      section_name: '',
      difficulty_distribution: { easy: 0, medium: 0, hard: 0 }
    }])
  }

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index))
  }

  const updateSection = (index: number, field: keyof ExamSection, value: any) => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, [field]: value } : section
    ))

    // Fetch question counts when subject is selected
    if (field === 'subject_id' && value) {
      const subject = subjects.find(s => s.id === value)
      if (subject) {
        setSections(prev => prev.map((section, i) => 
          i === index ? { ...section, section_name: subject.name } : section
        ))
        fetchQuestionCounts(value, index)
      }
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

  const getTotalQuestions = () => {
    return sections.reduce((total, section) => {
      const { easy, medium, hard } = section.difficulty_distribution
      return total + easy + medium + hard
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.start_time) {
      toast.error('All exam fields are required')
      return
    }

    if (sections.length === 0) {
      toast.error('Please add at least one section')
      return
    }

    // Validate sections
    for (const section of sections) {
      if (!section.subject_id || !section.section_name.trim()) {
        toast.error('All sections must have a subject selected')
        return
      }
      
      const total = section.difficulty_distribution.easy + 
                   section.difficulty_distribution.medium + 
                   section.difficulty_distribution.hard
      
      if (total === 0) {
        toast.error(`Section "${section.section_name}" must have at least one question`)
        return
      }
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
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
          sections: sections.map(section => ({
            subject_id: section.subject_id,
            section_name: section.section_name.trim(),
            difficulty_distribution: section.difficulty_distribution
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create exam')
      }

      const result = await response.json()
      toast.success(`Multi-subject exam created! ${result.total_questions} questions across ${result.sections_created} sections.`)
      navigate('/admin')
    } catch (error: any) {
      toast.error('Failed to create exam: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

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
          <h1 className="text-3xl font-bold">Create Multi-Subject Exam</h1>
        </div>

        {/* Exam Details */}
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

        {/* Class Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Class Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
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
          </CardContent>
        </Card>

        {/* Sections */}
        {selectedClass && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exam Sections</CardTitle>
                <Button onClick={addSection} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {sections.map((section, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        <span className="font-medium">Section {index + 1}</span>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => removeSection(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <Input
                        placeholder="Section name"
                        value={section.section_name}
                        onChange={(e) => updateSection(index, 'section_name', e.target.value)}
                      />
                    </div>

                    {section.available_counts && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-green-600">Easy Questions</label>
                          <div className="text-xs text-muted-foreground">
                            Available: {section.available_counts.easy}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={section.available_counts.easy}
                            value={section.difficulty_distribution.easy || ''}
                            onChange={(e) => updateDifficulty(index, 'easy', Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-yellow-600">Medium Questions</label>
                          <div className="text-xs text-muted-foreground">
                            Available: {section.available_counts.medium}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={section.available_counts.medium}
                            value={section.difficulty_distribution.medium || ''}
                            onChange={(e) => updateDifficulty(index, 'medium', Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-red-600">Hard Questions</label>
                          <div className="text-xs text-muted-foreground">
                            Available: {section.available_counts.hard}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={section.available_counts.hard}
                            value={section.difficulty_distribution.hard || ''}
                            onChange={(e) => updateDifficulty(index, 'hard', Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {getTotalQuestions() > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total Questions: {getTotalQuestions()} • Sections: {sections.length} • Duration: {formData.duration_minutes} minutes
                </div>
                <Button 
                  type="submit" 
                  onClick={handleSubmit} 
                  disabled={submitting || getTotalQuestions() === 0}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Multi-Subject Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 JEE-Style Multi-Subject Exams</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Each subject becomes a separate section in the exam</li>
              <li>Questions are organized section-wise (Physics → Chemistry → Maths)</li>
              <li>Students can navigate between sections during the exam</li>
              <li>Results are calculated both section-wise and overall</li>
              <li>Usage-aware selection ensures fair question distribution</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateMultiSubjectExam