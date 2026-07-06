import React, { useState } from 'react';
import { Search, Calendar, Clock, AlertCircle, XCircle, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { Booking } from '../types';

interface BookingTrackerProps {
  bookings: Booking[];
  currentUserEmail: string;
  onRefresh: () => void;
}

export function BookingTracker({ bookings, currentUserEmail, onRefresh }: BookingTrackerProps) {
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
      const response = await fetch(`/api/bookings/${cancellingBooking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': currentUserEmail
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel booking');
      }

      if (result.policyViolation) {
        alert('Warning: Your cancellation was processed, but was flagged as a POLICY VIOLATION because it was submitted with less than 1 hour advance notice.');
      } else {
        alert('Booking cancelled successfully.');
      }

      setCancellingBooking(null);
      setCancelReason('');
      onRefresh();
      
      // Update local search result if applicable
      if (searchResult) {
        setSearchResult(prev => 
          prev ? prev.map(b => b.id === cancellingBooking.id ? { ...b, status: 'CANCELLED', cancellationReason: cancelReason } : b) : null
        );
      }
    } catch (err: any) {
      setCancelError(err.message || 'Error occurred during cancellation');
    } finally {
      setCancelling(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">APPROVED</span>;
      case 'PENDING REVIEW':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">PENDING REVIEW</span>;
      case 'PENDING VALIDATION':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">PENDING VALIDATION</span>;
      case 'REJECTED BY STAFF':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">REJECTED</span>;
      case 'CANCELLED':
        return <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">CANCELLED</span>;
      case 'REJECTED (BAN)':
        return <span className="bg-red-200 text-red-900 text-[10px] font-bold px-2 py-0.5 rounded-full">REJECTED (POLICY)</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-8" id="booking-tracker-module">
      
      {/* Search / Track form */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Track Specific Request</h2>
            <p className="text-[11px] text-gray-500">Lookup any space request instantly using either your unique Reference ID or email</p>
          </div>
          <button 
            onClick={() => { onRefresh(); handleSearch(); }}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="e.g. T-1001 or usman@society.pk"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
            />
          </div>
          <button
            type="submit"
            className="bg-secondary hover:bg-secondary/95 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            Lookup
          </button>
        </form>

        {searchResult !== null && (
          <div className="mt-6 border-t border-gray-100 pt-4 animate-fade-in">
            <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider">Search Results ({searchResult.length})</h3>
            {searchResult.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">No matching bookings found for "{searchQuery}". Please check the spelling or format.</p>
            ) : (
              <div className="space-y-3">
                {searchResult.map(booking => (
                  <BookingItem key={booking.id} booking={booking} onCancelClick={setCancellingBooking} getStatusBadge={getStatusBadge} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal History */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Your Personal History</h2>
        <p className="text-[11px] text-gray-500 mb-4">
          All bookings requested by your active simulated identity: <strong className="text-primary font-semibold">{currentUserEmail}</strong>
        </p>

        {personalHistory.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl py-8 px-4 text-center text-xs text-gray-500">
            No booking history found for {currentUserEmail}. Try changing your active identity or submit a new request.
          </div>
        ) : (
          <div className="space-y-3">
            {personalHistory.map(booking => (
              <BookingItem key={booking.id} booking={booking} onCancelClick={setCancellingBooking} getStatusBadge={getStatusBadge} />
            ))}
          </div>
        )}
      </div>

      {/* CANCELLATION MODAL */}
      {cancellingBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-primary text-white p-4 font-bold text-sm flex items-center justify-between">
              <span>Submit Cancellation Request</span>
              <button onClick={() => setCancellingBooking(null)} className="text-white hover:text-accent font-bold cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-surface-card rounded-lg text-xs space-y-1 text-gray-700">
                <p><strong>Booking ID:</strong> {cancellingBooking.id}</p>
                <p><strong>Space:</strong> {cancellingBooking.room}</p>
                <p><strong>Schedule:</strong> {cancellingBooking.date} @ {cancellingBooking.startTime} - {cancellingBooking.endTime}</p>
                {cancellingBooking.status === 'APPROVED' && (
                  <p className="text-rose-700 font-semibold flex items-center gap-1 mt-2">
                    <AlertCircle className="h-3.5 w-3.5" /> Note: Must be requested &gt; 1 hour in advance to prevent policy marks.
                  </p>
                )}
              </div>

              {cancelError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">{cancelError}</p>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Cancellation <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Provide a specific reason for canceling this space reservation..."
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Internal row item subcomponent
interface BookingItemProps {
  key?: string;
  booking: Booking;
  onCancelClick: (booking: Booking) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

function BookingItem({ booking, onCancelClick, getStatusBadge }: BookingItemProps) {
  const isCancellable = booking.status === 'APPROVED' || booking.status === 'PENDING REVIEW';

  return (
    <div className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors bg-white shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-primary bg-surface-card px-2 py-0.5 rounded border border-gray-200/50">{booking.id}</span>
          <span className="font-medium text-xs text-gray-900">{booking.eventTitle}</span>
          {getStatusBadge(booking.status)}
          {booking.conflictStatus === 'CONFLICT DETECTED' && (
            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
              <AlertCircle className="h-3 w-3 text-amber-600" /> OVERLAP WARNING
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <div><strong>Space:</strong> {booking.room}</div>
          <div><strong>Date:</strong> {booking.date}</div>
          <div><strong>Duration:</strong> {booking.startTime} - {booking.endTime} ({booking.duration} mins)</div>
          <div><strong>Org:</strong> {booking.organization || 'None'}</div>
        </div>

        {booking.rejectionReason && (
          <div className="text-[11px] bg-rose-50 border border-rose-100 text-rose-800 p-2 rounded-lg mt-2">
            <strong>Rejection Reason:</strong> {booking.rejectionReason}
          </div>
        )}

        {booking.cancellationReason && (
          <div className="text-[11px] bg-gray-50 border border-gray-200 text-gray-600 p-2 rounded-lg mt-2">
            <strong>Cancellation Reason:</strong> {booking.cancellationReason}
          </div>
        )}
      </div>

      {isCancellable && (
        <button
          onClick={() => onCancelClick(booking)}
          className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Cancel Reservation
        </button>
      )}
    </div>
  );
}
