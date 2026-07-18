import React from 'react';
import { Check, Info } from 'lucide-react';
import { User } from '../../../../../types';

interface BanFormProps {
  banEmail: string;
  setBanEmail: (val: string) => void;
  banName: string;
  matchedBanUser?: User;
  banDuration: string;
  setBanDuration: (val: string) => void;
  customDays: string;
  setCustomDays: (val: string) => void;
  banReason: string;
  setBanReason: (val: string) => void;
  ceilingDays: number;
  currentUser: User;
  processing: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function BanForm({
  banEmail,
  setBanEmail,
  banName,
  matchedBanUser,
  banDuration,
  setBanDuration,
  customDays,
  setCustomDays,
  banReason,
  setBanReason,
  ceilingDays,
  currentUser,
  processing,
  onSubmit
}: BanFormProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit text-left">
      <div className="space-y-1">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Issue Blacklist Restriction</h3>
        <p className="text-[11px] text-gray-500">Temporarily or permanently restrict a user account from reserving rooms.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Blacklist Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            required
            value={banEmail}
            onChange={e => setBanEmail(e.target.value)}
            placeholder="e.g. rebel@ucp.edu.pk"
            className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Account Holder Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={banName}
            disabled={true}
            placeholder="Will autofill based on email..."
            className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-gray-100 text-gray-400 cursor-not-allowed font-medium"
          />
          {matchedBanUser ? (
            <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
              <Check className="h-3 w-3" /> Verified simulated profile: {matchedBanUser.name}
            </p>
          ) : banEmail.trim() ? (
            <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
              <Info className="h-3 w-3" /> External / Booking-only history profile
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Blacklist Duration <span className="text-red-500">*</span></label>
          <select
            value={banDuration}
            onChange={e => setBanDuration(e.target.value)}
            className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary text-gray-800 cursor-pointer"
          >
            {(currentUser.role === 'Administrator' || ceilingDays >= 3) && <option value="3 days">3 Days Suspension</option>}
            {(currentUser.role === 'Administrator' || ceilingDays >= 7) && <option value="7 days">7 Days Suspension</option>}
            {(currentUser.role === 'Administrator' || ceilingDays >= 30) && <option value="30 days">30 Days Suspension</option>}
            {currentUser.role === 'Administrator' && <option value="Permanent">Permanent Ban</option>}
            {(currentUser.role === 'Administrator' || ceilingDays > 0) && <option value="Custom">Custom Days...</option>}
          </select>
        </div>

        {banDuration === 'Custom' && (
          <div className="animate-fade-in">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
              Custom Duration (Days) {currentUser.role !== 'Administrator' && `— Max ${ceilingDays} days`}
            </label>
            <input
              type="number"
              min="1"
              max={currentUser.role === 'Administrator' ? undefined : ceilingDays}
              value={customDays}
              onChange={e => {
                const val = parseInt(e.target.value) || 0;
                if (currentUser.role !== 'Administrator' && val > ceilingDays) {
                  setCustomDays(String(ceilingDays));
                } else {
                  setCustomDays(e.target.value);
                }
              }}
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Official Policy Violation Reason <span className="text-red-500">*</span></label>
          <textarea
            required
            rows={2}
            value={banReason}
            onChange={e => setBanReason(e.target.value)}
            placeholder="e.g. Double booking manipulation and failure to clean space after society session..."
            className="w-full p-2.5 border border-gray-155 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
          />
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          {processing ? 'Processing restriction...' : 'Commit Blacklist Rule'}
        </button>
      </form>
    </div>
  );
}
