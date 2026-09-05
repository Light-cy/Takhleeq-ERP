import React from 'react';
import { GraduationCap, AlertTriangle, CheckCircle2, X, ShieldAlert, Sparkles, Building2 } from 'lucide-react';

interface StartupItem {
  id: number;
  startup_name: string;
  name?: string;
  email?: string;
  program_status?: string;
}

interface BulkGraduateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  cohortName: string;
  startups: StartupItem[];
  isSubmitting?: boolean;
}

export const BulkGraduateConfirmationModal: React.FC<BulkGraduateConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cohortName,
  startups,
  isSubmitting = false
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-150 flex flex-col text-left max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Bulk Graduate Cohort</h3>
              <p className="text-xs text-gray-500 font-medium">Cohort Lifecycle & Alumni Graduation Confirmation</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Target Cohort Notice */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4 text-xs space-y-1.5 text-blue-950">
            <div className="flex items-center gap-2 font-black text-blue-900">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Target Cohort: <strong className="font-extrabold">{cohortName}</strong></span>
            </div>
            <p className="text-blue-800 leading-relaxed font-medium">
              Is cohort ke tamam active startups ko <strong>GRADUATED</strong> mark kiya jayega aur cohort status <strong>COMPLETED</strong> ho jayega.
            </p>
          </div>

          {/* Startups to Graduate Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono">
                Active Startups to Graduate ({startups.length})
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Eligible for Graduation
              </span>
            </div>

            {startups.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-500">
                Is cohort mein abhi koi active startup enrolled nahi hai. Cohort status COMPLETED mark ho jayega.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                {startups.map((s) => (
                  <div 
                    key={s.id} 
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-150 text-xs shadow-3xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-gray-900 block truncate">{s.startup_name}</span>
                        {s.name && <span className="text-[10px] text-gray-500 block truncate font-medium">{s.name}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 shrink-0">
                      🎓 Will Graduate
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Lifecycle Rules Callouts */}
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-snug">
                <strong>New Cohort Unlocked:</strong> Is cohort ke complete hone ke baad system naya cohort banane ki permission open kar dega.
              </span>
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-150">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-snug">
                <strong>Kicked Out Excluded:</strong> Jo startups pehle se Terminated/Kicked Out hain, wo status change nahi hoga (wo kick out hi rahenge).
              </span>
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-150">
              <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-snug">
                <strong>Cohort History Safe:</strong> Pichla data aur tamam sessions archive mein safe rahenge aur aap kisi bhi waqt unhein dekh sakenge.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions (Yes / No) */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-150 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            No, Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              await onConfirm();
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Graduating Startups...</span>
              </>
            ) : (
              <>
                <GraduationCap className="h-4 w-4" />
                <span>Yes, Graduate All Startups</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
