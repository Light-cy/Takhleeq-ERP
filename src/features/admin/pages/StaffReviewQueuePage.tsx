import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Check, 
  X, 
  Eye, 
  AlertTriangle, 
  UserMinus, 
  Calendar, 
  Clock, 
  Mail, 
  ShieldCheck, 
  HelpCircle,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Lock
} from 'lucide-react';
import { Booking, Ban } from '../../../types';

interface StaffReviewQueueProps {
  bookings: Booking[];
  activeBans: Ban[];
  onApprove: (bookingId: string) => Promise<void>;
  onReject: (bookingId: string, reason: string) => Promise<void>;
  onIssueBanClick: (email: string, name: string) => void;
  onRefresh: () => void;
  hasPermission?: (permission: string) => boolean;
}

export function StaffReviewQueue({ 
  bookings, 
  activeBans, 
  onApprove, 
  onReject, 
  onIssueBanClick, 
  onRefresh,
  hasPermission
}: StaffReviewQueueProps) {
  const isAllowedToApproveReject = hasPermission ? hasPermission('APPROVE_REJECT_BOOKINGS') : true;
  const isAllowedToBan = hasPermission ? hasPermission('ISSUE_BAN') : true;

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Filter pending review list
  const pendingBookings = bookings.filter(b => b.status === 'PENDING REVIEW');

  // Filtered by search (e.g. name, ID, room)
  const displayedBookings = pendingBookings.filter(b => 
    b.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.room.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.eventTitle.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Helper to check ban flag details for any email
  const getEmailBanDetails = (email: string) => {
    const activeBan = activeBans.find(b => b.email.toLowerCase() === email.toLowerCase() && b.status === 'Active');
    if (!activeBan) return null;

    // Calculate days remaining
    let daysRemaining = 'Permanent';
    if (activeBan.expiresAt !== 'Never') {
      const msDiff = new Date(activeBan.expiresAt).getTime() - Date.now();
      const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      daysRemaining = days > 0 ? `${days} days remaining` : 'Expiring today';
    }

    return {
      reason: activeBan.reason,
      duration: activeBan.duration,
      daysRemaining
    };
  };

  const handleApproveAction = async (bookingId: string) => {
    setProcessing(true);
    setErrorMsg(null);
    try {
      await onApprove(bookingId);
      setSelectedBooking(null);
      setShowRejectionInput(false);
      setRejectionReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error approving request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectAction = async (e: React.FormEvent, bookingId: string) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setErrorMsg('Rejection reason is mandatory.');
      return;
    }

    setProcessing(true);
    setErrorMsg(null);
    try {
      await onReject(bookingId, rejectionReason);
      setSelectedBooking(null);
      setShowRejectionInput(false);
      setRejectionReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error rejecting request.');
    } finally {
      setProcessing(false);
    }
  };

  // Helper to find details about the conflicting booking
  const getConflictDetails = (booking: Booking) => {
    if (booking.conflictStatus !== 'CONFLICT DETECTED' || !booking.conflictingBookingId) return null;
    return bookings.find(b => b.id === booking.conflictingBookingId);
  };

  // Helper to find all overlapping/conflicting bookings (same room, same date, overlapping time window)
  const getOverlappingBookings = (booking: Booking) => {
    return bookings.filter(b => 
      b.id !== booking.id &&
      b.room === booking.room &&
      b.date === booking.date &&
      b.startTime < booking.endTime &&
      booking.startTime < b.endTime &&
      (b.status === 'APPROVED' || b.status === 'PENDING REVIEW')
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100/85 overflow-hidden text-left" id="staff-review-queue-view">
      
      {/* Header bar */}
      <div className="bg-gradient-to-r from-primary to-[#5A0F0F] px-6 py-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100">
        <div>
          <span className="text-accent text-[9px] font-black uppercase tracking-widest block">Operational Desk</span>
          <h2 className="text-base font-black uppercase tracking-wider">Pending Space Review Queue</h2>
          <p className="text-[11px] text-white/80 mt-0.5">Incoming space reservation requests awaiting administrative approval.</p>
        </div>
        <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-accent text-xs font-black font-mono">{pendingBookings.length}</span>
          <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider">Requests Pending</span>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/45 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Search pending by Name, ID, or Space..."
            className="w-full pl-9 pr-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium placeholder-gray-400"
          />
        </div>
        
        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest self-center font-mono">
          Checked automatically by Takhleeq Conflict Engine
        </p>
      </div>

      {displayedBookings.length === 0 ? (
        <div className="py-16 px-6 text-center text-xs text-gray-400 leading-relaxed border-b border-gray-100">
          {pendingBookings.length === 0 ? (
            <div className="space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="font-bold text-gray-800">Operational Desk Clear</p>
              <p>No space reservation requests are currently pending review.</p>
            </div>
          ) : (
            <p>No pending bookings match the active query "{searchFilter}".</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                <th className="py-3 px-6">Reference ID</th>
                <th className="py-3 px-6">Requester details</th>
                <th className="py-3 px-6">Space & Schedule</th>
                <th className="py-3 px-6">Booking Type</th>
                <th className="py-3 px-6">Overlaps Check</th>
                <th className="py-3 px-6">Banned Registry</th>
                <th className="py-3 px-6 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedBookings.map(booking => {
                const banInfo = getEmailBanDetails(booking.email);
                return (
                  <tr key={booking.id} className="hover:bg-gray-50/40 transition-colors text-xs text-gray-700">
                    <td className="py-4.5 px-6 font-mono font-black text-primary whitespace-nowrap">{booking.id}</td>
                    <td className="py-4.5 px-6">
                      <p className="font-black text-gray-900">{booking.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-3 w-3 text-gray-400" /> {booking.email}
                      </p>
                    </td>
                    <td className="py-4.5 px-6">
                      <p className="font-extrabold text-gray-800 whitespace-nowrap">{booking.room}</p>
                      <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                        <span>{booking.date} @ {booking.startTime} - {booking.endTime}</span>
                      </p>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="bg-[#F8F5F0] border border-gray-150 text-gray-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg whitespace-nowrap inline-block">
                        {booking.bookingType}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      {booking.conflictStatus === 'CONFLICT DETECTED' ? (
                        <span className="bg-amber-150 text-amber-900 border border-amber-200 text-[9px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse whitespace-nowrap">
                          <AlertTriangle className="h-3 w-3 text-amber-700 shrink-0" /> OVERLAP DETECTED
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-0.5 whitespace-nowrap">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" /> SAFE
                        </span>
                      )}
                    </td>
                    <td className="py-4.5 px-6">
                      {banInfo ? (
                        <span className="bg-rose-50 text-rose-800 border border-rose-100 text-[9px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse whitespace-nowrap" title={`Reason: ${banInfo.reason}`}>
                          <ShieldAlert className="h-3 w-3 text-rose-600 shrink-0" /> BANNED ({banInfo.daysRemaining})
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[10px] inline-flex items-center gap-1 whitespace-nowrap">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> CLEAR
                        </span>
                      )}
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <button
                        onClick={() => { setSelectedBooking(booking); setShowRejectionInput(false); setErrorMsg(null); }}
                        className="bg-primary hover:bg-primary/95 text-white font-black px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-wider transition-colors shadow-3xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> Open Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL ACTION MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="review-action-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal header with booking ID */}
            <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Review Space Reservation: {selectedBooking.id}</span>
              <button onClick={() => setSelectedBooking(null)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-left">
              {!isAllowedToApproveReject && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-rose-900 uppercase tracking-wide">Privilege Restriction</p>
                    <p className="text-[11px] mt-1 text-rose-800 leading-normal">
                      Your account lacks the <strong>'APPROVE_REJECT_BOOKINGS'</strong> permission. You can review the details, but you are not authorized to approve or reject reservation requests on this system.
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* BAN FLAG DETECTOR */}
              {getEmailBanDetails(selectedBooking.email) && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1.5">
                  <p className="font-black text-xs text-rose-700 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-600" /> BLACKLISTED ACCOUNT DETECTED
                  </p>
                  <p className="text-xs text-rose-800 leading-normal">
                    <strong>Reason for blacklisting:</strong> {getEmailBanDetails(selectedBooking.email)?.reason} ({getEmailBanDetails(selectedBooking.email)?.daysRemaining})
                  </p>
                  <p className="text-[10px] text-rose-600 font-semibold bg-white border border-rose-100 p-2 rounded-lg">
                    BR-09 Protocol: Banned accounts are completely barred from securing reservations. Rejection is advised.
                  </p>
                </div>
              )}

              {/* CONFLICT FLAG DETECTOR */}
              {getOverlappingBookings(selectedBooking).length > 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-2.5">
                  <p className="font-black text-xs text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> SCHEDULE OVERLAP CONFLICT DETECTED
                  </p>
                  <div className="text-xs text-amber-800 pl-5 space-y-2">
                    <p className="font-bold text-gray-900">Overlapping with other active/pending booking(s):</p>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {getOverlappingBookings(selectedBooking).map(overlap => (
                        <div key={overlap.id} className="bg-white border border-amber-100 rounded-xl p-3 text-[11px] space-y-1">
                          <p className="flex justify-between items-center">
                            <span>
                              <strong>Booking Ref:</strong> <span className="font-mono text-primary font-bold bg-[#F8F5F0] border px-1.5 py-0.5 rounded">{overlap.id}</span>
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                              overlap.status === 'APPROVED' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {overlap.status}
                            </span>
                          </p>
                          <p><strong>Title:</strong> {overlap.eventTitle}</p>
                          <p><strong>Requester:</strong> {overlap.name} ({overlap.email})</p>
                          <p><strong>Scheduled Slot:</strong> {overlap.date} @ {overlap.startTime} - {overlap.endTime}</p>
                          {overlap.status === 'APPROVED' && (
                            <p className="text-rose-600 font-extrabold flex items-center gap-1 mt-1.5 bg-rose-50 p-1.5 rounded-md border border-rose-100 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" /> Approving this will automatically REJECT & replace this approved booking and send a cancellation mail!
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-700 font-bold bg-white border border-amber-150 p-2.5 rounded-lg leading-normal">
                    BR-02 Double Booking Bypass Protocol: Standard block restriction is lifted. You can evaluate the priority and click 'Approve Space' to override. Approving will automatically reject all overlapping approved reservations and notify those users.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Conflict Engine: No schedule conflicts detected for this room. Safe to process approval.</span>
                </div>
              )}

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-gray-100 pb-1.5">Event/Meeting Information</h4>
                  <div className="text-xs space-y-2 text-gray-700">
                    <p className="leading-relaxed"><strong>Title:</strong> <span className="text-gray-900 font-bold">{selectedBooking.eventTitle}</span></p>
                    <p className="leading-relaxed text-gray-500"><strong>Description:</strong> {selectedBooking.eventDescription}</p>
                    <p><strong>Attendance count:</strong> {selectedBooking.expectedAttendance} persons</p>
                    <p><strong>Classification:</strong> {selectedBooking.bookingType}</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-gray-100 pb-1.5">Requester & Schedule details</h4>
                  <div className="text-xs space-y-2 text-gray-700 bg-[#F8F5F0]/40 p-4 rounded-xl border border-gray-100">
                    <p><strong>Name:</strong> {selectedBooking.name}</p>
                    <p className="font-mono"><strong>Email:</strong> {selectedBooking.email}</p>
                    <p><strong>Phone:</strong> {selectedBooking.phone}</p>
                    <p><strong>Affiliation:</strong> {selectedBooking.organization || 'Individual'}</p>
                    <p className="border-t border-gray-200/50 pt-2 mt-2"><strong>Requested room:</strong> <span className="font-extrabold text-primary">{selectedBooking.room}</span></p>
                    <p><strong>Scheduled slot:</strong> <span className="font-mono font-bold text-gray-900">{selectedBooking.date} @ {selectedBooking.startTime} - {selectedBooking.endTime}</span></p>
                  </div>
                </div>
              </div>

              {/* Rejection input */}
              {showRejectionInput && (
                <form onSubmit={(e) => handleRejectAction(e, selectedBooking.id)} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3 animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700">Mandatory Rejection Justification <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={2}
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Provide specific details why this request is being rejected. This notification will be logged and dispatched to the requester..."
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowRejectionInput(false); setRejectionReason(''); }}
                      className="px-3.5 py-2 border border-gray-200 text-gray-600 rounded-xl text-[11px] font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal actions footer */}
            <div className="bg-gray-50 p-4.5 border-t border-gray-100 flex flex-wrap justify-end gap-3 shrink-0">
              
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4.5 py-2.5 border border-gray-200 hover:bg-white text-gray-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                
                {!showRejectionInput && (
                  <button
                    type="button"
                    disabled={!isAllowedToApproveReject}
                    onClick={() => setShowRejectionInput(true)}
                    className={`px-4.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border ${
                      !isAllowedToApproveReject
                        ? 'bg-gray-50 text-gray-300 border-gray-150 cursor-not-allowed opacity-55'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100 cursor-pointer'
                    }`}
                  >
                    {!isAllowedToApproveReject ? <Lock className="h-4.5 w-4.5 text-gray-300" /> : <X className="h-4.5 w-4.5 text-rose-600" />} Reject Request
                  </button>
                )}                 <button
                  type="button"
                  disabled={processing || !!getEmailBanDetails(selectedBooking.email) || !isAllowedToApproveReject}
                  onClick={() => handleApproveAction(selectedBooking.id)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider transition-colors shadow-sm text-white ${
                    getOverlappingBookings(selectedBooking).some(o => o.status === 'APPROVED')
                      ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  title={getEmailBanDetails(selectedBooking.email) ? 'Blocked: Banned Account' : !isAllowedToApproveReject ? 'Blocked: Missing permission' : getOverlappingBookings(selectedBooking).some(o => o.status === 'APPROVED') ? 'Bypass conflict & override approved reservation' : 'Approve and lock slot'}
                >
                  {isAllowedToApproveReject ? (getOverlappingBookings(selectedBooking).some(o => o.status === 'APPROVED') ? <AlertTriangle className="h-4.5 w-4.5" /> : <Check className="h-4.5 w-4.5" />) : <Lock className="h-4.5 w-4.5" />}
                  {getOverlappingBookings(selectedBooking).some(o => o.status === 'APPROVED') ? 'Bypass & Approve' : 'Approve Space'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
