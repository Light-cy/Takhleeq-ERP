import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon, 
  FileText, 
  Search, 
  Building,
  TrendingUp,
  Percent,
  History,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Booking, Ban } from '../../../types';

interface UserProfileHistoryModalProps {
  userEmail: string;
  userName?: string;
  bookings: Booking[];
  activeBans?: Ban[];
  onClose: () => void;
  onViewBookingDetails?: (booking: Booking) => void;
  onInitiateReject?: (booking: Booking) => void;
  isAllowedToApproveReject?: boolean;
}

export const UserProfileHistoryModal: React.FC<UserProfileHistoryModalProps> = ({
  userEmail,
  userName,
  bookings,
  activeBans = [],
  onClose,
  onViewBookingDetails,
  onInitiateReject,
  isAllowedToApproveReject = true
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'upcoming' | 'past' | 'rejected' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all bookings belonging to this user
  const userBookings = useMemo(() => {
    if (!userEmail) return [];
    return bookings
      .filter(b => b.email && b.email.toLowerCase() === userEmail.toLowerCase())
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [bookings, userEmail]);

  // Derived user details from booking history
  const displayName = userName || userBookings[0]?.name || userEmail.split('@')[0];
  const userOrg = userBookings[0]?.organization || 'University Member';

  // Check ban status
  const banInfo = useMemo(() => {
    return activeBans.find(
      b => b.email && b.email.toLowerCase() === userEmail.toLowerCase() && b.status === 'Active'
    );
  }, [activeBans, userEmail]);

  // KPI calculations
  const total = userBookings.length;
  const approved = userBookings.filter(b => b.status === 'APPROVED').length;
  const pending = userBookings.filter(b => b.status.includes('PENDING')).length;
  const rejected = userBookings.filter(b => b.status.includes('REJECTED')).length;
  const cancelled = userBookings.filter(b => b.status === 'CANCELLED').length;
  
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  // Past vs Upcoming check
  const parseToMidnight = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  };

  const isPast = (b: Booking) => {
    if (!b.date) return false;
    const now = new Date();
    const bDate = parseToMidnight(b.date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (bDate < today) return true;
    if (bDate.getTime() === today.getTime() && b.endTime) {
      const [h, m] = b.endTime.split(':').map(Number);
      const bookingEnd = new Date(today);
      bookingEnd.setHours(h || 0, m || 0, 0, 0);
      return now > bookingEnd;
    }
    return false;
  };

  // Filtered booking records
  const filteredBookings = useMemo(() => {
    return userBookings.filter(b => {
      // Tab filter
      if (filterTab === 'upcoming') {
        if (isPast(b) || b.status.includes('REJECTED') || b.status === 'CANCELLED') return false;
      } else if (filterTab === 'past') {
        if (!isPast(b)) return false;
      } else if (filterTab === 'rejected') {
        if (!b.status.includes('REJECTED')) return false;
      } else if (filterTab === 'cancelled') {
        if (b.status !== 'CANCELLED') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = b.id.toLowerCase().includes(q);
        const matchRoom = b.room?.toLowerCase().includes(q);
        const matchTitle = b.eventTitle?.toLowerCase().includes(q);
        const matchType = b.bookingType?.toLowerCase().includes(q);
        if (!matchId && !matchRoom && !matchTitle && !matchType) return false;
      }

      return true;
    });
  }, [userBookings, filterTab, searchQuery]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] text-left animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* User Identity Header */}
        <div className="bg-gradient-to-r from-primary to-[#5A0F0F] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-accent font-black text-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">{displayName}</h2>
                {banInfo ? (
                  <span className="bg-rose-500/20 text-rose-200 border border-rose-300/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-rose-300" /> Currently Banned
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-300/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-300" /> Good Standing
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 font-mono mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-white/60" /> {userEmail}
                </span>
                <span className="text-white/40">·</span>
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3 text-white/60" /> {userOrg}
                </span>
              </p>
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
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Active Ban Callout if applicable */}
          {banInfo && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-rose-950">Active Reservation Ban In Effect</p>
                <p className="text-[11px] mt-0.5 text-rose-800 leading-relaxed">
                  Reason: <em>"{banInfo.reason}"</em>. Duration: {banInfo.duration}. Expires on: {banInfo.expiresAt}.
                </p>
              </div>
            </div>
          )}

          {/* Metric KPI Strip (Tabular Numerals) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-gray-50 border border-gray-200/70 rounded-xl">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Bookings</span>
              <p className="text-xl font-black text-gray-900 font-mono tabular-nums mt-0.5">{total}</p>
              <span className="text-[10px] text-gray-400">All submissions</span>
            </div>

            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Approved</span>
              <p className="text-xl font-black text-emerald-700 font-mono tabular-nums mt-0.5">{approved}</p>
              <span className="text-[10px] text-emerald-600 font-mono tabular-nums">{approvalRate}% approval rate</span>
            </div>

            <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">In Review</span>
              <p className="text-xl font-black text-amber-700 font-mono tabular-nums mt-0.5">{pending}</p>
              <span className="text-[10px] text-amber-600">Pending desk</span>
            </div>

            <div className="p-3.5 bg-rose-50/50 border border-rose-200/60 rounded-xl">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Rejected</span>
              <p className="text-xl font-black text-rose-700 font-mono tabular-nums mt-0.5">{rejected}</p>
              <span className="text-[10px] text-rose-600">Staff / system</span>
            </div>

            <div className="p-3.5 bg-gray-100/70 border border-gray-200 rounded-xl">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Cancelled</span>
              <p className="text-xl font-black text-gray-700 font-mono tabular-nums mt-0.5">{cancelled}</p>
              <span className="text-[10px] text-gray-500 font-mono tabular-nums">{cancellationRate}% cancel rate</span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-100 pb-3">
            {/* Segmented Filter Control */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All ({total})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('upcoming')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'upcoming' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('past')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'past' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Past / Completed
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('rejected')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'rejected' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Rejected ({rejected})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('cancelled')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === 'cancelled' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Cancelled ({cancelled})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search user bookings..."
                className="w-full pl-8.5 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Bookings Table / List */}
          {filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 space-y-1.5">
              <History className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="font-bold text-gray-700">No bookings found</p>
              <p>No reservations matched the selected filter or query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-150 rounded-xl">
              <table className="w-full text-left text-xs text-gray-700">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Ref ID</th>
                    <th className="py-3 px-4">Space & Date</th>
                    <th className="py-3 px-4">Event & Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.map(b => {
                    const past = isPast(b);
                    const isAppr = b.status === 'APPROVED';
                    const isPend = b.status.includes('PENDING');
                    const isRej = b.status.includes('REJECTED');
                    const isCanc = b.status === 'CANCELLED';

                    return (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                          {b.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900">{b.room}</p>
                          <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                            {b.date} · {b.startTime} - {b.endTime}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-800 line-clamp-1">{b.eventTitle || 'Untitled Event'}</p>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {b.bookingType} · {b.expectedAttendance || 0} pax
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isAppr && (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              {past ? 'Completed' : 'Approved'}
                            </span>
                          )}
                          {isPend && (
                            <span className="text-amber-700 font-bold inline-flex items-center gap-1 text-[11px]">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              In Review
                            </span>
                          )}
                          {isRej && (
                            <span className="text-rose-700 font-bold inline-flex items-center gap-1 text-[11px]" title={b.rejectionReason}>
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              Rejected
                            </span>
                          )}
                          {isCanc && (
                            <span className="text-gray-500 font-medium inline-flex items-center gap-1 text-[11px]">
                              <AlertOctagon className="h-3.5 w-3.5 text-gray-400" />
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {onViewBookingDetails && (
                              <button
                                type="button"
                                onClick={() => onViewBookingDetails(b)}
                                className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors inline-flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Details</span>
                              </button>
                            )}

                            {onInitiateReject && isAppr && !past && (
                              <button
                                type="button"
                                disabled={!isAllowedToApproveReject}
                                onClick={() => onInitiateReject(b)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors inline-flex items-center gap-1 disabled:opacity-40"
                              >
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                <span>Force Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-500 font-mono">
            Showing {filteredBookings.length} of {total} total user records
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200/80 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
