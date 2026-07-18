import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Booking, Room, Ban } from '../../../../types';
import { BookingFilterToolbar } from '../../components/BookingFilterToolbar';
import { BookingOverrideModal } from '../../components/BookingOverrideModal';
import { useBookingDashboard } from './hooks/useBookingDashboard';

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
  onOverride,
  hasPermission
}: BookingCalendarDashboardProps) {
  // Check if current user is allowed to perform overrides
  const isAllowedToOverride = hasPermission ? hasPermission('BOOKING_OVERRIDE') : true;

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

  const {
    filterRoom,
    setFilterRoom,
    filterStatus,
    setFilterStatus,
    filterBookingType,
    setFilterBookingType,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    searchVal,
    setSearchVal,
    searchTerm,
    editingBooking,
    setEditingBooking,
    filteredBookings,
    handleExportData
  } = useBookingDashboard({ bookings });

  const startEditing = (booking: Booking) => {
    setEditingBooking(booking);
  };

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

      <BookingFilterToolbar 
        rooms={rooms}
        bookings={bookings}
        filteredBookings={filteredBookings}
        filterRoom={filterRoom}
        setFilterRoom={setFilterRoom}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterBookingType={filterBookingType}
        setFilterBookingType={setFilterBookingType}
        filterStartDate={filterStartDate}
        setFilterStartDate={setFilterStartDate}
        filterEndDate={filterEndDate}
        setFilterEndDate={setFilterEndDate}
        searchVal={searchVal}
        setSearchVal={setSearchVal}
        searchTerm={searchTerm}
        handleExportData={handleExportData}
      />

      {/* TABLE DISPLAY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-155 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50 font-sans">
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
                      <td className="py-4 px-6 font-mono font-black text-primary whitespace-nowrap">{b.id}</td>
                      <td className="py-4 px-6">
                        <p className="font-black text-gray-900">{b.eventTitle}</p>
                        <p className="text-[10px] text-gray-400 max-w-xs truncate">{b.eventDescription}</p>
                      </td>
                      <td className="py-4 px-6 font-extrabold text-gray-800 whitespace-nowrap">{b.room}</td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <p className="font-extrabold text-gray-800 font-mono">{b.date}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{b.startTime} - {b.endTime}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-extrabold text-gray-900 whitespace-nowrap">{b.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono whitespace-nowrap">{b.email}</p>
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-800 whitespace-nowrap">{b.bookingType}</td>
                      <td className="py-4 px-6 font-semibold text-gray-800 whitespace-nowrap">{b.approvedBy || '—'}</td>
                      <td className="py-4 px-6 font-mono text-gray-500 whitespace-nowrap">{b.approvalDate ? new Date(b.approvalDate).toLocaleDateString() : '—'}</td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {b.conflictStatus === 'CONFLICT DETECTED' ? (
                          <span className="bg-rose-50 text-rose-800 border border-rose-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">CONFLICT DETECTED</span>
                        ) : (
                          <span className="bg-green-50 text-green-800 border border-green-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">NO CONFLICT</span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {isBanned ? (
                          <span className="bg-red-100 text-red-800 border border-red-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">BANNED</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">CLEAR</span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start whitespace-nowrap">
                          {getStatusBadge(b.status)}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEditing(b)}
                          disabled={b.status.includes('REJECTED') || b.status === 'CANCELLED' || isDateInPast(b.date, todayStr)}
                          className={`border px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
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

      {/* SCHEDULE OVERRIDE MODAL */}
      {editingBooking && (
        <BookingOverrideModal 
          editingBooking={editingBooking}
          setEditingBooking={setEditingBooking}
          rooms={rooms}
          isAllowedToOverride={isAllowedToOverride}
          onOverride={onOverride}
          onRefresh={onRefresh}
        />
      )}

    </div>
  );
}
