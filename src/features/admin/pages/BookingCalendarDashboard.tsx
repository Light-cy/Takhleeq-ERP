import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  BarChart2, 
  List, 
  RefreshCw,
  TrendingUp,
  Award,
  Users,
  ChevronRight,
  Info,
  ShieldCheck,
  Building,
  Search,
  Lock
} from 'lucide-react';
import { Booking, Room, Ban } from '../../../types';

interface BookingCalendarDashboardProps {
  bookings: Booking[];
  rooms: Room[];
  activeBans: Ban[];
  onRefresh: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onOverride: (id: string, updateData: any) => Promise<void>;
  hasPermission?: (permission: string) => boolean;
}

export function BookingCalendarDashboard({ 
  bookings, 
  rooms, 
  activeBans,
  onRefresh, 
  onApprove, 
  onReject, 
  onOverride,
  hasPermission
}: BookingCalendarDashboardProps) {
  // Check if current user is allowed to perform overrides
  const isAllowedToOverride = hasPermission ? hasPermission('BOOKING_OVERRIDE') : true;

  // Views: Register list vs. Analytics reports
  const [viewMode, setViewViewMode] = useState<'register' | 'reports'>('register');

  // Get today's local date string "YYYY-MM-DD"
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

  // Filtering states
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBookingType, setFilterBookingType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Free-text search states
  const [searchVal, setSearchVal] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce free-text search (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchVal);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Selected details or edits
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [overrideRoom, setOverrideRoom] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStartTime, setOverrideStartTime] = useState('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState('10:00');
  const [overrideForceApprove, setOverrideForceApprove] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Apply filters to bookings list
  const filteredBookings = bookings.filter(b => {
    if (filterRoom && b.room !== filterRoom) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterBookingType && b.bookingType !== filterBookingType) return false;
    if (filterStartDate && b.date < filterStartDate) return false;
    if (filterEndDate && b.date > filterEndDate) return false;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const matchId = String(b.id || '').toLowerCase().includes(lowerSearch);
      const matchName = String(b.name || '').toLowerCase().includes(lowerSearch);
      const matchTitle = String(b.eventTitle || '').toLowerCase().includes(lowerSearch);
      if (!matchId && !matchName && !matchTitle) return false;
    }

    return true;
  });

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    setProcessing(true);
    setErrorMsg(null);

    try {
      await onOverride(editingBooking.id, {
        room: overrideRoom,
        date: overrideDate,
        startTime: overrideStartTime,
        endTime: overrideEndTime,
        forceApprove: overrideForceApprove
      });
      setEditingBooking(null);
      onRefresh();
      alert('Booking schedule successfully overridden! An audit record was created and the requester was notified.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while overriding booking.');
    } finally {
      setProcessing(false);
    }
  };

  const startEditing = (booking: Booking) => {
    setEditingBooking(booking);
    setOverrideRoom(booking.room);
    setOverrideDate(booking.date);
    setOverrideStartTime(booking.startTime);
    setOverrideEndTime(booking.endTime);
    setOverrideForceApprove(false);
    setErrorMsg(null);
  };

  // Excel Export Simulator
  const handleExportData = () => {
    if (filteredBookings.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Booking ID',
      'Requester Name',
      'Email Address',
      'Phone Number',
      'Organization / Department',
      'Reserved Space / Room',
      'Booking Date',
      'Start Time',
      'End Time',
      'Duration',
      'Booking Type / Purpose',
      'Expected Attendance',
      'Approval Status',
      'Conflict Check Status'
    ];

    const toTitleCase = (str: string) => {
      if (!str) return 'N/A';
      return str
        .toLowerCase()
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const formatReadableDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    const formatReadableTime = (timeStr: string) => {
      if (!timeStr) return 'N/A';
      try {
        if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
          return timeStr;
        }
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          let hour = parseInt(parts[0], 10);
          const minute = parts[1].padEnd(2, '0');
          const ampm = hour >= 12 ? 'PM' : 'AM';
          hour = hour % 12;
          hour = hour ? hour : 12;
          return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
        }
      } catch {}
      return timeStr;
    };

    const rows = filteredBookings.map(b => {
      const organizationVal = b.organization && b.organization.trim() ? b.organization : 'None';
      const durationVal = b.duration ? `${b.duration} mins` : '0 mins';
      const typeVal = b.bookingType ? toTitleCase(b.bookingType) : 'Not Specified';
      const attendeesVal = b.expectedAttendance ? `${b.expectedAttendance} attendees` : '0 attendees';
      const statusVal = toTitleCase(b.status || 'PENDING');
      
      let conflictVal = 'Clear (No Conflict)';
      if (b.conflictStatus === 'CONFLICT DETECTED') {
        conflictVal = 'Conflict Detected';
      }

      return [
        `B-${b.id}`,
        b.name || 'N/A',
        b.email || 'N/A',
        b.phone || 'N/A',
        organizationVal,
        b.room || 'N/A',
        formatReadableDate(b.date),
        formatReadableTime(b.startTime),
        formatReadableTime(b.endTime),
        durationVal,
        typeVal,
        attendeesVal,
        statusVal,
        conflictVal
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `takhleeq_erp_bookings_snapshot_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Analytics report precalculations
  const totalCount = bookings.length;
  const approvedCount = bookings.filter(b => b.status === 'APPROVED').length;
  const pendingCount = bookings.filter(b => b.status === 'PENDING REVIEW').length;
  const rejectedCount = bookings.filter(b => b.status === 'REJECTED BY STAFF' || b.status === 'REJECTED (BAN)').length;
  const cancelledCount = bookings.filter(b => b.status === 'CANCELLED').length;

  // Active bans list
  const activeBansCount = activeBans.filter(b => b.status === 'Active').length;

  // Utilization minutes per room
  const roomUtilization = rooms.map(room => {
    const approvedBookingsForRoom = bookings.filter(b => b.room === room.name && b.status === 'APPROVED');
    const totalMinutes = approvedBookingsForRoom.reduce((sum, b) => sum + b.duration, 0);
    // Let's assume standard capacity is (operating hours: 8 hrs = 480 mins) over 5 days = 2400 mins
    const maxCapacityMinutes = 2400; 
    const percentage = Math.min(100, Math.round((totalMinutes / maxCapacityMinutes) * 100));

    return {
      roomName: room.name,
      bookingsCount: approvedBookingsForRoom.length,
      utilizationMinutes: totalMinutes,
      utilizationPercentage: percentage
    };
  });

  // Booking type counts
  const typeDistribution: { [key: string]: number } = {};
  bookings.forEach(b => {
    typeDistribution[b.bookingType] = (typeDistribution[b.bookingType] || 0) + 1;
  });

  // Peak usage periods based on start hours
  const hourlyDistribution: { [hour: string]: number } = {};
  bookings.filter(b => b.status === 'APPROVED').forEach(b => {
    const hour = b.startTime.split(':')[0];
    const label = `${hour}:00`;
    hourlyDistribution[label] = (hourlyDistribution[label] || 0) + 1;
  });

  const hoursOfOperation = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];
  Object.keys(hourlyDistribution).forEach(h => {
    if (!hoursOfOperation.includes(h)) {
      hoursOfOperation.push(h);
    }
  });
  hoursOfOperation.sort();
  const maxCount = Math.max(...hoursOfOperation.map(h => hourlyDistribution[h] || 0), 1);

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-green-100 text-green-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">APPROVED</span>;
      case 'PENDING REVIEW':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">PENDING REVIEW</span>;
      case 'PENDING VALIDATION':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">PENDING VAL</span>;
      case 'REJECTED BY STAFF':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">REJECTED</span>;
      case 'CANCELLED':
        return <span className="bg-gray-100 text-gray-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">CANCELLED</span>;
      case 'REJECTED (BAN)':
        return <span className="bg-red-200 text-red-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">REJECTED (BAN)</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">{status}</span>;
    }
  };

  const registerView = (
    <>
          {/* SEARCH FILTERS TOOLBAR */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-primary uppercase tracking-wider">
                <Filter className="h-4 w-4" /> Filter Reservations
              </div>
              {searchTerm && (
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                  Filtered by Search
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Search by Booking ID, requester name, or event title..."
                className="w-full pl-10 pr-12 py-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 text-gray-700 font-medium focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              {searchVal && (
                <button
                  type="button"
                  onClick={() => setSearchVal('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Room Space</label>
                <select
                  value={filterRoom}
                  onChange={e => setFilterRoom(e.target.value)}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 text-gray-700 font-medium cursor-pointer focus:ring-1 focus:ring-primary focus:bg-white"
                >
                  <option value="">All Rooms</option>
                  {rooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Status State</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 text-gray-700 font-medium cursor-pointer focus:ring-1 focus:ring-primary focus:bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING REVIEW">PENDING REVIEW</option>
                  <option value="REJECTED BY STAFF">REJECTED BY STAFF</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="REJECTED (BAN)">REJECTED (BAN)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Requester Type</label>
                <select
                  value={filterBookingType}
                  onChange={e => setFilterBookingType(e.target.value)}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 text-gray-700 font-medium cursor-pointer focus:ring-1 focus:ring-primary focus:bg-white"
                >
                  <option value="">All Types</option>
                  <option value="Student Society">Student Society</option>
                  <option value="Cohort Startup">Cohort Startup</option>
                  <option value="Department">Department</option>
                  <option value="Meeting / Event">Meeting / Event</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-150 rounded-xl text-xs bg-gray-50/50 text-gray-700 font-medium cursor-pointer focus:ring-1 focus:ring-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-150 rounded-xl text-xs bg-gray-50/50 text-gray-700 font-medium cursor-pointer focus:ring-1 focus:ring-primary focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
              <span className="text-[11px] text-gray-400">
                Displaying <strong>{filteredBookings.length}</strong> of <strong>{bookings.length}</strong> total reservations
              </span>
              <button
                type="button"
                onClick={handleExportData}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-3xs"
              >
                <FileSpreadsheet className="h-4 w-4" /> Export CSV Snapshot
              </button>
            </div>
          </div>

          {/* TABLE DISPLAY */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                    <th className="py-3 px-6">ID</th>
                    <th className="py-3 px-6">Event Details</th>
                    <th className="py-3 px-6">Room Location</th>
                    <th className="py-3 px-6">Schedule Slot</th>
                    <th className="py-3 px-6">Requester</th>
                    <th className="py-3 px-6">User Type</th>
                    <th className="py-3 px-6">Approved By</th>
                    <th className="py-3 px-6">Approval Date</th>
                    <th className="py-3 px-6">Conflict Status</th>
                    <th className="py-3 px-6">Ban Status</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-xs text-gray-400">
                        No reservation records match the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map(b => {
                      const isBanned = activeBans.some(ban => ban.email.toLowerCase() === b.email.toLowerCase() && ban.status === 'Active');
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/30 transition-colors text-xs text-gray-700">
                          <td className="py-4 px-6 font-mono font-black text-primary">{b.id}</td>
                          <td className="py-4 px-6">
                            <p className="font-black text-gray-900">{b.eventTitle}</p>
                            <p className="text-[10px] text-gray-400 max-w-xs truncate">{b.eventDescription}</p>
                          </td>
                          <td className="py-4 px-6 font-extrabold text-gray-800">{b.room}</td>
                          <td className="py-4 px-6">
                            <p className="font-extrabold text-gray-800 font-mono">{b.date}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{b.startTime} - {b.endTime}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-extrabold text-gray-900">{b.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{b.email}</p>
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-800">{b.bookingType}</td>
                          <td className="py-4 px-6 font-semibold text-gray-800">{b.approvedBy || '—'}</td>
                          <td className="py-4 px-6 font-mono text-gray-500">{b.approvalDate ? new Date(b.approvalDate).toLocaleDateString() : '—'}</td>
                          <td className="py-4 px-6">
                            {b.conflictStatus === 'CONFLICT DETECTED' ? (
                              <span className="bg-rose-50 text-rose-800 border border-rose-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase">CONFLICT DETECTED</span>
                            ) : (
                              <span className="bg-green-50 text-green-800 border border-green-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase">NO CONFLICT</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {isBanned ? (
                              <span className="bg-red-100 text-red-800 border border-red-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase">BANNED</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-800 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase">CLEAR</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1 items-start">
                              {getStatusBadge(b.status)}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => startEditing(b)}
                              disabled={b.status.includes('REJECTED') || b.status === 'CANCELLED' || isDateInPast(b.date, todayStr)}
                              className={`border px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 ${
                                b.status.includes('REJECTED') || b.status === 'CANCELLED' || isDateInPast(b.date, todayStr)
                                  ? 'border-gray-150 text-gray-300 bg-gray-50/50 cursor-not-allowed'
                                  : 'text-primary hover:text-white hover:bg-primary border-primary/20 hover:border-primary cursor-pointer'
                              }`}
                            >
                              Override
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
    </>
  );

  const unusedReports = (
    <div className="space-y-6">
          
          {/* Bento Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total reservations</span>
              <p className="text-2xl font-black text-gray-900">{totalCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-1">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Approved Slots</span>
              <p className="text-2xl font-black text-emerald-600">{approvedCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-1">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">Pending Reviews</span>
              <p className="text-2xl font-black text-blue-600">{pendingCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-1">
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block">Rejected / Banned</span>
              <p className="text-2xl font-black text-rose-600">{rejectedCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Banned Accounts</span>
              <p className="text-2xl font-black text-gray-900">{activeBansCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Room Utilization percentage (MOD-01B.7) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Room Space Utilization Percentage</h3>
              </div>
              <div className="space-y-4">
                {roomUtilization.map(u => (
                  <div key={u.roomName} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-gray-700">
                      <span>{u.roomName} ({u.bookingsCount} approved bookings)</span>
                      <span>{u.utilizationPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          u.utilizationPercentage > 75 ? 'bg-rose-600' : u.utilizationPercentage > 40 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${u.utilizationPercentage}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 font-mono">{u.utilizationMinutes} mins locked / 2400 mins operating capacity</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Demographics / Distributions charts */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-5">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Booking Type Distribution</h3>
              </div>
              
              <div className="space-y-3 pt-2">
                {Object.entries(typeDistribution).map(([type, count]) => {
                  const percent = Math.round((count / totalCount) * 100) || 0;
                  return (
                    <div key={type} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2">
                      <span className="font-bold text-gray-700">{type}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-gray-400 text-[10px]">{count} requests</span>
                        <span className="bg-primary/5 text-primary font-black px-2 py-0.5 rounded-md text-[10px]">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-[10px] text-gray-500 leading-relaxed flex gap-2">
                <Info className="h-4.5 w-4.5 text-gray-400 shrink-0 mt-0.5" />
                <p><strong>System Note:</strong> Booking type distributions highlight user demographics. Facility managers can adjust room purposes or booking duration ceilings based on demand spikes.</p>
              </div>
            </div>

            {/* Peak Usage Hours Chart (FR-01B-10) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-5 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Peak Usage Hours (Approved Bookings)</h3>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Count by booking start hour</span>
              </div>

              {hoursOfOperation.length === 0 || Math.max(...hoursOfOperation.map(h => hourlyDistribution[h] || 0)) === 0 ? (
                <div className="h-48 flex items-center justify-center border border-dashed border-gray-150 rounded-xl bg-gray-50/50">
                  <p className="text-xs text-gray-400">No approved bookings to map peak usage hours.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Vertical bars container */}
                  <div className="h-48 flex items-end gap-2 md:gap-4 pt-6 px-2 border-b border-gray-150">
                    {hoursOfOperation.map(hour => {
                      const count = hourlyDistribution[hour] || 0;
                      const pct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          {/* Tooltip */}
                          <div className="absolute -top-6 bg-gray-900 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-sm">
                            {count} bookings
                          </div>
                          
                          {/* Bar */}
                          <div 
                            className="w-full bg-primary hover:bg-primary/90 rounded-t-md transition-all duration-300 relative cursor-pointer"
                            style={{ height: `${Math.max(4, pct)}%` }}
                          >
                            {count > 0 && (
                              <span className="absolute -top-4 inset-x-0 text-center text-[10px] font-extrabold text-primary font-mono">
                                {count}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Labels row */}
                  <div className="flex justify-between gap-2 md:gap-4 px-2 text-[9px] font-black text-gray-450 font-mono">
                    {hoursOfOperation.map(hour => (
                      <span key={hour} className="flex-1 text-center truncate" title={hour}>
                        {hour}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Ban History by User Report */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Ban History by User Report</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">Immutable restrictions register</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                    <th className="py-2.5 px-4">User Details</th>
                    <th className="py-2.5 px-4">Ban Reason</th>
                    <th className="py-2.5 px-4">Duration</th>
                    <th className="py-2.5 px-4">Issued By & Date</th>
                    <th className="py-2.5 px-4">Expiry Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeBans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                        No active or past restriction ban records exist in the system.
                      </td>
                    </tr>
                  ) : (
                    activeBans.map(ban => {
                      return (
                        <tr key={ban.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-extrabold text-gray-900">{ban.name || 'Anonymous User'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{ban.email}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={ban.reason}>
                            {ban.reason}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-600">
                            {ban.duration}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-gray-800">{ban.bannedBy}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{new Date(ban.createdAt).toLocaleDateString()}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-600">
                            {ban.expiresAt === 'Never' ? 'Permanent' : new Date(ban.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            {ban.status === 'Active' ? (
                              <span className="bg-red-100 text-red-800 border border-red-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase">ACTIVE</span>
                            ) : ban.status === 'Lifted' ? (
                              <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase">LIFTED</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-800 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase">EXPIRED</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 max-w-xs truncate text-[10px]" title={ban.liftedReason}>
                            {ban.status === 'Lifted' ? (
                              <>
                                <p className="font-semibold text-blue-800">Lifted by {ban.liftedBy}</p>
                                <p className="italic text-gray-450">"{ban.liftedReason}"</p>
                              </>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
  );

  return (
    <div className="space-y-6 text-left" id="booking-calendar-dashboard-view">
      
      {/* Switch Navigation & Quick stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
        <div>
          <span className="text-accent text-[9px] font-black uppercase tracking-widest block">Administration Registry</span>
          <h1 className="text-base font-black text-gray-900 uppercase tracking-wider mt-0.5">Space Reservation Register & Schedule</h1>
          <p className="text-[11px] text-gray-500">Live operational timetables, administrative overrides, and CSV snapshots.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            className="p-2.5 text-gray-400 hover:text-primary hover:bg-gray-50 border border-gray-100 rounded-xl cursor-pointer"
            title="Reload registry state"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {registerView}

      {/* SCHEDULE OVERRIDE MODAL (MOD-01B.6) */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="schedule-override-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Schedule Override: {editingBooking.id}</span>
              <button onClick={() => setEditingBooking(null)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="p-6 space-y-5 text-left overflow-y-auto">
              
              {!isAllowedToOverride && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-rose-900 uppercase tracking-wide">Privilege Restriction</p>
                    <p className="text-[11px] mt-1 text-rose-800 leading-normal">
                      Your account lacks the <strong>'BOOKING_OVERRIDE'</strong> permission. You can review the details, but you are not authorized to save or apply overrides on this system.
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="p-3.5 bg-[#F8F5F0] rounded-xl text-xs space-y-1 border border-gray-200">
                <p><strong>Requester:</strong> {editingBooking.name} ({editingBooking.email})</p>
                <p><strong>Event Title:</strong> {editingBooking.eventTitle}</p>
                <p><strong>Current:</strong> {editingBooking.room} @ {editingBooking.date} ({editingBooking.startTime} - {editingBooking.endTime})</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Override Room Space</label>
                  <select
                    value={overrideRoom}
                    onChange={e => setOverrideRoom(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 font-medium"
                  >
                    {rooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Override Date</label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={e => setOverrideDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Override Start</label>
                    <input
                      type="time"
                      value={overrideStartTime}
                      onChange={e => setOverrideStartTime(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Override End</label>
                    <input
                      type="time"
                      value={overrideEndTime}
                      onChange={e => setOverrideEndTime(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 font-medium"
                    />
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="force-approve"
                    checked={overrideForceApprove}
                    onChange={e => setOverrideForceApprove(e.target.checked)}
                    className="h-4 w-4 mt-0.5 accent-primary shrink-0 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="force-approve" className="block text-xs font-bold text-rose-900 cursor-pointer">Bypass Conflict Block (Force Approve)</label>
                    <p className="text-[10px] text-rose-700 mt-1 leading-relaxed">
                      Enable this checkbox to explicitly bypass double-booking checks and force approval. This action generates a major policy breach override log on the immutable system log.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !isAllowedToOverride}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  {processing ? 'Processing Override...' : 'Commit Override'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
