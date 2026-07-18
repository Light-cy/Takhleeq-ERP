import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Database, 
  FileSpreadsheet, 
  Eye, 
  X, 
  Lock, 
  BarChart2, 
  PieChart, 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Booking, Room, Ban, AuditRecord } from '../../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatAuditValue, renderAuditValue } from '../utils/auditFormatter';

interface AuditAnalyticsDashboardProps {
  auditLogs: AuditRecord[];
  bookings?: Booking[];
  rooms?: Room[];
  activeBans?: Ban[];
  hasDashboardView: boolean;
  hasExportView: boolean;
  onRefresh: () => void;
  setSelectedLog: (log: AuditRecord | null) => void;
}

export function AuditAnalyticsDashboard({
  auditLogs,
  bookings,
  rooms,
  activeBans,
  hasDashboardView,
  hasExportView,
  onRefresh,
  setSelectedLog
}: AuditAnalyticsDashboardProps) {
  const bookingsList = bookings || [];
  const roomsList = rooms || [];
  const bansList = activeBans || [];

  const [selectedReport, setSelectedReport] = useState<string>('analytics');

  // 1. Booking Report states
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingRoom, setBookingRoom] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [bookingStartDate, setBookingStartDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [bookingSortField, setBookingSortField] = useState<'date' | 'attendance' | 'duration'>('date');
  const [bookingSortOrder, setBookingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bookingPage, setBookingPage] = useState(1);

  // 2. Room Utilization Report states
  const [utilRoomSearch, setUtilRoomSearch] = useState('');
  const [utilStartDate, setUtilStartDate] = useState('');
  const [utilEndDate, setUtilEndDate] = useState('');
  const [utilSortField, setUtilSortField] = useState<'utilization' | 'count' | 'capacity'>('utilization');
  const [utilSortOrder, setUtilSortOrder] = useState<'asc' | 'desc'>('desc');
  const [utilPage, setUtilPage] = useState(1);

  // 3. Peak Usage Report states
  const [peakRoomFilter, setPeakRoomFilter] = useState('');
  const [peakStartDate, setPeakStartDate] = useState('');
  const [peakEndDate, setPeakEndDate] = useState('');
  const [peakSortField, setPeakSortField] = useState<'bookings' | 'attendance'>('bookings');
  const [peakSortOrder, setPeakSortOrder] = useState<'asc' | 'desc'>('desc');
  const [peakPage, setPeakPage] = useState(1);

  // 4. Booking Trends Report states
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [trendStartDate, setTrendStartDate] = useState('');
  const [trendEndDate, setTrendEndDate] = useState('');
  const [trendSortField, setTrendSortField] = useState<'period' | 'volume'>('period');
  const [trendSortOrder, setTrendSortOrder] = useState<'asc' | 'desc'>('desc');
  const [trendPage, setTrendPage] = useState(1);

  // 5. Ban Reports states
  const [banSearch, setBanSearch] = useState('');
  const [banStatusFilter, setBanStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Lifted'>('All');
  const [banSortOrder, setBanSortOrder] = useState<'asc' | 'desc'>('desc');
  const [banPage, setBanPage] = useState(1);

  // 6. Administrative Audit Logs states (integrated list tab)
  const [searchQuery, setSearchQuery] = useState('');

  // Precalculations for Top KPI Cards (key system statistics)
  const totalBookingsCount = bookingsList.length;
  const approvedBookingsCount = bookingsList.filter(b => b.status === 'APPROVED').length;
  const pendingBookingsCount = bookingsList.filter(b => b.status === 'PENDING REVIEW' || b.status === 'PENDING VALIDATION').length;
  const rejectedBookingsCount = bookingsList.filter(b => b.status.includes('REJECTED')).length;
  const cancelledBookingsCount = bookingsList.filter(b => b.status === 'CANCELLED').length;
  const activeBansCount = bansList.filter(ban => ban.status === 'Active').length;
  const totalRoomsCount = roomsList.length;

  // Average Room Utilization Calculation
  const computedRoomUtils = roomsList.map(room => {
    const roomBookings = bookingsList.filter(b => b.room === room.name && b.status === 'APPROVED');
    const totalMinutes = roomBookings.reduce((sum, b) => sum + b.duration, 0);
    const maxCapacityMinutes = 2400; // Operating hours limit (8 hours * 5 days = 2400 mins)
    return Math.min(100, Math.round((totalMinutes / maxCapacityMinutes) * 100));
  });
  const avgRoomUtilization = computedRoomUtils.length > 0
    ? Math.round(computedRoomUtils.reduce((s, v) => s + v, 0) / computedRoomUtils.length)
    : 0;

  // Filter logs list for raw log reporting tab
  const filteredLogs = auditLogs.filter(log => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchAction = log.action.toLowerCase().includes(query);
      const matchUser = log.user.toLowerCase().includes(query);
      const matchPrevious = log.previousValue?.toLowerCase().includes(query) || false;
      const matchNew = log.newValue?.toLowerCase().includes(query) || false;
      
      if (!matchAction && !matchUser && !matchPrevious && !matchNew) return false;
    }
    return true;
  });

  // Export Audit CSV File
  const handleExportCSV = () => {
    try {
      const headers = ['Date & Time', 'System Event Action', 'Authorizer User', 'Previous State / Value', 'New State / Action Details'];
      
      const formatTimestamp = (ts: string) => {
        try {
          const d = new Date(ts);
          if (isNaN(d.getTime())) return ts;
          const pad = (num: number) => String(num).padStart(2, '0');
          const year = d.getFullYear();
          const month = pad(d.getMonth() + 1);
          const day = pad(d.getDate());
          let hours = d.getHours();
          const minutes = pad(d.getMinutes());
          const seconds = pad(d.getSeconds());
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          return `${year}-${month}-${day} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
        } catch {
          return ts;
        }
      };

      const rows = filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.action,
        log.user,
        formatAuditValue(log.previousValue, log.newValue),
        formatAuditValue(log.newValue, log.previousValue)
      ]);
      
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
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `takhleeq_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  // Export Audit PDF File
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setProperties({
        title: 'Takhleeq ERP - Compliance Audit Report',
        subject: 'Immutable Audit Ledger Logs',
        author: 'Takhleeq ERP Administration',
        creator: 'Takhleeq ERP Securitized Engine'
      });
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('SECURED COMPLIANCE AUDIT REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 25);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Audit Ledger Compliance Parameters', 10, 48);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Total Query Matches: ${filteredLogs.length} entries`, 10, 54);
      doc.text('Action Filter Applied: All Event Types', 10, 59);
      doc.text(`Search Keyword filter: ${searchQuery ? `"${searchQuery}"` : 'None'}`, 10, 64);
      
      const tableHead = [['Timestamp (UTC)', 'System Event Action', 'Authorizer User', 'Previous Value', 'New Value / Action']];
      const tableBody = filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.user,
        formatAuditValue(log.previousValue, log.newValue),
        formatAuditValue(log.newValue, log.previousValue)
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 38 },
          2: { cellWidth: 32 },
          3: { cellWidth: 46 },
          4: { cellWidth: 46 }
        },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page ${data.pageNumber} of ${pageCount} | SHA-256 Block-Secured System Audit Trail`, 10, 285);
        }
      });
      doc.save(`takhleeq_audit_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const exportBookingsCSV = (dataToExport: Booking[]) => {
    try {
      const headers = ['Booking ID', 'Requester Name', 'Email', 'Phone', 'Room', 'Date', 'Start Time', 'End Time', 'Duration (min)', 'Event Title', 'Purpose / Type', 'Expected Attendance', 'Status'];
      const rows = dataToExport.map(b => [
        b.id,
        b.name,
        b.email,
        b.phone,
        b.room,
        b.date,
        b.startTime,
        b.endTime,
        b.duration,
        b.eventTitle,
        b.bookingType,
        b.expectedAttendance,
        b.status
      ]);
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
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `takhleeq_bookings_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const exportBookingsPDF = (dataToExport: Booking[]) => {
    try {
      const doc = new jsPDF();
      doc.setProperties({ title: 'Takhleeq ERP - Bookings Report' });
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('REPORTS & ANALYTICS - BOOKINGS REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 25);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Filter Criteria & Scope Parameters', 10, 48);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Total Records: ${dataToExport.length} entries`, 10, 54);
      doc.text(`Scope Date Range: ${bookingStartDate || 'Any'} to ${bookingEndDate || 'Any'}`, 10, 59);
      doc.text(`Selected Room: ${bookingRoom || 'All Rooms'} | Status: ${bookingStatus || 'All Statuses'}`, 10, 64);

      const tableHead = [['ID', 'Requester', 'Room', 'Date & Slot', 'Type', 'Attd', 'Status']];
      const tableBody = dataToExport.map(b => [
        b.id,
        `${b.name}\n${b.email}`,
        b.room,
        `${b.date}\n${b.startTime} - ${b.endTime} (${b.duration}m)`,
        b.bookingType,
        b.expectedAttendance,
        b.status
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25 },
          5: { cellWidth: 15 },
          6: { cellWidth: 20 }
        }
      });
      doc.save(`takhleeq_bookings_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const exportUtilizationPDF = (dataToExport: any[]) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('REPORTS & ANALYTICS - ROOM UTILIZATION REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 25);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Room Space Occupancy and Utilization Rates', 10, 48);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Active Rooms Scanned: ${dataToExport.length} physical spaces`, 10, 54);
      doc.text(`Time Filter Scope: ${utilStartDate || 'Any'} to ${utilEndDate || 'Any'}`, 10, 59);

      const tableHead = [['Room Name', 'Capacity', 'Operating Hours', 'Bookings Count', 'Approved Count', 'Minutes Booked', 'Avg Attd', 'Utilization Rate']];
      const tableBody = dataToExport.map(u => [
        u.roomName,
        u.capacity,
        u.operatingHours,
        u.bookingsCount,
        u.approvedCount,
        `${u.utilizationMinutes} min`,
        u.avgAttendance,
        `${u.utilizationPercentage}%`
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] }
      });
      doc.save(`takhleeq_room_utilization_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const exportPeakPDF = (dataToExport: any[]) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('REPORTS & ANALYTICS - PEAK USAGE HOUR REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 25);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Time-Slot Overlap and Peak Hour Demands', 10, 48);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Operating Window: 09:00 AM - 05:00 PM (Standard Hours)`, 10, 54);
      doc.text(`Selected Room filter: ${peakRoomFilter || 'All Rooms'} | Period: ${peakStartDate || 'Any'} to ${peakEndDate || 'Any'}`, 10, 59);

      const tableHead = [['Hourly Time Slot', 'Total Bookings', 'Approved Count', 'Busiest Room Space', 'Avg Attendance', 'Relative System Load']];
      const tableBody = dataToExport.map(p => [
        p.hourLabel,
        p.totalCount,
        p.approvedCount,
        p.busiestRoom,
        p.avgAttendance,
        p.loadStatus
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [55, 65, 81] }
      });
      doc.save(`takhleeq_peak_usage_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const exportTrendsPDF = (dataToExport: any[]) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('REPORTS & ANALYTICS - BOOKING TRENDS ACTIVITY REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 25);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Aggregated Booking Volumes and Metrics', 10, 48);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Aggregation Scope: ${trendPeriod.toUpperCase()} INTERVALS`, 10, 54);
      doc.text(`Period Range: ${trendStartDate || 'Any'} to ${trendEndDate || 'Any'}`, 10, 59);

      const tableHead = [['Time Period', 'Submitted Bookings', 'Approved Bookings', 'Rejected/Cancelled', 'Approval Rate', 'Expected Attendees']];
      const tableBody = dataToExport.map(t => [
        t.period,
        t.submittedCount,
        t.approvedCount,
        t.cancelledCount,
        `${t.approvalRate}%`,
        t.totalAttendees
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [55, 65, 81] }
      });
      doc.save(`takhleeq_booking_trends_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const exportOperationalAnalyticsPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setProperties({
        title: 'Takhleeq ERP - Operational Analytics Report',
        subject: 'Operational Analytics Overview',
        author: 'Takhleeq ERP Administration',
        creator: 'Takhleeq ERP Securitized Engine'
      });

      // Header Brand bar
      doc.setFillColor(17, 24, 39); // Deep space slate grey (#111827)
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('TAKHLEEQ ERP', 10, 16);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('SECURED OPERATIONAL ANALYTICS REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 25);

      // Section: KPI Parameters
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('System-Wide Key Performance Indicators (KPIs)', 10, 48);
      
      // Beautiful KPI table
      const kpiHead = [['Metric Indicator', 'Value', 'Metric Indicator', 'Value']];
      const kpiBody = [
        ['Total Bookings', `${totalBookingsCount}`, 'Approved Bookings', `${approvedBookingsCount}`],
        ['Pending Bookings', `${pendingBookingsCount}`, 'Rejected Bookings', `${rejectedBookingsCount}`],
        ['Cancelled Bookings', `${cancelledBookingsCount}`, 'Active Security Bans', `${activeBansCount}`],
        ['Total Room Spaces', `${totalRoomsCount}`, 'Avg Room Utilization', `${avgRoomUtilization}%`],
        ['Avg Approved Duration', `${bookingsList.filter(b => b.status === 'APPROVED').length > 0 ? Math.round(bookingsList.filter(b => b.status === 'APPROVED').reduce((sum, b) => sum + b.duration, 0) / bookingsList.filter(b => b.status === 'APPROVED').length) : 0} min`, 'Cancellation Rate', `${Math.max(bookingsList.length, 1) ? Math.round((bookingsList.filter(b => b.status === 'CANCELLED').length / Math.max(bookingsList.length, 1)) * 100) : 0}%`]
      ];

      autoTable(doc, {
        startY: 54,
        margin: { left: 10, right: 10 },
        head: kpiHead,
        body: kpiBody,
        theme: 'grid',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 45 },
          2: { cellWidth: 50, fontStyle: 'bold' },
          3: { cellWidth: 45 }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 12;

      // Section: Room Space Utilization Popularity
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Space Utilization Popularity', 10, currentY);

      const roomHead = [['Room Name', 'Max Capacity', 'Operating Hours', 'Approved Reservations']];
      const roomBody = roomsList.map(room => {
        const approvedCount = bookingsList.filter(b => b.room === room.name && b.status === 'APPROVED').length;
        return [
          room.name,
          `${room.capacity} persons`,
          room.operatingHours,
          `${approvedCount} Approved`
        ];
      });

      autoTable(doc, {
        startY: currentY + 4,
        margin: { left: 10, right: 10 },
        head: roomHead,
        body: roomBody,
        theme: 'striped',
        headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;

      // Section: Booking Purpose Split
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Booking Purpose Split', 10, currentY);

      const purposeStats: { [type: string]: number } = {};
      bookingsList.forEach(b => {
        const type = b.bookingType || 'Meeting';
        purposeStats[type] = (purposeStats[type] || 0) + 1;
      });
      const purposeArray = Object.entries(purposeStats).map(([type, count]) => ({ type, count }));
      const totalOutcome = Math.max(bookingsList.length, 1);

      const purposeHead = [['Purpose Type / Tag', 'Reservation Count', 'Percentage of Total']];
      const purposeBody = purposeArray.map(item => [
        item.type,
        `${item.count} bookings`,
        `${Math.round((item.count / totalOutcome) * 100)}%`
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        margin: { left: 10, right: 10 },
        head: purposeHead,
        body: purposeBody,
        theme: 'striped',
        headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;

      // Section: Top Booking Requesters
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Booking Requesters', 10, currentY);

      const userCounts: { [email: string]: { name: string; count: number } } = {};
      bookingsList.forEach(b => {
        userCounts[b.email] = {
          name: b.name,
          count: (userCounts[b.email]?.count || 0) + 1
        };
      });
      const topRequesters = Object.entries(userCounts)
        .map(([email, info]) => ({ email, name: info.name, count: info.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const requestersHead = [['Requester Name', 'Email Address', 'Total Reservations Requested']];
      const requestersBody = topRequesters.map(req => [
        req.name,
        req.email,
        `${req.count} bookings`
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        margin: { left: 10, right: 10 },
        head: requestersHead,
        body: requestersBody,
        theme: 'striped',
        headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page ${data.pageNumber} of ${pageCount} | Takhleeq Securitized Operational Analytics Ledger`, 10, 285);
        }
      });

      doc.save(`takhleeq_operational_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to export Operational Analytics PDF:', error);
    }
  };

  const exportBansPDF = (dataToExport: Ban[]) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('REPORTS & ANALYTICS - SECURITY ENFORCEMENT BANS REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 25);

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Security Enforcement, Bans, and Complete Ban History', 10, 48);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Total Ban Records: ${dataToExport.length} entries`, 10, 54);
      doc.text(`Status Filter Scope: ${banStatusFilter} accounts`, 10, 59);

      const tableHead = [['ID', 'Banned User Details', 'Duration', 'Issued Date', 'Expires Date', 'Enforcing Admin', 'Ban Status', 'Action Reason Details']];
      const tableBody = dataToExport.map(b => [
        b.id,
        `${b.name}\n${b.email}`,
        b.duration,
        new Date(b.createdAt).toLocaleDateString(),
        b.expiresAt === 'Never' ? 'Permanent' : new Date(b.expiresAt).toLocaleDateString(),
        b.bannedBy,
        b.status,
        b.status === 'Lifted' ? `Lifted By: ${b.liftedBy}\nReason: ${b.liftedReason}` : b.reason
      ]);

      autoTable(doc, {
        startY: 70,
        margin: { left: 10, right: 10 },
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 35 },
          2: { cellWidth: 15 },
          3: { cellWidth: 18 },
          4: { cellWidth: 18 },
          5: { cellWidth: 22 },
          6: { cellWidth: 15 },
          7: { cellWidth: 55 }
        }
      });
      doc.save(`takhleeq_bans_security_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  if (!hasDashboardView) {
    return (
      <div className="border border-dashed py-16 text-center text-xs text-rose-700 bg-rose-50/50 border-rose-100 rounded-3xl p-6 space-y-2">
        <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto" />
        <p className="font-extrabold uppercase tracking-wide">Privilege Blocked: Access Denied</p>
        <p className="text-gray-500 max-w-md mx-auto">
          Only user accounts holding the <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-mono font-bold">VIEW_ANALYTICS_DASHBOARD</code> permission node possess clearance to access the aggregated statistics panels.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* PERSISTENT KPI SYSTEM STATISTICS ROW */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Executive Summary Dashboard</span>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mt-0.5">System-Wide Key Statistics</h3>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">Live Metrics</span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Total Bookings */}
          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Bookings</span>
              <p className="text-lg font-black font-mono text-gray-900">{totalBookingsCount}</p>
            </div>
            <Database className="h-5 w-5 text-gray-400" />
          </div>

          {/* Stat 2: Approved Bookings */}
          <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Approved Bookings</span>
              <p className="text-lg font-black font-mono text-emerald-600">{approvedBookingsCount}</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          {/* Stat 3: Pending Bookings */}
          <div className="bg-blue-50/20 p-4 rounded-xl border border-blue-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">Pending Bookings</span>
              <p className="text-lg font-black font-mono text-blue-600">{pendingBookingsCount}</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
          </div>

          {/* Stat 4: Rejected Bookings */}
          <div className="bg-rose-50/20 p-4 rounded-xl border border-rose-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block">Rejected Bookings</span>
              <p className="text-lg font-black font-mono text-rose-655 font-bold text-rose-600">{rejectedBookingsCount}</p>
            </div>
            <X className="h-4 w-4 text-rose-400" />
          </div>

          {/* Stat 5: Cancelled Bookings */}
          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Cancelled Bookings</span>
              <p className="text-lg font-black font-mono text-gray-700">{cancelledBookingsCount}</p>
            </div>
            <X className="h-4 w-4 text-gray-300" />
          </div>

          {/* Stat 6: Active Bans */}
          <div className="bg-rose-50/10 p-4 rounded-xl border border-rose-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest block">Active Security Bans</span>
              <p className="text-lg font-black font-mono text-rose-700">{activeBansCount}</p>
            </div>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>

          {/* Stat 7: Total Rooms */}
          <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Total Room Spaces</span>
              <p className="text-lg font-black font-mono text-indigo-600">{totalRoomsCount}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </div>

          {/* Stat 8: Room Utilization Rate */}
          <div className="bg-violet-50/20 p-4 rounded-xl border border-violet-100/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-violet-600 uppercase tracking-widest block">Room Utilization Rate</span>
              <p className="text-lg font-black font-mono text-violet-600">{avgRoomUtilization}%</p>
            </div>
            <Clock className="h-4 w-4 text-violet-400" />
          </div>
        </div>
      </div>

      {/* REPORT SECTIONS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="space-y-1.5 bg-white p-4.5 rounded-2xl border border-gray-100 shadow-3xs lg:col-span-1">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-3 pb-2.5 border-b border-gray-100 mb-2">Reports Registry Tabs</span>
          
          {[
            { id: 'analytics', name: 'Operational Analytics', desc: 'KPI Dashboard & Charts', icon: BarChart2 },
            { id: 'bookings', name: 'Booking Report', desc: 'Custom Filter & Export Table', icon: FileText },
            { id: 'utilization', name: 'Room Utilization', desc: 'Monitor Occupancy Rates', icon: TrendingUp },
            { id: 'peak', name: 'Peak Usage', desc: 'Analyze Busiest Hours', icon: Clock },
            { id: 'trends', name: 'Booking Trends', desc: 'Aggregated activity trends', icon: PieChart },
            { id: 'bans', name: 'Ban Reports', desc: 'Accounts Enforcement history', icon: ShieldAlert },
            { id: 'audit_report', name: 'System Audit Logs', desc: 'Administrative operations track', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = selectedReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedReport(tab.id);
                }}
                className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-primary text-white border border-primary shadow-sm' 
                    : 'hover:bg-gray-50 border border-transparent text-gray-500'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-[10.5px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-gray-800'}`}>{tab.name}</p>
                  <p className={`text-[9px] font-medium mt-0.5 leading-tight ${isActive ? 'text-indigo-100' : 'text-gray-400'}`}>{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content Pane */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: OPERATIONAL ANALYTICS DASHBOARD */}
          {selectedReport === 'analytics' && (() => {
            // Booking outcomes calculation
            const approvedOutcome = bookingsList.filter(b => b.status === 'APPROVED').length;
            const pendingOutcome = bookingsList.filter(b => b.status === 'PENDING REVIEW' || b.status === 'PENDING VALIDATION').length;
            const rejectedOutcome = bookingsList.filter(b => b.status.includes('REJECTED')).length;
            const cancelledOutcome = bookingsList.filter(b => b.status === 'CANCELLED').length;
            const totalOutcome = Math.max(bookingsList.length, 1);

            // Purpose breakdown calculation
            const purposeStats: { [type: string]: number } = {};
            bookingsList.forEach(b => {
              const type = b.bookingType || 'Meeting';
              purposeStats[type] = (purposeStats[type] || 0) + 1;
            });
            const purposeArray = Object.entries(purposeStats).map(([type, count]) => ({ type, count }));

            // Top 5 Booking Requesters
            const userCounts: { [email: string]: { name: string; count: number } } = {};
            bookingsList.forEach(b => {
              userCounts[b.email] = {
                name: b.name,
                count: (userCounts[b.email]?.count || 0) + 1
              };
            });
            const topRequesters = Object.entries(userCounts)
              .map(([email, info]) => ({ email, name: info.name, count: info.count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);

            // Additional metric insights
            const approvedWithDuration = bookingsList.filter(b => b.status === 'APPROVED');
            const avgApprovedDuration = approvedWithDuration.length > 0
              ? Math.round(approvedWithDuration.reduce((sum, b) => sum + b.duration, 0) / approvedWithDuration.length)
              : 0;
            const cancellationRate = Math.round((cancelledOutcome / totalOutcome) * 100);

            return (
              <div className="space-y-6 animate-fade-in">
                
                {/* Summary Header */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Operational Analytics Overview</h4>
                    <p className="text-[10.5px] text-gray-500 mt-1">High-level insights, booking purposes, outcome rates, and system efficiency.</p>
                  </div>
                  <button
                    onClick={exportOperationalAnalyticsPDF}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" /> Export PDF Report
                  </button>
                </div>

                {/* Top Graphs Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Space Utilization popularities */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-900">Space Utilization popularity</h5>
                      <p className="text-[10px] text-gray-400">Total approved reservations per physical room space</p>
                    </div>
                    <div className="space-y-3 pt-1">
                      {roomsList.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-6 text-center">No physical spaces registered.</p>
                      ) : (
                        roomsList.slice(0, 5).map(room => {
                          const approvedCount = bookingsList.filter(b => b.room === room.name && b.status === 'APPROVED').length;
                          const maxApproved = Math.max(...roomsList.map(r => bookingsList.filter(b => b.room === r.name && b.status === 'APPROVED').length), 1);
                          const fillPercent = Math.round((approvedCount / maxApproved) * 100);
                          return (
                            <div key={room.id} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-gray-700">
                                <span>{room.name}</span>
                                <span className="font-mono text-gray-500">{approvedCount} Approved</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${fillPercent}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Outcomes breakdown */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-900">Bookings Outcomes & Statuses</h5>
                      <p className="text-[10px] text-gray-400">Relative outcome distributions for requested reservations</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-center pt-2">
                      <div className="bg-emerald-50/40 border border-emerald-100/30 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block">Approved</span>
                        <span className="text-lg font-black font-mono text-emerald-800 mt-1 block">{approvedOutcome}</span>
                        <span className="text-[8px] text-emerald-600 block mt-0.5 font-mono">{Math.round((approvedOutcome / totalOutcome) * 100)}% of total</span>
                      </div>
                      <div className="bg-blue-50/40 border border-blue-100/30 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest block">Pending</span>
                        <span className="text-lg font-black font-mono text-blue-800 mt-1 block">{pendingOutcome}</span>
                        <span className="text-[8px] text-blue-600 block mt-0.5 font-mono">{Math.round((pendingOutcome / totalOutcome) * 100)}% of total</span>
                      </div>
                      <div className="bg-rose-50/40 border border-rose-100/30 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest block">Rejected</span>
                        <span className="text-lg font-black font-mono text-rose-800 mt-1 block">{rejectedOutcome}</span>
                        <span className="text-[8px] text-rose-600 block mt-0.5 font-mono">{Math.round((rejectedOutcome / totalOutcome) * 100)}% of total</span>
                      </div>
                      <div className="bg-gray-50/40 border border-gray-150 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Cancelled</span>
                        <span className="text-lg font-black font-mono text-gray-750 mt-1 block">{cancelledOutcome}</span>
                        <span className="text-[8px] text-gray-400 block mt-0.5 font-mono">{Math.round((cancelledOutcome / totalOutcome) * 100)}% of total</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Lower row: Purpose and requesters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Incubator reservation types */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4 md:col-span-1">
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-900">Purpose Type Split</h5>
                      <p className="text-[10px] text-gray-400">Reservation count by purpose tags</p>
                    </div>
                    <div className="space-y-3 pt-1 text-xs">
                      {purposeArray.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-6 text-center">No purpose metadata tracked.</p>
                      ) : (
                        purposeArray.slice(0, 4).map((item, idx) => {
                          const pct = Math.round((item.count / totalOutcome) * 100);
                          return (
                            <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-2">
                              <span className="font-bold text-gray-600 capitalize">{item.type}</span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-gray-900 font-extrabold">{item.count}</span>
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded font-black">{pct}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Top requesters */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4 md:col-span-1">
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-900">Top Booking Requesters</h5>
                      <p className="text-[10px] text-gray-400">Members with highest reservation volume</p>
                    </div>
                    <div className="space-y-3 pt-1 text-xs">
                      {topRequesters.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-6 text-center">No booking records found.</p>
                      ) : (
                        topRequesters.map((user, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <div className="truncate pr-2">
                              <p className="font-black text-gray-800 truncate leading-tight">{user.name}</p>
                              <p className="text-[9.5px] text-gray-400 font-mono truncate">{user.email}</p>
                            </div>
                            <span className="font-black bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-[10.5px] font-mono shrink-0">{user.count} bookings</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Efficiency Metrics */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4 md:col-span-1">
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-900">Efficiency metrics</h5>
                      <p className="text-[10px] text-gray-400">Core operational indicators</p>
                    </div>
                    <div className="space-y-4 pt-1 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-700 block">Avg Approved Duration</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Approved duration in minutes</span>
                        </div>
                        <span className="font-black text-base text-indigo-700 font-mono">{avgApprovedDuration} min</span>
                      </div>

                      <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                        <div>
                          <span className="font-bold text-gray-700 block">Cancellation Rate</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Pre-conflict & manual cancellation</span>
                        </div>
                        <span className={`font-black text-base font-mono ${cancellationRate > 15 ? 'text-amber-600' : 'text-gray-900'}`}>{cancellationRate}%</span>
                      </div>

                      <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                        <div>
                          <span className="font-bold text-gray-700 block">Approval Outcome Ratio</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">System-wide success rate</span>
                        </div>
                        <span className="font-black text-base text-emerald-600 font-mono">{Math.round((approvedOutcome / totalOutcome) * 100)}%</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

          {/* TAB 2: BOOKING REPORT */}
          {selectedReport === 'bookings' && (() => {
            const filteredBookings = bookingsList.filter(b => {
              if (bookingSearch.trim()) {
                const q = bookingSearch.toLowerCase();
                const matchId = b.id.toLowerCase().includes(q);
                const matchName = b.name.toLowerCase().includes(q);
                const matchEmail = b.email.toLowerCase().includes(q);
                const matchTitle = b.eventTitle.toLowerCase().includes(q);
                if (!matchId && !matchName && !matchEmail && !matchTitle) return false;
              }
              if (bookingRoom && b.room !== bookingRoom) return false;
              if (bookingStatus && b.status !== bookingStatus) return false;
              if (bookingType && b.bookingType !== bookingType) return false;
              if (bookingStartDate && b.date < bookingStartDate) return false;
              if (bookingEndDate && b.date > bookingEndDate) return false;
              return true;
            });

            const sortedBookings = [...filteredBookings].sort((a, b) => {
              let valA: any = a.date;
              let valB: any = b.date;
              if (bookingSortField === 'attendance') {
                valA = a.expectedAttendance;
                valB = b.expectedAttendance;
              } else if (bookingSortField === 'duration') {
                valA = a.duration;
                valB = b.duration;
              }
              
              if (valA < valB) return bookingSortOrder === 'asc' ? -1 : 1;
              if (valA > valB) return bookingSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const bookingPageSize = 10;
            const totalPages = Math.ceil(sortedBookings.length / bookingPageSize) || 1;
            const paginatedBookings = sortedBookings.slice((bookingPage - 1) * bookingPageSize, bookingPage * bookingPageSize);

            const roomOptions = Array.from(new Set(roomsList.map(r => r.name)));

            return (
              <div className="space-y-6 animate-fade-in">
                
                {/* Filters Panel */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Booking Reports Parameters</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Filter, search, sort and export administrative reservation records.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportBookingsCSV(sortedBookings)}
                        className="px-3.5 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-150 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <FileSpreadsheet className="h-4 w-4" /> CSV Export
                      </button>
                      <button
                        onClick={() => exportBookingsPDF(sortedBookings)}
                        className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs"
                      >
                        <FileText className="h-4 w-4" /> PDF Export
                      </button>
                    </div>
                  </div>

                  {/* Filters Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 pt-1 text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Text Search</span>
                      <input 
                        type="text"
                        placeholder="Search Name/Email/Title..."
                        value={bookingSearch}
                        onChange={e => { setBookingSearch(e.target.value); setBookingPage(1); }}
                        className="w-full px-2.5 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Filter Room</span>
                      <select
                        value={bookingRoom}
                        onChange={e => { setBookingRoom(e.target.value); setBookingPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All Room Spaces</option>
                        {roomOptions.map((name, i) => <option key={i} value={name}>{name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Filter Status</span>
                      <select
                        value={bookingStatus}
                        onChange={e => { setBookingStatus(e.target.value); setBookingPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All Outcomes</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="PENDING REVIEW">PENDING REVIEW</option>
                        <option value="PENDING VALIDATION">PENDING VALIDATION</option>
                        <option value="REJECTED BY STAFF">REJECTED BY STAFF</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">From Date</span>
                      <input 
                        type="date"
                        value={bookingStartDate}
                        onChange={e => { setBookingStartDate(e.target.value); setBookingPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">To Date</span>
                      <input 
                        type="date"
                        value={bookingEndDate}
                        onChange={e => { setBookingEndDate(e.target.value); setBookingPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Sorting block */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50 text-[10px] font-bold text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span>Sort Columns:</span>
                      {([
                        { f: 'date', label: 'Date' },
                        { f: 'attendance', label: 'Attendance' },
                        { f: 'duration', label: 'Duration' }
                      ] as { f: 'date' | 'attendance' | 'duration'; label: string }[]).map(s => (
                        <button
                          key={s.f}
                          onClick={() => {
                            if (bookingSortField === s.f) {
                              setBookingSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setBookingSortField(s.f);
                              setBookingSortOrder('desc');
                            }
                            setBookingPage(1);
                          }}
                          className={`px-2 py-1 border rounded-lg cursor-pointer flex items-center gap-1 uppercase tracking-wider text-[8.5px] transition-all ${
                            bookingSortField === s.f ? 'bg-primary border-primary text-white font-black' : 'border-gray-150 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {s.label}
                          {bookingSortField === s.f && <ArrowUpDown className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                    <div className="text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                      Matches: {sortedBookings.length} bookings
                    </div>
                  </div>
                </div>

                {/* Report Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                          <th className="py-3 px-5">ID</th>
                          <th className="py-3 px-5">Requester User</th>
                          <th className="py-3 px-5">Room Space</th>
                          <th className="py-3 px-5">Date & Slot</th>
                          <th className="py-3 px-5">Type / Purpose</th>
                          <th className="py-3 px-5">Expected Attendance</th>
                          <th className="py-3 px-5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedBookings.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-gray-400">No booking matches found on this filter criteria.</td>
                          </tr>
                        ) : (
                          paginatedBookings.map(b => (
                            <tr key={b.id} className="hover:bg-gray-50/50 text-gray-700 transition-colors">
                              <td className="py-4 px-5 font-mono text-[10px] text-gray-500 whitespace-nowrap">{b.id}</td>
                              <td className="py-4 px-5">
                                <p className="font-extrabold text-gray-900 leading-tight">{b.name}</p>
                                <p className="text-[9.5px] text-gray-400 font-mono">{b.email}</p>
                              </td>
                              <td className="py-4 px-5 font-bold text-gray-800 whitespace-nowrap">{b.room}</td>
                              <td className="py-4 px-5 font-medium whitespace-nowrap">
                                <p>{b.date}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{b.startTime} - {b.endTime} ({b.duration}m)</p>
                              </td>
                              <td className="py-4 px-5 text-gray-600 font-bold capitalize whitespace-nowrap">{b.bookingType}</td>
                              <td className="py-4 px-5 font-mono text-center font-bold text-gray-800 whitespace-nowrap">{b.expectedAttendance}</td>
                              <td className="py-4 px-5 text-right whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                                  b.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                  b.status.includes('PENDING') ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                                  b.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                                  'bg-rose-50 text-rose-800 border border-rose-100'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Row */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                      <span>Page {bookingPage} of {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={bookingPage === 1}
                          onClick={() => setBookingPage(prev => prev - 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          disabled={bookingPage === totalPages}
                          onClick={() => setBookingPage(prev => prev + 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* TAB 3: ROOM UTILIZATION REPORT */}
          {selectedReport === 'utilization' && (() => {
            const roomUtilsData = roomsList.map(room => {
              const roomBookings = bookingsList.filter(b => {
                if (b.room !== room.name) return false;
                if (utilStartDate && b.date < utilStartDate) return false;
                if (utilEndDate && b.date > utilEndDate) return false;
                return true;
              });

              const approvedBookings = roomBookings.filter(b => b.status === 'APPROVED');
              const totalMinutes = approvedBookings.reduce((sum, b) => sum + b.duration, 0);
              const avgAttendance = approvedBookings.length > 0
                ? Math.round(approvedBookings.reduce((sum, b) => sum + b.expectedAttendance, 0) / approvedBookings.length)
                : 0;

              // Standard Operating capacity (operating hours limits: 8 hours per day)
              const maxCapacityMinutes = 2400; 
              const utilizationPercentage = Math.min(100, Math.round((totalMinutes / maxCapacityMinutes) * 100));

              return {
                roomName: room.name,
                bookingsCount: roomBookings.length,
                approvedCount: approvedBookings.length,
                utilizationMinutes: totalMinutes,
                utilizationPercentage,
                avgAttendance,
                capacity: room.capacity,
                operatingHours: room.operatingHours,
                isActive: room.isActive
              };
            });

            const filteredUtil = roomUtilsData.filter(u => {
              if (utilRoomSearch.trim()) {
                return u.roomName.toLowerCase().includes(utilRoomSearch.toLowerCase().trim());
              }
              return true;
            });

            const sortedUtil = [...filteredUtil].sort((a, b) => {
              let valA: any = a.utilizationPercentage;
              let valB: any = b.utilizationPercentage;
              if (utilSortField === 'count') {
                valA = a.bookingsCount;
                valB = b.bookingsCount;
              } else if (utilSortField === 'capacity') {
                valA = a.capacity;
                valB = b.capacity;
              }
              
              if (valA < valB) return utilSortOrder === 'asc' ? -1 : 1;
              if (valA > valB) return utilSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const utilPageSize = 10;
            const totalPages = Math.ceil(sortedUtil.length / utilPageSize) || 1;
            const paginatedUtil = sortedUtil.slice((utilPage - 1) * utilPageSize, utilPage * utilPageSize);

            return (
              <div className="space-y-6 animate-fade-in">
                
                {/* Filters Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Room Utilization Tracker</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Analyze and export physical room space utilization and occupancy percentages.</p>
                    </div>
                    <button
                      onClick={() => exportUtilizationPDF(sortedUtil)}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs"
                    >
                      <FileText className="h-4 w-4" /> PDF Report Export
                    </button>
                  </div>

                  {/* Grid Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Room Search</span>
                      <input 
                        type="text"
                        placeholder="Search room space name..."
                        value={utilRoomSearch}
                        onChange={e => { setUtilRoomSearch(e.target.value); setUtilPage(1); }}
                        className="w-full px-2.5 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">From Date</span>
                      <input 
                        type="date"
                        value={utilStartDate}
                        onChange={e => { setUtilStartDate(e.target.value); setUtilPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">To Date</span>
                      <input 
                        type="date"
                        value={utilEndDate}
                        onChange={e => { setUtilEndDate(e.target.value); setUtilPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sort Parameters</span>
                      <div className="flex gap-1">
                        <select
                          value={utilSortField}
                          onChange={e => { setUtilSortField(e.target.value as any); setUtilPage(1); }}
                          className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="utilization">Utilization %</option>
                          <option value="count">Bookings count</option>
                          <option value="capacity">Capacity</option>
                        </select>
                        <button
                          onClick={() => { setUtilSortOrder(p => p === 'asc' ? 'desc' : 'asc'); setUtilPage(1); }}
                          className="px-2.5 border border-gray-150 hover:bg-gray-50 bg-gray-50/50 rounded-lg text-gray-500 font-bold cursor-pointer"
                          title="Toggle Sort order"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Room utilization table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                          <th className="py-3 px-5">Physical Room Space</th>
                          <th className="py-3 px-5">Policies Capacity</th>
                          <th className="py-3 px-5">Standard Operating Hours</th>
                          <th className="py-3 px-5">Total Bookings (Approved)</th>
                          <th className="py-3 px-5">Hours Booked</th>
                          <th className="py-3 px-5">Avg Expected Attd</th>
                          <th className="py-3 px-5 text-right">Utilization Rate (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {paginatedUtil.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-gray-400">No rooms met the filtered tracking criteria.</td>
                          </tr>
                        ) : (
                          paginatedUtil.map(u => (
                            <tr key={u.roomName} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                  <span className="font-extrabold text-gray-900">{u.roomName}</span>
                                </div>
                              </td>
                              <td className="py-4 px-5 font-mono font-bold text-gray-600">{u.capacity} guests limit</td>
                              <td className="py-4 px-5 font-mono text-gray-500">{u.operatingHours}</td>
                              <td className="py-4 px-5 font-medium">
                                <span>{u.bookingsCount} requested</span>
                                <span className="text-emerald-600 block text-[10.5px]">({u.approvedCount} approved)</span>
                              </td>
                              <td className="py-4 px-5 font-bold font-mono text-gray-850">{Math.round((u.utilizationMinutes / 60) * 10) / 10} hrs</td>
                              <td className="py-4 px-5 font-mono text-center font-bold">{u.avgAttendance || '—'}</td>
                              <td className="py-4 px-5 text-right font-black font-mono">
                                <div className="flex items-center justify-end gap-2.5">
                                  <span>{u.utilizationPercentage}%</span>
                                  <div className="h-1.5 w-14 bg-gray-100 rounded-full overflow-hidden shrink-0">
                                    <div 
                                      className={`h-full rounded-full ${
                                        u.utilizationPercentage > 70 ? 'bg-indigo-600' :
                                        u.utilizationPercentage > 30 ? 'bg-primary' : 'bg-gray-300'
                                      }`} 
                                      style={{ width: `${u.utilizationPercentage}%` }} 
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Row */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                      <span>Page {utilPage} of {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={utilPage === 1}
                          onClick={() => setUtilPage(prev => prev - 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          disabled={utilPage === totalPages}
                          onClick={() => setUtilPage(prev => prev + 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* TAB 4: PEAK USAGE REPORT */}
          {selectedReport === 'peak' && (() => {
            const hoursOfOperation = [9, 10, 11, 12, 13, 14, 15, 16];
            const peakReportData = hoursOfOperation.map(hour => {
              const activeBookings = bookingsList.filter(b => {
                if (peakStartDate && b.date < peakStartDate) return false;
                if (peakEndDate && b.date > peakEndDate) return false;
                if (peakRoomFilter && b.room !== peakRoomFilter) return false;

                const [bStartH, bStartM] = b.startTime.split(':').map(Number);
                const [bEndH, bEndM] = b.endTime.split(':').map(Number);
                const bStartMinutes = bStartH * 60 + bStartM;
                const bEndMinutes = bEndH * 60 + bEndM;

                const slotStartMinutes = hour * 60;
                const slotEndMinutes = (hour + 1) * 60;

                return bStartMinutes < slotEndMinutes && bEndMinutes > slotStartMinutes;
              });

              const totalCount = activeBookings.length;
              const approvedCount = activeBookings.filter(b => b.status === 'APPROVED').length;

              const roomCounts: { [name: string]: number } = {};
              activeBookings.forEach(b => {
                roomCounts[b.room] = (roomCounts[b.room] || 0) + 1;
              });
              let busiestRoom = 'None';
              let maxRoomCount = 0;
              Object.entries(roomCounts).forEach(([roomName, count]) => {
                if (count > maxRoomCount) {
                  busiestRoom = roomName;
                  maxRoomCount = count;
                }
              });

              const avgAttendance = approvedCount > 0
                ? Math.round(activeBookings.filter(b => b.status === 'APPROVED').reduce((sum, b) => sum + b.expectedAttendance, 0) / approvedCount)
                : 0;

              let loadStatus = 'Low';
              if (totalCount > 4) loadStatus = 'Peak';
              else if (totalCount > 2) loadStatus = 'High';
              else if (totalCount > 0) loadStatus = 'Medium';

              return {
                hourLabel: `${hour === 12 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'} - ${(hour + 1) === 12 ? 12 : (hour + 1) % 12}:00 ${(hour + 1) >= 12 ? 'PM' : 'AM'}`,
                hour24: hour,
                totalCount,
                approvedCount,
                busiestRoom,
                avgAttendance,
                loadStatus
              };
            });

            const sortedPeak = [...peakReportData].sort((a, b) => {
              let valA = a.totalCount;
              let valB = b.totalCount;
              if (peakSortField === 'attendance') {
                valA = a.avgAttendance;
                valB = b.avgAttendance;
              }
              
              if (valA < valB) return peakSortOrder === 'asc' ? -1 : 1;
              if (valA > valB) return peakSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const roomOptions = Array.from(new Set(roomsList.map(r => r.name)));

            return (
              <div className="space-y-6 animate-fade-in">
                
                {/* Filters Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Peak Usage Hour Report</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Analyze and optimize busiest hourly intervals and overlapping reservation volumes.</p>
                    </div>
                    <button
                      onClick={() => exportPeakPDF(sortedPeak)}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs animate-fade-in"
                    >
                      <FileText className="h-4 w-4" /> PDF Report Export
                    </button>
                  </div>

                  {/* Grid Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Filter Room</span>
                      <select
                        value={peakRoomFilter}
                        onChange={e => { setPeakRoomFilter(e.target.value); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All Room Spaces</option>
                        {roomOptions.map((name, i) => <option key={i} value={name}>{name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">From Date</span>
                      <input 
                        type="date"
                        value={peakStartDate}
                        onChange={e => { setPeakStartDate(e.target.value); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">To Date</span>
                      <input 
                        type="date"
                        value={peakEndDate}
                        onChange={e => { setPeakEndDate(e.target.value); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sort Priority</span>
                      <div className="flex gap-1">
                        <select
                          value={peakSortField}
                          onChange={e => { setPeakSortField(e.target.value as any); }}
                          className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="bookings">Total Bookings</option>
                          <option value="attendance">Avg Attendance</option>
                        </select>
                        <button
                          onClick={() => { setPeakSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }}
                          className="px-2.5 border border-gray-150 hover:bg-gray-50 bg-gray-50/50 rounded-lg text-gray-500 font-bold cursor-pointer"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual graph representation of hourly peak load factor */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                  <div>
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-900">Hourly System Load Factor Visualizer</h5>
                    <p className="text-[10px] text-gray-400">Relative booking volume concentration across typical operational hours.</p>
                  </div>
                  <div className="space-y-3 pt-2 text-xs font-bold text-gray-700">
                    {sortedPeak.map((p, i) => {
                      const maxVolume = Math.max(...sortedPeak.map(item => item.totalCount), 1);
                      const fillPercentage = Math.round((p.totalCount / maxVolume) * 100);
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <span className="w-32 truncate">{p.hourLabel}</span>
                          <div className="h-3 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                p.loadStatus === 'Peak' ? 'bg-rose-600' :
                                p.loadStatus === 'High' ? 'bg-amber-500' :
                                p.loadStatus === 'Medium' ? 'bg-primary' : 'bg-gray-300'
                              }`}
                              style={{ width: `${fillPercentage}%` }}
                            />
                          </div>
                          <span className="w-20 text-right font-mono font-bold text-gray-500">{p.totalCount} active ({p.approvedCount} approved)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hourly Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                        <th className="py-3 px-5">Hourly Time Slot</th>
                        <th className="py-3 px-5 font-mono">Total requested overlaps</th>
                        <th className="py-3 px-5 font-mono">Approved Reservations count</th>
                        <th className="py-3 px-5">Busiest Room space</th>
                        <th className="py-3 px-5">Average attendance</th>
                        <th className="py-3 px-5 text-right">Relative load factor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {sortedPeak.map(p => (
                        <tr key={p.hour24} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-5 font-bold text-gray-900">{p.hourLabel}</td>
                          <td className="py-4 px-5 font-bold font-mono text-gray-600">{p.totalCount} bookings</td>
                          <td className="py-4 px-5 font-semibold text-emerald-600 font-mono">({p.approvedCount} approved)</td>
                          <td className="py-4 px-5 font-bold text-indigo-700">{p.busiestRoom}</td>
                          <td className="py-4 px-5 font-mono">{p.avgAttendance || '—'} guests</td>
                          <td className="py-4 px-5 text-right font-black">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              p.loadStatus === 'Peak' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                              p.loadStatus === 'High' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                              p.loadStatus === 'Medium' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                              'bg-gray-100 text-gray-500 border border-gray-150'
                            }`}>
                              {p.loadStatus} Load
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })()}

          {/* TAB 5: BOOKING TRENDS REPORT */}
          {selectedReport === 'trends' && (() => {
            const getGroupKey = (dateStr: string, mode: string) => {
              if (!dateStr) return 'N/A';
              const parts = dateStr.split('-');
              if (parts.length !== 3) return dateStr;
              const [year, month] = parts;
              
              if (mode === 'daily') {
                return dateStr;
              } else if (mode === 'monthly') {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const mIdx = parseInt(month, 10) - 1;
                return `${monthNames[mIdx] || month} ${year}`;
              } else if (mode === 'yearly') {
                return year;
              } else {
                // mode === 'weekly'
                const d = new Date(dateStr);
                const dayNum = d.getDay();
                const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diff));
                return `Week of ${monday.toISOString().split('T')[0]}`;
              }
            };
            
            const groupCounts: { [key: string]: { submitted: number; approved: number; cancelledOrRejected: number; totalAttendees: number } } = {};
            
            bookingsList.forEach(b => {
              if (trendStartDate && b.date < trendStartDate) return;
              if (trendEndDate && b.date > trendEndDate) return;
              
              const key = getGroupKey(b.date, trendPeriod);
              if (!groupCounts[key]) {
                groupCounts[key] = { submitted: 0, approved: 0, cancelledOrRejected: 0, totalAttendees: 0 };
              }
              groupCounts[key].submitted += 1;
              if (b.status === 'APPROVED') {
                groupCounts[key].approved += 1;
                groupCounts[key].totalAttendees += b.expectedAttendance;
              } else if (b.status === 'CANCELLED' || b.status.includes('REJECTED')) {
                groupCounts[key].cancelledOrRejected += 1;
              }
            });
            
            const trendReportData = Object.entries(groupCounts).map(([period, metrics]) => {
              const rate = metrics.submitted > 0 ? Math.round((metrics.approved / metrics.submitted) * 100) : 0;
              return {
                period,
                submittedCount: metrics.submitted,
                approvedCount: metrics.approved,
                cancelledCount: metrics.cancelledOrRejected,
                totalAttendees: metrics.totalAttendees,
                approvalRate: rate
              };
            });

            const sortedTrend = [...trendReportData].sort((a, b) => {
              let valA: any = a.period;
              let valB: any = b.period;
              if (trendSortField === 'volume') {
                valA = a.submittedCount;
                valB = b.submittedCount;
              }
              
              if (valA < valB) return trendSortOrder === 'asc' ? -1 : 1;
              if (valA > valB) return trendSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const trendPageSize = 10;
            const totalPages = Math.ceil(sortedTrend.length / trendPageSize) || 1;
            const paginatedTrend = sortedTrend.slice((trendPage - 1) * trendPageSize, trendPage * trendPageSize);

            return (
              <div className="space-y-6 animate-fade-in">
                
                {/* Filters Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Booking Trends Report</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Aggregate system-wide volume trends on a daily, weekly, monthly, or yearly cadence.</p>
                    </div>
                    <button
                      onClick={() => exportTrendsPDF(sortedTrend)}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs"
                    >
                      <FileText className="h-4 w-4" /> PDF Report Export
                    </button>
                  </div>

                  {/* Grid Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Aggregation Cadence</span>
                      <div className="flex gap-1 bg-gray-50 border border-gray-150 rounded-lg p-0.5 font-bold">
                        {([
                          { k: 'daily', label: 'D' },
                          { k: 'weekly', label: 'W' },
                          { k: 'monthly', label: 'M' },
                          { k: 'yearly', label: 'Y' }
                        ] as { k: 'daily' | 'weekly' | 'monthly' | 'yearly'; label: string }[]).map(t => (
                          <button
                            key={t.k}
                            onClick={() => { setTrendPeriod(t.k); setTrendPage(1); }}
                            className={`flex-1 py-1 rounded-md text-[9px] uppercase tracking-wider cursor-pointer transition-colors ${
                              trendPeriod === t.k ? 'bg-primary text-white font-extrabold' : 'text-gray-400 hover:text-gray-650'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">From Date</span>
                      <input 
                        type="date"
                        value={trendStartDate}
                        onChange={e => { setTrendStartDate(e.target.value); setTrendPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">To Date</span>
                      <input 
                        type="date"
                        value={trendEndDate}
                        onChange={e => { setTrendEndDate(e.target.value); setTrendPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sort Priority</span>
                      <div className="flex gap-1">
                        <select
                          value={trendSortField}
                          onChange={e => { setTrendSortField(e.target.value as any); setTrendPage(1); }}
                          className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="period">Time Period</option>
                          <option value="volume">Reservations Volume</option>
                        </select>
                        <button
                          onClick={() => { setTrendSortOrder(p => p === 'asc' ? 'desc' : 'asc'); setTrendPage(1); }}
                          className="px-2.5 border border-gray-150 hover:bg-gray-50 bg-gray-50/50 rounded-lg text-gray-500 font-bold cursor-pointer"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trends Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                          <th className="py-3 px-5">Aggregated Time Period</th>
                          <th className="py-3 px-5 font-mono text-center">Submitted requested counts</th>
                          <th className="py-3 px-5 font-mono text-center">Approved Reservations count</th>
                          <th className="py-3 px-5 font-mono text-center">Rejected / Cancelled counts</th>
                          <th className="py-3 px-5 text-center">System success rate (%)</th>
                          <th className="py-3 px-5 text-right">Sum expected attendees</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {paginatedTrend.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-xs text-gray-400">No aggregated booking volume trends found.</td>
                          </tr>
                        ) : (
                          paginatedTrend.map(t => (
                            <tr key={t.period} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 px-5 font-extrabold text-gray-900 capitalize">{t.period}</td>
                              <td className="py-4 px-5 font-bold font-mono text-center">{t.submittedCount} submissions</td>
                              <td className="py-4 px-5 text-emerald-600 font-bold font-mono text-center">{t.approvedCount} slots</td>
                              <td className="py-4 px-5 text-rose-600 font-medium font-mono text-center">{t.cancelledCount} slots</td>
                              <td className="py-4 px-5 text-center font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10.5px] font-mono ${
                                  t.approvalRate > 75 ? 'text-emerald-700 bg-emerald-50' :
                                  t.approvalRate > 40 ? 'text-blue-700 bg-blue-50' : 'text-rose-700 bg-rose-50'
                                }`}>
                                  {t.approvalRate}%
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right font-black font-mono text-gray-800">{t.totalAttendees} attendees</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Row */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                      <span>Page {trendPage} of {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={trendPage === 1}
                          onClick={() => setTrendPage(prev => prev - 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          disabled={trendPage === totalPages}
                          onClick={() => setTrendPage(prev => prev + 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* TAB 6: BAN REPORTS */}
          {selectedReport === 'bans' && (() => {
            const filteredBans = bansList.filter(ban => {
              if (banSearch.trim()) {
                const q = banSearch.toLowerCase();
                const matchName = ban.name.toLowerCase().includes(q);
                const matchEmail = ban.email.toLowerCase().includes(q);
                const matchReason = ban.reason.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchReason) return false;
              }
              if (banStatusFilter !== 'All' && ban.status !== banStatusFilter) return false;
              return true;
            });

            const sortedBans = [...filteredBans].sort((a, b) => {
              const valA = a.createdAt;
              const valB = b.createdAt;
              if (valA < valB) return banSortOrder === 'asc' ? -1 : 1;
              if (valA > valB) return banSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const banPageSize = 10;
            const totalPages = Math.ceil(sortedBans.length / banPageSize) || 1;
            const paginatedBans = sortedBans.slice((banPage - 1) * banPageSize, banPage * banPageSize);

            return (
              <div className="space-y-6 animate-fade-in">
                
                {/* Filters Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Security Enforcement Ban Reports</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Track currently active security bans and complete lift/expires audit logs histories.</p>
                    </div>
                    <button
                      onClick={() => exportBansPDF(sortedBans)}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs"
                    >
                      <FileText className="h-4 w-4" /> PDF Report Export
                    </button>
                  </div>

                  {/* Grid Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Text Search</span>
                      <input 
                        type="text"
                        placeholder="Search Name, Email, Ban Reason..."
                        value={banSearch}
                        onChange={e => { setBanSearch(e.target.value); setBanPage(1); }}
                        className="w-full px-2.5 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Filter Status</span>
                      <select
                        value={banStatusFilter}
                        onChange={e => { setBanStatusFilter(e.target.value as any); setBanPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-150 rounded-lg text-xs bg-gray-50/50 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="All">All Enforcement Statuses</option>
                        <option value="Active">Active Bans</option>
                        <option value="Expired">Expired Bans</option>
                        <option value="Lifted">Lifted Bans</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sort Issued Date</span>
                      <button
                        onClick={() => { setBanSortOrder(p => p === 'asc' ? 'desc' : 'asc'); setBanPage(1); }}
                        className="w-full px-3 py-1.5 border border-gray-150 hover:bg-gray-50 bg-gray-50/50 rounded-lg text-gray-650 font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] cursor-pointer"
                      >
                        {banSortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ban Reports Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                          <th className="py-3 px-5">Enforced User Details</th>
                          <th className="py-3 px-5">Duration Scope</th>
                          <th className="py-3 px-5">Issued Date</th>
                          <th className="py-3 px-5">Expires Date</th>
                          <th className="py-3 px-5 font-mono">Issued By</th>
                          <th className="py-3 px-5">Enforcement Status</th>
                          <th className="py-3 px-5 text-right">Action details / reasons</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {paginatedBans.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-gray-400">No active security bans or histories registered.</td>
                          </tr>
                        ) : (
                          paginatedBans.map(ban => (
                            <tr key={ban.id} className="hover:bg-gray-50/50 transition-colors text-xs">
                              <td className="py-4 px-5">
                                <p className="font-extrabold text-gray-900 leading-tight">{ban.name}</p>
                                <p className="text-[9.5px] text-gray-400 font-mono">{ban.email}</p>
                              </td>
                              <td className="py-4 px-5 font-bold font-mono text-indigo-700">{ban.duration}</td>
                              <td className="py-4 px-5 font-mono text-gray-500">{new Date(ban.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 px-5 font-mono text-gray-500">{ban.expiresAt === 'Never' ? 'Permanent' : new Date(ban.expiresAt).toLocaleDateString()}</td>
                              <td className="py-4 px-5 font-semibold text-gray-800 font-mono text-[10.5px]">{ban.bannedBy}</td>
                              <td className="py-4 px-5">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  ban.status === 'Active' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                                  ban.status === 'Lifted' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                  'bg-gray-100 text-gray-500 border border-gray-150'
                                }`}>
                                  {ban.status}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right font-medium max-w-xs break-words">
                                {ban.status === 'Lifted' ? (
                                  <div>
                                    <p className="font-black text-emerald-700 leading-tight">Lifted by {ban.liftedBy}</p>
                                    <p className="text-[9.5px] text-gray-450 italic">" {ban.liftedReason} "</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-600 italic">" {ban.reason} "</p>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Row */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                      <span>Page {banPage} of {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={banPage === 1}
                          onClick={() => setBanPage(prev => prev - 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          disabled={banPage === totalPages}
                          onClick={() => setBanPage(prev => prev + 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* TAB 7: ADMINISTRATIVE AUDIT LOGS LEDGER */}
          {selectedReport === 'audit_report' && (
            <>
              {/* Integrated raw log list view */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Immutable Administrative Activity Logs</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Search, inspect and export complete administrative audit trails on this block filter.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      disabled={filteredLogs.length === 0 || !hasExportView}
                      className="px-3.5 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-150 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <FileSpreadsheet className="h-4 w-4" /> Export CSV
                    </button>
                    <button
                      onClick={handleExportPDF}
                      disabled={filteredLogs.length === 0 || !hasExportView}
                      className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-3xs disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Search input bar */}
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search ledger by Authorizer, values, actions..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-gray-150 rounded-xl text-xs bg-gray-50/40 focus:bg-white focus:ring-1 focus:ring-primary font-medium focus:outline-none"
                  />
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Search className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {/* Audit table logs list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                        <th className="py-3 px-5">Timestamp (UTC)</th>
                        <th className="py-3 px-5">System Event Action</th>
                        <th className="py-3 px-5">Authorizer User</th>
                        <th className="py-3 px-5">Previous Values</th>
                        <th className="py-3 px-5">New Values / Actions</th>
                        <th className="py-3 px-5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-gray-400">No matching audit records reside on this block filter.</td>
                        </tr>
                      ) : (
                        filteredLogs.slice(0, 50).map(log => (
                          <tr 
                            key={log.id} 
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-gray-50/50 text-gray-700 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-5 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-4 px-5">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border tracking-wider ${
                                log.action.includes('REJECT') || log.action.includes('BAN') 
                                  ? 'bg-rose-50 text-rose-800 border-rose-100' 
                                  : log.action.includes('APPROVE') || log.action.includes('LIFT')
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                  : log.action.includes('OVERRIDE')
                                  ? 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                                  : 'bg-blue-50 text-blue-800 border-blue-100'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-4 px-5 font-bold text-gray-900 font-mono text-[10.5px]">
                              {log.user}
                            </td>
                            <td className="py-4 px-5 font-mono text-[10.5px] text-gray-500 whitespace-normal max-w-xs break-words">
                              {renderAuditValue(log.previousValue, log.newValue)}
                            </td>
                            <td className="py-4 px-5 font-mono text-[10.5px] text-gray-800 whitespace-normal max-w-xs break-words">
                              {renderAuditValue(log.newValue, log.previousValue)}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLog(log);
                                }}
                                className="p-1.5 text-gray-400 group-hover:text-primary hover:bg-gray-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}
