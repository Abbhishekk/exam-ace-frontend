import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowLeft, Upload, X, Image } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '@/lib/envs'

interface Topic {
  id: string
  name: string
  chapters: {
    name: string
    subjects: {
      name: string
      classes: { name: string }
    }
  }
}

interface Question {
  id: string
  question_text: string
  image_url?: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  marks: number
  negative_marks: number
  difficulty: string
  explanation?: string
  topic_id: string
  created_at: string
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

const QuestionBank = () => {
  const [topics, setTopics] = useState<Topic[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    topic_id: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: '',
    marks: 1,
    negative_marks: 0.25,
    difficulty: '',
    explanation: '',
    image_url: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired. Please login again.')
        return
      }

      const formDataUpload = new FormData()
      formDataUpload.append('image', file)

      const response = await fetch(`${API_BASE_URL}/api/admin/upload-question-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formDataUpload
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload image')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, image_url: data.imageUrl }))
      setImagePreview(data.imageUrl)
      toast.success('Image uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload image: ' + error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }))
    setImagePreview(null)
  }

  const fetchData = async () => {
    try {
      // Fetch topics for dropdown
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          chapters!inner(
            name,
            subjects!inner(
              name,
              classes!inner(name)
            )
          )
        `)
        .order('name')

      if (topicsError) throw topicsError
      setTopics(topicsData || [])

      // Fetch questions with topic hierarchy
      const { data: questionsData, error: questionsError } = await supabase
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
          explanation,
          topic_id,
          created_at,
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

      if (questionsError) throw questionsError
      setQuestions(questionsData || [])
    } catch (error) {
      toast.error('Failed to fetch data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.topic_id || !formData.question_text.trim() || !formData.option_a.trim() || 
        !formData.option_b.trim() || !formData.option_c.trim() || !formData.option_d.trim() || 
        !formData.correct_option || !formData.difficulty) {
      toast.error('All fields except explanation and image are required')
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired. Please login again.')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topic_id: formData.topic_id,
          question_text: formData.question_text.trim(),
          option_a: formData.option_a.trim(),
          option_b: formData.option_b.trim(),
          option_c: formData.option_c.trim(),
          option_d: formData.option_d.trim(),
          correct_option: formData.correct_option,
          marks: formData.marks,
          negative_marks: formData.negative_marks,
          difficulty: formData.difficulty,
          explanation: formData.explanation.trim(),
          image_url: formData.image_url || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create question')
      }
      
      toast.success('Question added successfully')
      setFormData({
        topic_id: '',
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: '',
        marks: 1,
        negative_marks: 0.25,
        difficulty: '',
        explanation: '',
        image_url: ''
      })
      setImagePreview(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to add question: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Question deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete question: ' + error.message)
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
          <h1 className="text-3xl font-bold">Question Bank</h1>
        </div>

        {/* Add Question Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Topic Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  value={formData.topic_id}
                  onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.chapters.subjects.classes.name} - {topic.chapters.subjects.name} - {topic.chapters.name} - {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question Text */}
              <Textarea
                placeholder="Enter question text"
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                rows={3}
              />

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Image (Optional)</label>
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <Image className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload image
                          </span>
                          <input
                            id="image-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    </div>
                    {uploadingImage && (
                      <div className="mt-2 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Question preview"
                      className="max-w-full h-48 object-contain border rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Option A"
                  value={formData.option_a}
                  onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                />
                <Input
                  placeholder="Option B"
                  value={formData.option_b}
                  onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                />
                <Input
                  placeholder="Option C"
                  value={formData.option_c}
                  onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                />
                <Input
                  placeholder="Option D"
                  value={formData.option_d}
                  onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                />
              </div>

              {/* Correct Option and Marks */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  value={formData.correct_option}
                  onValueChange={(value) => setFormData({ ...formData, correct_option: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Correct option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Option A</SelectItem>
                    <SelectItem value="B">Option B</SelectItem>
                    <SelectItem value="C">Option C</SelectItem>
                    <SelectItem value="D">Option D</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Marks"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                  min="0"
                  step="0.25"
                />

                <Input
                  type="number"
                  placeholder="Negative marks"
                  value={formData.negative_marks}
                  onChange={(e) => setFormData({ ...formData, negative_marks: Number(e.target.value) })}
                  min="0"
                  step="0.25"
                />

                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Question'}
                </Button>
              </div>

              {/* Explanation */}
              <Textarea
                placeholder="Explanation (optional)"
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={2}
              />
            </form>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions found. Add your first question above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="text-sm">
                          {question.topics.chapters.subjects.classes.name} - {question.topics.name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{question.question_text}</TableCell>
                        <TableCell>
                          {question.image_url ? (
                            <img
                              src={question.image_url}
                              alt="Question image"
                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => setModalImage(question.image_url)}
                            />
                          ) : (
                            <span className="text-gray-400 text-sm">No image</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          A: {question.option_a.substring(0, 20)}...<br/>
                          B: {question.option_b.substring(0, 20)}...<br/>
                          C: {question.option_c.substring(0, 20)}...<br/>
                          D: {question.option_d.substring(0, 20)}...
                        </TableCell>
                        <TableCell className="font-medium">{question.correct_option}</TableCell>
                        <TableCell>{question.marks} / -{question.negative_marks}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(question.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <img
              src={modalImage}
              alt="Question image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionBank