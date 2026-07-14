import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  MapPin, 
  ArrowLeft,
  Users,
  Info
} from 'lucide-react';
import { Booking } from '../../../types';
import { bookingsApi } from '../services/bookings.api';

interface TrackPageProps {
  bookings: Booking[];
  currentUserEmail: string;
  jwtToken: string | null;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
}

export function TrackPage({ bookings, currentUserEmail, jwtToken, onRefresh, onNavigate }: TrackPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Booking[] | null>(null);
  
  // Cancellation Modal state
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Trigger search manually
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResult(null);
      return;
    }

    const filtered = bookings.filter(b => 
      b.id.toLowerCase() === query || 
      b.email.toLowerCase() === query
    );
    setSearchResult(filtered);
  };

  // Get auto personal history for simulated logged in email
  const personalHistory = bookings.filter(b => b.email.toLowerCase() === currentUserEmail.toLowerCase());

  // Re-run search if bookings update
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const filtered = bookings.filter(b => 
        b.id.toLowerCase() === query || 
        b.email.toLowerCase() === query
      );
      setSearchResult(filtered);
    }
  }, [bookings]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;
    if (!cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason.');
      return;
    }

    setCancelling(true);
    setCancelError(null);

    try {
      const result = await bookingsApi.cancel(cancellingBooking.id, cancelReason, jwtToken);

      if (result.policyViolation) {
        alert('Warning: Your cancellation was processed, but was flagged as a POLICY VIOLATION because it was submitted with less than 1 hour advance notice.');
      } else {
        alert('Booking cancelled successfully.');
      }

      setCancellingBooking(null);
      setCancelReason('');
      onRefresh();
    } catch (err: any) {
      setCancelError(err.message || 'Error occurred during cancellation');
    } finally {
      setCancelling(false);
    }
  };

  // Status timeline generator
  const renderStatusTimeline = (status: string) => {
    const steps = [
      { key: 'VALIDATION', label: 'PENDING VALIDATION', desc: 'Rules & Ban checks' },
      { key: 'REVIEW', label: 'PENDING REVIEW', desc: 'Staff review queue' },
      { key: 'FINAL', label: 'FINAL STATE', desc: 'Approved or Rejected' }
    ];

    let activeStep = 0;
    let isApproved = false;
    let isRejected = false;
    let isCancelled = false;

    if (status === 'PENDING VALIDATION') {
      activeStep = 0;
    } else if (status === 'PENDING REVIEW') {
      activeStep = 1;
    } else if (status === 'APPROVED') {
      activeStep = 2;
      isApproved = true;
    } else if (status === 'REJECTED BY STAFF' || status === 'REJECTED (BAN)' || status === 'REJECTED (VALIDATION)' || status.includes('REJECTED')) {
      activeStep = 2;
      isRejected = true;
    } else if (status === 'CANCELLED') {
      isCancelled = true;
    }

    if (isCancelled) {
      return (
        <div className="p-4 bg-gray-50 border rounded-xl text-center text-xs text-gray-500 font-medium">
          This booking has been <strong className="text-gray-800">CANCELLED</strong> and is no longer active.
        </div>
      );
    }

    return (
      <div className="pt-6 pb-2">
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-5">Workflow Audit Timeline</p>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-4">
          
          {/* Horizontal Line Connector (Desktop only) */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-100 hidden sm:block z-0" />

          {steps.map((step, index) => {
            const isCompleted = index < activeStep || (index === 2 && (isApproved || isRejected));
            const isCurrent = index === activeStep && !(index === 2 && (isApproved || isRejected));
            
            let circleBg = 'bg-gray-100 text-gray-400 border-gray-200';
            let labelColor = 'text-gray-500';

            if (isCompleted) {
              if (index === 2 && isRejected) {
                circleBg = 'bg-rose-100 text-rose-800 border-rose-300';
              } else {
                circleBg = 'bg-green-100 text-green-800 border-green-300';
              }
              labelColor = 'text-gray-900 font-bold';
            } else if (isCurrent) {
              circleBg = 'bg-primary text-white border-primary animate-pulse';
              labelColor = 'text-primary font-bold';
            }

            let stepLabel = step.label;
            if (index === 2) {
              if (isApproved) stepLabel = 'APPROVED';
              else if (isRejected) stepLabel = 'REJECTED';
              else stepLabel = 'DECISION PENDING';
            }

            return (
              <div key={step.key} className="flex sm:flex-col items-center text-left sm:text-center gap-4 sm:gap-2 z-10 flex-1 relative w-full sm:w-auto">
                <div className={`h-10 w-10 rounded-full border flex items-center justify-center shrink-0 ${circleBg} font-black text-xs`}>
                  {index === 2 && isApproved ? (
                    <CheckCircle2 className="h-5 w-5 text-green-700" />
                  ) : index === 2 && isRejected ? (
                    <XCircle className="h-5 w-5 text-rose-700" />
                  ) : (
                    <span>0{index + 1}</span>
                  )}
                </div>
                <div>
                  <p className={`text-[11px] uppercase tracking-wider ${labelColor}`}>{stepLabel}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-green-100 text-green-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">APPROVED</span>;
      case 'PENDING REVIEW':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">PENDING REVIEW</span>;
      case 'PENDING VALIDATION':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">PENDING VALIDATION</span>;
      case 'REJECTED BY STAFF':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">REJECTED BY STAFF</span>;
      case 'REJECTED (VALIDATION)':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">REJECTED (VALIDATION)</span>;
      case 'CANCELLED':
        return <span className="bg-gray-100 text-gray-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">CANCELLED</span>;
      case 'REJECTED (BAN)':
        return <span className="bg-red-200 text-red-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">REJECTED (POLICY)</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8" id="takhleeq-track-page">
      
        {/* Tracker Search card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100/60 space-y-6" id="search-card">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Track Specific Request</h2>
              <p className="text-[11px] text-gray-500">Lookup any space request instantly using either your unique Reference ID or email</p>
            </div>
            <button 
              onClick={() => { onRefresh(); handleSearch(); }}
              className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
              title="Refresh database records"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. T-1001 or usman@society.pk"
                className="w-full pl-10 pr-3.5 py-3 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-3 rounded-xl text-xs cursor-pointer transition-all uppercase tracking-wider"
            >
              Lookup
            </button>
          </form>

          {/* Search Result details */}
          {searchResult !== null && (
            <div className="border-t border-gray-100 pt-6 space-y-4 animate-fade-in" id="search-results-panel">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Search Results ({searchResult.length})</h3>
              {searchResult.length === 0 ? (
                <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-500">
                  No matching space bookings found for "{searchQuery}". Please verify your Reference ID or Email address.
                </div>
              ) : (
                <div className="space-y-6">
                  {searchResult.map(booking => (
                    <BookingCard key={booking.id} booking={booking} onCancelClick={setCancellingBooking} getStatusBadge={getStatusBadge} renderStatusTimeline={renderStatusTimeline} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Personal history lists */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100/60 space-y-4" id="personal-history-card">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Your Personal History</h2>
            <p className="text-[11px] text-gray-500">
              Showing bookings requested by your active simulated identity: <strong className="text-primary font-bold">{currentUserEmail}</strong>
            </p>
          </div>

          {personalHistory.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl py-10 px-4 text-center text-xs text-gray-400 leading-relaxed">
              No booking history found for {currentUserEmail}.<br/>
              Submit a new request in the Booking Portal or switch your simulated identity at the top to load a different history.
            </div>
          ) : (
            <div className="space-y-4">
              {personalHistory.map(booking => (
                <BookingCard key={booking.id} booking={booking} onCancelClick={setCancellingBooking} getStatusBadge={getStatusBadge} renderStatusTimeline={renderStatusTimeline} />
              ))}
            </div>
          )}
        </div>

      {/* CANCELLATION AUTHORIZATION MODAL */}
      {cancellingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="cancel-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-5 font-bold text-sm flex items-center justify-between">
              <span>Authorization: Cancel Space Reservation</span>
              <button onClick={() => setCancellingBooking(null)} className="text-white hover:text-accent font-bold cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCancelSubmit} className="p-6 space-y-5 text-left">
              <div className="p-4 bg-[#F8F5F0] rounded-xl text-xs space-y-1.5 text-gray-700 border border-gray-150">
                <p><strong>Booking ID:</strong> {cancellingBooking.id}</p>
                <p><strong>Space:</strong> {cancellingBooking.room}</p>
                <p><strong>Schedule:</strong> {cancellingBooking.date} @ {cancellingBooking.startTime} - {cancellingBooking.endTime}</p>
                {cancellingBooking.status === 'APPROVED' && (
                  <div className="text-rose-700 font-semibold flex items-start gap-1.5 mt-2.5 bg-rose-50 p-2 rounded-lg border border-rose-100">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p className="text-[10px] leading-relaxed">Rule: Cancellations must be requested &gt; 1 hour in advance. Less than 1 hour notice flags a policy violation on your account.</p>
                  </div>
                )}
              </div>

              {cancelError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{cancelError}</p>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Mandatory Cancellation Reason <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Provide a specific reason for canceling this space reservation..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Internal Booking card component
interface BookingCardProps {
  key?: string | number;
  booking: Booking;
  onCancelClick: (booking: Booking) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  renderStatusTimeline: (status: string) => React.ReactNode;
}

function BookingCard({ booking, onCancelClick, getStatusBadge, renderStatusTimeline }: BookingCardProps) {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateString();

  const isDateInPast = (bookingDateStr: string, currentTodayStr: string) => {
    if (!bookingDateStr) return false;
    
    const parseToMidnight = (dateStr: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(`${dateStr}T00:00:00`);
      }
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      return new Date(dateStr);
    };

    const bDate = parseToMidnight(bookingDateStr);
    const tDate = parseToMidnight(currentTodayStr);
    return bDate < tDate;
  };

  const isPast = isDateInPast(booking.date, todayStr);
  const isCancellable = (booking.status === 'APPROVED' || booking.status === 'PENDING REVIEW') && !isPast;

  return (
    <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-3xs flex flex-col text-left">
      
      {/* Card Header banner with status */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black text-primary bg-[#F8F5F0] px-2.5 py-1 rounded border border-gray-200">{booking.id}</span>
          <span className="text-xs font-bold text-gray-900 truncate max-w-[200px] sm:max-w-xs">{booking.eventTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(booking.status)}
          {booking.conflictStatus === 'CONFLICT DETECTED' && (
            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <AlertTriangle className="h-3 w-3 text-amber-600" /> OVERLAP
            </span>
          )}
        </div>
      </div>

      {/* Details grid & workflow */}
      <div className="p-6 space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Space Requested</span>
            <p className="font-bold text-gray-800 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              {booking.room}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Reserved Date</span>
            <p className="font-semibold text-gray-800 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {booking.date}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Reserved Duration</span>
            <p className="font-semibold text-gray-800 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {booking.startTime} - {booking.endTime}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Society / Cohort</span>
            <p className="font-semibold text-gray-800 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {booking.organization || 'Individual'}
            </p>
          </div>
        </div>

        {/* Rejection / Cancellation Notes */}
        {booking.rejectionReason && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl flex gap-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <p><strong>Rejection Justification:</strong> {booking.rejectionReason}</p>
          </div>
        )}

        {booking.cancellationReason && (
          <div className="p-3 bg-gray-50 border border-gray-150 text-gray-600 text-[11px] rounded-xl">
            <p><strong>Cancellation Reason:</strong> {booking.cancellationReason}</p>
          </div>
        )}

        {/* Render timeline */}
        {renderStatusTimeline(booking.status)}

        {/* Card action controls */}
        {isCancellable && (
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={() => onCancelClick(booking)}
              className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
            >
              <Trash2 className="h-4 w-4" />
              Cancel Reservation
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
