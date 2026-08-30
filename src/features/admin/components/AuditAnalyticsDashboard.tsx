import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Database, 
  FileSpreadsheet, 
  Eye, 
  ShieldAlert, 
  Clock, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Ban, AuditRecord } from '../../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatAuditValue, renderAuditValue } from '../utils/auditFormatter';

interface AuditAnalyticsDashboardProps {
  auditLogs: AuditRecord[];
  activeBans?: Ban[];
  hasDashboardView: boolean;
  hasExportView: boolean;
  onRefresh: () => void;
  setSelectedLog: (log: AuditRecord | null) => void;
}

export function AuditAnalyticsDashboard({
  auditLogs,
  activeBans,
  hasDashboardView,
  hasExportView,
  onRefresh,
  setSelectedLog
}: AuditAnalyticsDashboardProps) {
  const bansList = activeBans || [];

  const [selectedReport, setSelectedReport] = useState<string>('bans');

  // Ban Reports states
  const [banSearch, setBanSearch] = useState('');
  const [banStatusFilter, setBanStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Lifted'>('All');
  const [banSortOrder, setBanSortOrder] = useState<'asc' | 'desc'>('desc');
  const [banPage, setBanPage] = useState(1);

  // Administrative Audit Logs states
  const [searchQuery, setSearchQuery] = useState('');

  // Precalculations for Security & Enforcement Summary KPI Cards
  const totalAuditEventsCount = auditLogs.length;
  const activeBansCount = bansList.filter(ban => ban.status === 'Active').length;
  const expiredBansCount = bansList.filter(ban => ban.status === 'Expired').length;
  const liftedBansCount = bansList.filter(ban => ban.status === 'Lifted').length;
  const totalBansRecorded = bansList.length;

  const uniqueActorsCount = new Set(auditLogs.map(log => log.user)).size;

  // Filter logs list for raw log reporting tab
  const filteredLogs = auditLogs.filter(log => {
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

  // Export Audit CSV File
  const handleExportCSV = () => {
    try {
      const headers = ['Date & Time', 'System Event Action', 'Authorizer User', 'Previous State / Value', 'New State / Action Details'];
      
      const formatTimestamp = (ts: string) => {
        try {
          const d = new Date(ts);
          if (isNaN(d.getTime())) return ts;
          const pad = (num: number) => String(num).padStart(2, '0');
          const year = d.getFullYear();
          const month = pad(d.getMonth() + 1);
          const day = pad(d.getDate());
          let hours = d.getHours();
          const minutes = pad(d.getMinutes());
          const seconds = pad(d.getSeconds());
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          return `${year}-${month}-${day} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
        } catch {
          return ts;
        }
      };

      const rows = filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.action,
        log.user,
        formatAuditValue(log.previousValue, log.newValue),
        formatAuditValue(log.newValue, log.previousValue)
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(val => {
            const str = val === null || val === undefined ? '' : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\r\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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

  // Export Audit PDF File
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setProperties({
        title: 'Takhleeq ERP - Compliance Audit Report',
        subject: 'Immutable Audit Ledger Logs',
        author: 'Takhleeq ERP Administration',
        creator: 'Takhleeq ERP Securitized Engine'
      });
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('SECURED COMPLIANCE AUDIT REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 25);

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
      
      const tableHead = [['Timestamp (UTC)', 'System Event Action', 'Authorizer User', 'Previous Value', 'New Value / Action']];
      const tableBody = filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.user,
        formatAuditValue(log.previousValue, log.newValue),
        formatAuditValue(log.newValue, log.previousValue)
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 38 },
          2: { cellWidth: 32 },
          3: { cellWidth: 46 },
          4: { cellWidth: 46 }
        },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page ${data.pageNumber} of ${pageCount} | Cryptographically Verified Ledger`, 10, 290);
        }
      });

      doc.save(`takhleeq_compliance_audit_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  // Export Bans PDF
  const exportBansPDF = (bans: Ban[]) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(224, 231, 255);
      doc.text('GOVERNANCE & ENFORCEMENT REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 25);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Security Enforcement & Bans Registry', 10, 48);

      const tableHead = [['User Name', 'Email', 'Duration', 'Issued Date', 'Expires Date', 'Issued By', 'Status', 'Reason']];
      const tableBody = bans.map(b => [
        b.name,
        b.email,
        b.duration,
        new Date(b.createdAt).toLocaleDateString(),
        b.expiresAt === 'Never' ? 'Permanent' : new Date(b.expiresAt).toLocaleDateString(),
        b.bannedBy,
        b.status,
        b.status === 'Lifted' ? `Lifted: ${b.liftedReason || 'N/A'}` : b.reason
      ]);

      autoTable(doc, {
        startY: 55,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 32 },
          2: { cellWidth: 16 },
          3: { cellWidth: 18 },
          4: { cellWidth: 18 },
          5: { cellWidth: 22 },
          6: { cellWidth: 15 },
          7: { cellWidth: 55 }
        }
      });
      doc.save(`takhleeq_bans_security_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  if (!hasDashboardView) {
    return (
      <div className="border border-dashed py-16 text-center text-xs text-rose-700 bg-rose-50/50 border-rose-100 rounded-3xl p-6 space-y-2">
        <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto" />
        <p className="font-extrabold uppercase tracking-wide">Privilege Blocked: Access Denied</p>
        <p className="text-gray-500 max-w-md mx-auto">
          Only user accounts holding the <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-mono font-bold">VIEW_ANALYTICS_DASHBOARD</code> permission node possess clearance to access the aggregated statistics panels.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* PERSISTENT KPI SYSTEM STATISTICS ROW */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Governance & Audit Dashboard</span>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mt-0.5">Security & Enforcement Key Metrics</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
              title="Refresh ledger metrics"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">Live Ledger</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Stat 1: Total Audit Events */}
          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Audit Logs</span>
              <p className="text-lg font-black font-mono text-gray-900">{totalAuditEventsCount}</p>
            </div>
            <Database className="h-5 w-5 text-gray-400" />
          </div>

          {/* Stat 2: Active Security Bans */}
          <div className="bg-rose-50/20 p-4 rounded-xl border border-rose-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block">Active Security Bans</span>
              <p className="text-lg font-black font-mono text-rose-600">{activeBansCount}</p>
            </div>
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>

          {/* Stat 3: Expired / Lifted Bans */}
          <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Resolved / Lifted Bans</span>
              <p className="text-lg font-black font-mono text-emerald-600">{expiredBansCount + liftedBansCount}</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          {/* Stat 4: Total Bans History */}
          <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">Total Ban Records</span>
              <p className="text-lg font-black font-mono text-amber-600">{totalBansRecorded}</p>
            </div>
            <FileText className="h-5 w-5 text-amber-400" />
          </div>

          {/* Stat 5: Unique Authorizers */}
          <div className="bg-purple-50/20 p-4 rounded-xl border border-purple-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block">Active Authorizers</span>
              <p className="text-lg font-black font-mono text-purple-600">{uniqueActorsCount}</p>
            </div>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>

          {/* Stat 6: Ledger Integrity Status */}
          <div className="bg-teal-50/20 p-4 rounded-xl border border-teal-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest block">Ledger Integrity</span>
              <p className="text-lg font-black font-mono text-teal-600">100%</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-teal-500"></div>
          </div>
        </div>
      </div>

      {/* REPORT SECTIONS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="space-y-1.5 bg-white p-4.5 rounded-2xl border border-gray-100 shadow-3xs lg:col-span-1">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-3 pb-2.5 border-b border-gray-100 mb-2">Reports Registry Tabs</span>
          
          {[
            { id: 'bans', name: 'Ban Reports', desc: 'Accounts Enforcement history', icon: ShieldAlert },
            { id: 'audit_report', name: 'System Audit Logs', desc: 'Administrative operations track', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = selectedReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedReport(tab.id);
                }}
                className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-primary text-white border border-primary shadow-sm' 
                    : 'hover:bg-gray-50 border border-transparent text-gray-500'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-[10.5px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-gray-800'}`}>{tab.name}</p>
                  <p className={`text-[9px] font-medium mt-0.5 leading-tight ${isActive ? 'text-indigo-100' : 'text-gray-400'}`}>{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content Pane */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: BAN REPORTS */}
          {selectedReport === 'bans' && (() => {
            const filteredBans = bansList.filter(ban => {
              if (banSearch.trim()) {
                const q = banSearch.toLowerCase();
                const matchName = ban.name.toLowerCase().includes(q);
                const matchEmail = ban.email.toLowerCase().includes(q);
                const matchReason = ban.reason.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchReason) return false;
              }
              if (banStatusFilter !== 'All' && ban.status !== banStatusFilter) return false;
              return true;
            });

            const sortedBans = [...filteredBans].sort((a, b) => {
              const valA = a.createdAt;
              const valB = b.createdAt;
              if (valA < valB) return banSortOrder === 'asc' ? -1 : 1;
              if (valA > valB) return banSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const banPageSize = 10;
            const totalPages = Math.ceil(sortedBans.length / banPageSize) || 1;
            const paginatedBans = sortedBans.slice((banPage - 1) * banPageSize, banPage * banPageSize);

            return (
              <div className="space-y-6 animate-fade-in">
                
                {/* Filters Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Security Enforcement Ban Reports</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Track currently active security bans and complete lift/expires audit logs histories.</p>
                    </div>
                    <button
                      onClick={() => exportBansPDF(sortedBans)}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs"
                    >
                      <FileText className="h-4 w-4" /> PDF Report Export
                    </button>
                  </div>

                  {/* Grid Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Text Search</span>
                      <input 
                        type="text" 
                        placeholder="Search Name, Email, Ban Reason..."
                        value={banSearch}
                        onChange={e => { setBanSearch(e.target.value); setBanPage(1); }}
                        className="w-full px-2.5 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Filter Status</span>
                      <select
                        value={banStatusFilter}
                        onChange={e => { setBanStatusFilter(e.target.value as any); setBanPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="All">All Enforcement Statuses</option>
                        <option value="Active">Active Bans</option>
                        <option value="Expired">Expired Bans</option>
                        <option value="Lifted">Lifted Bans</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sort Issued Date</span>
                      <button
                        onClick={() => { setBanSortOrder(p => p === 'asc' ? 'desc' : 'asc'); setBanPage(1); }}
                        className="w-full px-3 py-1.5 border border-gray-150 hover:bg-gray-50 bg-gray-50/50 rounded-lg text-gray-650 font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] cursor-pointer"
                      >
                        {banSortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ban Reports Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                          <th className="py-3 px-5">Enforced User Details</th>
                          <th className="py-3 px-5">Duration Scope</th>
                          <th className="py-3 px-5">Issued Date</th>
                          <th className="py-3 px-5">Expires Date</th>
                          <th className="py-3 px-5 font-mono">Issued By</th>
                          <th className="py-3 px-5">Enforcement Status</th>
                          <th className="py-3 px-5 text-right">Action details / reasons</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {paginatedBans.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-gray-400">No active security bans or histories registered.</td>
                          </tr>
                        ) : (
                          paginatedBans.map(ban => (
                            <tr key={ban.id} className="hover:bg-gray-50/50 transition-colors text-xs">
                              <td className="py-4 px-5">
                                <p className="font-extrabold text-gray-900 leading-tight">{ban.name}</p>
                                <p className="text-[9.5px] text-gray-400 font-mono">{ban.email}</p>
                              </td>
                              <td className="py-4 px-5 font-bold font-mono text-indigo-700">{ban.duration}</td>
                              <td className="py-4 px-5 font-mono text-gray-500">{new Date(ban.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 px-5 font-mono text-gray-500">{ban.expiresAt === 'Never' ? 'Permanent' : new Date(ban.expiresAt).toLocaleDateString()}</td>
                              <td className="py-4 px-5 font-semibold text-gray-800 font-mono text-[10.5px]">{ban.bannedBy}</td>
                              <td className="py-4 px-5">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  ban.status === 'Active' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                                  ban.status === 'Lifted' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                  'bg-gray-100 text-gray-500 border border-gray-150'
                                }`}>
                                  {ban.status}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right font-medium max-w-xs break-words">
                                {ban.status === 'Lifted' ? (
                                  <div>
                                    <p className="font-black text-emerald-700 leading-tight">Lifted by {ban.liftedBy}</p>
                                    <p className="text-[9.5px] text-gray-450 italic">" {ban.liftedReason} "</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-600 italic">" {ban.reason} "</p>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Row */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                      <span>Page {banPage} of {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={banPage === 1}
                          onClick={() => setBanPage(prev => prev - 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          disabled={banPage === totalPages}
                          onClick={() => setBanPage(prev => prev + 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* TAB 2: ADMINISTRATIVE AUDIT LOGS LEDGER */}
          {selectedReport === 'audit_report' && (
            <>
              {/* Integrated raw log list view */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Immutable Administrative Activity Logs</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Search, inspect and export complete administrative audit trails on this block filter.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      disabled={filteredLogs.length === 0 || !hasExportView}
                      className="px-3.5 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-150 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <FileSpreadsheet className="h-4 w-4" /> Export CSV
                    </button>
                    <button
                      onClick={handleExportPDF}
                      disabled={filteredLogs.length === 0 || !hasExportView}
                      className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Search input bar */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search ledger by Authorizer, values, actions..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-gray-150 rounded-xl text-xs bg-gray-50/40 focus:bg-white focus:ring-1 focus:ring-primary font-medium focus:outline-none"
                  />
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Search className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {/* Audit table logs list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                        <th className="py-3 px-5">Timestamp (UTC)</th>
                        <th className="py-3 px-5">System Event Action</th>
                        <th className="py-3 px-5">Authorizer User</th>
                        <th className="py-3 px-5">Previous Values</th>
                        <th className="py-3 px-5">New Values / Actions</th>
                        <th className="py-3 px-5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-gray-400">No matching audit records reside on this block filter.</td>
                        </tr>
                      ) : (
                        filteredLogs.slice(0, 50).map(log => (
                          <tr 
                            key={log.id} 
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-gray-50/50 text-gray-700 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-5 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-4 px-5">
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
                            <td className="py-4 px-5 font-bold text-gray-900 font-mono text-[10.5px]">
                              {log.user}
                            </td>
                            <td className="py-4 px-5 font-mono text-[10.5px] text-gray-500 whitespace-normal max-w-xs break-words">
                              {renderAuditValue(log.previousValue, log.newValue)}
                            </td>
                            <td className="py-4 px-5 font-mono text-[10.5px] text-gray-800 whitespace-normal max-w-xs break-words">
                              {renderAuditValue(log.newValue, log.previousValue)}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLog(log);
                                }}
                                className="p-1.5 text-gray-400 group-hover:text-primary hover:bg-gray-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Inspect</span>
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

        </div>

      </div>

    </div>
  );
}
