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
import { Plus, Loader2, ArrowLeft, X, Image, Eye, Edit, Filter, Search, ImagePlus, Upload, ChevronDown, ChevronUp, Sparkles, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '@/lib/envs'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'

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
  option_a_image_url?: string

  option_b: string
  option_b_image_url?: string

  option_c: string
  option_c_image_url?: string

  option_d: string
  option_d_image_url?: string
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

  const [showAddForm, setShowAddForm] = useState(false)
  const [showLatexHelp, setShowLatexHelp] = useState(false)
  const PAGE_SIZE = 10;
  const [QuestionCount, setQuestionCount] = useState();
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
    difficulty: 'easy',
    explanation: '',
    image_url: '',
    explanation_image_url: '',

    option_a_image_url: '',
    option_b_image_url: '',
    option_c_image_url: '',
    option_d_image_url: '',
  })

  useEffect(() => {
    fetchMasterData();
  }, []);

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

  const handleOptionImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    option: 'option_a' | 'option_b' | 'option_c' | 'option_d'
  ) => {
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

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Session expired. Please login again.')
        return
      }

      const formDataUpload = new FormData()

      formDataUpload.append('image', file)

      const response = await fetch(
        `${API_BASE_URL}/api/admin/upload-question-options-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formDataUpload
        }
      )

      const data = await response.json()

      const imageField = `${option}_image_url`

      setFormData(prev => {
        const updatedData = {
          ...prev,
          [imageField]: data.imageUrl
        }

        return updatedData
      })

      if (!response.ok) {
        const error = await response.json()

        throw new Error(
          error.error || 'Failed to upload option image'
        )
      }

      toast.success(
        `Option ${option.replace('option_', '').toUpperCase()} image uploaded successfully`
      )

    } catch (error: any) {
      toast.error(
        'Failed to upload option image: ' + error.message
      )
    } finally {
      // Allow selecting the same file again
      e.target.value = ''
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

  const fetchMasterData = async () => {
    setLoadingMore(true)
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

    } catch (error) {
      toast.error('Failed to fetch data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestions = async (
    pageNumber = 0,
    append = false
  ) => {
    try {
      setLoadingMore(true);

      let topicIds: string[] = [];

      // ----------------------------
      // Find topic ids from filters
      // ----------------------------

      if (filters.topicId) {
        topicIds = [filters.topicId];
      } else if (filters.chapterId) {
        topicIds = topics
          .filter(t => t.chapter_id === filters.chapterId)
          .map(t => t.id);
      } else if (filters.subjectId) {
        const chapterIds = chapters
          .filter(c => c.subject_id === filters.subjectId)
          .map(c => c.id);

        topicIds = topics
          .filter(t => chapterIds.includes(t.chapter_id))
          .map(t => t.id);
      } else if (filters.classId) {
        const subjectIds = subjects
          .filter(s => s.class_id === filters.classId)
          .map(s => s.id);

        const chapterIds = chapters
          .filter(c => subjectIds.includes(c.subject_id))
          .map(c => c.id);

        topicIds = topics
          .filter(t => chapterIds.includes(t.chapter_id))
          .map(t => t.id);
      }

      //---------------------------------------
      // Build Question Query
      //---------------------------------------

      let query = supabase
        .from("questions")
        .select(
          `
        id,
        question_text,
        image_url,
        option_a,
        option_a_image_url,
        option_b,
        option_b_image_url,
        option_c,
        option_c_image_url,
        option_d,
        option_d_image_url,
        correct_option,
        marks,
        negative_marks,
        difficulty,
        explanation,
        topic_id,
        created_at,
        topics(
          id,
          name,
          chapter_id,
          chapters(
            id,
            name,
            subject_id,
            subjects(
              id,
              name,
              class_id,
              classes(
                id,
                name
              )
            )
          )
        )
      `,
          { count: "exact" }
        );

      //---------------------------------------
      // Apply Filters
      //---------------------------------------

      if (topicIds.length > 0) {
        query = query.in("topic_id", topicIds);
      }

      if (filters.searchText) {
        query = query.ilike(
          "question_text",
          `%${filters.searchText}%`
        );
      }

      //---------------------------------------
      // Pagination
      //---------------------------------------

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(
          pageNumber * PAGE_SIZE,
          (pageNumber + 1) * PAGE_SIZE - 1
        );

      if (error) throw error;

      if (append) {
        setQuestions(prev => [...prev, ...(data || [])]);
      } else {
        setQuestions(data || []);
      }

      setQuestionCount(count || 0);

      setPage(pageNumber);

      setHasMore(
        (pageNumber + 1) * PAGE_SIZE < (count || 0)
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreQuestions = () => {
    fetchQuestions(page + 1, true);
  };

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
          option_a_image_url: formData.option_a_image_url || null,

          option_b: formData.option_b.trim(),
          option_b_image_url: formData.option_b_image_url || null,

          option_c: formData.option_c.trim(),
          option_c_image_url: formData.option_c_image_url || null,

          option_d: formData.option_d.trim(),
          option_d_image_url: formData.option_d_image_url || null,

          correct_option: formData.correct_option,

          marks: formData.marks,
          negative_marks: formData.negative_marks,
          difficulty: formData.difficulty,

          explanation: formData.explanation.trim(),

          image_url: formData.image_url || null,
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
        option_a_image_url: '',
        option_b: '',
        option_b_image_url: '',
        option_c: '',
        option_c_image_url: '',
        option_d: '',
        option_d_image_url: '',
        correct_option: '',
        marks: 4,
        negative_marks: 1,
        difficulty: 'easy',
        explanation: '',
        image_url: '',
        explanation_image_url: ''
      })
      setImagePreview(null)
      setExplanationImagePreview(null)
      // fetchData()
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
      option_a_image_url: question.option_a_image_url || '',

      option_b: question.option_b,
      option_b_image_url: question.option_b_image_url || '',

      option_c: question.option_c,
      option_c_image_url: question.option_c_image_url || '',

      option_d: question.option_d,
      option_d_image_url: question.option_d_image_url || '',

      correct_option: question.correct_option,

      marks: question.marks,
      negative_marks: question.negative_marks,
      difficulty: question.difficulty,

      explanation: question.explanation || '',
      explanation_image_url: question.explanation_image_url || '',

      image_url: question.image_url || ''
    })
    setImagePreview(question.image_url || null)
    setExplanationImagePreview(
      question.explanation_image_url || null
    )

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
          image_url: formData.image_url || null,

          option_a: formData.option_a.trim(),
          option_a_image_url:
            formData.option_a_image_url || null,

          option_b: formData.option_b.trim(),
          option_b_image_url:
            formData.option_b_image_url || null,

          option_c: formData.option_c.trim(),
          option_c_image_url:
            formData.option_c_image_url || null,

          option_d: formData.option_d.trim(),
          option_d_image_url:
            formData.option_d_image_url || null,

          correct_option: formData.correct_option,

          marks: formData.marks,
          negative_marks: formData.negative_marks,
          difficulty: formData.difficulty,

          explanation: formData.explanation.trim(),

          explanation_image_url:
            formData.explanation_image_url || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update question')
      }

      toast.success('Question updated successfully')
      setEditModalOpen(false)
      setEditingQuestion(null)
      // fetchData()
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
      // fetchData()
    } catch (error) {
      toast.error('Failed to delete question: ' + error.message)
    }
  }

  useEffect(() => {
    if (
      classes.length &&
      subjects.length &&
      chapters.length &&
      topics.length
    ) {
      fetchQuestions(0, false);
    }
  }, [classes, subjects, chapters, topics, filters]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                Curriculum Repository
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {QuestionCount ? `${QuestionCount.toLocaleString()} Total Questions` : "Loading..."}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              Question Bank
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Filter, search, edit and create JEE & NEET questions with LaTeX formulas and diagrams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLatexHelp(!showLatexHelp)}
              className="text-xs text-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              {showLatexHelp ? "Hide LaTeX Tips" : "LaTeX Guide"}
            </Button>
            <Link to="/admin/questions/import">
              <Button variant="outline" size="sm" className="text-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Bulk Import
              </Button>
            </Link>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {showAddForm ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1.5" />
                  Close Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Question
                </>
              )}
            </Button>
          </div>
        </div>

        {/* LaTeX Tips Card */}
        {showLatexHelp && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> LaTeX Math Formatting Cheatsheet
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShowLatexHelp(false)} className="h-6 px-2 text-xs">
                Dismiss
              </Button>
            </div>
            <p className="text-slate-600">
              Wrap inline formulas in single dollar signs: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-blue-700">$E = mc^2$</code>. Wrap block equations in double dollar signs: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-blue-700">$$\int_0^\infty e^{-x} dx$$</code>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <span className="bg-white/80 p-1.5 rounded border border-blue-100">$x^2 + y^2 = r^2$</span>
              <span className="bg-white/80 p-1.5 rounded border border-blue-100">\frac{"{a}"}{"{b}"}</span>
              <span className="bg-white/80 p-1.5 rounded border border-blue-100">\sqrt{"{x}"}</span>
              <span className="bg-white/80 p-1.5 rounded border border-blue-100">\theta, \lambda, \Delta</span>
            </div>
          </div>
        )}

        {/* Add Question Form (Collapsible) */}
        {showAddForm && (
        <Card className="border-blue-200 shadow-sm bg-white">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Add New Single Question
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select hierarchy topic, specify marking rules, and enter options.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
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
                  <label className="text-sm font-medium">
                    Options (supports LaTeX)
                  </label>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {['option_a', 'option_b', 'option_c', 'option_d'].map(
                      (option, index) => {
                        const imageField = `${option}_image_url` as keyof typeof formData

                        return (
                          <div key={option} className="space-y-1">

                            <div className="relative">
                              <Input
                                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                value={
                                  formData[
                                  option as keyof typeof formData
                                  ] as string
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    [option]: e.target.value,
                                  })
                                }
                                className="pr-12"
                              />

                              {/* Image upload button */}
                              <label
                                className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-primary"
                                title={`Add image to Option ${String.fromCharCode(65 + index)}`}
                              >
                                <ImagePlus size={18} />

                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleOptionImageUpload(
                                      e,
                                      option as
                                      | 'option_a'
                                      | 'option_b'
                                      | 'option_c'
                                      | 'option_d'
                                    )
                                  }
                                />
                              </label>
                            </div>

                            {/* Image preview */}
                            {formData[imageField] && (
                              <div className="relative mt-2 w-fit">
                                <img
                                  src={formData[imageField] as string}
                                  alt={`Option ${String.fromCharCode(65 + index)}`}
                                  className="max-h-32 rounded-md border object-contain"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      [imageField]: '',
                                    }))
                                  }
                                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                                >
                                  ×
                                </button>
                              </div>
                            )}

                            {/* LaTeX Preview */}
                            {showPreview &&
                              formData[
                              option as keyof typeof formData
                              ] && (
                                <div className="rounded border bg-gray-50 p-2 text-xs">
                                  {renderMath(
                                    formData[
                                    option as keyof typeof formData
                                    ] as string
                                  )}
                                </div>
                              )}
                          </div>
                        )
                      }
                    )}
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

                <Button type="submit" disabled={submitting || !selectedTopic} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Save Question to Repository
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )}

        {/* Filters Card */}
        <Card className="border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Filter Repository</h3>
                  <p className="text-xs text-slate-500">Narrow down questions by syllabus taxonomy</p>
                </div>
              </div>

              {(filters.classId || filters.subjectId || filters.chapterId || filters.topicId || filters.searchText) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleFilterChange('classId', 'all');
                    handleFilterChange('subjectId', 'all');
                    handleFilterChange('chapterId', 'all');
                    handleFilterChange('topicId', 'all');
                    handleFilterChange('searchText', '');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reset Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Class</label>
                <Select
                  value={filters.classId || 'all'}
                  onValueChange={(value) => handleFilterChange('classId', value)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="text-xs">
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Subject</label>
                <Select
                  value={filters.subjectId || 'all'}
                  onValueChange={(value) => handleFilterChange('subjectId', value)}
                  disabled={!filters.classId || filters.classId === 'all'}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {filteredSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id} className="text-xs">
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Chapter</label>
                <Select
                  value={filters.chapterId || 'all'}
                  onValueChange={(value) => handleFilterChange('chapterId', value)}
                  disabled={!filters.subjectId || filters.subjectId === 'all'}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="All Chapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chapters</SelectItem>
                    {filteredChapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id} className="text-xs">
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Topic</label>
                <Select
                  value={filters.topicId || 'all'}
                  onValueChange={(value) => handleFilterChange('topicId', value)}
                  disabled={!filters.chapterId || filters.chapterId === 'all'}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {filteredTopics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id} className="text-xs">
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Instant Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <Input
                    placeholder="Search keywords, LaTeX..."
                    value={filters.searchText}
                    onChange={(e) => handleFilterChange('searchText', e.target.value)}
                    className="pl-8 h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table Card */}
        <Card className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Question Records
              </CardTitle>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                {QuestionCount ? `${QuestionCount.toLocaleString()} total` : `${questions.length} loaded`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Easy
              </span>
              <span className="inline-flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium
              </span>
              <span className="inline-flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Hard
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
                <p className="text-xs font-medium">Fetching question repository...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={BookOpen}
                  title="No questions match the current filters"
                  description="Try broadening your taxonomy selection or search keywords to view questions."
                  actionLabel="Add Single Question"
                  onAction={() => setShowAddForm(true)}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200/80">
                      <TableHead className="w-[180px] text-xs font-semibold uppercase text-slate-500 tracking-wider">Taxonomy</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Question Formula / Text</TableHead>
                      <TableHead className="w-[80px] text-xs font-semibold uppercase text-slate-500 tracking-wider">Diagram</TableHead>
                      <TableHead className="w-[260px] text-xs font-semibold uppercase text-slate-500 tracking-wider">Options</TableHead>
                      <TableHead className="w-[80px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Answer</TableHead>
                      <TableHead className="w-[90px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-center">Marks</TableHead>
                      <TableHead className="w-[90px] text-xs font-semibold uppercase text-slate-500 tracking-wider">Difficulty</TableHead>
                      <TableHead className="w-[100px] text-xs font-semibold uppercase text-slate-500 tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {question.topics.chapters.subjects.classes.name}
                            </span>
                            <p className="text-xs font-semibold text-slate-800">
                              {question.topics.chapters.subjects.name}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-tight truncate max-w-[170px]" title={question.topics.name}>
                              {question.topics.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3.5 max-w-sm">
                          <div className="text-xs text-slate-800 leading-relaxed font-sans line-clamp-3">
                            {renderMath(question.question_text)}
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3.5">
                          {question.image_url ? (
                            <img
                              src={question.image_url}
                              alt="Question"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all shadow-xs"
                              onClick={() => setModalImage(question.image_url)}
                            />
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3.5">
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div className={`p-1.5 rounded border ${question.correct_option === 'A' ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : 'bg-slate-50/60 border-slate-200/60 text-slate-700'}`}>
                              <span className="font-bold mr-1">A:</span> {renderMath(question.option_a.substring(0, 18) + (question.option_a.length > 18 ? '…' : ''))}
                            </div>
                            <div className={`p-1.5 rounded border ${question.correct_option === 'B' ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : 'bg-slate-50/60 border-slate-200/60 text-slate-700'}`}>
                              <span className="font-bold mr-1">B:</span> {renderMath(question.option_b.substring(0, 18) + (question.option_b.length > 18 ? '…' : ''))}
                            </div>
                            <div className={`p-1.5 rounded border ${question.correct_option === 'C' ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : 'bg-slate-50/60 border-slate-200/60 text-slate-700'}`}>
                              <span className="font-bold mr-1">C:</span> {renderMath(question.option_c.substring(0, 18) + (question.option_c.length > 18 ? '…' : ''))}
                            </div>
                            <div className={`p-1.5 rounded border ${question.correct_option === 'D' ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : 'bg-slate-50/60 border-slate-200/60 text-slate-700'}`}>
                              <span className="font-bold mr-1">D:</span> {renderMath(question.option_d.substring(0, 18) + (question.option_d.length > 18 ? '…' : ''))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs shadow-xs">
                            {question.correct_option}
                          </span>
                        </TableCell>
                        <TableCell className="align-top py-3.5 text-center text-xs font-semibold text-slate-700">
                          <span className="text-emerald-600">+{question.marks}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-rose-500">-{question.negative_marks}</span>
                        </TableCell>
                        <TableCell className="align-top py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            question.difficulty === 'easy'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : question.difficulty === 'medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {question.difficulty}
                          </span>
                        </TableCell>
                        <TableCell className="align-top py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => handleEdit(question)}
                              title="Edit Question"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDelete(question.id)}
                              title="Delete Question"
                            >
                              <X className="w-3.5 h-3.5" />
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

        {/* Load More Pagination */}
        {hasMore && (
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <Button
              onClick={loadMoreQuestions}
              disabled={loadingMore}
              variant="outline"
              className="px-6 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-blue-600" />
                  Loading Questions...
                </>
              ) : (
                `Load More Questions (${questions.length} loaded)`
              )}
            </Button>
            <p className="text-[11px] text-slate-400">
              Showing {questions.length} questions of {QuestionCount || "repository"}
            </p>
          </div>
        )}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {["option_a", "option_b", "option_c", "option_d"].map(
                    (option, index) => {
                      const imageField =
                        `${option}_image_url` as keyof typeof formData

                      return (
                        <div key={option} className="space-y-2">
                          {/* Option Input */}
                          <div className="relative">
                            <Input
                              placeholder={`Option ${String.fromCharCode(
                                65 + index
                              )}`}
                              value={
                                formData[
                                option as keyof typeof formData
                                ] as string
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [option]: e.target.value,
                                })
                              }
                              className="pr-11"
                            />

                            {/* Add Image Button */}
                            <label
                              className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                              title={`Add image to Option ${String.fromCharCode(
                                65 + index
                              )}`}
                            >
                              <ImagePlus size={18} />

                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleOptionImageUpload(
                                    e,
                                    option as
                                    | "option_a"
                                    | "option_b"
                                    | "option_c"
                                    | "option_d"
                                  )
                                }
                              />
                            </label>
                          </div>

                          {/* Image Preview - Only shown if image exists */}
                          {formData[imageField] && (
                            <div className="relative overflow-hidden rounded-md border bg-gray-50">
                              <img
                                src={formData[imageField] as string}
                                alt={`Option ${String.fromCharCode(65 + index)}`}
                                className="max-h-48 w-full object-contain p-2"
                              />

                              {/* Remove Image */}
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    [imageField]: "",
                                  }))
                                }
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow hover:bg-gray-100"
                                title="Remove image"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}

                          {/* LaTeX Preview */}
                          {showPreview &&
                            formData[
                            option as keyof typeof formData
                            ] && (
                              <div className="rounded border bg-gray-50 p-2 text-xs">
                                {renderMath(
                                  formData[
                                  option as keyof typeof formData
                                  ] as string
                                )}
                              </div>
                            )}
                        </div>
                      )
                    }
                  )}
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
    </AdminLayout>
  )
}

export default ManageQuestions