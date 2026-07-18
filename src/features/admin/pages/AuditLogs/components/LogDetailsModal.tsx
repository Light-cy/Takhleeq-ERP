import React from 'react';
import { Database, X } from 'lucide-react';
import { AuditRecord } from '../../../../../types';

interface LogDetailsModalProps {
  selectedLog: AuditRecord;
  setSelectedLog: (log: AuditRecord | null) => void;
}

export function LogDetailsModal({
  selectedLog,
  setSelectedLog
}: LogDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="audit-details-modal">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] text-left">
        
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
  );
}
