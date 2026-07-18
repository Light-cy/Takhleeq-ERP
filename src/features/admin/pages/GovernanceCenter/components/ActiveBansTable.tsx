import React from 'react';
import { Lock } from 'lucide-react';
import { Ban, User } from '../../../../../types';

interface ActiveBansTableProps {
  activeBans: Ban[];
  currentUser: User;
  liftingBan: Ban | null;
  setLiftingBan: (ban: Ban | null) => void;
  liftReason: string;
  setLiftReason: (reason: string) => void;
  onLiftSubmit: (e: React.FormEvent) => void;
  processing: boolean;
}

export function ActiveBansTable({
  activeBans,
  currentUser,
  liftingBan,
  setLiftingBan,
  liftReason,
  setLiftReason,
  onLiftSubmit,
  processing
}: ActiveBansTableProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 text-left">
      <div className="space-y-1">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Active Blacklist Registry</h3>
        <p className="text-[11px] text-gray-500">Registry of suspended users. Conflict Engine automatically blocks active bans.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-155 text-[9px] font-black text-gray-400 uppercase bg-gray-50/50">
              <th className="py-2.5 px-3">Subject Account</th>
              <th className="py-2.5 px-3">Violation Reason</th>
              <th className="py-2.5 px-3">Duration Details</th>
              <th className="py-2.5 px-3 text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {activeBans.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-gray-400">No active blacklist suspensions recorded.</td>
              </tr>
            ) : (
              activeBans.map(ban => (
                <tr key={ban.id} className="hover:bg-gray-50/30 text-gray-700">
                  <td className="py-3 px-3">
                    <p className="font-extrabold text-gray-900">{ban.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{ban.email}</p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="line-clamp-2 max-w-xs text-gray-600">{ban.reason}</p>
                    {ban.status === 'Lifted' && <p className="text-[9px] text-emerald-600 font-semibold mt-1">Lifted: {ban.liftedReason}</p>}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      ban.status === 'Active' ? 'bg-rose-50 text-rose-800 border border-rose-100' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {ban.status} ({ban.duration})
                    </span>
                    <p className="text-[9px] text-gray-400 font-mono mt-1">Expires: {ban.expiresAt?.split('T')[0]}</p>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {ban.status === 'Active' ? (
                      currentUser.role === 'Administrator' ? (
                        <button
                          onClick={() => { setLiftingBan(ban); }}
                          className="text-emerald-700 hover:text-white hover:bg-emerald-700 border border-emerald-200 hover:border-emerald-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer"
                        >
                          Lift suspension
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[10px] inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
                          <Lock className="h-3 w-3 text-gray-400" /> Admin Only
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400 text-[10px]">Settled</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* BAN LIFT MODAL */}
      {liftingBan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="lift-ban-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-155 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-4 font-black text-xs flex items-center justify-between">
              <span className="uppercase tracking-wider">Lift Blacklist: {liftingBan.name}</span>
              <button onClick={() => setLiftingBan(null)} className="text-white hover:text-accent font-bold cursor-pointer text-xs">✕</button>
            </div>

            <form onSubmit={onLiftSubmit} className="p-5 space-y-4 text-left">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 leading-normal">
                <p><strong>Banned Email:</strong> {liftingBan.email}</p>
                <p><strong>Original Violation Reason:</strong> {liftingBan.reason}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Official Lift Justification <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={liftReason}
                  onChange={e => setLiftReason(e.target.value)}
                  placeholder="State the official resolution detail (e.g. Written apology submitted, or department head intervention)..."
                  className="w-full p-2 border border-gray-150 rounded-xl text-xs bg-white text-gray-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                <button
                  type="button"
                  onClick={() => setLiftingBan(null)}
                  className="px-3 py-2 border border-gray-150 text-gray-600 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  Confirm Lift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
