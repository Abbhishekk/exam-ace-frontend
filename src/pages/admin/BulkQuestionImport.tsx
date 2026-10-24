import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/envs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileArchive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface ClassItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
  class_id: string;
}

interface ChapterItem {
  id: string;
  name: string;
  subject_id: string;
}

interface TopicItem {
  id: string;
  name: string;
  chapter_id: string;
}

interface ValidatedQuestionRow {
  _rowNumber: number;
  _status: 'valid' | 'needs_correction' | 'duplicate_warning' | 'error';
  _errors: string[];
  _warnings: string[];
  _selected: boolean;

  topic_id: string | null;
  chapter_id: string | null;
  subject_id: string | null;
  class_id: string | null;

  class_name: string;
  subject_name: string;
  chapter_name: string;
  topic_name: string;

  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  difficulty: string;
  marks: number;
  negative_marks: number;
  explanation: string;

  image_url: string | null;
  option_a_image_url: string | null;
  option_b_image_url: string | null;
  option_c_image_url: string | null;
  option_d_image_url: string | null;

  source: string | null;
  external_reference: string | null;
  question_type: string;
}

interface ImportJob {
  id: string;
  file_name: string;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  created_at: string;
  completed_at: string | null;
  admin_email: string;
  error_report?: any[];
}

const TARGET_FIELDS = [
  { key: 'question_text', label: 'Question Text', required: true },
  { key: 'option_a', label: 'Option A', required: true },
  { key: 'option_b', label: 'Option B', required: true },
  { key: 'option_c', label: 'Option C', required: false },
  { key: 'option_d', label: 'Option D', required: false },
  { key: 'correct_option', label: 'Correct Option', required: true },
  { key: 'class', label: 'Class', required: false },
  { key: 'subject', label: 'Subject', required: false },
  { key: 'chapter', label: 'Chapter', required: false },
  { key: 'topic', label: 'Topic', required: false },
  { key: 'difficulty', label: 'Difficulty', required: false },
  { key: 'marks', label: 'Marks', required: false },
  { key: 'negative_marks', label: 'Negative Marks', required: false },
  { key: 'explanation', label: 'Explanation', required: false },
  { key: 'question_type', label: 'Question Type', required: false },
  { key: 'image_url', label: 'Question Image URL/File', required: false },
  { key: 'source', label: 'Source', required: false },
  { key: 'external_reference', label: 'External Reference', required: false }
];

export default function BulkQuestionImport() {
  const navigate = useNavigate();

  // Wizard Steps: 1 = Upload, 2 = Mapping, 3 = Preview & Validate, 4 = Import Summary, 5 = History
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');

  // Hierarchy master data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState<boolean>(true);

  // Global Defaults
  const [defaultClass, setDefaultClass] = useState<string>('');
  const [defaultSubject, setDefaultSubject] = useState<string>('');
  const [defaultChapter, setDefaultChapter] = useState<string>('');
  const [defaultTopic, setDefaultTopic] = useState<string>('');
  const [defaultDifficulty, setDefaultDifficulty] = useState<string>('medium');
  const [defaultMarks, setDefaultMarks] = useState<number>(4);
  const [defaultNegativeMarks, setDefaultNegativeMarks] = useState<number>(1);

  // Upload Files State
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Parsed State
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [zipImageMap, setZipImageMap] = useState<Record<string, string>>({});

  // Validation State
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validatedRows, setValidatedRows] = useState<ValidatedQuestionRow[]>([]);
  const [validationStats, setValidationStats] = useState({
    totalRows: 0,
    valid: 0,
    needsCorrection: 0,
    potentialDuplicates: 0,
    invalid: 0
  });

  // Preview Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'needs_correction' | 'duplicate_warning' | 'error' | 'selected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [renderMathEnabled, setRenderMathEnabled] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Inline Row Edit Modal
  const [editingRow, setEditingRow] = useState<ValidatedQuestionRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);

  // Import Execution State
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<any>(null);

  // History State
  const [historyJobs, setHistoryJobs] = useState<ImportJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Load Hierarchy Master Data
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoadingMasterData(true);
    try {
      const [cRes, sRes, chRes, tRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name, class_id').order('name'),
        supabase.from('chapters').select('id, name, subject_id').order('name'),
        supabase.from('topics').select('id, name, chapter_id').order('name')
      ]);

      setClasses(cRes.data || []);
      setSubjects(sRes.data || []);
      setChapters(chRes.data || []);
      setTopics(tRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load classes and subjects: ' + err.message);
    } finally {
      setLoadingMasterData(false);
    }
  };

  // Filtered dropdowns for defaults
  const filteredSubjects = useMemo(() => {
    return defaultClass ? subjects.filter(s => s.class_id === defaultClass) : subjects;
  }, [subjects, defaultClass]);

  const filteredChapters = useMemo(() => {
    return defaultSubject ? chapters.filter(c => c.subject_id === defaultSubject) : chapters;
  }, [chapters, defaultSubject]);

  const filteredTopics = useMemo(() => {
    return defaultChapter ? topics.filter(t => t.chapter_id === defaultChapter) : topics;
  }, [topics, defaultChapter]);

  // Auth token helper
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User session expired. Please sign in again.');
    }
    return session.access_token;
  };

  // 1. Download official template
  const handleDownloadTemplate = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/bulk-import/template`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to generate template from server.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'question_bulk_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Excel template downloaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error downloading template');
    }
  };

  // 2. Parse file
  const handleParseFile = async () => {
    if (!spreadsheetFile) {
      toast.error('Please select an Excel (.xlsx) or CSV (.csv) file.');
      return;
    }

    setIsParsing(true);
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('file', spreadsheetFile);
      if (zipFile) {
        formData.append('zip', zipFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/bulk-import/parse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse file.');
      }

      setParsedHeaders(data.headers || []);
      setColumnMapping(data.suggestedMapping || {});
      setRawRows(data.rawRows || []);
      setZipImageMap(data.zipImageMap || {});

      toast.success(`Successfully parsed ${data.totalRows} questions from ${data.fileName}`);
      setCurrentStep(2); // Move to Column Mapping
    } catch (err: any) {
      toast.error(err.message || 'File parsing failed.');
    } finally {
      setIsParsing(false);
    }
  };

  // 3. Validate rows
  const handleValidateRows = async (overrideRows?: any[]) => {
    setIsValidating(true);
    try {
      const token = await getAuthToken();

      const topicObj = topics.find(t => t.id === defaultTopic);
      const chapterObj = chapters.find(c => c.id === defaultChapter);
      const subjectObj = subjects.find(s => s.id === defaultSubject);
      const classObj = classes.find(cl => cl.id === defaultClass);

      const defaultsPayload = {
        class_id: defaultClass || null,
        class_name: classObj?.name || '',
        subject_id: defaultSubject || null,
        subject_name: subjectObj?.name || '',
        chapter_id: defaultChapter || null,
        chapter_name: chapterObj?.name || '',
        topic_id: defaultTopic || null,
        topic_name: topicObj?.name || '',
        difficulty: defaultDifficulty,
        marks: defaultMarks,
        negative_marks: defaultNegativeMarks
      };

      const res = await fetch(`${API_BASE_URL}/api/admin/bulk-import/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rows: overrideRows || rawRows,
          columnMapping,
          defaults: defaultsPayload,
          zipImageMap
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Validation failed.');
      }

      setValidationStats(data.summary);
      setValidatedRows(data.validatedRows);
      setPage(1);

      toast.success(`Validation finished: ${data.summary.valid} valid, ${data.summary.needsCorrection + data.summary.invalid} with issues.`);
      setCurrentStep(3); // Move to Preview & Validation
    } catch (err: any) {
      toast.error(err.message || 'Error validating questions.');
    } finally {
      setIsValidating(false);
    }
  };

  // Selection helpers
  const handleToggleRowSelection = (rowNumber: number) => {
    setValidatedRows(prev =>
      prev.map(r => (r._rowNumber === rowNumber ? { ...r, _selected: !r._selected } : r))
    );
  };

  const handleSelectAllValid = () => {
    setValidatedRows(prev =>
      prev.map(r => ({ ...r, _selected: r._status === 'valid' || r._status === 'duplicate_warning' }))
    );
    toast.info('Selected all valid and warning rows for import');
  };

  const handleSelectAll = () => {
    setValidatedRows(prev => prev.map(r => ({ ...r, _selected: true })));
  };

  const handleDeselectAll = () => {
    setValidatedRows(prev => prev.map(r => ({ ...r, _selected: false })));
  };

  // Export error report
  const handleExportErrors = async () => {
    const errorRows = validatedRows.filter(r => r._status !== 'valid');
    if (errorRows.length === 0) {
      toast.info('No error or warning rows to export.');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/bulk-import/export-errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ errorRows })
      });

      if (!res.ok) throw new Error('Failed to generate error report.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'question_import_error_report.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Error report downloaded.');
    } catch (err: any) {
      toast.error(err.message || 'Error exporting error report.');
    }
  };

  // Inline Row Edit Modal Handlers
  const handleOpenEditRow = (row: ValidatedQuestionRow) => {
    setEditingRow({ ...row });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedRow = () => {
    if (!editingRow) return;

    // Validate essential fields
    if (!editingRow.question_text.trim()) {
      toast.error('Question text cannot be empty.');
      return;
    }
    if (!editingRow.option_a.trim() || !editingRow.option_b.trim()) {
      toast.error('Options A and B are required.');
      return;
    }
    if (!['A', 'B', 'C', 'D'].includes(editingRow.correct_option)) {
      toast.error('Correct option must be A, B, C, or D.');
      return;
    }
    if (!editingRow.topic_id) {
      toast.error('Please assign a valid Topic.');
      return;
    }

    // Re-evaluate status
    const errors: string[] = [];
    const warnings: string[] = [];

    if (editingRow.correct_option === 'C' && !editingRow.option_c.trim()) {
      errors.push('Option C is marked as correct but is empty.');
    }
    if (editingRow.correct_option === 'D' && !editingRow.option_d.trim()) {
      errors.push('Option D is marked as correct but is empty.');
    }

    const newStatus = errors.length > 0 ? 'error' : warnings.length > 0 ? 'needs_correction' : 'valid';

    const updatedRow: ValidatedQuestionRow = {
      ...editingRow,
      _errors: errors,
      _warnings: warnings,
      _status: newStatus,
      _selected: errors.length === 0
    };

    setValidatedRows(prev => {
      const nextRows = prev.map(r => (r._rowNumber === editingRow._rowNumber ? updatedRow : r));
      // Re-calculate stats
      const valid = nextRows.filter(r => r._status === 'valid').length;
      const needsCorrection = nextRows.filter(r => r._status === 'needs_correction').length;
      const potentialDuplicates = nextRows.filter(r => r._status === 'duplicate_warning').length;
      const invalid = nextRows.filter(r => r._status === 'error').length;
      setValidationStats({
        totalRows: nextRows.length,
        valid,
        needsCorrection,
        potentialDuplicates,
        invalid
      });
      return nextRows;
    });

    setIsEditDialogOpen(false);
    toast.success(`Row #${editingRow._rowNumber} updated successfully.`);
  };

  // 4. Execute Import
  const handleExecuteImport = async () => {
    const selectedRows = validatedRows.filter(r => r._selected && r._status !== 'error');

    if (selectedRows.length === 0) {
      toast.error('No valid questions selected for import. Fix any errors or select valid rows.');
      return;
    }

    if (!confirm(`Are you sure you want to import ${selectedRows.length} questions into the question bank?`)) {
      return;
    }

    setIsImporting(true);
    setImportProgress(10);
    try {
      const token = await getAuthToken();
      setImportProgress(35);

      const idempotencyKey = `import_${spreadsheetFile?.name || 'file'}_${Date.now()}`;

      const res = await fetch(`${API_BASE_URL}/api/admin/bulk-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rowsToImport: selectedRows,
          fileName: spreadsheetFile?.name || 'bulk_import.xlsx',
          idempotencyKey
        })
      });

      setImportProgress(85);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Import failed.');
      }

      setImportProgress(100);
      setImportResult(data);
      setCurrentStep(4); // Move to Summary Step
      toast.success(`Successfully imported ${data.importedCount} questions!`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  // Load History
  const fetchImportHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/bulk-import/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryJobs(data.jobs || []);
      }
    } catch (err: any) {
      console.error('History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchImportHistory();
    }
  }, [activeTab]);

  // Math rendering utility
  const renderMath = (content: string) => {
    if (!content) return null;
    if (!renderMathEnabled) return <span>{content}</span>;

    try {
      const blockSplit = content.split(/(\$\$[\s\S]*?\$\$)/g);
      return blockSplit.map((block, blockIndex) => {
        if (block.startsWith('$$') && block.endsWith('$$')) {
          return <BlockMath key={blockIndex}>{block.slice(2, -2)}</BlockMath>;
        }
        const inlineSplit = block.split(/(\$[^$]+\$)/g);
        return inlineSplit.map((inline, inlineIndex) => {
          if (inline.startsWith('$') && inline.endsWith('$')) {
            return <InlineMath key={`${blockIndex}-${inlineIndex}`}>{inline.slice(1, -1)}</InlineMath>;
          }
          return <span key={`${blockIndex}-${inlineIndex}`}>{inline}</span>;
        });
      });
    } catch {
      return <span>{content}</span>;
    }
  };

  // Filtered rows for preview table
  const displayedRows = useMemo(() => {
    return validatedRows.filter(row => {
      // Status filter
      if (statusFilter === 'valid' && row._status !== 'valid') return false;
      if (statusFilter === 'needs_correction' && row._status !== 'needs_correction') return false;
      if (statusFilter === 'duplicate_warning' && row._status !== 'duplicate_warning') return false;
      if (statusFilter === 'error' && row._status !== 'error') return false;
      if (statusFilter === 'selected' && !row._selected) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = (row.question_text || '').toLowerCase().includes(q);
        const topicMatch = (row.topic_name || '').toLowerCase().includes(q);
        const optMatch = `${row.option_a} ${row.option_b} ${row.option_c} ${row.option_d}`.toLowerCase().includes(q);
        if (!textMatch && !topicMatch && !optMatch) return false;
      }

      return true;
    });
  }, [validatedRows, statusFilter, searchQuery]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayedRows.slice(start, start + pageSize);
  }, [displayedRows, page]);

  const totalPages = Math.ceil(displayedRows.length / pageSize) || 1;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Link to="/admin/questions">
              <Button variant="outline" size="sm" className="h-9">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Questions
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bulk Question Import</h1>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="w-3 h-3 mr-1 text-primary" /> JEE / NEET Ready
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                Import hundreds of questions via Excel or CSV with hierarchy resolution and duplicate verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'import' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('import')}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Importer
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('history')}
            >
              <History className="w-4 h-4 mr-2" />
              Import History
            </Button>
          </div>
        </div>

        {activeTab === 'history' ? (
          /* =========================================================================
             HISTORY TAB
          ========================================================================= */
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Past Import Jobs</CardTitle>
                <CardDescription>Track the audit record and metrics of previous bulk uploads</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchImportHistory} disabled={loadingHistory}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading history...
                </div>
              ) : historyJobs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 stroke-[1.5]" />
                  <p>No import jobs recorded yet.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100/75">
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Total Rows</TableHead>
                        <TableHead>Imported</TableHead>
                        <TableHead>Failed / Skipped</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyJobs.map(job => (
                        <TableRow key={job.id}>
                          <TableCell className="text-xs text-slate-600">
                            {new Date(job.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">{job.file_name}</TableCell>
                          <TableCell className="text-xs text-slate-600">{job.admin_email}</TableCell>
                          <TableCell>{job.total_rows}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">{job.imported_count}</TableCell>
                          <TableCell className="text-slate-500">
                            {job.failed_count} / {job.skipped_count}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                job.status === 'completed'
                                  ? 'default'
                                  : job.status === 'partial'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className={
                                job.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                                  : job.status === 'partial'
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-300'
                              }
                            >
                              {job.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* =========================================================================
             IMPORT WORKFLOW TABS
          ========================================================================= */
          <div className="space-y-6">
            {/* Step Wizard Progress Bar */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  currentStep === 1
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : currentStep > 1
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                1. Upload & Defaults
              </div>
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  currentStep === 2
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : currentStep > 2
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                2. Column Mapping
              </div>
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  currentStep === 3
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : currentStep > 3
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                3. Preview & Validate
              </div>
              <div
                className={`p-2.5 rounded-lg border transition-all ${
                  currentStep === 4
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                4. Import Summary
              </div>
            </div>

            {/* =====================================================================
                STEP 1: UPLOAD & DEFAULTS
            ===================================================================== */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: File Upload & Template */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Select Questions Spreadsheet</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadTemplate}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200 font-medium"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Excel Template
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Supports Excel (.xlsx, .xls) and CSV (.csv) files. Maximum 2000 rows per batch.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Drag & Drop Upload Area */}
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                          spreadsheetFile
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-slate-300 hover:border-primary/40 bg-white'
                        }`}
                      >
                        <FileSpreadsheet
                          className={`w-12 h-12 mx-auto mb-3 ${
                            spreadsheetFile ? 'text-primary' : 'text-slate-400'
                          }`}
                        />
                        {spreadsheetFile ? (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-800">{spreadsheetFile.name}</p>
                            <p className="text-xs text-slate-500">
                              {(spreadsheetFile.size / 1024).toFixed(1)} KB • Ready for column parsing
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => setSpreadsheetFile(null)}
                            >
                              Remove and select another
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-700">
                              Drag and drop your spreadsheet here, or browse
                            </p>
                            <p className="text-xs text-slate-400">Excel files (.xlsx, .xls) or comma-separated (.csv)</p>
                            <label htmlFor="spreadsheet-input">
                              <Button variant="secondary" size="sm" className="mt-2 cursor-pointer" asChild>
                                <span>Browse Files</span>
                              </Button>
                            </label>
                            <input
                              id="spreadsheet-input"
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              className="hidden"
                              onChange={e => {
                                if (e.target.files?.[0]) setSpreadsheetFile(e.target.files[0]);
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Optional Images ZIP Upload */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileArchive className="w-5 h-5 text-indigo-600" />
                          <h4 className="text-sm font-semibold text-slate-800">Optional Images Archive (.zip)</h4>
                        </div>
                        <p className="text-xs text-slate-500">
                          If your questions or options reference local images (e.g. <code>diagram1.png</code>), pack them
                          into a ZIP file and upload here. They will be uploaded and mapped automatically.
                        </p>

                        <div className="flex items-center gap-3 pt-1">
                          <input
                            id="zip-input"
                            type="file"
                            accept=".zip"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) setZipFile(e.target.files[0]);
                            }}
                          />
                          <label htmlFor="zip-input">
                            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                              <span>{zipFile ? 'Change ZIP File' : 'Attach Image ZIP'}</span>
                            </Button>
                          </label>
                          {zipFile && (
                            <div className="flex items-center gap-2 text-xs text-slate-700">
                              <span className="font-medium">{zipFile.name}</span>
                              <span className="text-slate-400">({(zipFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-rose-500 hover:text-rose-700"
                                onClick={() => setZipFile(null)}
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-2 border-t">
                      <Button
                        onClick={handleParseFile}
                        disabled={!spreadsheetFile || isParsing}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isParsing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Parsing Spreadsheet...
                          </>
                        ) : (
                          <>
                            Next: Map Columns
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                {/* Right Col: Global Hierarchy Defaults */}
                <div className="space-y-6">
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        Global Defaults (Fallback)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Used whenever a row leaves class, subject, chapter, or topic blank.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Default Class */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Default Class</label>
                        <Select
                          value={defaultClass}
                          onValueChange={val => {
                            setDefaultClass(val);
                            setDefaultSubject('');
                            setDefaultChapter('');
                            setDefaultTopic('');
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select class (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Default Subject */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Default Subject</label>
                        <Select
                          value={defaultSubject}
                          onValueChange={val => {
                            setDefaultSubject(val);
                            setDefaultChapter('');
                            setDefaultTopic('');
                          }}
                          disabled={!defaultClass && filteredSubjects.length === 0}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select subject (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSubjects.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Default Chapter */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Default Chapter</label>
                        <Select
                          value={defaultChapter}
                          onValueChange={val => {
                            setDefaultChapter(val);
                            setDefaultTopic('');
                          }}
                          disabled={!defaultSubject && filteredChapters.length === 0}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select chapter (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredChapters.map(ch => (
                              <SelectItem key={ch.id} value={ch.id}>
                                {ch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Default Topic */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">
                          Default Topic <span className="text-slate-400 font-normal">(recommended)</span>
                        </label>
                        <Select value={defaultTopic} onValueChange={setDefaultTopic}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredTopics.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="pt-2 border-t space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">Default Difficulty</label>
                          <Select value={defaultDifficulty} onValueChange={setDefaultDifficulty}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Marks</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.25"
                              value={defaultMarks}
                              onChange={e => setDefaultMarks(Number(e.target.value))}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Negative Marks</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.25"
                              value={defaultNegativeMarks}
                              onChange={e => setDefaultNegativeMarks(Number(e.target.value))}
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* =====================================================================
                STEP 2: COLUMN MAPPING
            ===================================================================== */}
            {currentStep === 2 && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Map Spreadsheet Headers to Question Fields</CardTitle>
                  <CardDescription>
                    Verify that your spreadsheet columns map correctly to the required question properties.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TARGET_FIELDS.map(field => {
                      const currentVal = columnMapping[field.key] || '__NONE__';
                      return (
                        <div
                          key={field.key}
                          className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                            </span>
                            {currentVal !== '__NONE__' && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                Mapped
                              </Badge>
                            )}
                          </div>
                          <Select
                            value={currentVal}
                            onValueChange={val => {
                              setColumnMapping(prev => ({
                                ...prev,
                                [field.key]: val === '__NONE__' ? '' : val
                              }));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__NONE__" className="text-slate-400 italic">
                                -- None / Use Default --
                              </SelectItem>
                              {parsedHeaders.map(h => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to File
                  </Button>
                  <Button onClick={() => handleValidateRows()} disabled={isValidating} className="bg-primary hover:bg-primary/90">
                    {isValidating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Validating Data...
                      </>
                    ) : (
                      <>
                        Validate & Preview
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* =====================================================================
                STEP 3: PREVIEW & VALIDATE
            ===================================================================== */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {/* Calculated KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card className="shadow-none border border-slate-200 bg-white">
                    <CardContent className="p-3">
                      <p className="text-xs text-slate-500">Total Rows</p>
                      <p className="text-2xl font-bold text-slate-800">{validationStats.totalRows}</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none border border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-emerald-700 font-medium">Valid</p>
                      <p className="text-2xl font-bold text-emerald-700">{validationStats.valid}</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none border border-amber-200 bg-amber-50/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-amber-700 font-medium">Needs Correction</p>
                      <p className="text-2xl font-bold text-amber-700">{validationStats.needsCorrection}</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none border border-indigo-200 bg-indigo-50/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-indigo-700 font-medium">Potential Duplicates</p>
                      <p className="text-2xl font-bold text-indigo-700">{validationStats.potentialDuplicates}</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none border border-rose-200 bg-rose-50/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-rose-700 font-medium">Invalid / Errors</p>
                      <p className="text-2xl font-bold text-rose-700">{validationStats.invalid}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Filter and Action Bar */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                      {/* Filter Tabs */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          variant={statusFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setStatusFilter('all')}
                        >
                          All ({validatedRows.length})
                        </Button>
                        <Button
                          variant={statusFilter === 'valid' ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs text-emerald-700 hover:text-emerald-800"
                          onClick={() => setStatusFilter('valid')}
                        >
                          Valid ({validationStats.valid})
                        </Button>
                        <Button
                          variant={statusFilter === 'needs_correction' ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs text-amber-700 hover:text-amber-800"
                          onClick={() => setStatusFilter('needs_correction')}
                        >
                          Warnings ({validationStats.needsCorrection})
                        </Button>
                        <Button
                          variant={statusFilter === 'duplicate_warning' ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs text-indigo-700 hover:text-indigo-800"
                          onClick={() => setStatusFilter('duplicate_warning')}
                        >
                          Duplicates ({validationStats.potentialDuplicates})
                        </Button>
                        <Button
                          variant={statusFilter === 'error' ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs text-rose-700 hover:text-rose-800"
                          onClick={() => setStatusFilter('error')}
                        >
                          Errors ({validationStats.invalid})
                        </Button>
                        <Button
                          variant={statusFilter === 'selected' ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs font-semibold"
                          onClick={() => setStatusFilter('selected')}
                        >
                          Selected ({validatedRows.filter(r => r._selected).length})
                        </Button>
                      </div>

                      {/* Right Side Options */}
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-56">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setRenderMathEnabled(!renderMathEnabled)}
                        >
                          {renderMathEnabled ? <Eye className="w-3.5 h-3.5 mr-1 text-primary" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                          LaTeX Math
                        </Button>

                        {validationStats.invalid + validationStats.needsCorrection > 0 && (
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportErrors}>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Error Report (.xlsx)
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Batch Selection Bar */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleSelectAllValid}>
                          Select Valid Only
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleSelectAll}>
                          Select All
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleDeselectAll}>
                          Deselect All
                        </Button>
                      </div>
                      <div>
                        Showing {(page - 1) * pageSize + 1}-
                        {Math.min(page * pageSize, displayedRows.length)} of {displayedRows.length} questions
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Question Preview Table */}
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-100/75">
                        <TableRow>
                          <TableHead className="w-10 text-center">
                            <span className="sr-only">Select</span>
                          </TableHead>
                          <TableHead className="w-12 text-center">Row</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-48">Classification</TableHead>
                          <TableHead className="min-w-[280px]">Question Text</TableHead>
                          <TableHead className="w-64">Options</TableHead>
                          <TableHead className="w-16 text-center">Ans</TableHead>
                          <TableHead className="w-20 text-center">Diff / Marks</TableHead>
                          <TableHead className="w-16 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                              No questions match the current filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedRows.map(row => (
                            <TableRow
                              key={row._rowNumber}
                              className={`transition-colors ${
                                row._selected ? 'bg-primary/[0.02]' : 'opacity-70 bg-slate-50/50'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={row._selected}
                                  onCheckedChange={() => handleToggleRowSelection(row._rowNumber)}
                                />
                              </TableCell>

                              {/* Row Number */}
                              <TableCell className="text-center font-mono text-xs text-slate-500">
                                #{row._rowNumber}
                              </TableCell>

                              {/* Status Badge with Tooltip */}
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        {row._status === 'valid' && (
                                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 text-[10px]">
                                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Valid
                                          </Badge>
                                        )}
                                        {row._status === 'needs_correction' && (
                                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300 text-[10px]">
                                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" /> Warning
                                          </Badge>
                                        )}
                                        {row._status === 'duplicate_warning' && (
                                          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-300 text-[10px]">
                                            <AlertTriangle className="w-3 h-3 mr-1 text-indigo-600" /> Duplicate
                                          </Badge>
                                        )}
                                        {row._status === 'error' && (
                                          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-300 text-[10px]">
                                            <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Error
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {(row._errors.length > 0 || row._warnings.length > 0) && (
                                      <TooltipContent className="max-w-xs text-xs space-y-1">
                                        {row._errors.map((e, idx) => (
                                          <p key={idx} className="text-rose-400 font-medium">
                                            • {e}
                                          </p>
                                        ))}
                                        {row._warnings.map((w, idx) => (
                                          <p key={idx} className="text-amber-300">
                                            • {w}
                                          </p>
                                        ))}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>

                              {/* Classification */}
                              <TableCell className="text-xs">
                                <div className="font-semibold text-slate-800 truncate max-w-[180px]">
                                  {row.topic_name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                  {row.subject_name} • {row.chapter_name}
                                </div>
                              </TableCell>

                              {/* Question Text */}
                              <TableCell className="text-xs text-slate-800">
                                <div className="space-y-1">
                                  <div className="line-clamp-2">{renderMath(row.question_text)}</div>
                                  {row.image_url && (
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <img
                                        src={row.image_url}
                                        alt="attachment"
                                        className="w-8 h-8 rounded border object-contain bg-white"
                                      />
                                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                        {row.image_url}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* Options */}
                              <TableCell className="text-xs text-slate-600">
                                <div className="space-y-0.5 font-mono text-[11px]">
                                  <div className="truncate">
                                    <span className="font-bold text-slate-700">A:</span> {row.option_a}
                                  </div>
                                  <div className="truncate">
                                    <span className="font-bold text-slate-700">B:</span> {row.option_b}
                                  </div>
                                  {row.option_c && (
                                    <div className="truncate">
                                      <span className="font-bold text-slate-700">C:</span> {row.option_c}
                                    </div>
                                  )}
                                  {row.option_d && (
                                    <div className="truncate">
                                      <span className="font-bold text-slate-700">D:</span> {row.option_d}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* Correct Option */}
                              <TableCell className="text-center font-bold text-sm text-primary">
                                {row.correct_option || '-'}
                              </TableCell>

                              {/* Difficulty & Marks */}
                              <TableCell className="text-center text-xs">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    row.difficulty === 'easy'
                                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                      : row.difficulty === 'medium'
                                      ? 'border-amber-300 text-amber-700 bg-amber-50'
                                      : 'border-rose-300 text-rose-700 bg-rose-50'
                                  }`}
                                >
                                  {row.difficulty}
                                </Badge>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  +{row.marks} / -{row.negative_marks}
                                </div>
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Edit Question"
                                  onClick={() => handleOpenEditRow(row)}
                                >
                                  <Edit className="w-4 h-4 text-slate-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-3 border-t bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Column Mapping
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">
                        {validatedRows.filter(r => r._selected && r._status !== 'error').length} Questions Selected
                      </div>
                      <div className="text-xs text-slate-500">
                        {validatedRows.filter(r => r._status === 'error').length} invalid questions excluded
                      </div>
                    </div>

                    <Button
                      onClick={handleExecuteImport}
                      disabled={
                        isImporting ||
                        validatedRows.filter(r => r._selected && r._status !== 'error').length === 0
                      }
                      className="bg-primary hover:bg-primary/90 px-6 font-semibold"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Importing ({importProgress}%)...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirm & Import Selected
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                STEP 4: IMPORT SUMMARY
            ===================================================================== */}
            {currentStep === 4 && importResult && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="text-center pb-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <CardTitle className="text-xl text-slate-900">Import Completed Successfully</CardTitle>
                  <CardDescription>
                    Your question batch has been processed and committed to the question bank.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-center">
                      <p className="text-xs font-semibold text-emerald-800">Imported Questions</p>
                      <p className="text-3xl font-extrabold text-emerald-700 mt-1">{importResult.importedCount}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
                      <p className="text-xs font-semibold text-slate-700">Skipped / Excluded</p>
                      <p className="text-3xl font-extrabold text-slate-700 mt-1">
                        {validationStats.totalRows - importResult.importedCount}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-center">
                      <p className="text-xs font-semibold text-rose-800">Failed / Rejected</p>
                      <p className="text-3xl font-extrabold text-rose-700 mt-1">{importResult.failedCount || 0}</p>
                    </div>
                  </div>

                  {importResult.alreadyImported && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-center max-w-xl mx-auto">
                      Notice: This batch had already been processed previously. Duplication was prevented via idempotency key.
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-center gap-3 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSpreadsheetFile(null);
                      setZipFile(null);
                      setValidatedRows([]);
                      setCurrentStep(1);
                    }}
                  >
                    Import Another Batch
                  </Button>
                  <Button onClick={() => navigate('/admin/questions')} className="bg-primary hover:bg-primary/90">
                    Go to Question Bank
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        )}

        {/* =========================================================================
            ROW EDIT MODAL
        ========================================================================= */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span>Edit Row #{editingRow?._rowNumber}</span>
                {editingRow?._status === 'error' && (
                  <Badge variant="destructive" className="text-[10px]">
                    Has Errors
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Correct any fields or classification directly before committing the import.
              </DialogDescription>
            </DialogHeader>

            {editingRow && (
              <div className="space-y-4 py-2">
                {/* Error Banner */}
                {editingRow._errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                    <p className="font-semibold">Validation Errors:</p>
                    {editingRow._errors.map((e, idx) => (
                      <p key={idx}>• {e}</p>
                    ))}
                  </div>
                )}

                {/* Topic Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Assigned Topic *</label>
                  <Select
                    value={editingRow.topic_id || ''}
                    onValueChange={val => {
                      const t = topics.find(item => item.id === val);
                      setEditingRow({
                        ...editingRow,
                        topic_id: val,
                        topic_name: t?.name || 'Topic'
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Text */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Question Text *</label>
                  <Textarea
                    rows={3}
                    value={editingRow.question_text}
                    onChange={e => setEditingRow({ ...editingRow, question_text: e.target.value })}
                    className="text-xs font-mono"
                    placeholder="Question prompt with LaTeX..."
                  />
                </div>

                {/* Options A & B */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Option A *</label>
                    <Input
                      value={editingRow.option_a}
                      onChange={e => setEditingRow({ ...editingRow, option_a: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Option B *</label>
                    <Input
                      value={editingRow.option_b}
                      onChange={e => setEditingRow({ ...editingRow, option_b: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Options C & D */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Option C (Optional)</label>
                    <Input
                      value={editingRow.option_c}
                      onChange={e => setEditingRow({ ...editingRow, option_c: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Option D (Optional)</label>
                    <Input
                      value={editingRow.option_d}
                      onChange={e => setEditingRow({ ...editingRow, option_d: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Correct Option, Difficulty, Marks */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Correct Option *</label>
                    <Select
                      value={editingRow.correct_option}
                      onValueChange={val => setEditingRow({ ...editingRow, correct_option: val })}
                    >
                      <SelectTrigger className="h-9 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Option A</SelectItem>
                        <SelectItem value="B">Option B</SelectItem>
                        <SelectItem value="C">Option C</SelectItem>
                        <SelectItem value="D">Option D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Difficulty</label>
                    <Select
                      value={editingRow.difficulty}
                      onValueChange={val => setEditingRow({ ...editingRow, difficulty: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Marks</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        value={editingRow.marks}
                        onChange={e => setEditingRow({ ...editingRow, marks: Number(e.target.value) })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Penalty</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        value={editingRow.negative_marks}
                        onChange={e => setEditingRow({ ...editingRow, negative_marks: Number(e.target.value) })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Explanation</label>
                  <Textarea
                    rows={2}
                    value={editingRow.explanation}
                    onChange={e => setEditingRow({ ...editingRow, explanation: e.target.value })}
                    className="text-xs"
                    placeholder="Solution explanation with LaTeX..."
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEditedRow} className="bg-primary hover:bg-primary/90">
                Apply & Save Row
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
