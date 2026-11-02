import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  User, 
  Mail, 
  Building, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertOctagon, 
  ShieldAlert, 
  ShieldCheck, 
  History, 
  Filter, 
  Eye, 
  ArrowUpDown,
  Download,
  Users
} from 'lucide-react';
import { Booking, Ban, Room, User as ERPUser } from '../../../../types';
import { BookingDetailModal } from '../../components/BookingDetailModal';
import { UserProfileHistoryModal } from '../../components/UserProfileHistoryModal';
import { BookingRejectModal } from '../../components/BookingRejectModal';
import { BookingOverrideModal } from '../../components/BookingOverrideModal';

interface UserHistoryPageProps {
  bookings: Booking[];
  activeBans: Ban[];
  users?: ERPUser[];
  rooms?: Room[];
  onRefresh: () => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onOverride?: (id: string, updateData: any) => Promise<void>;
  hasPermission?: (permission: string) => boolean;
}

interface RequesterSummary {
  email: string;
  name: string;
  organization: string;
  totalBookings: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  cancelledCount: number;
  latestBookingDate: string;
  hasActiveBan: boolean;
  banReason?: string;
  banDaysRemaining?: number;
}

export function UserHistoryPage({
  bookings,
  activeBans = [],
  rooms = [],
  onRefresh,
  onApprove,
  onReject,
  onOverride,
  hasPermission
}: UserHistoryPageProps) {
  const isAllowedToApproveReject = hasPermission ? hasPermission('APPROVE_REJECT_BOOKINGS') : true;
  const isAllowedToOverride = hasPermission ? hasPermission('BOOKING_OVERRIDE') : true;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active_bans' | 'frequent' | 'pending'>('all');
  const [sortField, setSortField] = useState<'total' | 'name' | 'latest'>('total');
  const [sortAsc, setSortAsc] = useState(false);

  // Modal states
  const [inspectedUserEmail, setInspectedUserEmail] = useState<string | null>(null);
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [overridingBooking, setOverridingBooking] = useState<Booking | null>(null);

  // Group and aggregate bookings by requester email
  const requesterSummaries: RequesterSummary[] = useMemo(() => {
    const map = new Map<string, RequesterSummary>();

    bookings.forEach(b => {
      const email = (b.email || '').trim().toLowerCase();
      if (!email) return;

      const existing = map.get(email);
      const isApproved = b.status === 'APPROVED';
      const isPending = b.status.includes('PENDING');
      const isRejected = b.status.includes('REJECTED');
      const isCancelled = b.status === 'CANCELLED';

      if (!existing) {
        // Check ban
        const activeBan = activeBans.find(
          ban => ban.email && ban.email.toLowerCase() === email && ban.status === 'Active'
        );

        let daysRem: number | undefined;
        if (activeBan && activeBan.expiresAt && activeBan.expiresAt !== 'Never') {
          const exp = new Date(activeBan.expiresAt).getTime();
          const diff = Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24));
          daysRem = Math.max(0, diff);
        }

        map.set(email, {
          email,
          name: b.name || email.split('@')[0],
          organization: b.organization || 'University Member',
          totalBookings: 1,
          approvedCount: isApproved ? 1 : 0,
          pendingCount: isPending ? 1 : 0,
          rejectedCount: isRejected ? 1 : 0,
          cancelledCount: isCancelled ? 1 : 0,
          latestBookingDate: b.date || '',
          hasActiveBan: !!activeBan,
          banReason: activeBan?.reason,
          banDaysRemaining: daysRem
        });
      } else {
        existing.totalBookings += 1;
        if (isApproved) existing.approvedCount += 1;
        if (isPending) existing.pendingCount += 1;
        if (isRejected) existing.rejectedCount += 1;
        if (isCancelled) existing.cancelledCount += 1;

        if (b.name && (!existing.name || existing.name === email.split('@')[0])) {
          existing.name = b.name;
        }
        if (b.organization && existing.organization === 'University Member') {
          existing.organization = b.organization;
        }

        if (b.date && (!existing.latestBookingDate || b.date > existing.latestBookingDate)) {
          existing.latestBookingDate = b.date;
        }
      }
    });

    return Array.from(map.values());
  }, [bookings, activeBans]);

  // Overall system metrics
  const totalRequesters = requesterSummaries.length;
  const totalBannedRequesters = requesterSummaries.filter(r => r.hasActiveBan).length;
  const totalBookingsAll = bookings.length;
  const totalApproved = bookings.filter(b => b.status === 'APPROVED').length;
  const overallApprovalRate = totalBookingsAll > 0 ? Math.round((totalApproved / totalBookingsAll) * 100) : 0;

  // Filter and sort requesters
  const filteredRequesters = useMemo(() => {
    return requesterSummaries
      .filter(r => {
        // Filter tabs
        if (filterType === 'active_bans' && !r.hasActiveBan) return false;
        if (filterType === 'frequent' && r.totalBookings < 2) return false;
        if (filterType === 'pending' && r.pendingCount === 0) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.name.toLowerCase().includes(q);
          const matchEmail = r.email.toLowerCase().includes(q);
          const matchOrg = r.organization.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchOrg) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'total') {
          diff = b.totalBookings - a.totalBookings;
        } else if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'latest') {
          diff = (b.latestBookingDate || '').localeCompare(a.latestBookingDate || '');
        }
        return sortAsc ? -diff : diff;
      });
  }, [requesterSummaries, filterType, searchQuery, sortField, sortAsc]);

  const handleSort = (field: 'total' | 'name' | 'latest') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6 text-left" id="user-history-admin-page">
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary to-[#5A0F0F] rounded-2xl p-6 text-white shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-accent text-[9px] font-black uppercase tracking-widest block">Booking Intelligence</span>
          <h1 className="text-lg font-black uppercase tracking-wider">User History & Requesters Dossier</h1>
          <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
            Search, analyze, and inspect lifetime reservation records across all university societies, departments, and incubator startups.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Metrics Strip (Tabular Figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Requesters</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-gray-900 font-mono tabular-nums mt-1">{totalRequesters}</p>
          <span className="text-[11px] text-gray-400">Distinct applicant accounts</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Bookings</span>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 font-mono tabular-nums mt-1">{totalBookingsAll}</p>
          <span className="text-[11px] text-emerald-600 font-mono tabular-nums">{totalApproved} approved reservations</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Approval Rate</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-gray-900 font-mono tabular-nums mt-1">{overallApprovalRate}%</p>
          <span className="text-[11px] text-gray-400">Platform acceptance benchmark</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Banned Requesters</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 font-mono tabular-nums mt-1">{totalBannedRequesters}</p>
          <span className="text-[11px] text-rose-600">Currently restricted from booking</span>
        </div>
      </div>

      {/* Main Roster Panel */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        
        {/* Search & Filter Toolbar */}
        <div className="p-5 border-b border-gray-150 bg-gray-50/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by requester name, email, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
            />
          </div>

          {/* Segmented Filter Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All Requesters ({totalRequesters})
            </button>
            <button
              onClick={() => setFilterType('frequent')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'frequent' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Frequent Bookers (2+)
            </button>
            <button
              onClick={() => setFilterType('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'pending' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Has Pending Requests
            </button>
            <button
              onClick={() => setFilterType('active_bans')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === 'active_bans' ? 'bg-white text-rose-700 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Banned ({totalBannedRequesters})
            </button>
          </div>
        </div>

        {/* Requesters Table */}
        {filteredRequesters.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 space-y-2">
            <History className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-700">No Requesters Found</p>
            <p>No user records matched query "{searchQuery}".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                  <th className="py-3 px-6 cursor-pointer hover:text-gray-600" onClick={() => handleSort('name')}>
                    <span className="inline-flex items-center gap-1">
                      Requester <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-6">Department / Role</th>
                  <th className="py-3 px-6 cursor-pointer hover:text-gray-600" onClick={() => handleSort('total')}>
                    <span className="inline-flex items-center gap-1">
                      Total Bookings <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-6">Breakdown (Appr / Pend / Rej / Canc)</th>
                  <th className="py-3 px-6">Standing / Ban</th>
                  <th className="py-3 px-6 cursor-pointer hover:text-gray-600" onClick={() => handleSort('latest')}>
                    <span className="inline-flex items-center gap-1">
                      Latest Activity <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredRequesters.map(req => {
                  return (
                    <tr key={req.email} className="hover:bg-gray-50/60 transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <p className="font-black text-gray-900">{req.name}</p>
                        <p className="text-[11px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {req.email}
                        </p>
                      </td>

                      {/* Organization / Dept */}
                      <td className="py-4 px-6 text-gray-600">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Building className="h-3.5 w-3.5 text-gray-400" />
                          {req.organization}
                        </span>
                      </td>

                      {/* Total Bookings */}
                      <td className="py-4 px-6">
                        <span className="font-mono font-black text-primary text-sm tabular-nums">
                          {req.totalBookings}
                        </span>
                      </td>

                      {/* Status Breakdown badges */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                          <span className="text-emerald-700 font-bold" title="Approved">
                            ✓ {req.approvedCount}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-amber-700 font-bold" title="Pending">
                            ⏳ {req.pendingCount}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-rose-700 font-bold" title="Rejected">
                            ✗ {req.rejectedCount}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-500" title="Cancelled">
                            ⊘ {req.cancelledCount}
                          </span>
                        </div>
                      </td>

                      {/* Standing / Ban */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {req.hasActiveBan ? (
                          <span 
                            className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2.5 py-0.5 rounded-md inline-flex items-center gap-1"
                            title={req.banReason}
                          >
                            <ShieldAlert className="h-3 w-3 text-rose-600" />
                            BANNED {req.banDaysRemaining !== undefined ? `(${req.banDaysRemaining}d)` : ''}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Good Standing
                          </span>
                        )}
                      </td>

                      {/* Latest Date */}
                      <td className="py-4 px-6 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {req.latestBookingDate || 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectedUserEmail(req.email)}
                          className="bg-primary hover:bg-primary/95 text-white font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-wider transition-colors shadow-3xs"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>View History</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-4 border-t border-gray-150 bg-gray-50 flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>Showing {filteredRequesters.length} of {totalRequesters} requesters</span>
          <span>Click any row or 'View History' to open complete user reservation logs</span>
        </div>
      </div>

      {/* USER PROFILE DOSSIER MODAL */}
      {inspectedUserEmail && (
        <UserProfileHistoryModal
          userEmail={inspectedUserEmail}
          bookings={bookings}
          activeBans={activeBans}
          onClose={() => setInspectedUserEmail(null)}
          onViewBookingDetails={(b) => setInspectedBooking(b)}
          onInitiateReject={(b) => setRejectingBooking(b)}
          isAllowedToApproveReject={isAllowedToApproveReject}
        />
      )}

      {/* BOOKING DETAIL INSPECTION MODAL */}
      {inspectedBooking && (
        <BookingDetailModal
          booking={inspectedBooking}
          activeBans={activeBans}
          onClose={() => setInspectedBooking(null)}
          onApprove={onApprove}
          onInitiateReject={(b) => {
            setInspectedBooking(null);
            setRejectingBooking(b);
          }}
          onInitiateOverride={(b) => {
            setInspectedBooking(null);
            setOverridingBooking(b);
          }}
          onViewUserHistory={(email) => {
            setInspectedBooking(null);
            setInspectedUserEmail(email);
          }}
          isAllowedToApproveReject={isAllowedToApproveReject}
          isAllowedToOverride={isAllowedToOverride}
        />
      )}

      {/* FORCE REJECT MODAL */}
      {rejectingBooking && onReject && (
        <BookingRejectModal
          booking={rejectingBooking}
          onClose={() => setRejectingBooking(null)}
          onConfirmReject={async (id, reason) => {
            await onReject(id, reason);
            setRejectingBooking(null);
            onRefresh();
          }}
          isAllowedToReject={isAllowedToApproveReject}
          onSuccess={onRefresh}
        />
      )}

      {/* OVERRIDE MODAL */}
      {overridingBooking && onOverride && (
        <BookingOverrideModal
          editingBooking={overridingBooking}
          setEditingBooking={setOverridingBooking}
          rooms={rooms}
          isAllowedToOverride={isAllowedToOverride}
          isAllowedToReject={isAllowedToApproveReject}
          onOverride={onOverride}
          onRefresh={onRefresh}
          onInitiateReject={(b) => {
            setOverridingBooking(null);
            setRejectingBooking(b);
          }}
        />
      )}

    </div>
  );
}
