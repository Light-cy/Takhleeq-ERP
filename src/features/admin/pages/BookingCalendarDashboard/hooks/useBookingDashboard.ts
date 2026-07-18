import { useState, useEffect, useMemo } from 'react';
import { Booking } from '../../../../../types';

interface UseBookingDashboardParams {
  bookings: Booking[];
}

export function useBookingDashboard({ bookings }: UseBookingDashboardParams) {
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
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Apply filters to bookings list
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
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
  }, [bookings, filterRoom, filterStatus, filterBookingType, filterStartDate, filterEndDate, searchTerm]);

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

  return {
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
  };
}
