import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Copy, 
  Check, 
  History, 
  FileText, 
  AlertOctagon,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Booking, Ban } from '../../../types';

interface BookingDetailModalProps {
  booking: Booking | null;
  onClose: () => void;
  activeBans?: Ban[];
  onApprove?: (id: string) => Promise<void>;
  onInitiateReject?: (booking: Booking) => void;
  onInitiateOverride?: (booking: Booking) => void;
  onViewUserHistory?: (email: string) => void;
  isAllowedToApproveReject?: boolean;
  isAllowedToOverride?: boolean;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  onClose,
  activeBans = [],
  onApprove,
  onInitiateReject,
  onInitiateOverride,
  onViewUserHistory,
  isAllowedToApproveReject = true,
  isAllowedToOverride = true
}) => {
  const [copied, setCopied] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  if (!booking) return null;

  const copyReference = () => {
    navigator.clipboard.writeText(booking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const banDetails = activeBans.find(
    b => b.email.toLowerCase() === booking.email.toLowerCase() && b.status === 'Active'
  );

  const isPending = booking.status.includes('PENDING');
  const isApproved = booking.status === 'APPROVED' || booking.status === 'approved';
  const isRejected = booking.status.includes('REJECTED');
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'cancelled';

  // Check if booking is in the past
  const parseToMidnight = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  };

  const isPast = () => {
    if (!booking.date) return false;
    const now = new Date();
    const bDate = parseToMidnight(booking.date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (bDate < today) return true;
    if (bDate.getTime() === today.getTime() && booking.endTime) {
      const [h, m] = booking.endTime.split(':').map(Number);
      const bookingEnd = new Date(today);
      bookingEnd.setHours(h || 0, m || 0, 0, 0);
      return now > bookingEnd;
    }
    return false;
  };

  const pastConcluded = isPast();

  const handleApprove = async () => {
    if (!onApprove) return;
    setApproving(true);
    setApproveError(null);
    try {
      await onApprove(booking.id);
      onClose();
    } catch (err: any) {
      setApproveError(err?.message || 'Failed to approve booking.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] text-left animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-[#5A0F0F] px-6 py-4.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-white tracking-wider">{booking.id}</span>
                <button 
                  onClick={copyReference} 
                  className="text-white/70 hover:text-white transition-colors"
                  title="Copy Reference ID"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <h2 className="text-sm font-bold text-white/90">
                {booking.eventTitle || 'Space Reservation Details'}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-gray-700">
          
          {/* Status Ribbon & Ban Alert */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status:</span>
              {isApproved && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Approved Reservation
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Clock className="h-4 w-4 text-amber-600" /> Awaiting Staff Review
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <XCircle className="h-4 w-4 text-rose-600" /> Rejected Reservation
                </span>
              )}
              {isCancelled && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <AlertOctagon className="h-4 w-4 text-gray-500" /> Cancelled by Requester
                </span>
              )}
            </div>

            {pastConcluded && (
              <span className="text-[11px] font-mono text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded">
                Past Schedule
              </span>
            )}
          </div>

          {/* Active Ban Alert if user is currently banned */}
          {banDetails && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-black text-rose-950">Active User Ban In Effect</p>
                <p className="text-[11px] mt-0.5 text-rose-800">
                  Requester is restricted under ban reason: <em>"{banDetails.reason}"</em>. Expires: {banDetails.expiresAt}.
                </p>
              </div>
            </div>
          )}

          {/* Overlap Conflict Diagnostics */}
          {booking.conflictStatus === 'CONFLICT DETECTED' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-black text-amber-950">Schedule Overlap Conflict Detected</p>
                <p className="text-[11px] mt-0.5 text-amber-800">
                  This reservation overlaps with an existing schedule
                  {booking.conflictingBookingId ? ` (Ref: #${booking.conflictingBookingId})` : ''}. Review timeline before confirming.
                </p>
              </div>
            </div>
          )}

          {/* Rejection / Cancellation Notes */}
          {booking.rejectionReason && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl text-xs space-y-1">
              <span className="font-bold text-rose-900 uppercase tracking-wider text-[10px] block">Rejection Reason:</span>
              <p className="text-rose-800 italic">"{booking.rejectionReason}"</p>
            </div>
          )}

          {booking.cancellationReason && (
            <div className="p-3.5 bg-gray-100 border border-gray-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block">Cancellation Reason:</span>
              <p className="text-gray-600 italic">"{booking.cancellationReason}"</p>
            </div>
          )}

          {approveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {approveError}
            </div>
          )}

          {/* Main Grid: Space & Requester details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Requester Dossier Block */}
            <div className="p-4 rounded-xl border border-gray-200/80 bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 uppercase tracking-wider">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Requester Information
                </div>
                {onViewUserHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewUserHistory(booking.email);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <History className="h-3 w-3" />
                    <span>View History</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Full Name</span>
                  <p className="font-black text-gray-900">{booking.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Official Email</span>
                  <p className="font-mono text-gray-700 flex items-center gap-1">
                    <Mail className="h-3 w-3 text-gray-400" />
                    {booking.email}
                  </p>
                </div>
                {booking.phone && (
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Contact Phone</span>
                    <p className="font-mono text-gray-700 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-gray-400" />
                      {booking.phone}
                    </p>
                  </div>
                )}
                {booking.organization && (
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Department / Society</span>
                    <p className="font-medium text-gray-800 flex items-center gap-1">
                      <Building className="h-3 w-3 text-gray-400" />
                      {booking.organization}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Space & Schedule Block */}
            <div className="p-4 rounded-xl border border-gray-200/80 bg-white space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Space & Reservation Time
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Reserved Space</span>
                  <p className="font-black text-gray-900">{booking.room}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Date & Slot</span>
                  <p className="font-mono font-medium text-gray-800 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span>{booking.date}</span>
                    <span className="text-gray-400">·</span>
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Booking Type</span>
                  <p className="text-gray-700 font-medium">{booking.bookingType}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Expected Attendance</span>
                  <p className="font-mono text-gray-800 flex items-center gap-1">
                    <Users className="h-3 w-3 text-gray-400" />
                    <span>{booking.expectedAttendance || 'Not specified'} participants</span>
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Event Purpose / Description */}
          {booking.eventDescription && (
            <div className="p-4 rounded-xl border border-gray-200/80 bg-white space-y-1.5">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
                Event Description & Reservation Purpose
              </span>
              <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                {booking.eventDescription}
              </p>
            </div>
          )}

          {/* Audit Trail Metadata */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Submitted: {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A'}</span>
            {booking.approvedBy && (
              <span>Approved by: {booking.approvedBy}</span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <div>
            {onViewUserHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewUserHistory(booking.email);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-200/70 border border-gray-200 transition-colors inline-flex items-center gap-1.5"
              >
                <History className="h-3.5 w-3.5 text-primary" />
                <span>User History Dossier</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Force Reject or Reject Button */}
            {onInitiateReject && !isRejected && !isCancelled && !pastConcluded && (
              <button
                type="button"
                disabled={!isAllowedToApproveReject}
                onClick={() => {
                  onClose();
                  onInitiateReject(booking);
                }}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black transition-colors inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
                <span>{isApproved ? 'Force Reject' : 'Reject Request'}</span>
              </button>
            )}

            {/* Override Schedule Button */}
            {onInitiateOverride && (isApproved || isPending) && !pastConcluded && (
              <button
                type="button"
                disabled={!isAllowedToOverride}
                onClick={() => {
                  onClose();
                  onInitiateOverride(booking);
                }}
                className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-black transition-colors inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
                <span>Override</span>
              </button>
            )}

            {/* Approve Button (for Pending) */}
            {isPending && onApprove && (
              <button
                type="button"
                disabled={!isAllowedToApproveReject || approving}
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{approving ? 'Approving...' : 'Approve Request'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200/80 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
