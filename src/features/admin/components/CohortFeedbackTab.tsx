import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Star, 
  EyeOff, 
  UserCheck, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Trash2, 
  Send, 
  Building2, 
  Calendar,
  Sparkles
} from 'lucide-react';

interface FeedbackItem {
  id: number;
  cohort_id: number | null;
  session_id: number | null;
  user_id: number | null;
  applicant_id: number | null;
  founder_name: string;
  startup_name: string;
  feedback_type: string; // 'SESSION' | 'PROGRAM' | 'MENTORSHIP' | 'FACILITY' | 'CURRICULUM' | 'OTHER'
  rating: number;
  title: string | null;
  comment: string | null;
  is_anonymous: boolean;
  status: string; // 'SUBMITTED' | 'REVIEWED' | 'ADDRESSED'
  staff_response: string | null;
  created_at: string;
}

interface CohortFeedbackTabProps {
  cohortId?: number;
}

export const CohortFeedbackTab: React.FC<CohortFeedbackTabProps> = ({ cohortId }) => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [privacyFilter, setPrivacyFilter] = useState<string>('ALL'); // 'ALL' | 'ANONYMOUS' | 'IDENTIFIED'
  const [ratingFilter, setRatingFilter] = useState<string>('ALL'); // 'ALL' | '5' | '4' | '3' | 'LOW'
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // 'ALL' | 'SUBMITTED' | 'REVIEWED'

  // Response Modal State
  const [activeRespondItem, setActiveRespondItem] = useState<FeedbackItem | null>(null);
  const [responseInput, setResponseInput] = useState('');
  const [responseStatus, setResponseStatus] = useState<'REVIEWED' | 'ADDRESSED'>('REVIEWED');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/cohort-feedback';
      if (cohortId) url += `?cohort_id=${cohortId}`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!res.ok) throw new Error('Failed to load feedback records');
      const data = await res.json();
      setFeedbackList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching cohort feedback:', err);
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [cohortId]);

  const handleRespondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRespondItem) return;

    try {
      setSubmittingResponse(true);
      const res = await fetch(`/api/cohort-feedback/${activeRespondItem.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          status: responseStatus,
          staff_response: responseInput
        })
      });

      if (res.ok) {
        setActiveRespondItem(null);
        setResponseInput('');
        fetchFeedback();
      }
    } catch (err) {
      console.error('Failed to update feedback status:', err);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this feedback entry?')) return;
    try {
      const res = await fetch(`/api/cohort-feedback/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (res.ok) fetchFeedback();
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  // Filtered List
  const filteredList = feedbackList.filter(item => {
    if (categoryFilter !== 'ALL' && item.feedback_type !== categoryFilter) return false;
    
    if (privacyFilter === 'ANONYMOUS' && !item.is_anonymous) return false;
    if (privacyFilter === 'IDENTIFIED' && item.is_anonymous) return false;

    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

    if (ratingFilter === '5' && item.rating !== 5) return false;
    if (ratingFilter === '4' && item.rating !== 4) return false;
    if (ratingFilter === '3' && item.rating !== 3) return false;
    if (ratingFilter === 'LOW' && item.rating > 2) return false;

    return true;
  });

  // Analytics Metrics
  const totalLogs = feedbackList.length;
  const avgRating = totalLogs > 0
    ? (feedbackList.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalLogs).toFixed(1)
    : '5.0';
  const anonymousCount = feedbackList.filter(f => f.is_anonymous).length;
  const identifiedCount = totalLogs - anonymousCount;
  const pendingCount = feedbackList.filter(f => f.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6 text-left">
      {/* HEADER & METRICS */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">
                Founder Feedback & Rating Analytics
              </h2>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Review real-time ratings, mentor feedback, and incubator evaluation logs submitted by cohort founders.
              Features strict end-to-end privacy masking for anonymous responses.
            </p>
          </div>

          <button
            onClick={fetchFeedback}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh Feedback</span>
          </button>
        </div>

        {/* METRICS CARDS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Average Rating</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-950">{avgRating}</span>
              <span className="text-xs font-bold text-amber-700">/ 5.0 Stars</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60">
            <div className="flex items-center justify-between text-blue-800 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Feedback Logs</span>
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-950">{totalLogs}</div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/60">
            <div className="flex items-center justify-between text-purple-800 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Submission Types</span>
              <EyeOff className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-purple-900">
                🔒 {anonymousCount} Anon
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs font-bold text-purple-900">
                👤 {identifiedCount} Public
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Awaiting Review</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950">{pendingCount}</div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mr-2">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Privacy Filter */}
            <select
              value={privacyFilter}
              onChange={(e) => setPrivacyFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Privacy Modes</option>
              <option value="ANONYMOUS">🔒 Anonymous Only</option>
              <option value="IDENTIFIED">👤 Non-Anonymous Only</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="PROGRAM">Program Overview</option>
              <option value="SESSION">Workshop / Session</option>
              <option value="MENTORSHIP">Mentorship Advisory</option>
              <option value="FACILITY">Facilities & Space</option>
              <option value="CURRICULUM">Curriculum Content</option>
              <option value="OTHER">General Other</option>
            </select>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
              <option value="3">⭐⭐⭐ (3 Stars)</option>
              <option value="LOW">⚠️ Low Ratings (1-2 Stars)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Pending Review</option>
              <option value="REVIEWED">Reviewed / Responded</option>
            </select>
          </div>

          <span className="text-xs font-bold text-gray-400">
            Showing {filteredList.length} of {totalLogs} records
          </span>
        </div>
      </div>

      {/* FEEDBACK LIST */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-3xs">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-500">Loading founder feedback logs...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-3xs space-y-3">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">No Feedback Records Found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            No founder feedback matches your selected filter criteria. When founders submit feedback from their dashboard, items will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-5 transition-all shadow-3xs hover:shadow-2xs space-y-4 ${
                item.is_anonymous
                  ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/20 to-white'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= item.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-black text-amber-900 ml-1">{item.rating}.0</span>
                  </div>

                  {/* Category Badge */}
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">
                    {item.feedback_type}
                  </span>

                  {/* Privacy Badge */}
                  {item.is_anonymous ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-300/60">
                      <EyeOff className="w-3 h-3" />
                      100% Anonymous Founder
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 flex items-center gap-1 border border-blue-200">
                      <UserCheck className="w-3 h-3 text-blue-600" />
                      Public Submission
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Founder / Author Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                    item.is_anonymous ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-primary/10 text-primary'
                  }`}>
                    {item.is_anonymous ? '🕵️' : (item.founder_name[0] || 'F')}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      {item.founder_name}
                      {item.is_anonymous && (
                        <span className="text-[10px] font-normal text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Identity Masked
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {item.startup_name}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                  item.status === 'REVIEWED' || item.status === 'ADDRESSED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Title & Comment */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3.5 space-y-1.5">
                {item.title && (
                  <h5 className="text-xs font-bold text-gray-900">{item.title}</h5>
                )}
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                  {item.comment || 'No detailed comments provided.'}
                </p>
              </div>

              {/* Staff Response / Action Area */}
              {item.staff_response ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Staff Response & Action Notes
                  </p>
                  <p className="text-xs text-gray-800 font-medium whitespace-pre-line">
                    {item.staff_response}
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => {
                    setActiveRespondItem(item);
                    setResponseInput(item.staff_response || '');
                    setResponseStatus((item.status as any) || 'REVIEWED');
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3 text-gray-600" />
                  <span>{item.staff_response ? 'Edit Response' : 'Acknowledge & Respond'}</span>
                </button>

                <button
                  onClick={() => handleDeleteFeedback(item.id)}
                  className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                  title="Delete Feedback Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STAFF RESPONSE MODAL */}
      {activeRespondItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Acknowledge & Respond to Feedback</span>
              </h3>
              <button
                onClick={() => setActiveRespondItem(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1">
              <p className="font-bold text-gray-800">
                {activeRespondItem.is_anonymous ? '🔒 Anonymous Founder' : activeRespondItem.founder_name} ({activeRespondItem.feedback_type})
              </p>
              <p className="text-gray-600 line-clamp-2">
                "{activeRespondItem.comment || activeRespondItem.title || 'Rating given'}"
              </p>
            </div>

            <form onSubmit={handleRespondSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResponseStatus('REVIEWED')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      responseStatus === 'REVIEWED'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseStatus('ADDRESSED')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      responseStatus === 'ADDRESSED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Addressed & Resolved
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Staff Response / Resolution Note
                </label>
                <textarea
                  value={responseInput}
                  onChange={(e) => setResponseInput(e.target.value)}
                  placeholder="Provide an official staff response or internal resolution action note..."
                  rows={4}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRespondItem(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse}
                  className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingResponse ? 'Saving...' : 'Save Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
