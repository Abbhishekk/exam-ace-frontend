import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowLeft, Wand2, FileText } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface Subject {
  id: string
  name: string
}

interface Rules {
  [subject: string]: {
    easy: number
    medium: number
    hard: number
  }
}

const RuleBasedExamCreation = () => {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [rules, setRules] = useState<Rules>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '',
    duration_minutes: 60,
    marks_per_question: 1,
    negative_marks: 0.25
  })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name')

      if (error) throw error
      
      const subjectList = data || []
      setSubjects(subjectList)
      
      // Initialize rules for each subject
      const initialRules: Rules = {}
      subjectList.forEach(subject => {
        initialRules[subject.name] = { easy: 0, medium: 0, hard: 0 }
      })
      setRules(initialRules)
    } catch (error: any) {
      toast.error('Failed to fetch subjects: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRule = (subject: string, difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    setRules(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [difficulty]: Math.max(0, count)
      }
    }))
  }

  const getTotalQuestions = () => {
    return Object.values(rules).reduce((total, difficulties) => 
      total + difficulties.easy + difficulties.medium + difficulties.hard, 0
    )
  }

  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.start_time) {
      toast.error('Please fill all exam details')
      return
    }

    const totalQuestions = getTotalQuestions()
    if (totalQuestions === 0) {
      toast.error('Please specify at least one question in the rules')
      return
    }

    // Filter out subjects with zero questions
    const filteredRules = Object.fromEntries(
      Object.entries(rules).filter(([_, difficulties]) => 
        difficulties.easy + difficulties.medium + difficulties.hard > 0
      )
    )

    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired. Please login again.')
        return
      }

      // Step 1: Generate question paper using rules
      const response = await fetch('http://localhost:3001/api/admin/generate-question-paper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rules: filteredRules })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate question paper')
      }

      const generationResult = await response.json()
      
      if (!generationResult.success) {
        throw new Error(generationResult.error)
      }

      // Step 2: Create exam with generated questions
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert([{
          name: formData.name.trim(),
          code: formData.code.trim(),
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          total_questions: generationResult.total_questions,
          marks_per_question: formData.marks_per_question,
          negative_marks: formData.negative_marks
        }])
        .select()
        .single()

      if (examError) {
        if (examError.code === '23505') {
          throw new Error('Exam code already exists. Please use a different code.')
        }
        throw examError
      }

      // Step 3: Fetch selected questions and create exam snapshots
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', generationResult.selected_question_ids)

      if (questionsError) throw questionsError

      // Create exam questions with order based on generation result
      const examQuestions = generationResult.selected_question_ids.map((questionId: string, index: number) => {
        const question = questions.find(q => q.id === questionId)
        if (!question) throw new Error(`Question ${questionId} not found`)
        
        return {
          exam_id: examData.id,
          question_text: question.question_text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_option: question.correct_option,
          marks: formData.marks_per_question,
          negative_marks: formData.negative_marks,
          difficulty: question.difficulty,
          order_index: index + 1,
          original_question_id: question.id
        }
      })

      const { error: insertError } = await supabase
        .from('exam_questions')
        .insert(examQuestions)

      if (insertError) throw insertError

      toast.success(`Exam created successfully with ${generationResult.total_questions} questions!`)
      navigate('/admin/exams')
    } catch (error: any) {
      toast.error('Failed to create exam: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading subjects...</div>
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin/exams">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exams
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Rule-Based Exam Creation</h1>
        </div>

        {/* Exam Details Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Exam Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateExam} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Exam name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Input
                placeholder="Exam code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              
              <Input
                type="datetime-local"
                value={formData.start_time ? new Date(formData.start_time).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16) : ''}
                onChange={(e) => {
                  const localDateTime = e.target.value
                  const istDateTime = new Date(localDateTime + '+05:30').toISOString()
                  setFormData({ ...formData, start_time: istDateTime })
                }}
                required
              />
              
              <Input
                type="number"
                placeholder="Duration (minutes)"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                min="1"
                required
              />
              
              <Input
                type="number"
                placeholder="Marks per question"
                value={formData.marks_per_question}
                onChange={(e) => setFormData({ ...formData, marks_per_question: Number(e.target.value) })}
                min="0.5"
                step="0.5"
                required
              />
              
              <Input
                type="number"
                placeholder="Negative marks"
                value={formData.negative_marks}
                onChange={(e) => setFormData({ ...formData, negative_marks: Number(e.target.value) })}
                min="0"
                step="0.25"
                required
              />
            </form>
          </CardContent>
        </Card>

        {/* Question Distribution Rules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Question Distribution Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Easy</TableHead>
                  <TableHead>Medium</TableHead>
                  <TableHead>Hard</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={rules[subject.name]?.easy || 0}
                        onChange={(e) => updateRule(subject.name, 'easy', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={rules[subject.name]?.medium || 0}
                        onChange={(e) => updateRule(subject.name, 'medium', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={rules[subject.name]?.hard || 0}
                        onChange={(e) => updateRule(subject.name, 'hard', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell className="font-semibold">
                      {(rules[subject.name]?.easy || 0) + (rules[subject.name]?.medium || 0) + (rules[subject.name]?.hard || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Total Questions: {getTotalQuestions()}
              </div>
              <Button 
                onClick={handleGenerateExam}
                disabled={generating || getTotalQuestions() === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Exam
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 How Rule-Based Generation Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Automated Question Selection:</strong> Specify how many questions you want from each subject and difficulty level.</p>
            <p><strong>Random Selection:</strong> Questions are randomly selected from the question bank based on your rules.</p>
            <p><strong>Balanced Distribution:</strong> Ensures fair representation across subjects and difficulty levels.</p>
            <p><strong>Validation:</strong> System checks if enough questions are available before creating the exam.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RuleBasedExamCreation