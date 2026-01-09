import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowLeft, Clock, FileText } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  marks: number
  negative_marks: number
  difficulty: string
  topics: {
    name: string
    chapters: {
      name: string
      subjects: {
        name: string
        classes: { name: string }
      }
    }
  }
}

const CreateExam = () => {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '',
    duration_minutes: 60
  })

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          image_url,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          marks,
          negative_marks,
          difficulty,
          topics!inner(
            name,
            chapters!inner(
              name,
              subjects!inner(
                name,
                classes!inner(name)
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuestions(data || [])
    } catch (error: any) {
      toast.error('Failed to fetch questions: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuestions)
    if (checked) {
      newSelected.add(questionId)
    } else {
      newSelected.delete(questionId)
    }
    setSelectedQuestions(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(new Set(questions.map(q => q.id)))
    } else {
      setSelectedQuestions(new Set())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.start_time || selectedQuestions.size === 0) {
      toast.error('All fields are required and at least one question must be selected')
      return
    }

    setSubmitting(true)
    try {
      // Check if exam code already exists
      const { data: existingExam } = await supabase
        .from('exams')
        .select('code')
        .eq('code', formData.code.trim())
        .single()

      if (existingExam) {
        toast.error('Exam code already exists. Please use a different code.')
        return
      }

      // Step 1: Insert exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert([{
          name: formData.name.trim(),
          code: formData.code.trim(),
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          total_questions: selectedQuestions.size,
          marks_per_question: questions.find(q => selectedQuestions.has(q.id))?.marks || 1,
          negative_marks: questions.find(q => selectedQuestions.has(q.id))?.negative_marks || 0.25
        }])
        .select()
        .single()

      if (examError) throw examError

      // Step 2: Create question snapshots in exam_questions
      const selectedQuestionsData = questions.filter(q => selectedQuestions.has(q.id))
      const examQuestions = selectedQuestionsData.map((question, index) => ({
        exam_id: examData.id,
        question_text: question.question_text,
        image_url: question.image_url,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        correct_option: question.correct_option,
        marks: question.marks,
        negative_marks: question.negative_marks,
        difficulty: question.difficulty,
        order_index: index + 1,
        original_question_id: question.id
      }))

      const { error: questionsError } = await supabase
        .from('exam_questions')
        .insert(examQuestions)

      if (questionsError) throw questionsError

      toast.success('Exam created successfully!')
      navigate('/admin')
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Exam code already exists. Please use a different code.')
      } else {
        toast.error('Failed to create exam: ' + error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalMarks = Array.from(selectedQuestions).reduce((sum, qId) => {
    const question = questions.find(q => q.id === qId)
    return sum + (question?.marks || 0)
  }, 0)

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
          <h1 className="text-3xl font-bold">Create Exam</h1>
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
                  // Convert to IST and save
                  const localDateTime = e.target.value
                  const istDateTime = new Date(localDateTime + '+05:30').toISOString()
                  setFormData({ ...formData, start_time: istDateTime })
                }}
              />
              <span className="text-xs text-muted-foreground mt-1">Time in IST</span>
              
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  min="1"
                />
                <Button type="submit" disabled={submitting || selectedQuestions.size === 0}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Exam'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Selection Summary */}
        {selectedQuestions.size > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Selected: {selectedQuestions.size} questions</span>
                </div>
                <div>Total Marks: {totalMarks}</div>
                <div>Duration: {formData.duration_minutes} minutes</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Questions</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedQuestions.size === questions.length && questions.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">Select All</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions found. Add questions to the question bank first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Select</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedQuestions.has(question.id)}
                            onCheckedChange={(checked) => handleQuestionSelect(question.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {question.topics.chapters.subjects.classes.name} - {question.topics.name}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate">{question.question_text}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            A: {question.option_a.substring(0, 30)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                        </TableCell>
                        <TableCell>{question.marks} / -{question.negative_marks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Snapshot Logic Explanation */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📸 Snapshot Logic Explanation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Why Snapshots?</strong> Questions in the question bank may be edited or deleted after exam creation. Snapshots ensure exam integrity.</p>
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Selected questions are copied (not referenced) to <code>exam_questions</code> table</li>
              <li>All question data (text, options, correct answer, marks) is duplicated</li>
              <li>Original question ID is stored as <code>original_question_id</code> for reference</li>
              <li>Questions get <code>order_index</code> for consistent exam presentation</li>
              <li>Future changes to question bank won't affect existing exams</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateExam