import React from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Lock, 
  RefreshCw, 
  Search, 
  Database 
} from 'lucide-react';

interface ExportControlsProps {
  onRefresh: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  hasExportView: boolean;
  totalMatches: number;
}

export function ExportControls({
  onRefresh,
  onExportCSV,
  onExportPDF,
  searchQuery,
  setSearchQuery,
  hasExportView,
  totalMatches
}: ExportControlsProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-left">
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
            onClick={onExportCSV}
            disabled={totalMatches === 0 || !hasExportView}
            className="p-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-100 disabled:opacity-50 disabled:pointer-events-none rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
            title={hasExportView ? "Download results as a spreadsheet CSV file" : "Security Lock: EXPORT_AUDIT_LOGS permission required"}
          >
            <FileSpreadsheet className="h-4 w-4" /> 
            Export CSV {!hasExportView && <Lock className="h-3 w-3 inline-block" />}
          </button>

          {/* PDF Export Trigger */}
          <button
            onClick={onExportPDF}
            disabled={totalMatches === 0 || !hasExportView}
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

      <div className="text-[10px] text-gray-400 font-bold border-t border-gray-50 pt-3 flex items-center justify-between text-left">
        <span>Active Query Matches: <strong>{totalMatches}</strong> system operations records</span>
        <span className="font-mono text-[9px] text-emerald-600 uppercase">SHA-256 System Ledgers Block Secured</span>
      </div>
    </div>
  );
}
