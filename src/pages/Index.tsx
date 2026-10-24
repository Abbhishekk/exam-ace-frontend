import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  GraduationCap,
  Shield,
  Zap,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  FileSpreadsheet,
  Clock,
  Layers,
  Sparkles,
  Award,
  HelpCircle,
  BarChart3,
  Users,
  Settings,
  Lock,
  Menu,
  X
} from 'lucide-react';

export default function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'creator' | 'student' | 'analytics'>('admin');

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-primary/20 selection:text-primary">
      {/* =========================================================================
          1. RESPONSIVE NAVBAR
      ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm font-bold text-lg">
              EA
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">Exam Ace</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-primary border border-blue-200">
                JEE / NEET SaaS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#workflow" className="hover:text-primary transition-colors">Workflow</a>
            <a href="#student-experience" className="hover:text-primary transition-colors">Student View</a>
            <a href="#analytics" className="hover:text-primary transition-colors">Analytics</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/student">
              <Button variant="ghost" size="sm" className="text-slate-700">
                Student Portal
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-primary hover:bg-primary/95 text-white shadow-sm">
                Admin Sign In
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">Features</a>
            <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">Workflow</a>
            <a href="#student-experience" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">Student View</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">FAQ</a>
            <div className="pt-4 border-t flex flex-col gap-2">
              <Link to="/student" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">Student Portal</Button>
              </Link>
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-primary text-white">Admin Sign In</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION
      ========================================================================= */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-primary text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Designed specifically for JEE & NEET Coaching Institutes
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.12]">
            The Modern Exam Platform for{' '}
            <span className="text-primary underline decoration-blue-200 decoration-wavy underline-offset-8">
              High-Performing
            </span>{' '}
            Coaching Institutes
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Create multi-subject mock exams in minutes, conduct computer-based tests with authentic NTA-style interfaces, and deliver instant rank reports.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="xl" className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white shadow-md text-base">
                Get Started as Institute Admin
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/student" className="w-full sm:w-auto">
              <Button variant="outline" size="xl" className="w-full sm:w-auto border-slate-300 text-slate-800 text-base">
                Enter Student Test Window
              </Button>
            </Link>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8">
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 shadow-soft text-center">
              <p className="text-2xl font-bold text-slate-900">100%</p>
              <p className="text-xs text-slate-500 font-medium">NTA Test Engine Alignment</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 shadow-soft text-center">
              <p className="text-2xl font-bold text-slate-900">+4 / -1</p>
              <p className="text-xs text-slate-500 font-medium">Automated Negative Marking</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 shadow-soft text-center">
              <p className="text-2xl font-bold text-slate-900">LaTeX</p>
              <p className="text-xs text-slate-500 font-medium">Complex Math & Formulas</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 shadow-soft text-center">
              <p className="text-2xl font-bold text-slate-900">Instant</p>
              <p className="text-xs text-slate-500 font-medium">Rank & Score Generation</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. ACTUAL PRODUCT INTERACTIVE MOCKUP SHOWCASE
      ========================================================================= */}
      <section className="py-16 bg-slate-50/70 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              An Engine Built for Speed and Accuracy
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Explore how educators create rules, manage questions, and review student performance seamlessly.
            </p>

            {/* Interactive Showcase Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/80 gap-1 mt-4">
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Control
              </button>
              <button
                onClick={() => setActiveTab('creator')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'creator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rule-Based Creator
              </button>
              <button
                onClick={() => setActiveTab('student')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student Test Window
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Leaderboard & Analytics
              </button>
            </div>
          </div>

          {/* Interactive Screen Container */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden max-w-5xl mx-auto">
            <div className="h-10 bg-slate-100 border-b border-slate-200 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-500 font-mono ml-2">https://exam.abcoedtech.org/admin</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white border-slate-300 text-slate-600 font-medium">
                Live Interface
              </Badge>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/40">
              {activeTab === 'admin' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Institute Overview</h3>
                      <p className="text-xs text-slate-500">Real-time metrics across active batches</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">System Healthy</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Enrolled Students</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">450+</p>
                      <span className="text-[10px] text-emerald-600 font-medium">Active Batch 2026</span>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Total Exams</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">72</p>
                      <span className="text-[10px] text-primary font-medium">JEE Main & NEET</span>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Question Bank</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">5,840+</p>
                      <span className="text-[10px] text-slate-500">Categorized by Topic</span>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Avg Exam Score</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">142.8</p>
                      <span className="text-[10px] text-emerald-600 font-medium">Positive Progress</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'creator' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Multi-Subject Rule Engine</h4>
                      <p className="text-xs text-slate-600">Auto-compose test papers balancing difficulty distributions</p>
                    </div>
                    <Badge className="bg-primary text-white">Rule Processor</Badge>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Physics Section (30 Questions)</span>
                      <span className="text-primary">10 Easy • 15 Medium • 5 Hard</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full w-[33%]" />
                      <div className="bg-amber-500 h-full w-[50%]" />
                      <div className="bg-rose-500 h-full w-[17%]" />
                    </div>
                    <p className="text-xs text-slate-500">
                      Selected topics: Kinematics, Rotational Motion, Thermodynamics, Electrostatics.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'student' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-slate-900">Time Left: 02:45:18</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">Answered (14)</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-medium">Unanswered (6)</span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">Marked for Review (3)</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
                    <p className="font-semibold text-slate-900">Question 15 (Physics - Mechanics):</p>
                    <p className="text-slate-700 font-serif">
                      A uniform cylinder of mass $M$ and radius $R$ rolls without slipping down an inclined plane of angle $\theta$. The acceleration of its center of mass is:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="p-2 rounded border bg-blue-50 border-primary text-primary font-medium">(A) $\frac{2}{3} g \sin\theta$ (Selected)</div>
                      <div className="p-2 rounded border bg-white border-slate-200 text-slate-700">(B) $g \sin\theta$</div>
                      <div className="p-2 rounded border bg-white border-slate-200 text-slate-700">(C) $\frac{1}{2} g \sin\theta$</div>
                      <div className="p-2 rounded border bg-white border-slate-200 text-slate-700">(D) $\frac{3}{4} g \sin\theta$</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <h4 className="text-sm font-bold text-slate-900">Live Exam Submissions Leaderboard</h4>
                      <span className="text-xs text-slate-500">Exam: JEE Main Full Mock #04</span>
                    </div>
                    <div className="divide-y text-xs pt-2">
                      <div className="py-2 flex items-center justify-between font-medium">
                        <span className="flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Rank 1: Rohan Sharma</span>
                        <span className="font-bold text-emerald-600">276 / 300 (99.4 Percentile)</span>
                      </div>
                      <div className="py-2 flex items-center justify-between font-medium">
                        <span className="flex items-center gap-2"><Award className="w-4 h-4 text-slate-400" /> Rank 2: Priya Patel</span>
                        <span className="font-bold text-emerald-600">268 / 300 (98.9 Percentile)</span>
                      </div>
                      <div className="py-2 flex items-center justify-between font-medium">
                        <span className="flex items-center gap-2"><Award className="w-4 h-4 text-amber-700" /> Rank 3: Amit Verma</span>
                        <span className="font-bold text-emerald-600">254 / 300 (97.8 Percentile)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. TRUST & VERIFICATION SECTION
      ========================================================================= */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            Engineered For Academic Rigor and Examination Integrity
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-center opacity-85">
            <div className="flex items-center justify-center gap-2 font-semibold text-slate-700 text-sm">
              <Shield className="w-5 h-5 text-primary" />
              NTA Exam Pattern Compliant
            </div>
            <div className="flex items-center justify-center gap-2 font-semibold text-slate-700 text-sm">
              <Lock className="w-5 h-5 text-primary" />
              Tenant Isolated Question Bank
            </div>
            <div className="flex items-center justify-center gap-2 font-semibold text-slate-700 text-sm">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Audit-Protected Negative Scoring
            </div>
            <div className="flex items-center justify-center gap-2 font-semibold text-slate-700 text-sm">
              <Zap className="w-5 h-5 text-primary" />
              Sub-Second Online Submission
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. FEATURES GRID
      ========================================================================= */}
      <section id="features" className="py-20 bg-slate-50/60 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-primary">Capabilities</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything Your Institute Needs to Run Computer-Based Tests
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              A single unified suite for exam creation, question repository management, student conduction, and ranking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-sm border-slate-200 hover:border-slate-300 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-primary flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Multi-Subject Exam Architecture</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Support joint papers with distinct sections for Physics, Chemistry, and Mathematics/Biology with independent subject timers and rules.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:border-slate-300 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Bulk Excel & CSV Importer</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload hundreds of questions at once. Includes column mapping, duplicate detection, image ZIP archives, and error logs.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:border-slate-300 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Rule-Based Exam Generation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatically select questions by chapter weights and difficulty distributions (Easy/Medium/Hard) with question usage count tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:border-slate-300 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">LaTeX Math & Unicode Equations</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Preserves mathematical formulas, fractions, matrices, symbols, chemical formulas, and subscripts across questions, options, and explanations.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:border-slate-300 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Anti-Cheating Safeguards</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full-screen enforcement, tab-switch monitoring, automated warnings, and optional auto-submission on excessive integrity infractions.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:border-slate-300 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Automated Scoring & PDF Generation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Accurate scoring with unattempted logic, instantaneous rank calculations, and one-click PDF question paper & result downloads.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. EXAM CREATION WORKFLOW SECTION
      ========================================================================= */}
      <section id="workflow" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Syllabus to Live Exam in Four Steps
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              A predictable, guided workflow whether generating rule-based mock tests or hand-picking curated questions.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Hierarchy Selection</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose the target Class (e.g. Class 11, Class 12, JEE, NEET) and associate subjects and chapters.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Rules or Selection</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Define the count of Easy, Medium, and Hard questions per topic or choose from the 5,800+ question bank.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Configure Time & Code</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Set duration in minutes, exam access window, marks per question, and negative marking penalty.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Publish & Distribute</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publish instantly and share the short Exam Code with students to join from anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. STUDENT EXPERIENCE PREVIEW
      ========================================================================= */}
      <section id="student-experience" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-primary">Student Experience</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                An Authentic Test Environment That Eliminates Exam Anxiety
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Familiarity with the test screen is critical for competitive JEE and NEET aspirants. Exam Ace mirrors authentic computer-based testing workflows:
              </p>
              <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Color-coded question palette indicating Answered, Unanswered, and Marked for Review.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Clear response, Save & Next, and Mark for Review without unintentional overwrites.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Persistent countdown timer synced with server-side time window validation.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Auto-save of student selections to survive accidental page reloads.</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b text-xs">
                <span className="font-bold text-slate-800">JEE Advanced Mock 2026</span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">Remaining: 01:22:10</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <span className="font-bold text-primary">Physics - Question 08:</span>
                <p className="text-slate-800">
                  A parallel plate capacitor with plate area $A$ and separation $d$ is filled with two dielectrics of constants $K_1$ and $K_2$. The net capacitance is:
                </p>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="p-2 rounded border bg-blue-50 border-primary text-primary font-bold">{"A) C = (ε₀ · A / d) · [2K₁K₂ / (K₁ + K₂)] (Selected)"}</div>
                <div className="p-2 rounded border bg-white border-slate-200 text-slate-600">{"B) C = (ε₀ · A / d) · (K₁ + K₂)"}</div>
                <div className="p-2 rounded border bg-white border-slate-200 text-slate-600">{"C) C = (ε₀ · A / 2d) · √(K₁K₂)"}</div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="outline" size="sm" className="h-8 text-xs">Clear Response</Button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="h-8 text-xs">Mark for Review</Button>
                  <Button size="sm" className="h-8 text-xs bg-primary text-white">Save & Next</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. ANALYTICS & REPORTING SECTION
      ========================================================================= */}
      <section id="analytics" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-primary">Insights</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Actionable Intelligence for Teachers and Students
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Move beyond simple totals. Understand accuracy by topic, pinpoint common errors, and download verified PDF papers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Score Distribution Analysis</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Evaluate class performance with batch-level averages, median scores, and top quartile milestones.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Percentile & Ranking</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Instant leaderboards factoring in correct answers, incorrect answers, and penalties with deterministic tie-breaking.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Exportable PDF Papers</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generate print-ready question papers and detailed answer keys with explanations for offline distribution.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. PRICING SECTION
      ========================================================================= */}
      <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-primary">Transparent Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Simple, Predictable Plans for Growing Institutes
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Only transparent, supported plans built for single tutors, regional centers, and multi-branch academies.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            {/* Tier 1 */}
            <Card className="shadow-sm border-slate-200 flex flex-col justify-between">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Starter Academy</h3>
                  <p className="text-xs text-slate-500 mt-1">For individual teachers and small batches</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  ₹2,499<span className="text-xs text-slate-500 font-normal"> / month</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 100 Active Students</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Unlimited Exams</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Question Bank Access</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Bulk Excel/CSV Import</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Basic Score Reports</div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/auth">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </Card>

            {/* Tier 2 (Highlighted) */}
            <Card className="shadow-md border-primary bg-white flex flex-col justify-between relative ring-2 ring-primary/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-white text-[10px] font-semibold">MOST POPULAR</Badge>
              </div>
              <CardContent className="p-6 space-y-4 pt-7">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pro Institute</h3>
                  <p className="text-xs text-slate-500 mt-1">For standard coaching institutes & test centers</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  ₹5,999<span className="text-xs text-slate-500 font-normal"> / month</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Up to 500 Active Students</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Multi-Subject Exam Creator</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Rule-Based Automatic Papers</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Anti-Cheating Fullscreen Engine</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Automated Percentiles & Leaderboards</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> PDF Question Paper & Result Export</div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/auth">
                  <Button className="w-full bg-primary hover:bg-primary/95 text-white shadow-sm">
                    Choose Pro Institute
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Tier 3 */}
            <Card className="shadow-sm border-slate-200 flex flex-col justify-between">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Multi-Branch Campus</h3>
                  <p className="text-xs text-slate-500 mt-1">For large academies and school networks</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  ₹12,499<span className="text-xs text-slate-500 font-normal"> / month</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Unlimited Students</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Multiple Admin & Teacher Seats</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Custom Institute Branding & Logo</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dedicated Storage for Diagram ZIPs</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Priority Technical Support</div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/auth">
                  <Button variant="outline" className="w-full">Contact Sales</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. FAQ ACCORDION
      ========================================================================= */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-sm">
              Clear answers to common questions about features, imports, and exam administration.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="faq-1" className="border border-slate-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:text-primary">
                Does the platform support mathematical formulas, chemical structures, and LaTeX?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-600 leading-relaxed">
                Yes. Exam Ace natively parses LaTeX math notation wrapped in $...$ (inline) and $$...$$ (display block), as well as Unicode mathematical symbols (integrals, Greek letters, matrices, and sub/superscripts). Formulas render with zero character corruption.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="border border-slate-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:text-primary">
                How does the Bulk Question Import work?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-600 leading-relaxed">
                Admins can download the official Excel template (which includes full instructions and sample rows), populate it, and upload it via the bulk importer. The system detects column headers automatically, resolves syllabus hierarchy against your database, catches duplicate questions, lets you edit mistakes inline, and commits valid rows in safe batches.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="border border-slate-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:text-primary">
                How are multi-subject exams organized?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-600 leading-relaxed">
                For exams like JEE (Physics, Chemistry, Math) or NEET (Physics, Chemistry, Biology), you can configure distinct sections with specific question counts and section order. Students navigate between sections directly in their test window.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="border border-slate-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:text-primary">
                What anti-cheating mechanisms are included?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-600 leading-relaxed">
                The student testing window monitors window focus and tab switches, enters full-screen mode, and logs integrity events. Administrators can view tab-switch infractions directly in the exam submission reviews.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="border border-slate-200 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:text-primary">
                How are scores and ranks calculated?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-600 leading-relaxed">
                Scoring strictly follows official competitive test criteria. Unattempted questions receive zero marks (no negative penalty). Incorrect answers receive the configured negative marking penalty (typically -1). Totals, percentiles, and ranks update instantaneously upon student submission.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* =========================================================================
          11. STRONG CLOSING CTA
      ========================================================================= */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready to Upgrade Your Institute's Testing Infrastructure?
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Join coaching institutes conducting weekly test series with speed, mathematical precision, and zero administrative headache.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link to="/auth">
              <Button size="xl" className="bg-primary hover:bg-primary/90 text-white font-bold text-base px-8 shadow-md">
                Launch Institute Admin Portal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/student">
              <Button variant="outline" size="xl" className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium text-base">
                Join Active Test
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          12. FOOTER
      ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
              EA
            </div>
            <span className="font-bold text-sm text-slate-900">Exam Ace</span>
            <span>— EdTech SaaS Exam Conduction System</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/auth" className="hover:text-slate-900 transition-colors">Admin Portal</Link>
            <Link to="/student" className="hover:text-slate-900 transition-colors">Student Entrance</Link>
            <Link to="/admin/questions" className="hover:text-slate-900 transition-colors">Question Repository</Link>
            <Link to="/admin/questions/import" className="hover:text-slate-900 transition-colors">Bulk Importer</Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Exam Ace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
