import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowLeft, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Subject {
  id: string
  name: string
  classes: { name: string }
}

interface Chapter {
  id: string
  name: string
  description?: string
  subject_id: string
  created_at: string
  subjects: {
    name: string
    classes: { name: string }
  }
}

const ManageChapters = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', subject_id: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch subjects for dropdown
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          classes!inner(name)
        `)
        .order('name')

      if (subjectsError) throw subjectsError
      setSubjects(subjectsData || [])

      // Fetch chapters with subject and class names
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select(`
          id,
          name,
          description,
          subject_id,
          created_at,
          subjects!inner(
            name,
            classes!inner(name)
          )
        `)
        .order('created_at', { ascending: false })

      if (chaptersError) throw chaptersError
      setChapters(chaptersData || [])
    } catch (error: any) {
      toast.error('Failed to fetch data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.subject_id) {
      toast.error('Chapter name and subject are required')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('chapters')
        .insert([{
          name: formData.name.trim(),
          description: formData.description.trim(),
          subject_id: formData.subject_id
        }])

      if (error) throw error
      
      toast.success('Chapter added successfully')
      setFormData({ name: '', description: '', subject_id: '' })
      fetchData()
    } catch (error: any) {
      toast.error('Failed to add chapter: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return

    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Chapter deleted successfully')
      fetchData()
    } catch (error: any) {
      toast.error('Failed to delete chapter: ' + error.message)
    }
  }

  // Group chapters by subject
  const groupedChapters = chapters.reduce((acc, chapter) => {
    const subjectKey = `${chapter.subjects.classes.name} - ${chapter.subjects.name}`
    if (!acc[subjectKey]) {
      acc[subjectKey] = []
    }
    acc[subjectKey].push(chapter)
    return acc
  }, {} as Record<string, Chapter[]>)

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
          <h1 className="text-3xl font-bold">Manage Chapters</h1>
        </div>

        {/* Add Chapter Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Chapter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.classes.name} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Chapter name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              
              <Input
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Chapter'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Chapters Grouped by Subject */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : Object.keys(groupedChapters).length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No chapters found. Add your first chapter above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedChapters).map(([subjectName, subjectChapters]) => (
              <Card key={subjectName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    {subjectName}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({subjectChapters.length} chapters)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chapter Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectChapters.map((chapter) => (
                        <TableRow key={chapter.id}>
                          <TableCell className="font-medium">{chapter.name}</TableCell>
                          <TableCell>{chapter.description || '-'}</TableCell>
                          <TableCell>{new Date(chapter.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(chapter.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageChapters