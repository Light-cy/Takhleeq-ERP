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
  Building
} from 'lucide-react';
import { Booking, Room, Ban } from '../types';

interface BookingCalendarDashboardProps {
  bookings: Booking[];
  rooms: Room[];
  activeBans: Ban[];
  onRefresh: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onOverride: (id: string, updateData: any) => Promise<void>;
}

export function BookingCalendarDashboard({ 
  bookings, 
  rooms, 
  activeBans,
  onRefresh, 
  onApprove, 
  onReject, 
  onOverride 
}: BookingCalendarDashboardProps) {
  // Views: Register list vs. Analytics reports
  const [viewMode, setViewViewMode] = useState<'register' | 'reports'>('register');

  // Filtering states
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBookingType, setFilterBookingType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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

    // Convert to CSV string
    const headers = 'Booking ID,Requester Name,Email,Phone,Organization,Requested Space,Date,Start Time,End Time,Duration (Mins),Booking Type,Expected Attendance,Status,Conflict Status\n';
    const rows = filteredBookings.map(b => 
      `"${b.id}","${b.name}","${b.email}","${b.phone}","${b.organization || ''}","${b.room}","${b.date}","${b.startTime}","${b.endTime}",${b.duration},"${b.bookingType}",${b.expectedAttendance},"${b.status}","${b.conflictStatus}"`
    ).join('\n');

    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
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

  return (
    <div className="space-y-6 text-left" id="booking-calendar-dashboard-view">
      
      {/* Switch Navigation & Quick stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
        <div>
          <span className="text-accent text-[9px] font-black uppercase tracking-widest block">Administration Registry</span>
          <h1 className="text-base font-black text-gray-900 uppercase tracking-wider mt-0.5">Space Reservation Register & Schedule</h1>
          <p className="text-[11px] text-gray-500">Live operational timetables, administrative overrides, metrics, and CSV snapshots.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewViewMode('register')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'register' 
                ? 'bg-primary text-white shadow-sm' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <List className="h-4 w-4" /> Timetable Register
          </button>
          <button
            onClick={() => setViewViewMode('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'reports' 
                ? 'bg-primary text-white shadow-sm' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <BarChart2 className="h-4 w-4" /> Operations Reports
          </button>
          <button 
            onClick={onRefresh}
            className="p-2.5 text-gray-400 hover:text-primary hover:bg-gray-50 border border-gray-100 rounded-xl cursor-pointer"
            title="Reload registry state"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'register' ? (
        <>
          {/* SEARCH FILTERS TOOLBAR */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-primary uppercase tracking-wider">
              <Filter className="h-4 w-4" /> Filter Reservations
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
                              className="text-primary hover:text-white hover:bg-primary border border-primary/20 hover:border-primary px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
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
      ) : (
        /* ANALYTICS & STATS PANEL */
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

          </div>
        </div>
      )}

      {/* SCHEDULE OVERRIDE MODAL (MOD-01B.6) */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="schedule-override-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Schedule Override: {editingBooking.id}</span>
              <button onClick={() => setEditingBooking(null)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="p-6 space-y-5 text-left overflow-y-auto">
              
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
                  disabled={processing}
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
