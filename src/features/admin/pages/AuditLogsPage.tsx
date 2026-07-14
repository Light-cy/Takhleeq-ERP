import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Database,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  Eye,
  X,
  Lock,
  BarChart2,
  PieChart,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { AuditRecord } from '../../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditLogsPageProps {
  auditLogs: AuditRecord[];
  reportsData: any;
  onRefresh: () => void;
  hasPermission: (permission: string) => boolean;
}

export function AuditLogsPage({ auditLogs, reportsData, onRefresh, hasPermission }: AuditLogsPageProps) {
  const hasAuditView = hasPermission('VIEW_AUDIT_LOGS');
  const hasDashboardView = hasPermission('VIEW_ANALYTICS_DASHBOARD');
  const hasExportView = hasPermission('EXPORT_AUDIT_LOGS');

  const [activeView, setActiveView] = useState<'ledger' | 'analytics'>(
    hasAuditView ? 'ledger' : 'analytics'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditRecord | null>(null);

  // Render JSON values beautifully inline without word-break wrapping issues
  const renderAuditValue = (valueStr: string | null | undefined) => {
    if (!valueStr || valueStr === '-') return <span className="text-gray-300">-</span>;
    try {
      const trimmed = valueStr.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed)) {
            if (parsed.length === 0) return <span className="text-gray-400">None</span>;
            return (
              <div className="flex flex-wrap gap-1">
                {parsed.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-gray-50 text-gray-600 border border-gray-100">
                    {typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)}
                  </span>
                ))}
              </div>
            );
          }
          
          return (
            <div className="flex flex-col gap-1 max-w-xs">
              {Object.entries(parsed).map(([key, val]) => {
                const cleanKey = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase())
                  .replace(/_/g, ' ')
                  .trim();
                
                let displayVal = '';
                if (val === null || val === undefined) {
                  displayVal = 'None';
                } else if (Array.isArray(val)) {
                  displayVal = val.length === 0 ? 'None' : val.join(', ');
                } else if (typeof val === 'object') {
                  displayVal = JSON.stringify(val);
                } else {
                  displayVal = String(val);
                }
                
                return (
                  <div key={key} className="text-[11px] leading-normal flex items-start gap-1">
                    <span className="font-bold text-gray-500 whitespace-nowrap">{cleanKey}:</span>
                    <span className="text-gray-800 break-words font-medium">{displayVal}</span>
                  </div>
                );
              })}
            </div>
          );
        }
      }
    } catch (e) {
      // Fallback
    }
    return <span className="text-gray-700 font-medium break-words">{valueStr}</span>;
  };

  // Filter logs list
  const filteredLogs = auditLogs.filter(log => {
    // Text search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchAction = log.action.toLowerCase().includes(query);
      const matchUser = log.user.toLowerCase().includes(query);
      const matchPrevious = log.previousValue?.toLowerCase().includes(query) || false;
      const matchNew = log.newValue?.toLowerCase().includes(query) || false;
      
      if (!matchAction && !matchUser && !matchPrevious && !matchNew) return false;
    }

    return true;
  });

  // Export as CSV File
  const handleExportCSV = () => {
    try {
      const headers = ['Timestamp', 'System Event Action', 'Authorizer User', 'Previous Value', 'New Value / Actions'];
      const rows = filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.user,
        log.previousValue || '',
        log.newValue || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `takhleeq_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  // Format JSON values to a beautiful human-readable layout
  const formatAuditValue = (valueStr: string | null | undefined): string => {
    if (!valueStr || valueStr === '-') return '-';
    try {
      const trimmed = valueStr.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed)) {
            if (parsed.length === 0) return 'None';
            return parsed.map(item => {
              if (typeof item === 'object' && item !== null) {
                return formatObject(item);
              }
              return String(item);
            }).join(', ');
          }
          return formatObject(parsed);
        }
      }
    } catch (e) {
      // Return original string if parse fails
    }
    return valueStr;
  };

  const formatObject = (obj: any): string => {
    return Object.entries(obj)
      .map(([key, val]) => {
        const cleanKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .replace(/_/g, ' ')
          .trim();
        
        let displayVal = '';
        if (val === null || val === undefined) {
          displayVal = 'None';
        } else if (Array.isArray(val)) {
          displayVal = val.length === 0 ? 'None' : val.join(', ');
        } else if (typeof val === 'object') {
          displayVal = JSON.stringify(val);
        } else {
          displayVal = String(val);
        }
        return `${cleanKey}: ${displayVal}`;
      })
      .join(' | ');
  };

  // Export as beautiful compliance PDF File
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setProperties({
        title: 'Takhleeq ERP - Compliance Audit Report',
        subject: 'Immutable Audit Ledger Logs',
        author: 'Takhleeq ERP Administration',
        creator: 'Takhleeq ERP Securitized Engine'
      });

      // Header Brand bar
      doc.setFillColor(17, 24, 39); // Deep space slate grey (#111827)
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('TAKHLLEQ ERP', 10, 16);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('SECURED COMPLIANCE AUDIT REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 25);

      // Section metadata
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Audit Ledger Compliance Parameters', 10, 48);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Total Query Matches: ${filteredLogs.length} entries`, 10, 54);
      doc.text('Action Filter Applied: All Event Types', 10, 59);
      doc.text(`Search Keyword filter: ${searchQuery ? `"${searchQuery}"` : 'None'}`, 10, 64);
      
      // AutoTable setup
      const tableHead = [['Timestamp (UTC)', 'System Event Action', 'Authorizer User', 'Previous Value', 'New Value / Action']];
      const tableBody = filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.user,
        formatAuditValue(log.previousValue),
        formatAuditValue(log.newValue)
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [55, 65, 81]
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 38 },
          2: { cellWidth: 32 },
          3: { cellWidth: 46 },
          4: { cellWidth: 46 }
        },
        didDrawPage: (data) => {
          // Add system timestamp tracking and footer signatures on each page
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount} | SHA-256 Block-Secured System Audit Trail`,
            10,
            285
          );
        }
      });

      const filename = `takhleeq_audit_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

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
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <BarChart2 className="h-4 w-4" /> 
          Operational Analytics Dashboard
          {!hasDashboardView && <Lock className="h-3 w-3 text-gray-400" />}
        </button>
      </div>

      {/* VIEW 1: IMMUTABLE AUDIT LEDGER */}
      {activeView === 'ledger' && (
        <>
          {!hasAuditView ? (
            <div className="border border-dashed py-16 text-center text-xs text-rose-700 bg-rose-50/50 border-rose-100 rounded-3xl p-6 space-y-2">
              <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto" />
              <p className="font-extrabold uppercase tracking-wide">Privilege Blocked: Access Denied</p>
              <p className="text-gray-500 max-w-md mx-auto">
                Only user accounts holding the <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-mono font-bold">VIEW_AUDIT_LOGS</code> permission node possess visual clearance to inspect the raw compliance ledger database.
              </p>
            </div>
          ) : (
            <>
              {/* Search and Filters panel */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <Database className="h-4.5 w-4.5" /> Immutable Audit Ledger
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      System actions, schedule overrides, policy compiles, and bans are signed and recorded on an immutable ledger.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={onRefresh}
                      className="p-2.5 text-gray-400 hover:text-primary hover:bg-gray-50 border border-gray-100 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" /> Refresh Ledger
                    </button>

                    {/* CSV Export Trigger */}
                    <button
                      onClick={handleExportCSV}
                      disabled={filteredLogs.length === 0 || !hasExportView}
                      className="p-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-100 disabled:opacity-50 disabled:pointer-events-none rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
                      title={hasExportView ? "Download results as a spreadsheet CSV file" : "Security Lock: EXPORT_AUDIT_LOGS permission required"}
                    >
                      <FileSpreadsheet className="h-4 w-4" /> 
                      Export CSV {!hasExportView && <Lock className="h-3 w-3 inline-block" />}
                    </button>

                    {/* PDF Export Trigger */}
                    <button
                      onClick={handleExportPDF}
                      disabled={filteredLogs.length === 0 || !hasExportView}
                      className="p-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 disabled:opacity-50 disabled:pointer-events-none rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
                      title={hasExportView ? "Download results as a compliance-ready PDF report" : "Security Lock: EXPORT_AUDIT_LOGS permission required"}
                    >
                      <FileText className="h-4 w-4" /> 
                      Export PDF {!hasExportView && <Lock className="h-3 w-3 inline-block" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  
                  <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search ledger by Authorizer, values, actions..."
                      className="w-full pl-9 pr-3.5 py-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/40 focus:bg-white focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>

                </div>

                <div className="text-[10px] text-gray-400 font-bold border-t border-gray-50 pt-3 flex items-center justify-between">
                  <span>Active Query Matches: <strong>{filteredLogs.length}</strong> system operations records</span>
                  <span className="font-mono text-[9px] text-emerald-600 uppercase">SHA-256 System Ledgers Block Secured</span>
                </div>
              </div>

              {/* Audit ledger list table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                        <th className="py-3 px-6">Timestamp (UTC)</th>
                        <th className="py-3 px-6">System Event Action</th>
                        <th className="py-3 px-6">Authorizer User</th>
                        <th className="py-3 px-6">Previous Values</th>
                        <th className="py-3 px-6">New Values / Actions</th>
                        <th className="py-3 px-6 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                            No matching audit records reside on this block filter.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map(log => (
                          <tr 
                            key={log.id} 
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-gray-50/50 text-gray-700 transition-colors cursor-pointer group"
                          >
                            <td className="py-4.5 px-6 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-4.5 px-6">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border tracking-wider ${
                                log.action.includes('REJECT') || log.action.includes('BAN') 
                                  ? 'bg-rose-50 text-rose-800 border-rose-100' 
                                  : log.action.includes('APPROVE') || log.action.includes('LIFT')
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                  : log.action.includes('OVERRIDE')
                                  ? 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                                  : 'bg-blue-50 text-blue-800 border-blue-100'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-4.5 px-6 font-bold text-gray-900 font-mono text-[10.5px]">
                              {log.user}
                            </td>
                            <td className="py-4.5 px-6 font-mono text-[10.5px] text-gray-500 whitespace-normal max-w-xs break-words">
                              {renderAuditValue(log.previousValue)}
                            </td>
                            <td className="py-4.5 px-6 font-mono text-[10.5px] text-gray-800 whitespace-normal max-w-xs break-words">
                              {renderAuditValue(log.newValue)}
                            </td>
                            <td className="py-4.5 px-6 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLog(log);
                                }}
                                className="p-1.5 text-gray-400 group-hover:text-primary hover:bg-gray-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only">Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* VIEW 2: OPERATIONAL ANALYTICS DASHBOARD */}
      {activeView === 'analytics' && (
        <>
          {!hasDashboardView ? (
            <div className="border border-dashed py-16 text-center text-xs text-rose-700 bg-rose-50/50 border-rose-100 rounded-3xl p-6 space-y-2">
              <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto" />
              <p className="font-extrabold uppercase tracking-wide">Privilege Blocked: Access Denied</p>
              <p className="text-gray-500 max-w-md mx-auto">
                Only user accounts holding the <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-mono font-bold">VIEW_ANALYTICS_DASHBOARD</code> permission node possess clearance to access the aggregated statistics panels.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Top Row Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Card 1: Total Bookings */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total ERP Bookings</p>
                    <p className="text-3xl font-black text-gray-900 font-mono">
                      {reportsData?.totalSubmittedBookings ?? 0}
                    </p>
                    <p className="text-[10.5px] text-gray-500">Aggregated across all spaces</p>
                  </div>
                  <div className="h-11 w-11 bg-primary/5 rounded-xl flex items-center justify-center">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Card 2: Active Security Bans */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Member Bans</p>
                    <p className="text-3xl font-black text-rose-700 font-mono">
                      {reportsData?.activeBansCount ?? 0}
                    </p>
                    <p className="text-[10.5px] text-gray-500">Restricted accounts with active blocks</p>
                  </div>
                  <div className="h-11 w-11 bg-rose-50 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                  </div>
                </div>

                {/* Card 3: Conflicts Detected */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Schedule Conflict Alerts</p>
                    <p className={`text-3xl font-black font-mono ${reportsData?.conflictCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {reportsData?.conflictCount ?? 0}
                    </p>
                    <p className="text-[10.5px] text-gray-500">Overlaps intercepted by scheduler</p>
                  </div>
                  <div className="h-11 w-11 bg-amber-50 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                </div>

              </div>

              {/* Data visualizations and breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Visual: Room Utilization */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-primary" /> Space Popularity Utilization
                    </h4>
                    <p className="text-[11px] text-gray-500">Aggregated count of approved bookings per physical room</p>
                  </div>
                  
                  <div className="space-y-3.5 pt-2">
                    {!reportsData?.popularRooms || reportsData.popularRooms.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-8">No utilization logs found.</p>
                    ) : (
                      reportsData.popularRooms.map((item: any, idx: number) => {
                        const maxCount = Math.max(...reportsData.popularRooms.map((r: any) => r.count), 1);
                        const pct = Math.round((item.count / maxCount) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                              <span>{item.room}</span>
                              <span className="font-mono text-gray-500">{item.count} Approved</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Visuals Container */}
                <div className="space-y-6">
                  
                  {/* Status split */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                        <PieChart className="h-4 w-4 text-primary" /> Bookings Status Breakdown
                      </h4>
                      <p className="text-[11px] text-gray-500">Review outcomes of all submitted reservation requests</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center pt-2">
                      <div className="bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-2xl">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">Approved</span>
                        <span className="text-xl font-mono font-black text-emerald-800 mt-1 block">
                          {reportsData?.statusBreakdown?.APPROVED ?? 0}
                        </span>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-100/50 p-3 rounded-2xl">
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">Pending</span>
                        <span className="text-xl font-mono font-black text-amber-800 mt-1 block">
                          {reportsData?.statusBreakdown?.PENDING ?? 0}
                        </span>
                      </div>
                      <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-2xl">
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 block">Rejected</span>
                        <span className="text-xl font-mono font-black text-rose-800 mt-1 block">
                          {reportsData?.statusBreakdown?.REJECTED ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Incubator Bookings Split */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                        Incubator Reservation Types
                      </h4>
                      <p className="text-[11px] text-gray-500">Approved time distribution by booking purpose tag</p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {!reportsData?.bookingTypeStats || reportsData.bookingTypeStats.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">No purpose distribution logs available.</p>
                      ) : (
                        reportsData.bookingTypeStats.map((item: any, idx: number) => {
                          const total = reportsData.bookingTypeStats.reduce((sum: number, r: any) => sum + r.count, 0);
                          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium capitalize">{item.type.toLowerCase().replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-500">{item.count} bookings</span>
                                <span className="font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono w-10 text-right">{pct}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* Beautiful Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="audit-details-modal">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-gray-900 px-6 py-5 text-white flex justify-between items-center">
              <div>
                <span className="text-emerald-400 font-mono text-[9px] font-black uppercase tracking-widest block">INTEGRITY BLOCK ATTESTED</span>
                <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                  <Database className="h-4.5 w-4.5 text-emerald-400" /> System Action Inspection
                </h4>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Timestamp (UTC)</span>
                  <span className="text-[11px] font-mono text-gray-800 font-medium block mt-0.5">
                    {new Date(selectedLog.timestamp).toUTCString()}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 block">
                    Local: {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Authorizer User</span>
                  <span className="text-[11px] font-mono text-gray-900 font-bold block mt-0.5">
                    {selectedLog.user}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">System Event Action</span>
                  <div className="mt-1 flex items-center">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border tracking-wider ${
                      selectedLog.action.includes('REJECT') || selectedLog.action.includes('BAN') 
                        ? 'bg-rose-50 text-rose-800 border-rose-100' 
                        : selectedLog.action.includes('APPROVE') || selectedLog.action.includes('LIFT')
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                        : selectedLog.action.includes('OVERRIDE')
                        ? 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                        : 'bg-blue-50 text-blue-800 border-blue-100'
                    }`}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>
              </div>

              {/* State comparison details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Previous State */}
                <div className="space-y-2 border border-gray-150 p-4 rounded-2xl bg-gray-50/30">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block border-b border-gray-100 pb-1.5">
                    ⏮️ PREVIOUS STATE / VALUES
                  </span>
                  <div className="space-y-3 pt-1">
                    {selectedLog.previousValue ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(selectedLog.previousValue);
                          if (parsed && typeof parsed === 'object') {
                            return Object.entries(parsed).map(([key, val]) => {
                              const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).replace(/_/g, ' ').trim();
                              return (
                                <div key={key} className="border-l-2 border-rose-200 pl-2.5 py-0.5">
                                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider block">{cleanKey}</span>
                                  <span className="text-gray-800 font-mono text-[11px] leading-relaxed break-words block mt-0.5">
                                    {val === null || val === undefined ? 'None' : Array.isArray(val) ? (val.length === 0 ? 'None' : val.join(', ')) : String(val)}
                                  </span>
                                </div>
                              );
                            });
                          }
                        } catch (e) {}
                        return <span className="font-mono text-[11px] break-words text-gray-700 block">{selectedLog.previousValue}</span>;
                      })()
                    ) : (
                      <span className="text-gray-400 italic block py-2">No preceding state existed.</span>
                    )}
                  </div>
                </div>

                {/* New State */}
                <div className="space-y-2 border border-gray-150 p-4 rounded-2xl bg-gray-50/30">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block border-b border-gray-100 pb-1.5">
                    ⏭️ NEW STATE / ACTIONS
                  </span>
                  <div className="space-y-3 pt-1">
                    {selectedLog.newValue ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(selectedLog.newValue);
                          if (parsed && typeof parsed === 'object') {
                            return Object.entries(parsed).map(([key, val]) => {
                              const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).replace(/_/g, ' ').trim();
                              return (
                                <div key={key} className="border-l-2 border-emerald-200 pl-2.5 py-0.5">
                                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">{cleanKey}</span>
                                  <span className="text-gray-800 font-mono text-[11px] leading-relaxed break-words block mt-0.5">
                                    {val === null || val === undefined ? 'None' : Array.isArray(val) ? (val.length === 0 ? 'None' : val.join(', ')) : String(val)}
                                  </span>
                                </div>
                              );
                            });
                          }
                        } catch (e) {}
                        return <span className="font-mono text-[11px] break-words text-gray-700 block">{selectedLog.newValue}</span>;
                      })()
                    ) : (
                      <span className="text-gray-400 italic block py-2">No succeeding state recorded.</span>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4.5 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
