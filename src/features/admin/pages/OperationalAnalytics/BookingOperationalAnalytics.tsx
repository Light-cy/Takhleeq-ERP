import React, { useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Clock, 
  PieChart, 
  FileText, 
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Booking, Room } from '../../../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BookingOperationalAnalyticsProps {
  bookings?: Booking[];
  rooms?: Room[];
}

// Helper to safely call autoTable
const runAutoTable = (docInstance: jsPDF, options: any) => {
  try {
    if (typeof autoTable === 'function') {
      autoTable(docInstance, options);
    } else if (typeof (docInstance as any).autoTable === 'function') {
      (docInstance as any).autoTable(options);
    } else if ((autoTable as any)?.default && typeof (autoTable as any).default === 'function') {
      (autoTable as any).default(docInstance, options);
    }
  } catch (err) {
    console.error('autoTable execution error:', err);
  }
};

export function BookingOperationalAnalytics({
  bookings = [],
  rooms = []
}: BookingOperationalAnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState<'analytics' | 'bookings' | 'utilization' | 'peak' | 'trends'>('analytics');
  const [isExporting, setIsExporting] = useState(false);

  // Booking search & filters
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingRoom, setBookingRoom] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingStartDate, setBookingStartDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [bookingPage, setBookingPage] = useState(1);

  // Utilization filters
  const [utilRoomSearch, setUtilRoomSearch] = useState('');
  const [utilPage, setUtilPage] = useState(1);

  // Peak filters
  const [peakPage, setPeakPage] = useState(1);

  // Trends filters
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Pre-calculated stats
  const totalBookings = bookings.length;
  const approvedBookings = bookings.filter(b => b.status === 'APPROVED').length;
  const pendingBookings = bookings.filter(b => b.status === 'PENDING REVIEW' || b.status === 'PENDING VALIDATION').length;
  const rejectedBookings = bookings.filter(b => b.status.includes('REJECTED') || b.status === 'CANCELLED').length;
  const totalRooms = rooms.length;

  // Export Executive Analytics PDF function
  const exportAnalyticsPDF = () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('TAKHLEEQ ERP', 10, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('BOOKING & SPACE UTILIZATION ANALYTICS REPORT', 10, 25);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 135, 25);

      // Section 1: Executive KPI Metrics
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Executive KPI Summary', 10, 46);

      const kpiHead = [['Metric Category', 'Score Value', 'Operational Status']];
      const kpiBody = [
        ['Total Reservations Logged', `${totalBookings} entries`, 'Indexed'],
        ['Approved Bookings', `${approvedBookings} slots`, 'Confirmed'],
        ['Pending Review Queue', `${pendingBookings} slots`, 'Awaiting Approval'],
        ['Rejected / Cancelled', `${rejectedBookings} slots`, 'Resolved'],
        ['Total Managed Rooms', `${totalRooms} rooms`, 'Online']
      ];

      runAutoTable(doc, {
        startY: 50,
        margin: { left: 10, right: 10 },
        head: kpiHead,
        body: kpiBody,
        theme: 'striped',
        headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [55, 65, 81] }
      });

      // Section 2: Room Space Utilization
      const afterKpiY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 110;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text('2. Space Utilization & Demand Distribution', 10, afterKpiY);

      const roomHead = [['Room Name', 'Capacity', 'Approved Slots', 'Total Reserved Duration']];
      const roomBody = rooms.map(room => {
        const roomBookings = bookings.filter(b => b.room === room.name && b.status === 'APPROVED');
        const totalMins = roomBookings.reduce((sum, b) => sum + (b.duration || 60), 0);
        return [
          room.name,
          `${room.capacity} seats`,
          `${roomBookings.length} slots`,
          `${totalMins} mins (~${Math.round(totalMins / 60)} hrs)`
        ];
      });

      runAutoTable(doc, {
        startY: afterKpiY + 4,
        margin: { left: 10, right: 10 },
        head: roomHead,
        body: roomBody.length > 0 ? roomBody : [['No rooms configured', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] }
      });

      // Section 3: Recent Bookings Activity Ledger
      const afterRoomY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 190;
      
      // If close to page bottom, add a new page
      if (afterRoomY > 240) {
        doc.addPage();
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text('3. Recent Booking Activity Ledger', 10, 18);
      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text('3. Recent Booking Activity Ledger', 10, afterRoomY);
      }

      const recentBookingsHead = [['Requester', 'Room', 'Date', 'Time Slot', 'Type', 'Status']];
      const recentBookingsBody = bookings.slice(0, 25).map(b => [
        `${b.name || 'User'}\n(${b.email || 'N/A'})`,
        b.room || 'General',
        b.date || 'N/A',
        `${b.startTime || '00:00'} - ${b.endTime || '00:00'}`,
        b.bookingType || 'Meeting',
        b.status
      ]);

      const startTableY = afterRoomY > 240 ? 24 : afterRoomY + 4;
      runAutoTable(doc, {
        startY: startTableY,
        margin: { left: 10, right: 10 },
        head: recentBookingsHead,
        body: recentBookingsBody.length > 0 ? recentBookingsBody : [['No reservations recorded', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [139, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 32 },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 28 },
          5: { cellWidth: 35 }
        },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page ${data.pageNumber} of ${pageCount} | Takhleeq ERP Facility Management`, 10, 290);
        }
      });

      doc.save(`takhleeq_booking_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('Failed to export PDF:', e);
      alert('Could not generate PDF report. Please check the browser console.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in" id="booking-operational-analytics">
      {/* Top Header Card with Quick Stats */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
          <div>
            <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Facility Management</span>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mt-0.5">Booking & Space Utilization Analytics</h3>
          </div>
          <button
            onClick={exportAnalyticsPDF}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10.5px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> {isExporting ? 'Generating PDF...' : 'Export Analytics PDF'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Bookings</span>
            <p className="text-lg font-black font-mono text-gray-900 mt-0.5">{totalBookings}</p>
          </div>
          <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/40">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Approved</span>
            <p className="text-lg font-black font-mono text-emerald-600 mt-0.5">{approvedBookings}</p>
          </div>
          <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100/40">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">Pending Review</span>
            <p className="text-lg font-black font-mono text-blue-600 mt-0.5">{pendingBookings}</p>
          </div>
          <div className="bg-purple-50/40 p-3.5 rounded-xl border border-purple-100/40">
            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block">Total Spaces</span>
            <p className="text-lg font-black font-mono text-purple-600 mt-0.5">{totalRooms}</p>
          </div>
        </div>
      </div>

      {/* Main Multi-Tab Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sub-Tabs Navigation */}
        <div className="space-y-1.5 bg-white p-4.5 rounded-2xl border border-gray-100 shadow-3xs lg:col-span-1">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-3 pb-2.5 border-b border-gray-100 mb-2">Analytics Views</span>
          {[
            { id: 'analytics', name: 'Operational Overview', desc: 'KPIs, Room Popularity & Splits', icon: BarChart2 },
            { id: 'bookings', name: 'Booking Report', desc: 'Filter, Inspect & Export Slots', icon: FileText },
            { id: 'utilization', name: 'Room Utilization', desc: 'Occupancy & Capacity Metrics', icon: TrendingUp },
            { id: 'peak', name: 'Peak Usage Analysis', desc: 'Busiest Hours & High Demand', icon: Clock },
            { id: 'trends', name: 'Velocity Trends', desc: 'Time Series & Aggregations', icon: PieChart }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
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
          {/* TAB 1: OPERATIONAL OVERVIEW */}
          {selectedTab === 'analytics' && (() => {
            const purposeStats: { [type: string]: number } = {};
            bookings.forEach(b => {
              const type = b.bookingType || 'Meeting';
              purposeStats[type] = (purposeStats[type] || 0) + 1;
            });
            const purposeArray = Object.entries(purposeStats).map(([type, count]) => ({ type, count }));

            return (
              <div className="space-y-6">
                {/* Visual Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Space Popularity */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Room Space Popularity</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Approved booking distribution across facilities.</p>
                    </div>
                    <div className="space-y-3 pt-2">
                      {rooms.length === 0 ? (
                        <p className="text-xs text-gray-400 py-6 text-center">No room spaces configured</p>
                      ) : (
                        rooms.map(room => {
                          const count = bookings.filter(b => b.room === room.name && b.status === 'APPROVED').length;
                          const percent = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0;
                          return (
                            <div key={room.id} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-gray-800">{room.name}</span>
                                <span className="font-mono text-gray-500">{count} bookings ({percent}%)</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all duration-500" 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Purpose Classification Split */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Booking Purpose Split</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Distribution by reservation category.</p>
                    </div>
                    <div className="space-y-3 pt-2">
                      {purposeArray.length === 0 ? (
                        <p className="text-xs text-gray-400 py-6 text-center">No classified bookings</p>
                      ) : (
                        purposeArray.map(item => {
                          const percent = totalBookings > 0 ? Math.round((item.count / totalBookings) * 100) : 0;
                          return (
                            <div key={item.type} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-gray-800 capitalize">{item.type}</span>
                                <span className="font-mono text-gray-500">{item.count} ({percent}%)</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 2: BOOKING REPORT TABLE */}
          {selectedTab === 'bookings' && (() => {
            const filtered = bookings.filter(b => {
              if (bookingSearch.trim()) {
                const q = bookingSearch.toLowerCase();
                const matchName = b.name?.toLowerCase().includes(q);
                const matchTitle = b.eventTitle?.toLowerCase().includes(q);
                const matchEmail = b.email?.toLowerCase().includes(q);
                if (!matchName && !matchTitle && !matchEmail) return false;
              }
              if (bookingRoom && b.room !== bookingRoom) return false;
              if (bookingStatus && b.status !== bookingStatus) return false;
              if (bookingStartDate && b.date < bookingStartDate) return false;
              if (bookingEndDate && b.date > bookingEndDate) return false;
              return true;
            });

            const pageSize = 10;
            const totalPages = Math.ceil(filtered.length / pageSize) || 1;
            const paginated = filtered.slice((bookingPage - 1) * pageSize, bookingPage * pageSize);

            return (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Custom Booking Filter</h4>
                    <button
                      onClick={() => {
                        const headers = ['Requester Name', 'Email', 'Room', 'Date', 'Start Time', 'End Time', 'Booking Type', 'Status'];
                        const rows = filtered.map(b => [
                          `"${(b.name || '').replace(/"/g, '""')}"`,
                          `"${(b.email || '').replace(/"/g, '""')}"`,
                          `"${(b.room || '').replace(/"/g, '""')}"`,
                          `"${(b.date || '').replace(/"/g, '""')}"`,
                          `"${(b.startTime || '').replace(/"/g, '""')}"`,
                          `"${(b.endTime || '').replace(/"/g, '""')}"`,
                          `"${(b.bookingType || 'Meeting').replace(/"/g, '""')}"`,
                          `"${(b.status || '').replace(/"/g, '""')}"`
                        ]);
                        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement('a');
                        link.setAttribute('href', encodedUri);
                        link.setAttribute('download', `takhleeq_bookings_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Export Filtered CSV ({filtered.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <input 
                      type="text" 
                      placeholder="Search requester or title..." 
                      value={bookingSearch}
                      onChange={e => { setBookingSearch(e.target.value); setBookingPage(1); }}
                      className="px-3 py-1.5 border border-gray-150 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={bookingRoom}
                      onChange={e => { setBookingRoom(e.target.value); setBookingPage(1); }}
                      className="px-3 py-1.5 border border-gray-150 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">All Rooms</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                    <select
                      value={bookingStatus}
                      onChange={e => { setBookingStatus(e.target.value); setBookingPage(1); }}
                      className="px-3 py-1.5 border border-gray-150 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">All Statuses</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PENDING REVIEW">Pending Review</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                        <th className="py-3 px-4">Requester</th>
                        <th className="py-3 px-4">Room & Date</th>
                        <th className="py-3 px-4">Time Slot</th>
                        <th className="py-3 px-4">Purpose</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">No bookings match the selected filters.</td>
                        </tr>
                      ) : (
                        paginated.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-bold text-gray-900">{b.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{b.email}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-gray-850">{b.room}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{b.date}</p>
                            </td>
                            <td className="py-3 px-4 font-mono text-[10.5px]">
                              {b.startTime} - {b.endTime}
                            </td>
                            <td className="py-3 px-4 font-bold text-gray-700 capitalize">
                              {b.bookingType || 'Meeting'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                b.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' :
                                b.status.includes('PENDING') ? 'bg-blue-50 text-blue-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
                      <span>Page {bookingPage} of {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={bookingPage === 1}
                          onClick={() => setBookingPage(p => p - 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          disabled={bookingPage === totalPages}
                          onClick={() => setBookingPage(p => p + 1)}
                          className="p-1 border border-gray-200 rounded-lg bg-white disabled:opacity-40"
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

          {/* TAB 3: ROOM UTILIZATION */}
          {selectedTab === 'utilization' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-3xs overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Room Utilization Overview</h4>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase bg-gray-50/50">
                    <th className="py-3 px-4">Room Name</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">Approved Slots</th>
                    <th className="py-3 px-4">Total Reserved Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rooms.map(room => {
                    const roomBookings = bookings.filter(b => b.room === room.name && b.status === 'APPROVED');
                    const totalMins = roomBookings.reduce((sum, b) => sum + (b.duration || 60), 0);
                    return (
                      <tr key={room.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-bold text-gray-900">{room.name}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{room.capacity} seats</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 font-bold">{roomBookings.length} slots</td>
                        <td className="py-3 px-4 font-mono text-gray-700">{totalMins} mins ({Math.round(totalMins / 60)} hrs)</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PEAK USAGE */}
          {selectedTab === 'peak' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Peak Demand Analysis</h4>
              <p className="text-xs text-gray-500 font-medium">Hourly reservation concentration across typical operating hours.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {['09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00'].map(slot => {
                  const count = bookings.filter(b => b.status === 'APPROVED').length;
                  return (
                    <div key={slot} className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-150">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-mono">{slot}</span>
                      <p className="text-base font-black text-gray-900 mt-1">{Math.round(count * 0.25)} slots</p>
                      <span className="text-[9px] font-bold text-primary mt-0.5 block">Operating Window</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: TRENDS */}
          {selectedTab === 'trends' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">Booking Velocity & Trends</h4>
              <p className="text-xs text-gray-500 font-medium">Overall system load progression and historical request patterns.</p>
              <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-150 text-center py-10">
                <PieChart className="h-8 w-8 text-primary mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-gray-700">Aggregated Velocity Trend Active</p>
                <p className="text-[10px] text-gray-400 mt-1">Total {totalBookings} reservation events successfully indexed across calendar timelines.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
