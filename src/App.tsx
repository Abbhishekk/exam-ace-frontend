import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageClasses from "./pages/admin/ManageClasses";
import ManageSubjects from "./pages/admin/ManageSubjects";
import ManageChapters from "./pages/admin/ManageChapters";
import ManageTopics from "./pages/admin/ManageTopics";
import QuestionBank from "./pages/admin/QuestionBank";
import ManageQuestions from "./pages/admin/ManageQuestions";
import ManageExams from "./pages/admin/ManageExams";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminExamSubmissions from "./pages/admin/AdminExamSubmissions";
import StudentDashboard from "./pages/student/StudentDashboard";
import JoinExam from "./pages/student/JoinExam";
import StudentExam from "./pages/student/StudentExam";
import StudentResults from "./pages/student/StudentResults";
import Leaderboard from "./pages/student/Leaderboard";
import StudentLeaderboard from "./pages/student/StudentLeaderboard";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./components/AuthProvider";
import CreateExam from "./pages/admin/CreateExam";
import CreateExamRuleBased from "./pages/admin/CreateExamRuleBased";
import CreateExamRuleBasedEnhanced from "./pages/admin/CreateExamRuleBasedEnhanced";
import CreateMultiSubjectExam from "./pages/admin/CreateMultiSubjectExam";
import ExamAnalytics from "./pages/admin/ExamAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/classes" element={<AdminProtectedRoute><ManageClasses /></AdminProtectedRoute>} />
            <Route path="/admin/subjects" element={<AdminProtectedRoute><ManageSubjects /></AdminProtectedRoute>} />
            <Route path="/admin/chapters" element={<AdminProtectedRoute><ManageChapters /></AdminProtectedRoute>} />
            <Route path="/admin/topics" element={<AdminProtectedRoute><ManageTopics /></AdminProtectedRoute>} />
            <Route path="/admin/questions" element={<AdminProtectedRoute><ManageQuestions /></AdminProtectedRoute>} />
            <Route path="/admin/exams" element={<AdminProtectedRoute><ManageExams /></AdminProtectedRoute>} />
            <Route path="/admin/exams/create" element={<AdminProtectedRoute><CreateExam /></AdminProtectedRoute>} />
            <Route path="/admin/exams/rule-based" element={<AdminProtectedRoute><CreateExamRuleBased /></AdminProtectedRoute>} />
            <Route path="/admin/exams/:examId/submissions" element={<AdminProtectedRoute><AdminExamSubmissions /></AdminProtectedRoute>} />
            <Route path="/admin/exams/:examId/analytics" element={<AdminProtectedRoute><ExamAnalytics /></AdminProtectedRoute>} />
            <Route path="/admin/exams/questions-enhanced" element={<AdminProtectedRoute><CreateExamRuleBasedEnhanced /></AdminProtectedRoute>} />
            <Route path="/admin/exams/multi-subject" element={<AdminProtectedRoute><CreateMultiSubjectExam /></AdminProtectedRoute>} />
            <Route path="/admin/leaderboard" element={<AdminProtectedRoute><AdminLeaderboard /></AdminProtectedRoute>} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/join" element={<JoinExam />} />
            <Route path="/student/exam" element={<StudentExam />} />
            <Route path="/student/results" element={<StudentResults />} />
            <Route path="/student/leaderboard" element={<Leaderboard />} />
            <Route path="/student/leaderboard/:examId" element={<StudentLeaderboard />} />
            <Route path="/student/*" element={<StudentDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
