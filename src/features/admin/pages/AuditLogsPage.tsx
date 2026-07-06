import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Database,
  ArrowUpRight
} from 'lucide-react';
import { AuditRecord } from '../../../types';

interface AuditLogsPageProps {
  auditLogs: AuditRecord[];
  onRefresh: () => void;
}

export function AuditLogsPage({ auditLogs, onRefresh }: AuditLogsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');

  // Extract unique action types for filter
  const actionTypes = Array.from(new Set(auditLogs.map(log => log.action)));

  // Filter logs list
  const filteredLogs = auditLogs.filter(log => {
    // Action filter
    if (filterAction && log.action !== filterAction) return false;

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

  return (
    <div className="space-y-6 text-left animate-fade-in" id="audit-logs-view">
      
      {/* Search and Filters panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Database className="h-4.5 w-4.5" /> Immutable Audit Ledger
            </h3>
            <p className="text-[11px] text-gray-500">
              System actions, schedule overrides, policy compiles, and bans are signed and recorded on an immutable ledger.
            </p>
          </div>

          <button
            onClick={onRefresh}
            className="p-2.5 text-gray-400 hover:text-primary hover:bg-gray-50 border border-gray-100 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh Ledger
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          
          <div className="relative sm:col-span-2">
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

          <div>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/40 focus:bg-white focus:ring-1 focus:ring-primary font-bold cursor-pointer uppercase tracking-wider"
            >
              <option value="">All Action Types</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
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
                <th className="py-3 px-6 text-right font-bold">New Values / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                    No matching audit records reside on this block filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                   <tr key={log.id} className="hover:bg-gray-50/30 text-gray-700 transition-colors">
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
                    <td className="py-4.5 px-6 font-mono text-[10.5px] text-gray-500 whitespace-normal max-w-xs break-all">
                      {log.previousValue || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-4.5 px-6 text-right font-mono text-[10.5px] text-gray-800 whitespace-normal max-w-xs break-all">
                      {log.newValue || <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
