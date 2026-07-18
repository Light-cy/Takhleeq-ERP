import React from 'react';
import { Database, BarChart2, Lock } from 'lucide-react';
import { AuditRecord, Booking, Room, Ban } from '../../../../types';
import { useAuditLogs } from './hooks/useAuditLogs';
import { ExportControls } from './components/ExportControls';
import { AuditLogsTable } from './components/AuditLogsTable';
import { LogDetailsModal } from './components/LogDetailsModal';
import { AuditAnalyticsDashboard } from '../../components/AuditAnalyticsDashboard';

interface AuditLogsPageProps {
  auditLogs: AuditRecord[];
  reportsData: any;
  onRefresh: () => void;
  hasPermission: (permission: string) => boolean;
  bookings?: Booking[];
  rooms?: Room[];
  activeBans?: Ban[];
}

export function AuditLogsPage({ 
  auditLogs, 
  onRefresh, 
  hasPermission, 
  bookings, 
  rooms, 
  activeBans 
}: AuditLogsPageProps) {
  const hasAuditView = hasPermission('VIEW_AUDIT_LOGS');
  const hasDashboardView = hasPermission('VIEW_ANALYTICS_DASHBOARD');
  const hasExportView = hasPermission('EXPORT_AUDIT_LOGS');

  const {
    activeView,
    setActiveView,
    selectedLog,
    setSelectedLog,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    paginatedLogs,
    filteredLogs,
    totalPages,
    handleExportCSV,
    handleExportPDF
  } = useAuditLogs(auditLogs);

  return (
    <div className="space-y-6 text-left animate-fade-in" id="audit-logs-view">
      
      {/* Sub-navigation Tab Switcher */}
      <div className="flex border-b border-gray-150 gap-6 pb-px">
        <button
          onClick={() => {
            setActiveView('ledger');
            setSelectedLog(null);
          }}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeView === 'ledger'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Database className="h-4 w-4" /> 
          Immutable Audit Ledger
          {!hasAuditView && <Lock className="h-3 w-3 text-gray-400" />}
        </button>

        <button
          onClick={() => {
            setActiveView('analytics');
            setSelectedLog(null);
          }}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeView === 'analytics'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          <BarChart2 className="h-4 w-4" /> 
          Operational Analytics Dashboard
          {!hasDashboardView && <Lock className="h-3 w-3 text-gray-400" />}
        </button>
      </div>

      {/* VIEW 1: IMMUTABLE AUDIT LEDGER */}
      {activeView === 'ledger' && (
        <div className="space-y-4">
          <ExportControls 
            onRefresh={onRefresh}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hasExportView={hasExportView}
            totalMatches={filteredLogs.length}
          />
          <AuditLogsTable 
            logs={paginatedLogs}
            totalMatches={filteredLogs.length}
            setSelectedLog={setSelectedLog}
            hasAuditView={hasAuditView}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      )}

      {/* VIEW 2: OPERATIONAL ANALYTICS DASHBOARD */}
      {activeView === 'analytics' && (
        <AuditAnalyticsDashboard 
          auditLogs={auditLogs}
          bookings={bookings}
          rooms={rooms}
          activeBans={activeBans}
          hasDashboardView={hasDashboardView}
          hasExportView={hasExportView}
          onRefresh={onRefresh}
          setSelectedLog={setSelectedLog}
        />
      )}

      {/* Inspection Modal */}
      {selectedLog && (
        <LogDetailsModal 
          selectedLog={selectedLog}
          setSelectedLog={setSelectedLog}
        />
      )}

    </div>
  );
}
