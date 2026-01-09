import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowLeft, Search, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'

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
  subjects: {
    name: string
    classes: { name: string }
  }
}

interface Topic {
  id: string
  name: string
  description?: string
  chapter_id: string
  created_at: string
  chapters: {
    id: string
    name: string
    subject_id: string
    subjects: {
      id: string
      name: string
      class_id: string
      classes: { 
        id: string
        name: string 
      }
    }
  }
}

interface Filters {
  classId: string
  subjectId: string
  chapterId: string
  searchText: string
}

const ManageTopics = () => {
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', chapter_id: '' })
  const [filters, setFilters] = useState<Filters>({
    classId: '',
    subjectId: '',
    chapterId: '',
    searchText: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

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

      // Fetch chapters for dropdown
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select(`
          id,
          name,
          subject_id,
          subjects(
            name,
            classes(name)
          )
        `)
        .order('name')

      if (chaptersError) throw chaptersError
      setChapters(chaptersData || [])

      // Fetch topics with full hierarchy
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          description,
          chapter_id,
          created_at,
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
        `)
        .order('created_at', { ascending: false })

      if (topicsError) throw topicsError
      setTopics(topicsData || [])
    } catch (error) {
      toast.error('Failed to fetch data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter logic
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
    return topics.filter(topic => {
      // Class filter
      if (filters.classId && topic.chapters?.subjects?.classes?.id !== filters.classId) {
        return false
      }
      
      // Subject filter
      if (filters.subjectId && topic.chapters?.subjects?.id !== filters.subjectId) {
        return false
      }
      
      // Chapter filter
      if (filters.chapterId && topic.chapters?.id !== filters.chapterId) {
        return false
      }
      
      // Search filter
      if (filters.searchText && !topic.name.toLowerCase().includes(filters.searchText.toLowerCase())) {
        return false
      }
      
      return true
    })
  }, [topics, filters])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value === 'all' ? '' : value }
      
      // Reset dependent filters
      if (key === 'classId') {
        newFilters.subjectId = ''
        newFilters.chapterId = ''
      } else if (key === 'subjectId') {
        newFilters.chapterId = ''
      }
      
      return newFilters
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.chapter_id) {
      toast.error('Topic name and chapter are required')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('topics')
        .insert([{
          name: formData.name.trim(),
          description: formData.description.trim(),
          chapter_id: formData.chapter_id
        }])

      if (error) throw error
      
      toast.success('Topic added successfully')
      setFormData({ name: '', description: '', chapter_id: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to add topic: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return

    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Topic deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete topic: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Manage Topics</h1>
        </div>

        {/* Add Topic Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={formData.chapter_id}
                onValueChange={(value) => setFormData({ ...formData, chapter_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.subjects?.classes?.name} - {chapter.subjects?.name} - {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Topic name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              
              <Input
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Topic'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search topics..."
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Topics ({filteredTopics.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {topics.length === 0 ? 'No topics found. Add your first topic above.' : 'No topics match the current filters.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Topic Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell>{topic.chapters?.subjects?.classes?.name}</TableCell>
                      <TableCell>{topic.chapters?.subjects?.name}</TableCell>
                      <TableCell>{topic.chapters?.name}</TableCell>
                      <TableCell className="font-medium">{topic.name}</TableCell>
                      <TableCell>{topic.description || '-'}</TableCell>
                      <TableCell>{new Date(topic.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(topic.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ManageTopics