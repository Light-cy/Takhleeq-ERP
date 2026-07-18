import React from 'react';
import { Filter, Search, FileSpreadsheet } from 'lucide-react';
import { Room, Booking } from '../../../types';

interface BookingFilterToolbarProps {
  rooms: Room[];
  bookings: Booking[];
  filteredBookings: Booking[];
  filterRoom: string;
  setFilterRoom: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterBookingType: string;
  setFilterBookingType: (val: string) => void;
  filterStartDate: string;
  setFilterStartDate: (val: string) => void;
  filterEndDate: string;
  setFilterEndDate: (val: string) => void;
  searchVal: string;
  setSearchVal: (val: string) => void;
  searchTerm: string;
  handleExportData: () => void;
}

export function BookingFilterToolbar({
  rooms,
  bookings,
  filteredBookings,
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
  handleExportData
}: BookingFilterToolbarProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-3xs space-y-4 text-left">
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
  );
}
