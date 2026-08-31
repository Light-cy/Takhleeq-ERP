import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Users,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Star,
  MessageSquare,
  Lock,
  Unlock,
  Check,
  X,
  Sliders,
  HelpCircle,
  Layers,
  Award
} from 'lucide-react';
import { FeedbackForm, FeedbackQuestion, FeedbackQuestionType, FeedbackFormAnalytics } from '../../../types';

interface FeedbackFormsTabProps {
  cohortId?: number;
  jwtToken?: string | null;
  sessions?: { id: number; title: string; date: string }[];
}

export const FeedbackFormsTab: React.FC<FeedbackFormsTabProps> = ({
  cohortId,
  jwtToken,
  sessions = []
}) => {
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Closed'>('ALL');
  const [privacyFilter, setPrivacyFilter] = useState<'ALL' | 'ANONYMOUS' | 'IDENTIFIED'>('ALL');

  // Builder Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsAnonymous, setFormIsAnonymous] = useState(false);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formSessionId, setFormSessionId] = useState<string>('');
  const [questions, setQuestions] = useState<Array<{
    question_text: string;
    question_type: FeedbackQuestionType;
  }>>([
    { question_text: 'How would you rate the overall value and pacing of this session/period?', question_type: 'rating_1_10' },
    { question_text: 'What key insights or takeaways did your team gain?', question_type: 'long_text' }
  ]);
  const [savingForm, setSavingForm] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);

  // Analytics / Responses Modal State
  const [selectedFormForAnalytics, setSelectedFormForAnalytics] = useState<FeedbackForm | null>(null);
  const [analyticsData, setAnalyticsData] = useState<FeedbackFormAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [responsesSearchQuery, setResponsesSearchQuery] = useState('');

  // Delete Confirmation Modal State
  const [formToDelete, setFormToDelete] = useState<FeedbackForm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (actionToast) {
      const timer = setTimeout(() => setActionToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [actionToast]);

  const getAuthHeaders = () => {
    let token = jwtToken || '';
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('jwtToken') || localStorage.getItem('token') || '';
      if (!token) {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            token = u.token || u.jwtToken || '';
          } catch {}
        }
      }
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = cohortId ? `/api/cohorts/${cohortId}/feedback-forms` : '/api/feedback-forms';
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let errData: any = {};
        try { errData = JSON.parse(text); } catch { errData = {}; }
        throw new Error(errData.error || 'Failed to fetch feedback forms');
      }
      const text = await res.text().catch(() => '');
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = {}; }
      setForms(Array.isArray(data.forms) ? data.forms : []);
    } catch (err: any) {
      console.error('Error fetching feedback forms:', err);
      setError(err.message || 'Failed to load feedback forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [cohortId]);

  // Handle Question Manipulation in Builder
  const handleAddQuestion = (type: FeedbackQuestionType = 'rating_1_10') => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: type
      }
    ]);
  };

  const handleUpdateQuestion = (index: number, field: 'question_text' | 'question_type', value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      setBuilderError('At least one question is required.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setQuestions(updated);
  };

  // Submit New Form
  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuilderError(null);

    if (!formTitle.trim()) {
      setBuilderError('Please provide a form title.');
      return;
    }

    const validQuestions = questions.filter(q => q.question_text.trim().length > 0);
    if (validQuestions.length === 0) {
      setBuilderError('Please provide at least one valid question.');
      return;
    }

    try {
      setSavingForm(true);
      const payload = {
        cohort_id: cohortId || 1,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        is_anonymous: formIsAnonymous,
        expiry_date: formExpiryDate.trim() || undefined,
        session_id: formSessionId ? parseInt(formSessionId) : undefined,
        questions: validQuestions.map((q, idx) => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          question_order: idx + 1
        }))
      };

      const url = cohortId ? `/api/cohorts/${cohortId}/feedback-forms` : '/api/feedback-forms';
      const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let data: any = {};
        try { data = JSON.parse(text); } catch { data = {}; }
        throw new Error(data.error || 'Failed to create feedback form');
      }

      // Reset Form and refresh
      setIsBuilderOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormIsAnonymous(false);
      setFormExpiryDate('');
      setFormSessionId('');
      setQuestions([
        { question_text: 'How would you rate the overall value and pacing of this session/period?', question_type: 'rating_1_10' },
        { question_text: 'What key insights or takeaways did your team gain?', question_type: 'long_text' }
      ]);
      await fetchForms();
    } catch (err: any) {
      console.error('Error creating feedback form:', err);
      setBuilderError(err.message || 'Failed to create form.');
    } finally {
      setSavingForm(false);
    }
  };

  // Toggle Form Status (Active / Closed)
  const handleToggleStatus = async (form: FeedbackForm) => {
    const nextStatus = form.status === 'Active' ? 'Closed' : 'Active';
    // Optimistic UI update
    setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: nextStatus } : f));
    try {
      const res = await fetch(`/api/feedback-forms/${form.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setActionToast({
        message: `Form is now ${nextStatus === 'Active' ? 'Active for responses' : 'Closed'}.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      // Revert
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: form.status } : f));
      setActionToast({ message: err.message || 'Failed to update form status.', type: 'error' });
    }
  };

  // Confirm and Execute Form Deletion
  const confirmDeleteForm = async () => {
    if (!formToDelete) return;
    const targetId = formToDelete.id;
    const targetTitle = formToDelete.title;
    setIsDeleting(true);

    // Instant optimistic UI update
    setForms(prev => prev.filter(f => f.id !== targetId));
    if (selectedFormForAnalytics?.id === targetId) {
      setSelectedFormForAnalytics(null);
      setAnalyticsData(null);
    }
    setFormToDelete(null);

    try {
      const res = await fetch(`/api/feedback-forms/${targetId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let errData: any = {};
        try { errData = JSON.parse(text); } catch { errData = {}; }
        throw new Error(errData.error || `Failed to delete form (HTTP ${res.status})`);
      }
      setActionToast({ message: `"${targetTitle}" deleted successfully.`, type: 'success' });
    } catch (err: any) {
      console.error('Error deleting form:', err);
      setActionToast({ message: err.message || 'Failed to delete form from server.', type: 'error' });
      // Re-fetch to restore state if deletion failed on server
      fetchForms();
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch Detailed Analytics and Responses
  const handleOpenAnalytics = async (form: FeedbackForm) => {
    setSelectedFormForAnalytics(form);
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const res = await fetch(`/api/feedback-forms/${form.id}/responses`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let errData: any = {};
        try { errData = JSON.parse(text); } catch { errData = {}; }
        throw new Error(errData.error || 'Failed to load responses and analytics');
      }
      const text = await res.text().catch(() => '');
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = {}; }
      setAnalyticsData(data.analytics);
    } catch (err: any) {
      console.error('Error fetching responses analytics:', err);
      setAnalyticsError(err.message || 'Failed to load responses.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Filtered Forms List
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      if (privacyFilter === 'ANONYMOUS' && !f.is_anonymous) return false;
      if (privacyFilter === 'IDENTIFIED' && f.is_anonymous) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = f.title.toLowerCase().includes(q);
        const matchesDesc = (f.description || '').toLowerCase().includes(q);
        const matchesSession = (f.session_title || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSession) return false;
      }
      return true;
    });
  }, [forms, statusFilter, privacyFilter, searchQuery]);

  // Aggregate Stats
  const totalForms = forms.length;
  const activeFormsCount = forms.filter(f => f.status === 'Active').length;
  const totalResponsesCollected = forms.reduce((acc, f) => acc + (f.response_count || 0), 0);
  const avgCompletionRate = forms.length > 0
    ? Math.round(forms.reduce((acc, f) => acc + (f.completion_rate || 0), 0) / forms.length)
    : 0;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Cohort Feedback & Survey Builder</h1>
              <p className="text-xs text-gray-500 font-medium">Create targeted feedback forms, rating evaluations, and pulse surveys with privacy controls & analytics.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchForms}
            className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all cursor-pointer shadow-3xs"
            title="Refresh Forms"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setBuilderError(null);
              setIsBuilderOpen(true);
            }}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-primary/90 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create Feedback Form
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Total Forms</span>
            <p className="text-xl font-black text-gray-900 mt-1">{totalForms}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Active Surveys</span>
            <p className="text-xl font-black text-emerald-600 mt-1">{activeFormsCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Total Responses</span>
            <p className="text-xl font-black text-primary mt-1">{totalResponsesCollected}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
            <MessageSquare className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Avg. Completion</span>
            <p className="text-xl font-black text-indigo-600 mt-1">{avgCompletionRate}%</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <BarChart2 className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-150 shadow-3xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feedback surveys by title, description or session..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-primary transition-all placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'Active', 'Closed'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-gray-900 shadow-3xs font-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Privacy Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'ANONYMOUS', 'IDENTIFIED'] as const).map(pr => (
              <button
                key={pr}
                type="button"
                onClick={() => setPrivacyFilter(pr)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  privacyFilter === pr ? 'bg-white text-gray-900 shadow-3xs font-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {pr === 'ALL' ? 'All Privacy' : pr === 'ANONYMOUS' ? 'Anonymous' : 'Non-Anonymous'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forms Listing Directory */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-150 shadow-3xs space-y-3">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-bold">Loading feedback forms & analytics...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 text-red-700 space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
          <p className="text-xs font-bold">{error}</p>
          <button
            onClick={fetchForms}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-400 mx-auto">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-800">No Feedback Forms Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL' || privacyFilter !== 'ALL'
                ? 'No feedback forms match your active search filters.'
                : 'Create your first custom feedback form or evaluation survey to collect insights from founders.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsBuilderOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <Plus className="h-4 w-4" /> Create First Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map((form) => {
            const isClosed = form.status === 'Closed';
            const responseRatio = `${form.response_count || 0} / ${form.total_startups || 0}`;
            const completionPct = form.completion_rate || 0;
            const isAnonymous = form.is_anonymous;

            return (
              <div
                key={form.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-3xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Header & Status Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            isClosed
                              ? 'bg-gray-100 text-gray-600 border border-gray-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isClosed ? 'bg-gray-400' : 'bg-emerald-500 animate-pulse'}`} />
                          {form.status}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            isAnonymous
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isAnonymous ? 'Anonymous' : 'Non-Anonymous'}
                        </span>

                        {form.session_title && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold truncate max-w-[180px]">
                            📅 {form.session_title}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-gray-900 leading-snug pt-1">{form.title}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(form)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isClosed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                        title={isClosed ? 'Reopen Form for Submissions' : 'Close Form to Stop Submissions'}
                      >
                        {isClosed ? 'Reopen' : 'Close'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormToDelete(form)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                        title="Delete Form"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {form.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{form.description}</p>
                  )}

                  {/* Question Types & Metadata */}
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1 font-mono font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-150">
                      <FileText className="h-3 w-3 text-primary" /> {(form.questions || []).length} Questions
                    </span>
                    {form.expiry_date && (
                      <span className="flex items-center gap-1 font-mono text-gray-600">
                        <Clock className="h-3 w-3 text-gray-400" /> Closes: {form.expiry_date}
                      </span>
                    )}
                  </div>

                  {/* Submission Rate Progress Bar */}
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-extrabold text-gray-700 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary" /> Startups Completed:
                      </span>
                      <span className="font-mono font-black text-gray-900">
                        {responseRatio} ({completionPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          completionPct >= 80 ? 'bg-emerald-500' : completionPct >= 40 ? 'bg-primary' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, completionPct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-mono">
                    Created: {new Date(form.created_at).toLocaleDateString()}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenAnalytics(form)}
                    className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    View Responses ({form.response_count || 0})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FORM BUILDER MODAL                                                     */}
      {/* ========================================================================= */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Create New Feedback Survey</h3>
                  <p className="text-xs text-gray-500 font-medium">Design questions and configure confidentiality settings for founder responses.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-800 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {builderError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{builderError}</span>
              </div>
            )}

            <form onSubmit={handleCreateForm} className="space-y-6">
              {/* Form Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                    Survey Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Mid-Cohort Program Pulse Check, Workshop Evaluation"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                    Description / Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Provide brief context or instructions for founders answering this survey..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                    Optional Session Linkage
                  </label>
                  <select
                    value={formSessionId}
                    onChange={(e) => setFormSessionId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Standalone (General Program Feedback) --</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        Session: {s.title} ({s.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                    Expiry / Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
                  />
                </div>
              </div>

              {/* Anonymity Toggle Switch Banner */}
              <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                formIsAnonymous 
                  ? 'bg-purple-50/90 border-purple-200 shadow-2xs' 
                  : 'bg-indigo-50/70 border-indigo-200/80 shadow-2xs'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-black uppercase tracking-wide ${
                      formIsAnonymous ? 'text-purple-900' : 'text-indigo-950'
                    }`}>
                      {formIsAnonymous ? 'Anonymous Feedback Mode' : 'Non-Anonymous Feedback Mode'}
                    </h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                      formIsAnonymous 
                        ? 'bg-purple-200/80 text-purple-900' 
                        : 'bg-indigo-200/80 text-indigo-900'
                    }`}>
                      {formIsAnonymous ? 'Anonymous' : 'Non-Anonymous'}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${
                    formIsAnonymous ? 'text-purple-700' : 'text-indigo-800/80'
                  }`}>
                    {formIsAnonymous
                      ? 'When anonymous mode is active, founder and startup identities are permanently stripped for confidentiality.'
                      : 'Startup name and founder identity will be visible next to their submitted answers.'}
                  </p>
                </div>

                {/* Toggle Switch Component */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0 bg-white/70 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-xl border sm:border-0 border-gray-200/60">
                  <div className="text-right">
                    <span className="text-[11px] font-black text-gray-800 block leading-tight">
                      {formIsAnonymous ? 'Anonymous' : 'Non-Anonymous'}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">
                      {formIsAnonymous ? 'Identity Hidden' : 'Names Visible'}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={formIsAnonymous}
                    onClick={() => setFormIsAnonymous(!formIsAnonymous)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      formIsAnonymous ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className="sr-only">Toggle anonymous feedback mode</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formIsAnonymous ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Dynamic Questions Builder Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" /> Questions Configuration ({questions.length})
                  </h4>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('rating_1_10')}
                      className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Star className="h-3 w-3" /> + Rating (1-10)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('short_text')}
                      className="px-2.5 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="h-3 w-3" /> + Short Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('long_text')}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="h-3 w-3" /> + Long Text
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 relative group hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-white border border-gray-200 text-gray-700 font-mono text-xs font-black flex items-center justify-center shadow-3xs">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-500 font-mono">Question {idx + 1}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Question Type Selector */}
                          <select
                            value={q.question_type}
                            onChange={(e) => handleUpdateQuestion(idx, 'question_type', e.target.value)}
                            className="bg-white border border-gray-200 text-[11px] font-bold text-gray-800 rounded-lg px-2 py-1 shadow-3xs focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="rating_1_10">⭐ Rating Scale (1 - 10)</option>
                            <option value="short_text">📝 Short Text</option>
                            <option value="long_text">📄 Long Text / Open Feedback</option>
                          </select>

                          {/* Move Up/Down */}
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded hover:bg-white cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            disabled={idx === questions.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded hover:bg-white cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Question */}
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer ml-1"
                            title="Remove Question"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        required
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestion(idx, 'question_text', e.target.value)}
                        placeholder="e.g. How effective was the mentorship in solving your operational bottleneck?"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-primary shadow-2xs"
                      />

                      {/* Type Preview indicator */}
                      <div className="text-[10px] text-gray-400 font-mono">
                        {q.question_type === 'rating_1_10' && 'Preview: Founder selects a rating score between 1 and 10'}
                        {q.question_type === 'short_text' && 'Preview: Single line text response'}
                        {q.question_type === 'long_text' && 'Preview: Multi-line text feedback area'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingForm}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingForm ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Publishing Form...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Publish Feedback Form
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW RESPONSES & ANALYTICS MODAL                                       */}
      {/* ========================================================================= */}
      {selectedFormForAnalytics && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedFormForAnalytics.status === 'Closed'
                        ? 'bg-gray-100 text-gray-600 border border-gray-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {selectedFormForAnalytics.status}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                      selectedFormForAnalytics.is_anonymous
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {selectedFormForAnalytics.is_anonymous ? 'Anonymous Data' : 'Non-Anonymous Responses'}
                  </span>

                  {selectedFormForAnalytics.session_title && (
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
                      📅 {selectedFormForAnalytics.session_title}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-black text-gray-900 uppercase tracking-tight pt-1">
                  {selectedFormForAnalytics.title}
                </h2>
                {selectedFormForAnalytics.description && (
                  <p className="text-xs text-gray-500 font-medium">{selectedFormForAnalytics.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFormForAnalytics(null);
                  setAnalyticsData(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-800 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingAnalytics ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="text-xs text-gray-500 font-bold">Aggregating responses & calculating analytics...</p>
              </div>
            ) : analyticsError ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-center space-y-2">
                <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
                <p className="text-xs font-bold">{analyticsError}</p>
              </div>
            ) : analyticsData ? (
              <div className="space-y-6">
                {/* Analytics Summary Banner */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">
                      Completion Rate
                    </span>
                    <p className="text-xl font-black text-gray-900 mt-1">
                      {analyticsData.submitted_startups_count} of {analyticsData.total_cohort_startups} Startups
                    </p>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, analyticsData.completion_rate_percent)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">
                      Participation
                    </span>
                    <p className="text-xl font-black text-indigo-600 mt-1">
                      {analyticsData.completion_rate_percent}%
                    </p>
                    <span className="text-[10px] text-gray-500">Cohort engagement metric</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">
                      Privacy Safeguard
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {selectedFormForAnalytics.is_anonymous ? (
                        <span className="text-xs font-black text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Anonymous Mode Enforced
                        </span>
                      ) : (
                        <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Identified Submissions
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400 block mt-1">
                      {selectedFormForAnalytics.is_anonymous
                        ? 'Zero identity fields in API payload'
                        : 'Startup names attached to feedback'}
                    </span>
                  </div>
                </div>

                {/* Question-by-Question Deep Breakdown */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">
                    Questions & Responses Breakdown ({analyticsData.questions_analytics.length})
                  </h3>

                  {analyticsData.questions_analytics.map((qa, qIdx) => {
                    const isRating = qa.question.question_type === 'rating_1_10';
                    const hasResponses = qa.answers.length > 0;

                    return (
                      <div
                        key={qa.question.id || qIdx}
                        className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4 shadow-3xs"
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[10px] font-black rounded">
                                Q{qIdx + 1}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-mono">
                                {isRating ? 'Rating Scale (1 - 10)' : qa.question.question_type === 'short_text' ? 'Short Text' : 'Detailed Feedback'}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-gray-900">{qa.question.question_text}</h4>
                          </div>

                          {isRating && qa.average_rating !== undefined && (
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-center shrink-0">
                              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest block font-mono">Average Score</span>
                              <div className="text-base font-black text-amber-900 flex items-center justify-center gap-1">
                                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                {qa.average_rating} <span className="text-xs text-amber-600 font-normal">/ 10</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Rating Distribution Chart */}
                        {isRating && qa.rating_distribution && (
                          <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-xl space-y-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block font-mono">
                              Rating Distribution (1 - 10)
                            </span>
                            <div className="grid grid-cols-10 gap-1.5 text-center">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map(score => {
                                const count = qa.rating_distribution?.[score] || 0;
                                const maxCount = Math.max(...(Object.values(qa.rating_distribution || {}) as number[]), 1);
                                const heightPct = count > 0 ? Math.round((count / maxCount) * 100) : 4;

                                return (
                                  <div key={score} className="space-y-1">
                                    <div className="h-16 bg-gray-200 rounded flex items-end justify-center p-0.5 overflow-hidden">
                                      <div
                                        className="w-full bg-primary rounded transition-all duration-300 flex items-center justify-center text-[9px] text-white font-bold"
                                        style={{ height: `${heightPct}%`, minHeight: count > 0 ? '16px' : '4px' }}
                                      >
                                        {count > 0 ? count : ''}
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-gray-700 block">
                                      {score}⭐
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Response Answers List */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider font-mono">
                              Submitted Answers ({qa.answers.length}):
                            </span>
                          </div>

                          {!hasResponses ? (
                            <p className="text-xs text-gray-400 italic py-2">No responses received for this question yet.</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {qa.answers.map((ans, aIdx) => (
                                <div
                                  key={ans.id || aIdx}
                                  className="p-3 bg-gray-50/90 border border-gray-200/80 rounded-xl space-y-1 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      {selectedFormForAnalytics.is_anonymous ? (
                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold flex items-center gap-1 font-mono">
                                          <Lock className="h-2.5 w-2.5" /> Anonymous Founder Response
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold flex items-center gap-1">
                                          🚀 {ans.startup_name || 'Startup'} {ans.founder_name ? `• ${ans.founder_name}` : ''}
                                        </span>
                                      )}
                                    </div>

                                    {ans.submitted_at && (
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        {new Date(ans.submitted_at).toLocaleString()}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-gray-800 font-medium whitespace-pre-wrap leading-relaxed pt-0.5">
                                    {isRating ? (
                                      <span className="font-mono font-black text-primary text-sm">
                                        Score: {ans.answer_value} / 10
                                      </span>
                                    ) : (
                                      ans.answer_value
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedFormForAnalytics(null);
                  setAnalyticsData(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG MODAL */}
      {formToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-left flex-1">
                <h3 className="text-sm font-black text-gray-900 leading-tight">Delete Feedback Form?</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-gray-900 font-bold">"{formToDelete.title}"</strong>? All associated questions and startup response submissions will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFormToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteForm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete Form</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-3 duration-200 bg-white border-gray-200 text-gray-900">
          {actionToast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{actionToast.message}</span>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
