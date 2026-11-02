import React, { useState } from 'react';
import { 
  AlertOctagon, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Building, 
  ShieldAlert, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Booking } from '../../../types';

interface BookingRejectModalProps {
  booking: Booking | null;
  onClose: () => void;
  onConfirmReject: (bookingId: string, reason: string) => Promise<void>;
  isAllowedToReject: boolean;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  'Administrative priority allocation for institutional event',
  'Facility emergency maintenance & repair scheduled',
  'Room space reassignment mandated by campus administration',
  'Compliance policy adjustment / Reservation cancelled'
];

export function BookingRejectModal({
  booking,
  onClose,
  onConfirmReject,
  isAllowedToReject,
  onSuccess
}: BookingRejectModalProps) {
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!booking) return null;

  const isApproved = booking.status === 'APPROVED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('A detailed written reason is mandatory to reject or revoke this booking.');
      return;
    }

    setProcessing(true);
    setErrorMsg(null);

    try {
      await onConfirmReject(booking.id, reason.trim());
      setSuccessMsg(`Reservation ${booking.id} has been force rejected successfully. The room slot has been released.`);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject booking. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget && !processing) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-[#5A0F0F] text-white px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <AlertOctagon className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-200 block">
                {isApproved ? 'Approved Reservation Revocation' : 'Space Request Rejection'}
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {isApproved ? 'Force Reject Approved Booking' : 'Reject Booking Request'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4.5 text-left">
          
          {/* Privilege check alert */}
          {!isAllowedToReject && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-rose-900 uppercase tracking-wide">Privilege Restriction</p>
                <p className="text-[11px] mt-0.5 text-rose-800 leading-normal">
                  Your account lacks the <strong>'APPROVE_REJECT_BOOKINGS'</strong> permission. You cannot execute this action.
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Booking Summary Card */}
          <div className="bg-[#FAF8F5] border border-gray-200/80 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-start border-b border-gray-200/60 pb-2.5">
              <div>
                <span className="font-mono text-[11px] font-black text-primary block">{booking.id}</span>
                <p className="font-extrabold text-gray-900 text-sm mt-0.5">{booking.eventTitle || 'Untitled Event'}</p>
                {booking.eventDescription && (
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{booking.eventDescription}</p>
                )}
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                isApproved 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {booking.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-gray-700">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-900 truncate">{booking.room}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-mono">{booking.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-mono">{booking.startTime} - {booking.endTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{booking.name}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-mono text-[11px] text-gray-500 truncate">{booking.email}</span>
                {booking.organization && (
                  <span className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded ml-auto truncate">
                    {booking.organization}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Context Notice */}
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs space-y-1.5">
            <p className="font-extrabold text-rose-950 flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4 text-rose-600" />
              Administrative Impact:
            </p>
            <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-1 pl-1">
              <li>Status will immediately transition to <strong>REJECTED BY STAFF</strong>.</li>
              <li>The scheduled time slot for <strong>{booking.room}</strong> on <strong>{booking.date}</strong> will be released.</li>
              <li>An automated status email detailing the rejection reason will be dispatched to <strong>{booking.email}</strong>.</li>
              <li>An immutable audit entry will be recorded with your staff credentials.</li>
            </ul>
          </div>

          {/* Preset Reasons */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Quick Preset Reasons
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="text-[10px] bg-gray-100 hover:bg-gray-200 hover:text-gray-900 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 transition-colors text-left cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Form with Reason */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Mandatory Written Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                required
                placeholder="Specify the reason why this booking is being force rejected / revoked..."
                className="w-full p-3 border border-gray-300 rounded-xl text-xs bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none leading-relaxed"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                This explanation is displayed in the requester's notification email and permanent audit record.
              </p>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="px-4 py-2.5 border border-gray-250 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Keep Reservation
              </button>
              <button
                type="submit"
                disabled={processing || !isAllowedToReject || !reason.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {processing ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Rejection...</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="h-3.5 w-3.5" />
                    <span>Confirm Force Rejection</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
