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
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as ERPUser } from '../../types';

interface StaffLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeUser: ERPUser;
  hasPermission: (permission: string) => boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  activeTab,
  setActiveTab,
  activeUser,
  hasPermission,
  onNavigate,
  onLogout,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
              <h3 className="text-xs font-black text-gray-800 truncate leading-tight">{activeUser.name.split(' (')[0]}</h3>
              <p className="text-[10px] text-primary font-bold mt-0.5">{activeUser.role}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2.5">Operations</h2>
          
          <button
            onClick={() => setActiveTab('queue')}
            disabled={!hasPermission('VIEW_PENDING_QUEUE')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'queue' 
                ? 'bg-primary text-white shadow-3xs' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4" />
              Review Queue
            </span>
            {!hasPermission('VIEW_PENDING_QUEUE') && <Lock className="h-3 w-3 text-gray-400 animate-pulse" />}
          </button>

          <button
            onClick={() => setActiveTab('register')}
            disabled={!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'register' 
                ? 'bg-primary text-white shadow-3xs' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-3">
              <Activity className="h-4 w-4" />
              Booking Register
            </span>
            {!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE') && <Lock className="h-3 w-3 text-gray-400 animate-pulse" />}
          </button>

          <div className="pt-4 border-t border-gray-100 my-4" />
          <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2.5">Administration</h2>

          <button
            onClick={() => setActiveTab('governance')}
            disabled={!hasPermission('ISSUE_BAN') && !hasPermission('MANAGE_ROLES') && !hasPermission('MANAGE_USERS')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'governance' 
                ? 'bg-primary text-white shadow-3xs' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              Governance Center
            </span>
            {!hasPermission('ISSUE_BAN') && !hasPermission('MANAGE_ROLES') && !hasPermission('MANAGE_USERS') && <Lock className="h-3 w-3 text-gray-400" />}
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            disabled={activeUser.role !== 'Administrator'}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rooms' 
                ? 'bg-primary text-white shadow-3xs' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-3">
              <Building className="h-4 w-4" />
              Room Management
            </span>
            {activeUser.role !== 'Administrator' && <Lock className="h-3 w-3 text-gray-400" />}
          </button>

          <button
            onClick={() => setActiveTab('audits')}
            disabled={!hasPermission('VIEW_AUDIT_LOGS') && !hasPermission('EXPORT_AUDIT_LOGS') && !hasPermission('VIEW_ANALYTICS_DASHBOARD')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audits' 
                ? 'bg-primary text-white shadow-3xs' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-3">
              <Database className="h-4 w-4" />
              Audit Logs & Analytics
            </span>
            {!hasPermission('VIEW_AUDIT_LOGS') && !hasPermission('EXPORT_AUDIT_LOGS') && !hasPermission('VIEW_ANALYTICS_DASHBOARD') && <Lock className="h-3 w-3 text-gray-400" />}
          </button>
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

              <div className="flex-1 space-y-3.5 overflow-y-auto">
                <button 
                  onClick={() => { setActiveTab('queue'); setMobileMenuOpen(false); }}
                  disabled={!hasPermission('VIEW_PENDING_QUEUE')}
                  className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'queue' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                >
                  Review Queue
                </button>
                <button 
                  onClick={() => { setActiveTab('register'); setMobileMenuOpen(false); }}
                  disabled={!hasPermission('BOOKING_OVERRIDE') && !hasPermission('VIEW_PENDING_QUEUE')}
                  className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'register' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                >
                  Booking Register
                </button>
                <button 
                  onClick={() => { setActiveTab('governance'); setMobileMenuOpen(false); }}
                  disabled={!hasPermission('ISSUE_BAN') && !hasPermission('MANAGE_ROLES') && !hasPermission('MANAGE_USERS')}
                  className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'governance' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                >
                  Governance Center
                </button>
                <button 
                  onClick={() => { setActiveTab('rooms'); setMobileMenuOpen(false); }}
                  disabled={activeUser.role !== 'Administrator'}
                  className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'rooms' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                >
                  Room Management
                </button>
                <button 
                  onClick={() => { setActiveTab('audits'); setMobileMenuOpen(false); }}
                  disabled={!hasPermission('VIEW_AUDIT_LOGS') && !hasPermission('EXPORT_AUDIT_LOGS') && !hasPermission('VIEW_ANALYTICS_DASHBOARD')}
                  className={`w-full text-left font-black text-xs p-3.5 rounded-xl uppercase tracking-wider ${activeTab === 'audits' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'} disabled:opacity-40`}
                >
                  Audit Logs & Analytics
                </button>
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
