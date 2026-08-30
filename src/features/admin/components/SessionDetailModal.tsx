import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Video, 
  CheckCircle2, 
  XCircle, 
  Clock3, 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  HelpCircle,
  Eye,
  AlertCircle,
  ArrowLeft,
  Image as ImageIcon,
  Paperclip,
  Link as LinkIcon,
  ExternalLink,
  Star,
  MessageSquare,
  MessageCircle,
  UserCheck,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  Lock
} from 'lucide-react';
import { SessionFeedbackSummary, SessionFeedbackSubmission } from '../../../types/cohort.types';
import { downloadFileLocally, getCleanFileName, parseAssignmentAttachments, formatFileSize, AssignmentAttachment } from '../../../utils/fileDownload';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface SessionDetailModalProps {
  session: any;
  cohortStartups: any[];
  jwtToken: string | null;
  onClose?: () => void;
  onBack?: () => void;
  isFullPage?: boolean;
  onUpdateSession: (updatedSession: any) => void;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  cohortStartups,
  jwtToken,
  onClose,
  onBack,
  isFullPage = false,
  onUpdateSession,
  triggerSuccess,
  triggerError
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'assignments' | 'feedback'>('overview');

  // Attendance State
  const [attendanceSheet, setAttendanceSheet] = useState<Record<number, string>>({});
  const [attendancePhotoUrl, setAttendancePhotoUrl] = useState<string | null>(session.attendance_sheet_photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Assignments State
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showCreateAssignmentForm, setShowCreateAssignmentForm] = useState(false);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgDueDate, setAsgDueDate] = useState('');
  const [asgFiles, setAsgFiles] = useState<File[]>([]);
  const [asgExternalUrls, setAsgExternalUrls] = useState<string[]>([]);
  const [asgUrlInput, setAsgUrlInput] = useState('');
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadingAsgFile, setUploadingAsgFile] = useState(false);
  const [creatingAsg, setCreatingAsg] = useState(false);

  // Submissions State (for an expanded assignment)
  const [expandedAsgId, setExpandedAsgId] = useState<number | null>(null);
  const [asgSubmissions, setAsgSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Extend / Edit Assignment State
  const [editingAsg, setEditingAsg] = useState<any | null>(null);
  const [isUpdatingAsg, setIsUpdatingAsg] = useState(false);

  // Session Feedback State (Admin View)
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedbackSummary | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<number | 'all'>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<number | null>(null);

  // Active Startups Filter: Exclude startups in KICKED_OUT, PAUSED, SUSPENDED, DROPPED, or REJECTED status
  const activeEligibleStartups = cohortStartups.filter((st: any) => {
    const ps = String(st.program_status || '').toUpperCase();
    const s = String(st.status || '').toUpperCase();
    if (['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED'].includes(ps)) return false;
    if (['PAUSED', 'KICKED_OUT', 'SUSPENDED', 'DROPPED', 'REJECTED'].includes(s)) return false;
    return true;
  });

  // Session Date Lock Check
  const todayStr = getTodayDateString();
  const sessionDateStr = session.date ? String(session.date).slice(0, 10) : todayStr;
  const isAttendanceLocked = sessionDateStr > todayStr;

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${jwtToken}`
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('currentUser');
        window.dispatchEvent(new Event('auth:session_expired'));
      }
    }
    return res;
  };

  // Fetch Session Attendance
  const loadAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const res = await fetchWithAuth(`/api/sessions/${session.id}/attendance`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load attendance.');

      if (data.attendance_sheet_photo_url) {
        setAttendancePhotoUrl(data.attendance_sheet_photo_url);
      }

      const sheetMap: Record<number, string> = {};
      (data.attendance || []).forEach((rec: any) => {
        sheetMap[rec.applicant_id] = rec.status || 'not_marked';
      });

      // Default remaining active cohort startups to 'not_marked'
      activeEligibleStartups.forEach((st: any) => {
        if (!sheetMap[st.id]) {
          sheetMap[st.id] = 'not_marked';
        }
      });

      setAttendanceSheet(sheetMap);
    } catch (err: any) {
      console.error(err);
      triggerError(err.message);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Fetch Session Assignments
  const loadAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const res = await fetchWithAuth(`/api/sessions/${session.id}/assignments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load assignments.');
      setAssignments(data.assignments || []);
    } catch (err: any) {
      console.error(err);
      triggerError(err.message);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Fetch Submissions for a specific assignment
  const loadSubmissions = async (assignmentId: number) => {
    try {
      setLoadingSubmissions(true);
      const res = await fetchWithAuth(`/api/assignments/${assignmentId}/submissions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load submissions.');
      setAsgSubmissions(data.submissions || []);
    } catch (err: any) {
      console.error(err);
      triggerError(err.message);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance();
    } else if (activeTab === 'assignments') {
      loadAssignments();
    }
  }, [activeTab]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const fileData = reader.result as string;
        const res = await fetchWithAuth('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'File upload failed.');
        setAttendancePhotoUrl(data.url);
        triggerSuccess('Attendance sheet photo uploaded successfully.');
      };
    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (isAttendanceLocked) {
      triggerError(`Attendance is locked until the scheduled session date (${sessionDateStr}).`);
      return;
    }

    try {
      setSavingAttendance(true);
      const attendanceArray = Object.entries(attendanceSheet).map(([appId, status]) => ({
        applicant_id: parseInt(appId),
        status
      }));

      const res = await fetchWithAuth(`/api/sessions/${session.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance: attendanceArray,
          attendance_sheet_photo_url: attendancePhotoUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save attendance.');

      onUpdateSession({
        ...session,
        attendance_sheet_photo_url: attendancePhotoUrl
      });
      triggerSuccess(`Attendance records saved for '${session.title}'.`);
    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Assignment Multi-File Attachment Handlers
  const handleAddAsgFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    setAsgFiles(prev => {
      const existingSignatures = new Set(prev.map(f => `${f.name}_${f.size}`));
      const uniqueNew = incoming.filter(f => !existingSignatures.has(`${f.name}_${f.size}`));
      return [...prev, ...uniqueNew];
    });
  };

  const handleRemoveAsgFile = (index: number) => {
    setAsgFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExternalUrl = () => {
    const trimmed = asgUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      triggerError('Please enter a valid URL starting with https:// or http://');
      return;
    }
    if (!asgExternalUrls.includes(trimmed)) {
      setAsgExternalUrls(prev => [...prev, trimmed]);
      setAsgUrlInput('');
    }
  };

  const handleRemoveExternalUrl = (index: number) => {
    setAsgExternalUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim() || !asgDueDate) {
      triggerError('Title and due date are required.');
      return;
    }
    const todayStr = getTodayDateString();
    if (asgDueDate < todayStr) {
      triggerError('Submission due date cannot be in the past. Please select today or a future date.');
      return;
    }

    try {
      setCreatingAsg(true);
      const attachmentsList: AssignmentAttachment[] = [];

      // 1. Upload files in batch
      if (asgFiles.length > 0) {
        setUploadingAsgFile(true);
        for (let i = 0; i < asgFiles.length; i++) {
          const file = asgFiles[i];
          setUploadProgressText(`Uploading (${i + 1}/${asgFiles.length}): ${file.name}...`);
          
          const reader = new FileReader();
          const fileData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });

          const uploadRes = await fetchWithAuth('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileData })
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || `Upload failed for ${file.name}`);

          attachmentsList.push({
            name: file.name,
            url: uploadData.url,
            size: file.size
          });
        }
        setUploadingAsgFile(false);
      }

      // 2. Add external URLs
      asgExternalUrls.forEach(url => {
        if (url.trim()) {
          attachmentsList.push({
            name: getCleanFileName(url.trim()),
            url: url.trim()
          });
        }
      });

      // 3. Add single url input if user typed but forgot to click Add
      if (asgUrlInput.trim() && !asgExternalUrls.includes(asgUrlInput.trim())) {
        attachmentsList.push({
          name: getCleanFileName(asgUrlInput.trim()),
          url: asgUrlInput.trim()
        });
      }

      const finalAttachmentUrl = attachmentsList.length > 0 ? JSON.stringify(attachmentsList) : null;

      const res = await fetchWithAuth(`/api/sessions/${session.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: asgTitle.trim(),
          description: asgDesc.trim(),
          due_date: asgDueDate,
          attachment_url: finalAttachmentUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create assignment.');

      setAssignments(prev => [data.assignment, ...prev]);
      setShowCreateAssignmentForm(false);
      setAsgTitle('');
      setAsgDesc('');
      setAsgDueDate('');
      setAsgFiles([]);
      setAsgExternalUrls([]);
      setAsgUrlInput('');
      setUploadProgressText('');
      const attMsg = attachmentsList.length > 0 ? ` with ${attachmentsList.length} attachment(s)` : '';
      triggerSuccess(`Assignment created: '${data.assignment.title}'${attMsg}.`);
    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setCreatingAsg(false);
      setUploadingAsgFile(false);
      setUploadProgressText('');
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (asgId: number) => {
    try {
      const res = await fetchWithAuth(`/api/assignments/${asgId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete assignment.');
      setAssignments(prev => prev.filter(a => a.id !== asgId));
      if (expandedAsgId === asgId) setExpandedAsgId(null);
      triggerSuccess('Assignment deleted.');
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  const handleUpdateAssignmentDueDate = async () => {
    if (!editingAsg || !editingAsg.due_date) {
      triggerError('Due date is required.');
      return;
    }
    const todayStr = getTodayDateString();
    if (editingAsg.due_date < todayStr) {
      triggerError('Due date cannot be in the past. Please select today or a future date.');
      return;
    }
    setIsUpdatingAsg(true);
    try {
      const res = await fetchWithAuth(`/api/assignments/${editingAsg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingAsg.title,
          description: editingAsg.description,
          due_date: editingAsg.due_date
        })
      });
      if (res.ok) {
        triggerSuccess('Assignment due date updated / extended successfully!');
        setAssignments(prev => prev.map(a => a.id === editingAsg.id ? { ...a, ...editingAsg } : a));
        setEditingAsg(null);
      } else {
        const err = await res.json();
        triggerError(err.error || 'Failed to update assignment.');
      }
    } catch (err: any) {
      triggerError('Error updating assignment due date.');
    } finally {
      setIsUpdatingAsg(false);
    }
  };

  const handleToggleExpandAsg = (asgId: number) => {
    if (expandedAsgId === asgId) {
      setExpandedAsgId(null);
    } else {
      setExpandedAsgId(asgId);
      loadSubmissions(asgId);
    }
  };

  // Fetch Session Feedback
  const fetchSessionFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const res = await fetchWithAuth(`/api/sessions/${session.id}/feedback`);
      if (res.ok) {
        const data = await res.json();
        setSessionFeedback(data);
      }
    } catch (err) {
      console.error('Failed to load session feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    fetchSessionFeedback();
  }, [session.id]);

  useEffect(() => {
    if (activeTab === 'feedback') {
      fetchSessionFeedback();
    }
  }, [activeTab]);

  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this session feedback submission?')) return;
    setDeletingFeedbackId(feedbackId);
    try {
      const res = await fetchWithAuth(`/api/cohort-feedback/${feedbackId}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccess('Session feedback deleted successfully.');
        fetchSessionFeedback();
      } else {
        triggerError('Failed to delete feedback entry.');
      }
    } catch (err) {
      triggerError('Error deleting feedback.');
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  const content = (
    <div className={isFullPage ? "bg-white rounded-2xl border border-gray-100 p-6 shadow-3xs text-left space-y-6 w-full animate-fade-in" : "bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-left overflow-hidden"}>
      
      {/* HEADER */}
      {isFullPage ? (
        <div className="border-b border-gray-100 pb-5 space-y-3">
          {onBack && (
            <button 
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sessions
            </button>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono">
                  {session.topic_category || 'Session Detail'}
                </span>
                <span className="text-xs text-gray-400 font-bold font-mono">
                  {session.date} • {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                </span>
              </div>
              <h1 className="text-xl font-black text-gray-900 mt-1">{session.title}</h1>
            </div>
            {session.venue && (
              <span className="text-xs text-gray-500 font-bold bg-gray-50 border border-gray-150 px-3 py-1 rounded-lg font-mono">
                Venue: {session.venue}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono">
                {session.topic_category || 'Session Detail'}
              </span>
              <span className="text-xs text-gray-400 font-bold font-mono">
                {session.date} • {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
              </span>
            </div>
            <h2 className="text-lg font-black text-gray-900 mt-1">{session.title}</h2>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-gray-150 px-6 bg-white gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {isAttendanceLocked && <Lock className="w-3.5 h-3.5 text-amber-600" />}
            <span>Attendance Tracking</span>
            {isAttendanceLocked && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-100 text-amber-800 rounded">
                Locked
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Assignments & Submissions
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feedback'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${activeTab === 'feedback' ? 'fill-primary text-primary' : 'text-gray-400'}`} />
            <span>Session Feedback</span>
            {sessionFeedback?.total_submissions ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-black font-mono">
                {sessionFeedback.total_submissions}
              </span>
            ) : null}
          </button>
        </div>

        {/* TAB CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 block font-mono">Speaker / Mentor</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <User className="h-4 w-4 text-primary" />
                    <span>{session.mentor_name || 'Unspecified Internal Staff'}</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 block font-mono">Location / Venue</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{session.venue || 'Takhleeq Innovation Center'}</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 block font-mono">Date & Time</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{session.date} ({session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)})</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 block font-mono">Session Recording Link</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <Video className="h-4 w-4 text-primary" />
                    {session.recording_url ? (
                      <a href={session.recording_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                        {session.recording_url}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic font-normal">No URL attached</span>
                    )}
                  </div>
                </div>
              </div>

              {session.attendance_sheet_photo_url && (
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 block font-mono">Attendance Sheet Photo</span>
                  <div className="relative group max-w-sm rounded-lg overflow-hidden border border-gray-200">
                    <img src={session.attendance_sheet_photo_url} alt="Attendance Sheet" className="w-full h-auto object-cover max-h-48" />
                    <a 
                      href={session.attendance_sheet_photo_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all font-bold text-xs gap-1.5"
                    >
                      <Eye className="h-4 w-4" /> View Full Image
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">

              {/* Locked Notice Banner */}
              {isAttendanceLocked && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-amber-900 shadow-3xs">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5 font-mono">
                      Attendance is Locked Until Session Date
                    </h4>
                    <p className="text-xs font-medium text-amber-850 leading-relaxed">
                      This session is scheduled for <span className="font-bold underline">{sessionDateStr}</span>. Attendance marking and physical sign-in sheet uploads will automatically open on the day of the session.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Photo Upload Control */}
              <div className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                isAttendanceLocked ? 'bg-gray-50 border border-gray-200 opacity-60' : 'bg-rose-50/20 border border-rose-100'
              }`}>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Attendance Sheet Photo Attachment
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Upload a physical sign-in sheet photo or scan for reference verification.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {attendancePhotoUrl && (
                    <a 
                      href={attendancePhotoUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Photo
                    </a>
                  )}
                  <label className={`bg-white text-gray-800 border border-gray-200 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all ${
                    isAttendanceLocked ? 'cursor-not-allowed text-gray-400 bg-gray-100' : 'hover:bg-gray-50 cursor-pointer'
                  }`}>
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    {uploadingPhoto ? 'Uploading...' : attendancePhotoUrl ? 'Replace Photo' : 'Upload Photo'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      disabled={uploadingPhoto || isAttendanceLocked} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Startup Attendance Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 font-mono">
                      Active Startups ({activeEligibleStartups.length})
                    </span>
                    {cohortStartups.length > activeEligibleStartups.length && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono font-medium">
                        {cohortStartups.length - activeEligibleStartups.length} paused/kicked out excluded
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-[10px] font-bold text-gray-500">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Present: {Object.entries(attendanceSheet).filter(([id, v]) => activeEligibleStartups.some(s => String(s.id) === String(id)) && (v === 'present' || v === 'PRESENT')).length}</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Absent: {Object.entries(attendanceSheet).filter(([id, v]) => activeEligibleStartups.some(s => String(s.id) === String(id)) && (v === 'absent' || v === 'ABSENT')).length}</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Excused: {Object.entries(attendanceSheet).filter(([id, v]) => activeEligibleStartups.some(s => String(s.id) === String(id)) && (v === 'excused' || v === 'EXCUSED')).length}</span>
                  </div>
                </div>

                {loadingAttendance ? (
                  <div className="py-8 text-center text-gray-400 text-xs font-mono">Syncing attendance roster...</div>
                ) : activeEligibleStartups.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                    No active startups found in this cohort roster.
                  </div>
                ) : (
                  <div className="border border-gray-150 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                    {activeEligibleStartups.map((st: any) => {
                      const currentStatus = attendanceSheet[st.id] || 'not_marked';
                      return (
                        <div key={st.id} className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-gray-50/50 transition-all">
                          <div>
                            <h5 className="text-xs font-extrabold text-gray-800">{st.startup_name || 'Startup Team'}</h5>
                            <p className="text-[11px] text-gray-500">Founder: {st.name || st.founder_name || 'N/A'}</p>
                          </div>

                          {/* Segmented Control */}
                          <div className={`inline-flex p-1 bg-gray-100 rounded-xl border border-gray-150 text-[11px] font-bold ${
                            isAttendanceLocked ? 'opacity-50' : ''
                          }`}>
                            <button
                              type="button"
                              disabled={isAttendanceLocked}
                              onClick={() => setAttendanceSheet(prev => ({ ...prev, [st.id]: 'present' }))}
                              className={`px-3 py-1 rounded-lg transition-all ${
                                isAttendanceLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                currentStatus.toLowerCase() === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              disabled={isAttendanceLocked}
                              onClick={() => setAttendanceSheet(prev => ({ ...prev, [st.id]: 'absent' }))}
                              className={`px-3 py-1 rounded-lg transition-all ${
                                isAttendanceLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                currentStatus.toLowerCase() === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs font-black'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              disabled={isAttendanceLocked}
                              onClick={() => setAttendanceSheet(prev => ({ ...prev, [st.id]: 'excused' }))}
                              className={`px-3 py-1 rounded-lg transition-all ${
                                isAttendanceLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                currentStatus.toLowerCase() === 'excused'
                                  ? 'bg-amber-500 text-white shadow-xs font-black'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Excused
                            </button>
                            <button
                              type="button"
                              disabled={isAttendanceLocked}
                              onClick={() => setAttendanceSheet(prev => ({ ...prev, [st.id]: 'not_marked' }))}
                              className={`px-2.5 py-1 rounded-lg transition-all ${
                                isAttendanceLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                currentStatus.toLowerCase() === 'not_marked'
                                  ? 'bg-gray-300 text-gray-800 font-black'
                                  : 'text-gray-400 hover:text-gray-700'
                              }`}
                            >
                              Not Marked
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Save Button & Lock Info */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {isAttendanceLocked ? (
                  <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5 font-mono">
                    <Lock className="h-3.5 w-3.5" />
                    Attendance Locked until session date ({sessionDateStr})
                  </p>
                ) : <span />}

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance || isAttendanceLocked}
                  className={`py-2.5 px-6 rounded-xl font-bold text-xs tracking-wide transition-all shadow-3xs flex items-center gap-1.5 ${
                    isAttendanceLocked
                      ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                      : 'bg-primary hover:bg-[#5A0F0F] text-white cursor-pointer'
                  }`}
                >
                  {isAttendanceLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Attendance Locked
                    </>
                  ) : savingAttendance ? (
                    'Saving Attendance...'
                  ) : (
                    'Save Attendance Sheet'
                  )}
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              
              {/* Top Action */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-[10px] font-black uppercase text-gray-400 font-mono">
                  Session Assignments ({assignments.length})
                </span>
                <button
                  onClick={() => setShowCreateAssignmentForm(!showCreateAssignmentForm)}
                  className="bg-primary hover:bg-[#5A0F0F] text-white py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showCreateAssignmentForm ? 'Cancel' : 'Create Assignment'}
                </button>
              </div>

              {/* CREATE ASSIGNMENT FORM */}
              {showCreateAssignmentForm && (
                <form onSubmit={handleCreateAssignment} className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-4 text-xs">
                  <h4 className="font-black text-gray-800 uppercase tracking-wide text-xs">New Session Assignment</h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-500 font-mono">Title *</label>
                    <input
                      type="text"
                      required
                      value={asgTitle}
                      onChange={e => setAsgTitle(e.target.value)}
                      placeholder="e.g. Submitting Customer Interview Insights"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-500 font-mono">Submission Due Date *</label>
                    <input
                      type="date"
                      required
                      min={getTodayDateString()}
                      value={asgDueDate}
                      onChange={e => setAsgDueDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-500 font-mono">Description / Instructions</label>
                    <textarea
                      rows={2}
                      value={asgDesc}
                      onChange={e => setAsgDesc(e.target.value)}
                      placeholder="Outline assignment instructions or guidelines for startup teams..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-gray-500 font-mono">Reference Attachments & Templates (Optional)</label>
                      {(asgFiles.length > 0 || asgExternalUrls.length > 0) && (
                        <span className="text-[9px] font-bold text-primary font-mono">
                          {asgFiles.length + asgExternalUrls.length} attached
                        </span>
                      )}
                    </div>

                    {/* Multi-file selector drop area */}
                    <div className="border border-dashed border-gray-300 hover:border-primary rounded-xl p-3 bg-white text-center transition-colors">
                      <input
                        type="file"
                        id="session-multi-asg-files"
                        multiple
                        onChange={(e) => {
                          handleAddAsgFiles(e.target.files);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="session-multi-asg-files"
                        className="cursor-pointer flex flex-col items-center justify-center gap-1 text-[11px] text-gray-600 hover:text-primary font-medium"
                      >
                        <Paperclip className="h-4 w-4 text-gray-400" />
                        <span>Click to attach <strong>Multiple Files</strong> (PDF, PPTX, XLSX, DOCX, ZIP)</span>
                        <span className="text-[9px] text-gray-400">Templates, worksheets, instructions, rubrics</span>
                      </label>
                    </div>

                    {/* Selected Files List */}
                    {asgFiles.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[9px] font-bold text-gray-500 uppercase block font-mono">Files to Upload ({asgFiles.length}):</span>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {asgFiles.map((file, idx) => (
                            <div
                              key={`${file.name}_${idx}`}
                              className="flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded-lg text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 truncate mr-2">
                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="font-semibold text-gray-800 truncate" title={file.name}>{file.name}</span>
                                <span className="text-[9px] text-gray-400 font-mono shrink-0">({formatFileSize(file.size)})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAsgFile(idx)}
                                className="text-gray-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 cursor-pointer shrink-0 transition-colors"
                                title="Remove file"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* External Link Input */}
                    <div className="pt-1 space-y-1">
                      <span className="text-[9px] text-gray-400 font-mono block">or add link (Drive, Notion, Figma):</span>
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          placeholder="https://drive.google.com/... or https://notion.so/..."
                          value={asgUrlInput}
                          onChange={(e) => setAsgUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddExternalUrl();
                            }
                          }}
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary font-mono text-[10px]"
                        />
                        <button
                          type="button"
                          onClick={handleAddExternalUrl}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <LinkIcon className="h-3 w-3" /> Add Link
                        </button>
                      </div>

                      {asgExternalUrls.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {asgExternalUrls.map((url, idx) => (
                            <div
                              key={`url_${idx}`}
                              className="flex items-center justify-between p-1.5 bg-white border border-blue-100 rounded-lg text-[10px]"
                            >
                              <div className="flex items-center gap-1.5 truncate mr-2">
                                <LinkIcon className="h-3 w-3 text-blue-600 shrink-0" />
                                <span className="font-mono text-blue-700 truncate">{url}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveExternalUrl(idx)}
                                className="text-gray-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 cursor-pointer shrink-0 transition-colors"
                                title="Remove link"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={creatingAsg || uploadingAsgFile}
                      className="bg-primary hover:bg-[#5A0F0F] text-white py-2 px-5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-3xs disabled:opacity-50 flex items-center gap-2"
                    >
                      {creatingAsg || uploadingAsgFile ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{uploadProgressText || 'Publishing...'}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          <span>Publish Assignment {asgFiles.length + asgExternalUrls.length > 0 ? `(${asgFiles.length + asgExternalUrls.length} Files)` : ''}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ASSIGNMENTS LIST */}
              {loadingAssignments ? (
                <div className="py-8 text-center text-gray-400 text-xs font-mono">Fetching session assignments...</div>
              ) : assignments.length === 0 ? (
                <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                  No assignments created for this session yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map(asg => {
                    const isExpanded = expandedAsgId === asg.id;
                    return (
                      <div key={asg.id} className="border border-gray-150 rounded-xl overflow-hidden bg-white shadow-3xs">
                        
                        {/* Assignment Header Card */}
                        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/40">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-extrabold text-gray-800">{asg.title}</h4>
                              <span className="bg-rose-50 text-primary border border-rose-100 text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono">
                                Due: {asg.due_date}
                              </span>
                            </div>
                            {asg.description && <p className="text-xs text-gray-600">{asg.description}</p>}
                            {(() => {
                              const attachments = parseAssignmentAttachments(asg.attachment_url);
                              if (attachments.length === 0) return null;
                              return (
                                <div className="pt-1 space-y-1">
                                  <span className="text-[9px] font-bold text-gray-500 uppercase block font-mono">
                                    Attached Materials ({attachments.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {attachments.map((att, attIdx) => {
                                      const isHttpLink = att.url.startsWith('http://') || att.url.startsWith('https://');
                                      const isUploadFile = att.url.startsWith('/uploads/') || att.url.startsWith('data:') || att.url.startsWith('blob:');
                                      return (
                                        <button
                                          key={`${att.url}_${attIdx}`}
                                          type="button"
                                          onClick={() => {
                                            if (isUploadFile) {
                                              downloadFileLocally(att.url, att.name);
                                            } else {
                                              window.open(att.url, '_blank', 'noopener,noreferrer');
                                            }
                                          }}
                                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-800 hover:text-primary bg-white hover:bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 shadow-3xs cursor-pointer transition-all max-w-xs truncate"
                                          title={att.name || att.url}
                                        >
                                          {isUploadFile ? (
                                            <Download className="h-3 w-3 text-primary shrink-0" />
                                          ) : (
                                            <ExternalLink className="h-3 w-3 text-blue-600 shrink-0" />
                                          )}
                                          <span className="truncate">{att.name || getCleanFileName(att.url)}</span>
                                          {att.size && (
                                            <span className="text-[8px] text-gray-400 font-mono">({formatFileSize(att.size)})</span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingAsg({ id: asg.id, title: asg.title, description: asg.description || '', due_date: asg.due_date || '' })}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-blue-200"
                              title="Extend or Edit Due Date"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Extend Date</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleExpandAsg(asg.id)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {isExpanded ? 'Hide Submissions' : 'View Submissions'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(asg.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Delete Assignment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* EXPANDED SUBMISSIONS VIEW */}
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-150 space-y-3 bg-white">
                            <span className="text-[10px] font-black uppercase text-gray-400 block font-mono">
                              Startup Submissions Status
                            </span>

                            {loadingSubmissions ? (
                              <div className="py-4 text-center text-gray-400 text-xs font-mono">Loading submission records...</div>
                            ) : asgSubmissions.length === 0 ? (
                              <div className="p-4 text-center text-gray-400 text-xs">No startup submissions found.</div>
                            ) : (
                              <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100">
                                {asgSubmissions.map((sub: any) => (
                                  <div key={sub.applicant_id} className="p-3 flex items-center justify-between gap-3 text-xs">
                                    <div>
                                      <h5 className="font-extrabold text-gray-800">{sub.startup_name}</h5>
                                      <p className="text-[10px] text-gray-400">Founder: {sub.founder_name}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      {sub.is_submitted ? (
                                        <div className="flex items-center gap-2">
                                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Submitted
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => downloadFileLocally(sub.file_url, `${sub.startup_name.replace(/\s+/g, '_')}_${getCleanFileName(sub.file_url)}`)}
                                            className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-3xs"
                                            title="Save file directly to local disk"
                                          >
                                            <Download className="h-3 w-3" /> Save File
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                                          Not Submitted
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SESSION FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {loadingFeedback ? (
                <div className="p-12 text-center text-xs text-gray-400 font-bold space-y-2">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading session ratings and founder feedback...</p>
                </div>
              ) : !sessionFeedback ? (
                <div className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-bold">Unable to retrieve feedback information.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Score Card */}
                    <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                      <span className="text-[10px] font-black uppercase text-amber-700 block font-mono">Average Rating</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-900 font-mono">
                          {sessionFeedback.total_submissions > 0 ? sessionFeedback.average_rating.toFixed(1) : '—'}
                        </span>
                        <span className="text-xs text-amber-700 font-bold">/ 5.0</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(sessionFeedback.average_rating) && sessionFeedback.total_submissions > 0
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-amber-200'
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-amber-700 font-bold ml-1 font-mono">
                          ({sessionFeedback.total_submissions} {sessionFeedback.total_submissions === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    </div>

                    {/* Participation Card */}
                    <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                      <span className="text-[10px] font-black uppercase text-blue-700 block font-mono">Startup Participation</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-blue-900 font-mono">
                          {sessionFeedback.total_submissions}
                        </span>
                        <span className="text-xs text-blue-700 font-bold font-mono">
                          / {sessionFeedback.total_startups || cohortStartups.length || 0} Startups
                        </span>
                      </div>
                      <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100, 
                              Math.round((sessionFeedback.total_submissions / Math.max(1, sessionFeedback.total_startups || cohortStartups.length || 1)) * 100)
                            )}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* 7-Day Window Status Card */}
                    <div className={`p-4 rounded-xl border space-y-2 ${
                      sessionFeedback.feedback_status === 'ACTIVE'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : sessionFeedback.feedback_status === 'UPCOMING'
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-gray-100/70 border-gray-200 text-gray-800'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider block font-mono opacity-80">
                        7-Day Window Status
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          sessionFeedback.feedback_status === 'ACTIVE'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : sessionFeedback.feedback_status === 'UPCOMING'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-400 text-white'
                        }`}>
                          {sessionFeedback.feedback_status === 'ACTIVE' && '🟢 Active'}
                          {sessionFeedback.feedback_status === 'UPCOMING' && '⏳ Scheduled'}
                          {sessionFeedback.feedback_status === 'EXPIRED' && '🔒 Closed'}
                        </span>
                        {sessionFeedback.feedback_status === 'ACTIVE' && (
                          <span className="text-xs font-extrabold text-emerald-700 font-mono">
                            {sessionFeedback.days_remaining}d left
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {sessionFeedback.feedback_status === 'ACTIVE' && `Open until ${sessionFeedback.window_closes_date}`}
                        {sessionFeedback.feedback_status === 'UPCOMING' && `Opens on session date (${sessionFeedback.window_opens_date})`}
                        {sessionFeedback.feedback_status === 'EXPIRED' && `Window ended on ${sessionFeedback.window_closes_date}. Full logs archived permanently for admin audit.`}
                      </p>
                    </div>
                  </div>

                  {/* Rating Breakdown Bar */}
                  {sessionFeedback.total_submissions > 0 && (
                    <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Rating Distribution</span>
                        <span className="text-[11px] font-mono text-gray-500">Breakdown across 5 stars</span>
                      </div>
                      <div className="space-y-1.5">
                        {[5, 4, 3, 2, 1].map((r) => {
                          const count = (sessionFeedback.rating_breakdown as any)?.[r] || 0;
                          const pct = sessionFeedback.total_submissions > 0 ? (count / sessionFeedback.total_submissions) * 100 : 0;
                          return (
                            <div key={r} className="flex items-center gap-3 text-xs">
                              <span className="w-12 font-bold text-gray-700 font-mono flex items-center gap-1">
                                {r} <Star className="w-3 h-3 text-amber-500 fill-amber-400 inline" />
                              </span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-amber-400 h-full rounded-full transition-all duration-300" 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                              <span className="w-16 text-right text-[11px] text-gray-500 font-mono font-bold">
                                {count} ({Math.round(pct)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search feedback comments or founder names..."
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                      <button
                        type="button"
                        onClick={() => setFeedbackRatingFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          feedbackRatingFilter === 'all'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        All ({sessionFeedback.feedbacks.length})
                      </button>
                      {[5, 4, 3, 2, 1].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFeedbackRatingFilter(r)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            feedbackRatingFilter === r
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {r} <Star className="w-3 h-3 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedbacks Submissions List */}
                  <div className="space-y-3">
                    {(() => {
                      let list = sessionFeedback.feedbacks || [];
                      if (feedbackRatingFilter !== 'all') {
                        list = list.filter(f => f.rating === feedbackRatingFilter);
                      }
                      if (feedbackSearch.trim()) {
                        const term = feedbackSearch.toLowerCase();
                        list = list.filter(f => 
                          (f.comment && f.comment.toLowerCase().includes(term)) ||
                          (f.title && f.title.toLowerCase().includes(term)) ||
                          (f.founder_name && f.founder_name.toLowerCase().includes(term)) ||
                          (f.startup_name && f.startup_name.toLowerCase().includes(term))
                        );
                      }

                      if (list.length === 0) {
                        return (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-xs text-gray-500 space-y-2">
                            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                            <p className="font-bold text-gray-700">
                              {sessionFeedback.feedbacks.length === 0 
                                ? sessionFeedback.feedback_status === 'UPCOMING'
                                  ? `Session is scheduled for ${session.date}. Feedback window opens once the session is conducted.`
                                  : 'No feedback submissions recorded yet.'
                                : 'No feedback matches the selected filter.'}
                            </p>
                            {sessionFeedback.feedback_status === 'ACTIVE' && sessionFeedback.feedbacks.length === 0 && (
                              <p className="text-emerald-600 font-bold">
                                🟢 Founders in this cohort have an active 7-day window to submit feedback on their dashboard.
                              </p>
                            )}
                          </div>
                        );
                      }

                      return list.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all shadow-2xs space-y-3 text-left"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-3">
                              {/* Rating Stars */}
                              <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${
                                      star <= item.rating
                                        ? 'text-amber-500 fill-amber-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="text-xs font-black text-amber-900 ml-1 font-mono">
                                  {item.rating}.0
                                </span>
                              </div>

                              {/* Identity Tag */}
                              {item.is_anonymous ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                                  Anonymous Founder
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md">
                                  <UserCheck className="w-3 h-3 text-blue-600" />
                                  {item.founder_name} · <strong className="text-blue-900">{item.startup_name}</strong>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(item.created_at).toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteFeedback(item.id)}
                                disabled={deletingFeedbackId === item.id}
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                title="Delete this feedback submission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {item.title && (
                            <h4 className="text-xs font-black text-gray-900">{item.title}</h4>
                          )}

                          {item.comment ? (
                            <p className="text-xs text-gray-700 bg-gray-50/80 p-3 rounded-lg border border-gray-100 italic leading-relaxed">
                              "{item.comment}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400 italic">No written comment provided.</p>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      {content}

      {editingAsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-left">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Extend / Edit Due Date</h3>
              <button onClick={() => setEditingAsg(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Assignment Title</label>
                <input
                  type="text"
                  value={editingAsg.title}
                  onChange={(e) => setEditingAsg({ ...editingAsg, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Extended Due Date *</label>
                <input
                  type="date"
                  required
                  min={getTodayDateString()}
                  value={editingAsg.due_date}
                  onChange={(e) => setEditingAsg({ ...editingAsg, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Instructions / Guidelines</label>
                <textarea
                  value={editingAsg.description}
                  onChange={(e) => setEditingAsg({ ...editingAsg, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingAsg(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateAssignmentDueDate}
                disabled={isUpdatingAsg}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs"
              >
                {isUpdatingAsg ? 'Saving...' : 'Save Extended Date'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
