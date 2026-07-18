import React from 'react';
import { Eye, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditRecord } from '../../../../../types';
import { renderAuditValue } from '../../../utils/auditFormatter';

interface AuditLogsTableProps {
  logs: AuditRecord[];
  totalMatches: number;
  setSelectedLog: (log: AuditRecord | null) => void;
  hasAuditView: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

export function AuditLogsTable({
  logs,
  totalMatches,
  setSelectedLog,
  hasAuditView,
  currentPage,
  setCurrentPage,
  totalPages
}: AuditLogsTableProps) {
  if (!hasAuditView) {
    return (
      <div className="border border-dashed py-16 text-center text-xs text-rose-700 bg-rose-50/50 border-rose-100 rounded-3xl p-6 space-y-2 text-left">
        <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto" />
        <p className="font-extrabold uppercase tracking-wide text-center">Privilege Blocked: Access Denied</p>
        <p className="text-gray-500 max-w-md mx-auto text-center">
          Only user accounts holding the <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-mono font-bold">VIEW_AUDIT_LOGS</code> permission node possess visual clearance to inspect the raw compliance ledger database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Audit ledger list table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-155 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                <th className="py-3 px-6">Timestamp (UTC)</th>
                <th className="py-3 px-6">System Event Action</th>
                <th className="py-3 px-6">Authorizer User</th>
                <th className="py-3 px-6">Previous Values</th>
                <th className="py-3 px-6">New Values / Actions</th>
                <th className="py-3 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                    No matching audit records reside on this block filter.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
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
                      {renderAuditValue(log.previousValue, log.newValue)}
                    </td>
                    <td className="py-4.5 px-6 font-mono text-[10.5px] text-gray-800 whitespace-normal max-w-xs break-words">
                      {renderAuditValue(log.newValue, log.previousValue)}
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

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-3 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalMatches} total records)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Simple numerical pages */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Keep the active page centered if possible
                let pageNum = i + 1;
                if (currentPage > 3 && totalPages > 5) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum + (4 - i) > totalPages) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg border font-bold text-[11px] transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-gray-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
