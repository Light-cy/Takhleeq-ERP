import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Settings, 
  Menu, 
  X, 
  Shield, 
  LogOut, 
  Building, 
  Database,
  Lock,
  GraduationCap,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Sliders,
  FileText,
  UserCheck,
  Rocket,
  Calendar,
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  BarChart2,
  Award,
  AlertOctagon,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as ERPUser } from '../../types';

interface StaffLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeUser: ERPUser | null;
  hasPermission: (permission: string) => boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
  jwtToken?: string | null;
  cohortsList?: any[];
  selectedCohortId?: number | null;
  setSelectedCohortId?: (id: number) => void;
  currentPath?: string;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  activeTab,
  setActiveTab,
  activeUser,
  hasPermission,
  onNavigate,
  onLogout,
  children,
  cohortsList = [],
  selectedCohortId = null,
  setSelectedCohortId,
  currentPath
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Collapsible dropdown states
  const [bookingOpen, setBookingOpen] = useState<boolean>(true);
  const [cohortOpen, setCohortOpen] = useState<boolean>(true);
  const [appMgmtOpen, setAppMgmtOpen] = useState<boolean>(true);
  const [performanceOpen, setPerformanceOpen] = useState<boolean>(true);

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50/50" id="staff-dashboard-page">
      
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0">
        <div className="p-5 border-b border-gray-100 bg-gray-50/20">
          <div className="flex items-center gap-2.5 cursor-pointer mb-5" onClick={() => onNavigate('/')}>
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-black font-mono">T</span>
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-gray-900">Takhleeq ERP Portal</span>
          </div>

          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Signed Back-office</p>
          <div className="mt-2.5 flex items-start gap-2.5">
            <div className="h-8.5 w-8.5 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-gray-800 truncate leading-tight">{activeUser?.name ? activeUser.name.split(' (')[0] : (activeUser?.email || 'Staff Member')}</h3>
              <p className="text-[10px] text-primary font-bold mt-0.5">{activeUser?.role || 'Staff'}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          <div>
            <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">Operations</h2>
            
            {/* 1. BOOKING COLLAPSIBLE */}
            <div className="space-y-1">
              <button
                onClick={() => setBookingOpen(!bookingOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Building className="h-4 w-4 text-gray-500" />
                  Booking
                </span>
                {bookingOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              </button>

              <AnimatePresence>
                {bookingOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-3 border-l border-gray-100 ml-4 space-y-1 my-1 overflow-hidden"
                  >
                    <button
                      onClick={() => setActiveTab('queue')}
                      disabled={!hasPermission('VIEW_PENDING_QUEUE')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'queue' 
                          ? 'bg-primary text-white shadow-3xs' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Review Queue
                      </span>
                      {!hasPermission('VIEW_PENDING_QUEUE') && <Lock className="h-3 w-3 text-gray-400 animate-pulse" />}
                    </button>

                    <button
                      onClick={() => setActiveTab('register')}
                      disabled={!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'register' 
                          ? 'bg-primary text-white shadow-3xs' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" />
                        Booking Register
                      </span>
                      {!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE') && <Lock className="h-3 w-3 text-gray-400 animate-pulse" />}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. COHORT MANAGEMENT COLLAPSIBLE */}
            <div className="space-y-1 mt-2">
              <button
                onClick={() => setCohortOpen(!cohortOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Cohort Management
                </span>
                {cohortOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              </button>

              <AnimatePresence>
                {cohortOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-3 border-l border-gray-100 ml-4 space-y-1 my-1 overflow-hidden"
                  >
                    {/* Persistent Cohort Selector Dropdown */}
                    <div className="px-2 py-1.5 bg-gray-50/80 border border-gray-150 rounded-xl space-y-1 my-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block font-mono px-0.5">
                        Active Cohort Scope
                      </span>
                      <select
                        value={selectedCohortId || ''}
                        onChange={(e) => setSelectedCohortId && setSelectedCohortId(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 text-[11px] font-black text-gray-800 rounded-lg px-2 py-1 focus:outline-none focus:border-primary shadow-2xs cursor-pointer truncate"
                      >
                        {cohortsList.length === 0 ? (
                          <option value="">No Cohorts Loaded</option>
                        ) : (
                          cohortsList.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.status === 'ACTIVE' ? '🟢 Active' : `(${c.status})`}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Dashboard */}
                    <button
                      onClick={() => setActiveTab('cohort_dashboard')}
                      disabled={!hasPermission('cohort:applicant_review') && !hasPermission('cohort:session_manage') && !hasPermission('cohort:form_manage')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'cohort_dashboard' || activeTab === 'cohorts'
                          ? 'bg-primary text-white shadow-3xs' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Dashboard
                      </span>
                      {!hasPermission('cohort:applicant_review') && !hasPermission('cohort:session_manage') && !hasPermission('cohort:form_manage') && (
                        <Lock className="h-3 w-3 text-gray-400" />
                      )}
                    </button>

                    {/* Cohort Settings */}
                    <button
                      onClick={() => setActiveTab('cohort_settings')}
                      disabled={!hasPermission('cohort:form_manage')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'cohort_settings' 
                          ? 'bg-primary text-white shadow-3xs' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <Sliders className="h-3.5 w-3.5" />
                        Cohort Settings
                      </span>
                      {!hasPermission('cohort:form_manage') && <Lock className="h-3 w-3 text-gray-400" />}
                    </button>

                    {/* Application Management (Collapsible Sub-Group) */}
                    <div className="space-y-0.5">
                      <button
                        onClick={() => setAppMgmtOpen(!appMgmtOpen)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Application Management
                        </span>
                        {appMgmtOpen ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                      </button>

                      {appMgmtOpen && (
                        <div className="pl-3 border-l border-gray-100 ml-3 space-y-1 my-0.5">
                          <button
                            onClick={() => setActiveTab('cohort_form_config')}
                            disabled={!hasPermission('cohort:form_manage')}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              activeTab === 'cohort_form_config' || activeTab === 'builder'
                                ? 'bg-primary text-white shadow-3xs' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3 w-3" />
                              Application Form Configuration
                            </span>
                            {!hasPermission('cohort:form_manage') && <Lock className="h-3 w-3 text-gray-400" />}
                          </button>

                          <button
                            onClick={() => setActiveTab('cohort_applications')}
                            disabled={!hasPermission('cohort:applicant_review')}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              activeTab === 'cohort_applications' || activeTab === 'cohort_intake'
                                ? 'bg-primary text-white shadow-3xs' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <span className="flex items-center gap-1.5">
                              <UserCheck className="h-3 w-3" />
                              Review Applications
                            </span>
                            {!hasPermission('cohort:applicant_review') && <Lock className="h-3 w-3 text-gray-400" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Active Startups */}
                    <button
                      onClick={() => setActiveTab('cohort_startups')}
                      disabled={!hasPermission('cohort:applicant_review')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'cohort_startups' 
                          ? 'bg-primary text-white shadow-3xs' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <Rocket className="h-3.5 w-3.5" />
                        Active Startups
                      </span>
                      {!hasPermission('cohort:applicant_review') && <Lock className="h-3 w-3 text-gray-400" />}
                    </button>

                    {/* Sessions */}
                    <button
                      onClick={() => {
                        setActiveTab('cohort_sessions');
                        if (currentPath && currentPath.startsWith('/admin/sessions')) {
                          onNavigate('/staff/dashboard');
                        }
                      }}
                      disabled={!hasPermission('cohort:session_manage')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'cohort_sessions' || (currentPath && currentPath.startsWith('/admin/sessions'))
                          ? 'bg-primary text-white shadow-3xs' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Sessions
                      </span>
                      {!hasPermission('cohort:session_manage') && <Lock className="h-3 w-3 text-gray-400" />}
                    </button>

                    {/* Assignments */}
                    <button
                      onClick={() => setActiveTab('cohort_assignments')}
                      disabled={!hasPermission('cohort:session_manage')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'cohort_assignments' 
                          ? 'bg-primary text-white shadow-3xs' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-2">
                        <CheckSquare className="h-3.5 w-3.5" />
                        Assignments
                      </span>
                      {!hasPermission('cohort:session_manage') && <Lock className="h-3 w-3 text-gray-400" />}
                    </button>


                    {/* Performance (Collapsible Sub-Group) */}
                    <div className="space-y-0.5">
                      <button
                        onClick={() => setPerformanceOpen(!performanceOpen)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Performance
                        </span>
                        {performanceOpen ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                      </button>

                      {performanceOpen && (
                        <div className="pl-3 border-l border-gray-100 ml-3 space-y-1 my-0.5">
                          <button
                            onClick={() => setActiveTab('cohort_kpis')}
                            disabled={!hasPermission('cohort:checkin_log') && !hasPermission('cohort:applicant_review')}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              activeTab === 'cohort_kpis' 
                                ? 'bg-primary text-white shadow-3xs' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <span className="flex items-center gap-1.5">
                              <BarChart2 className="h-3 w-3" />
                              Metrics & KPIs
                            </span>
                            {!hasPermission('cohort:checkin_log') && !hasPermission('cohort:applicant_review') && <Lock className="h-3 w-3 text-gray-400" />}
                          </button>

                          <button
                            onClick={() => setActiveTab('cohort_investment')}
                            disabled={!hasPermission('cohort:applicant_review')}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              activeTab === 'cohort_investment' 
                                ? 'bg-primary text-white shadow-3xs' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Award className="h-3 w-3" />
                              Investment Readiness
                            </span>
                            {!hasPermission('cohort:applicant_review') && <Lock className="h-3 w-3 text-gray-400" />}
                          </button>

                          <button
                            onClick={() => setActiveTab('cohort_feedback')}
                            disabled={!hasPermission('cohort:checkin_log') && !hasPermission('cohort:applicant_review')}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              activeTab === 'cohort_feedback' 
                                ? 'bg-primary text-white shadow-3xs' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="h-3 w-3" />
                              Founder Feedback
                            </span>
                            {!hasPermission('cohort:checkin_log') && !hasPermission('cohort:applicant_review') && <Lock className="h-3 w-3 text-gray-400" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 my-2" />
          
          <div>
            <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">Administration</h2>

            <button
              onClick={() => setActiveTab('governance')}
              disabled={!hasPermission('ISSUE_BAN') && !hasPermission('MANAGE_ROLES') && !hasPermission('MANAGE_USERS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'governance' 
                  ? 'bg-primary text-white shadow-3xs' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="h-4 w-4" />
                Governance Center
              </span>
              {!hasPermission('ISSUE_BAN') && !hasPermission('MANAGE_ROLES') && !hasPermission('MANAGE_USERS') && <Lock className="h-3 w-3 text-gray-400" />}
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              disabled={!hasPermission('MANAGE_ROOMS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rooms' 
                  ? 'bg-primary text-white shadow-3xs' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className="flex items-center gap-2.5">
                <Building className="h-4 w-4" />
                Room Management
              </span>
              {!hasPermission('MANAGE_ROOMS') && <Lock className="h-3 w-3 text-gray-400" />}
            </button>

            <button
              onClick={() => setActiveTab('audits')}
              disabled={!hasPermission('VIEW_AUDIT_LOGS') && !hasPermission('EXPORT_AUDIT_LOGS') && !hasPermission('VIEW_ANALYTICS_DASHBOARD')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audits' 
                  ? 'bg-primary text-white shadow-3xs' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className="flex items-center gap-2.5">
                <Database className="h-4 w-4" />
                Audit Logs & Analytics
              </span>
              {!hasPermission('VIEW_AUDIT_LOGS') && !hasPermission('EXPORT_AUDIT_LOGS') && !hasPermission('VIEW_ANALYTICS_DASHBOARD') && <Lock className="h-3 w-3 text-gray-400" />}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-400 font-bold">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> AD Sync Active
          </span>
          <button 
            onClick={onLogout}
            className="text-gray-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-bold"
          >
            <LogOut className="h-3.5 w-3.5" /> Out
          </button>
        </div>
      </aside>

      {/* Staff Right Main workspace Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#8B1A1A] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
              Takhleeq Backoffice Console
            </span>
            <span className="h-4 w-px bg-gray-200" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {activeTab === 'queue' 
                ? 'Operational Pending Reviews' 
                : activeTab === 'register' 
                ? 'Schedules & CSV Snapper' 
                : activeTab === 'governance' 
                ? 'Custom Role Compiler' 
                : activeTab === 'rooms' 
                ? 'Facility Spaces configurator' 
                : activeTab.startsWith('cohort') 
                ? 'Incubator & Admissions Workspace'
                : 'Security Audit Ledger logs'}
            </span>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-500 hover:text-gray-950 rounded-lg cursor-pointer border border-gray-150 bg-gray-50"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* Mobile hamburger panel inside dashboard */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="md:hidden fixed inset-0 z-40 bg-white flex flex-col p-6 space-y-6 text-left"
            >
              <div className="flex justify-between items-center border-b pb-4">
                <span className="font-extrabold text-primary uppercase text-sm">Dashboard Nav</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-500 text-lg">✕</button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                <button 
                  onClick={() => { setActiveTab('queue'); setMobileMenuOpen(false); }}
                  disabled={!hasPermission('VIEW_PENDING_QUEUE')}
                  className={`w-full text-left font-black text-xs p-3 rounded-xl uppercase tracking-wider ${activeTab === 'queue' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                >
                  Review Queue
                </button>
                <button 
                  onClick={() => { setActiveTab('register'); setMobileMenuOpen(false); }}
                  disabled={!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE')}
                  className={`w-full text-left font-black text-xs p-3 rounded-xl uppercase tracking-wider ${activeTab === 'register' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                >
                  Booking Register
                </button>
                
                {/* Cohorts Mobile section */}
                <div className="pt-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Cohort Management</span>
                  <button 
                    onClick={() => { setActiveTab('cohort_dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full text-left font-black text-xs p-2.5 rounded-xl uppercase tracking-wider ${activeTab === 'cohort_dashboard' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Cohort Dashboard
                  </button>
                  <button 
                    onClick={() => { setActiveTab('cohort_applications'); setMobileMenuOpen(false); }}
                    className={`w-full text-left font-black text-xs p-2.5 rounded-xl uppercase tracking-wider mt-1 ${activeTab === 'cohort_applications' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Review Applications
                  </button>
                  <button 
                    onClick={() => { setActiveTab('cohort_startups'); setMobileMenuOpen(false); }}
                    className={`w-full text-left font-black text-xs p-2.5 rounded-xl uppercase tracking-wider mt-1 ${activeTab === 'cohort_startups' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Active Startups
                  </button>
                </div>

                <div className="pt-2 border-t mt-2">
                  <button 
                    onClick={() => { setActiveTab('governance'); setMobileMenuOpen(false); }}
                    disabled={!hasPermission('ISSUE_BAN') && !hasPermission('MANAGE_ROLES') && !hasPermission('MANAGE_USERS')}
                    className={`w-full text-left font-black text-xs p-3 rounded-xl uppercase tracking-wider ${activeTab === 'governance' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                  >
                    Governance Center
                  </button>
                  <button 
                    onClick={() => { setActiveTab('rooms'); setMobileMenuOpen(false); }}
                    disabled={!hasPermission('MANAGE_ROOMS')}
                    className={`w-full text-left font-black text-xs p-3 rounded-xl uppercase tracking-wider ${activeTab === 'rooms' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                  >
                    Room Management
                  </button>
                  <button 
                    onClick={() => { setActiveTab('audits'); setMobileMenuOpen(false); }}
                    disabled={!hasPermission('VIEW_AUDIT_LOGS') && !hasPermission('EXPORT_AUDIT_LOGS') && !hasPermission('VIEW_ANALYTICS_DASHBOARD')}
                    className={`w-full text-left font-black text-xs p-3 rounded-xl uppercase tracking-wider ${activeTab === 'audits' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                  >
                    Audit Logs & Analytics
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main inner workspace container with overflow scroll */}
        <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
