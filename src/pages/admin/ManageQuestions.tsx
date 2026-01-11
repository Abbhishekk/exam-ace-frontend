import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowLeft, X, Image, Eye, Edit, Filter, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '@/lib/envs'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

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

interface Topic {
  id: string
  name: string
  chapter_id: string
  chapters: {
    name: string
    subjects: {
      name: string
      classes: { name: string }
    }
  }
}

interface Filters {
  classId: string
  subjectId: string
  chapterId: string
  topicId: string
  searchText: string
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

const ManageQuestions = () => {
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingExplanationImage, setUploadingExplanationImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [explanationImagePreview, setExplanationImagePreview] = useState<string | null>(null)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  
  // Hierarchical selection state for form
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    classId: '',
    subjectId: '',
    chapterId: '',
    topicId: '',
    searchText: ''
  })
  
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: '',
    marks: 4,
    negative_marks: 1,
    difficulty: '',
    explanation: '',
    image_url: '',
    explanation_image_url: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Filter logic for form dropdowns
  const formSubjects = useMemo(() => {
    return selectedClass 
      ? subjects.filter(s => s.class_id === selectedClass)
      : []
  }, [subjects, selectedClass])

  const formChapters = useMemo(() => {
    return selectedSubject 
      ? chapters.filter(c => c.subject_id === selectedSubject)
      : []
  }, [chapters, selectedSubject])

  const formTopics = useMemo(() => {
    return selectedChapter 
      ? topics.filter(t => t.chapter_id === selectedChapter)
      : []
  }, [topics, selectedChapter])

  // Filter logic for table filters
  const filteredSubjects = useMemo(() => {
    return filters.classId 
      ? subjects.filter(s => s.class_id === filters.classId)
      : subjects
  }, [subjects, filters.classId])

  const filteredChapters = useMemo(() => {
    return filters.subjectId 
      ? chapters.filter(c => c.subject_id === filters.subjectId)
      : chapters
  }, [chapters, filters.subjectId])

  const filteredTopics = useMemo(() => {
    return filters.chapterId 
      ? topics.filter(t => t.chapter_id === filters.chapterId)
      : topics
  }, [topics, filters.chapterId])

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      // Class filter
      if (filters.classId && question.topics?.chapters?.subjects?.classes?.name !== classes.find(c => c.id === filters.classId)?.name) {
        return false
      }
      
      // Subject filter
      if (filters.subjectId && question.topics?.chapters?.subjects?.name !== subjects.find(s => s.id === filters.subjectId)?.name) {
        return false
      }
      
      // Chapter filter
      if (filters.chapterId && question.topics?.chapters?.name !== chapters.find(c => c.id === filters.chapterId)?.name) {
        return false
      }
      
      // Topic filter
      if (filters.topicId && question.topic_id !== filters.topicId) {
        return false
      }
      
      // Search filter
      if (filters.searchText && !question.question_text.toLowerCase().includes(filters.searchText.toLowerCase())) {
        return false
      }
      
      return true
    })
  }, [questions, filters, classes, subjects, chapters])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value === 'all' ? '' : value }
      
      // Reset dependent filters
      if (key === 'classId') {
        newFilters.subjectId = ''
        newFilters.chapterId = ''
        newFilters.topicId = ''
      } else if (key === 'subjectId') {
        newFilters.chapterId = ''
        newFilters.topicId = ''
      } else if (key === 'chapterId') {
        newFilters.topicId = ''
      }
      
      return newFilters
    })
  }

  // Math rendering helper
const renderMath = (content: string) => {
  if (!content) return null

  // Split by block math first ($$...$$)
  const blockSplit = content.split(/(\$\$[\s\S]*?\$\$)/g)

  return blockSplit.map((block, blockIndex) => {
    // Block math
    if (block.startsWith("$$") && block.endsWith("$$")) {
      return (
        <BlockMath key={blockIndex}>
          {block.slice(2, -2)}
        </BlockMath>
      )
    }

    // Split remaining text by inline math ($...$)
    const inlineSplit = block.split(/(\$[^$]+\$)/g)

    return inlineSplit.map((inline, inlineIndex) => {
      if (inline.startsWith("$") && inline.endsWith("$")) {
        return (
          <InlineMath key={`${blockIndex}-${inlineIndex}`}>
            {inline.slice(1, -1)}
          </InlineMath>
        )
      }

      return (
        <span key={`${blockIndex}-${inlineIndex}`}>
          {inline}
        </span>
      )
    })
  })
}


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'question' | 'explanation' = 'question') => {
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

    const setUploading = type === 'question' ? setUploadingImage : setUploadingExplanationImage
    setUploading(true)
    
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
      
      if (type === 'question') {
        setFormData(prev => ({ ...prev, image_url: data.imageUrl }))
        setImagePreview(data.imageUrl)
      } else {
        setFormData(prev => ({ ...prev, explanation_image_url: data.imageUrl }))
        setExplanationImagePreview(data.imageUrl)
      }
      
      toast.success(`${type === 'question' ? 'Question' : 'Explanation'} image uploaded successfully`)
    } catch (error) {
      toast.error('Failed to upload image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (type: 'question' | 'explanation' = 'question') => {
    if (type === 'question') {
      setFormData(prev => ({ ...prev, image_url: '' }))
      setImagePreview(null)
    } else {
      setFormData(prev => ({ ...prev, explanation_image_url: '' }))
      setExplanationImagePreview(null)
    }
  }

  const fetchData = async () => {
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')

      if (classesError) throw classesError
      setClasses(classesData || [])

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, class_id')
        .order('name')

      if (subjectsError) throw subjectsError
      setSubjects(subjectsData || [])

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, name, subject_id')
        .order('name')

      if (chaptersError) throw chaptersError
      setChapters(chaptersData || [])

      // Fetch topics for dropdown
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          chapter_id,
          chapters(
            name,
            subjects(
              name,
              classes(name)
            )
          )
        `)
        .order('name')

      if (topicsError) throw topicsError
      setTopics(topicsData as Topic[] || [])

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
          topics(
            name,
            chapters(
              name,
              subjects(
                name,
                classes(name)
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (questionsError) throw questionsError
      setQuestions(questionsData as Question[] || [])
    } catch (error) {
      toast.error('Failed to fetch data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTopic || !formData.question_text.trim() || !formData.option_a.trim() || 
        !formData.option_b.trim() || !formData.option_c.trim() || !formData.option_d.trim() || 
        !formData.correct_option || !formData.difficulty) {
      toast.error('All fields except explanation and images are required')
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
          topic_id: selectedTopic,
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
      // Only reset form fields, keep selections
      setFormData({
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
        image_url: '',
        explanation_image_url: ''
      })
      setImagePreview(null)
      setExplanationImagePreview(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to add question: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_option: question.correct_option,
      marks: question.marks,
      negative_marks: question.negative_marks,
      difficulty: question.difficulty,
      explanation: question.explanation || '',
      image_url: question.image_url || '',
      explanation_image_url: ''
    })
    setImagePreview(question.image_url || null)
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingQuestion || !formData.question_text.trim() || !formData.option_a.trim() || 
        !formData.option_b.trim() || !formData.option_c.trim() || !formData.option_d.trim() || 
        !formData.correct_option || !formData.difficulty) {
      toast.error('All fields except explanation and images are required')
      return
    }

    setEditing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired. Please login again.')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
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
        throw new Error(error.error || 'Failed to update question')
      }
      
      toast.success('Question updated successfully')
      setEditModalOpen(false)
      setEditingQuestion(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to update question: ' + error.message)
    } finally {
      setEditing(false)
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hierarchical Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Select Topic Hierarchy</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select
                    value={selectedClass}
                    onValueChange={(value) => {
                      setSelectedClass(value)
                      setSelectedSubject('')
                      setSelectedChapter('')
                      setSelectedTopic('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedSubject}
                    onValueChange={(value) => {
                      setSelectedSubject(value)
                      setSelectedChapter('')
                      setSelectedTopic('')
                    }}
                    disabled={!selectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {formSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedChapter}
                    onValueChange={(value) => {
                      setSelectedChapter(value)
                      setSelectedTopic('')
                    }}
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {formChapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedTopic}
                    onValueChange={setSelectedTopic}
                    disabled={!selectedChapter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {formTopics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Question Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Question Details</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question Text (supports LaTeX: $x^2$ or $$E=mc^2$$)</label>
                  <Textarea
                    placeholder="Enter question text with LaTeX support: $v = u + at$ or $$F = ma$$"
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    rows={3}
                  />
                  {showPreview && formData.question_text && (
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <div className="text-sm font-medium mb-2">Preview:</div>
                      <div>{renderMath(formData.question_text)}</div>
                    </div>
                  )}
                </div>

                {/* Question Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question Image (Optional)</label>
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Image className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-2">
                          <label htmlFor="question-image-upload" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              Click to upload question image
                            </span>
                            <input
                              id="question-image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'question')}
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
                        onClick={() => removeImage('question')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Options (supports LaTeX)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['option_a', 'option_b', 'option_c', 'option_d'].map((option, index) => (
                      <div key={option} className="space-y-1">
                        <Input
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          value={formData[option as keyof typeof formData] as string}
                          onChange={(e) => setFormData({ ...formData, [option]: e.target.value })}
                        />
                        {showPreview && formData[option as keyof typeof formData] && (
                          <div className="text-xs p-2 border rounded bg-gray-50">
                            {renderMath(formData[option as keyof typeof formData] as string)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correct Option */}
                <Select
                  value={formData.correct_option}
                  onValueChange={(value) => setFormData({ ...formData, correct_option: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Option A</SelectItem>
                    <SelectItem value="B">Option B</SelectItem>
                    <SelectItem value="C">Option C</SelectItem>
                    <SelectItem value="D">Option D</SelectItem>
                  </SelectContent>
                </Select>

                {/* Explanation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Explanation (Optional, supports LaTeX)</label>
                  <Textarea
                    placeholder="Enter explanation with LaTeX support..."
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    rows={3}
                  />
                  {showPreview && formData.explanation && (
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <div className="text-sm font-medium mb-2">Explanation Preview:</div>
                      <div>{renderMath(formData.explanation)}</div>
                    </div>
                  )}
                </div>

                {/* Explanation Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Explanation Image (Optional)</label>
                  {!explanationImagePreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Image className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-2">
                          <label htmlFor="explanation-image-upload" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              Click to upload explanation image
                            </span>
                            <input
                              id="explanation-image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'explanation')}
                              disabled={uploadingExplanationImage}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      </div>
                      {uploadingExplanationImage && (
                        <div className="mt-2 flex justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={explanationImagePreview}
                        alt="Explanation preview"
                        className="max-w-full h-48 object-contain border rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeImage('explanation')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={submitting || !selectedTopic} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Question
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select
                value={filters.classId || 'all'}
                onValueChange={(value) => handleFilterChange('classId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.subjectId || 'all'}
                onValueChange={(value) => handleFilterChange('subjectId', value)}
                disabled={!filters.classId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.chapterId || 'all'}
                onValueChange={(value) => handleFilterChange('chapterId', value)}
                disabled={!filters.subjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chapters</SelectItem>
                  {filteredChapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.topicId || 'all'}
                onValueChange={(value) => handleFilterChange('topicId', value)}
                disabled={!filters.chapterId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {filteredTopics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search questions..."
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Questions ({filteredQuestions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {questions.length === 0 ? 'No questions found. Add your first question above.' : 'No questions match the current filters.'}
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
                    {filteredQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="text-sm">
                          {question.topics.chapters.subjects.classes.name} - {question.topics.name}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{renderMath(question.question_text)}</div>
                        </TableCell>
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
                          <div className="space-y-1">
                            <div>A: {renderMath(question.option_a.substring(0, 20) + '...')}</div>
                            <div>B: {renderMath(question.option_b.substring(0, 20) + '...')}</div>
                            <div>C: {renderMath(question.option_c.substring(0, 20) + '...')}</div>
                            <div>D: {renderMath(question.option_d.substring(0, 20) + '...')}</div>
                          </div>
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
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(question)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(question.id)}
                            >
                              Delete
                            </Button>
                          </div>
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

      {/* Edit Question Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          
          {editingQuestion && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Topic: {editingQuestion.topics.chapters.subjects.classes.name} → {editingQuestion.topics.chapters.subjects.name} → {editingQuestion.topics.chapters.name} → {editingQuestion.topics.name}
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Question Details</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-2">
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
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Text</label>
                <Textarea
                  placeholder="Enter question text with LaTeX support"
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  rows={3}
                />
                {showPreview && formData.question_text && (
                  <div className="p-3 border rounded-lg bg-gray-50">
                    <div className="text-sm font-medium mb-2">Preview:</div>
                    <div>{renderMath(formData.question_text)}</div>
                  </div>
                )}
              </div>

              {/* Question Image */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Image</label>
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <Image className="mx-auto h-8 w-8 text-gray-400" />
                      <div className="mt-2">
                        <label htmlFor="edit-question-image" className="cursor-pointer">
                          <span className="text-sm font-medium text-gray-900">
                            Click to upload image
                          </span>
                          <input
                            id="edit-question-image"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'question')}
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
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
                      className="max-w-full h-32 object-contain border rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeImage('question')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['option_a', 'option_b', 'option_c', 'option_d'].map((option, index) => (
                    <div key={option} className="space-y-1">
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        value={formData[option as keyof typeof formData] as string}
                        onChange={(e) => setFormData({ ...formData, [option]: e.target.value })}
                      />
                      {showPreview && formData[option as keyof typeof formData] && (
                        <div className="text-xs p-2 border rounded bg-gray-50">
                          {renderMath(formData[option as keyof typeof formData] as string)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Correct Option */}
              <Select
                value={formData.correct_option}
                onValueChange={(value) => setFormData({ ...formData, correct_option: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select correct option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Option A</SelectItem>
                  <SelectItem value="B">Option B</SelectItem>
                  <SelectItem value="C">Option C</SelectItem>
                  <SelectItem value="D">Option D</SelectItem>
                </SelectContent>
              </Select>

              {/* Explanation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Explanation (Optional)</label>
                <Textarea
                  placeholder="Enter explanation with LaTeX support"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  rows={3}
                />
                {showPreview && formData.explanation && (
                  <div className="p-3 border rounded-lg bg-gray-50">
                    <div className="text-sm font-medium mb-2">Explanation Preview:</div>
                    <div>{renderMath(formData.explanation)}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editing}>
                  {editing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update Question
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ManageQuestions