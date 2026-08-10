import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Clock, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Building,
  Radio,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Room, Booking } from '../../../types';
import { bookingsApi } from '../services/bookings.api';

// ROOM COLOR MAPPING — Pill and badge styling for each facility room
export const ROOM_COLORS: Record<string, { bg: string; text: string; border: string; badge: string; dot: string }> = {
  "Board Room": {
    bg: "bg-red-500/10 text-red-300 border-red-500/30",
    text: "text-red-400",
    border: "border-red-500/40",
    badge: "bg-red-500/20 text-red-300 border-red-500/40 font-bold",
    dot: "bg-red-500"
  },
  "Presentation Hall": {
    bg: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    text: "text-blue-400",
    border: "border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold",
    dot: "bg-blue-500"
  },
  "Cube 1": {
    bg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    text: "text-amber-400",
    border: "border-amber-500/40",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold",
    dot: "bg-amber-500"
  },
  "Cube 2": {
    bg: "bg-teal-500/10 text-teal-300 border-teal-500/30",
    text: "text-teal-400",
    border: "border-teal-500/40",
    badge: "bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold",
    dot: "bg-teal-500"
  },
  "Podcast Room": {
    bg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    text: "text-purple-400",
    border: "border-purple-500/40",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold",
    dot: "bg-purple-500"
  }
};

export function getRoomColor(roomName: string) {
  if (!roomName) {
    return {
      bg: "bg-slate-500/10 text-slate-300 border-slate-500/30",
      text: "text-slate-400",
      border: "border-slate-500/40",
      badge: "bg-slate-500/20 text-slate-300 border-slate-500/40 font-bold",
      dot: "bg-slate-400"
    };
  }
  if (ROOM_COLORS[roomName]) return ROOM_COLORS[roomName];
  const matchedKey = Object.keys(ROOM_COLORS).find(k => k.toLowerCase() === roomName.trim().toLowerCase());
  if (matchedKey) return ROOM_COLORS[matchedKey];

  return {
    bg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    text: "text-indigo-400",
    border: "border-indigo-500/40",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold",
    dot: "bg-indigo-500"
  };
}

interface PublicRoomDisplayPageProps {
  rooms?: Room[];
  bookings?: Booking[];
  onRefresh?: () => void;
  onNavigate?: (path: string) => void;
}

export function PublicRoomDisplayPage({ onRefresh: parentOnRefresh }: PublicRoomDisplayPageProps) {
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [upcomingWeek, setUpcomingWeek] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // 1. DATA REFETCH TIMER (every 20 seconds)
  const fetchUnifiedData = async (showRefresher = false) => {
    if (showRefresher) setIsRefreshing(true);
    try {
      const res = await bookingsApi.getTodayAllRooms();
      if (res && res.today) {
        setTodayBookings(res.today);
        setUpcomingWeek(res.upcomingWeek || []);
      }
      if (parentOnRefresh) parentOnRefresh();
    } catch (err) {
      console.error('Failed to load unified signage schedule:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUnifiedData();
    const dataRefetchInterval = setInterval(() => {
      fetchUnifiedData();
    }, 20000); // 20 seconds

    return () => clearInterval(dataRefetchInterval);
  }, []);

  // 2. SEPARATE LOCAL COUNTDOWN / CLOCK TICKER (1000ms ticker, pure client-side)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNowMs(Date.now());
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  // Split ongoing vs upcoming
  const ongoing = todayBookings.filter(b => b.is_ongoing);
  const upcomingToday = todayBookings.filter(b => !b.is_ongoing && b.is_upcoming);

  // Formatted clock strings
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Countdown renderer helper for ongoing items
  const renderOngoingCountdown = (endTimestamp: number, fallbackMins: number) => {
    if (!endTimestamp) {
      return `${fallbackMins} min remaining`;
    }
    const diffMs = endTimestamp - nowMs;
    if (diffMs <= 0) return 'Ending now';
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `Ends in ${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `Ends in ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-slate-100 flex flex-col font-sans select-none antialiased" id="public-unified-signage-page">
      
      {/* HEADER BAR */}
      <header className="bg-[#121620] border-b border-slate-800/80 px-6 py-4 flex flex-wrap justify-between items-center gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-primary/20 border border-primary/40 rounded-2xl flex items-center justify-center text-primary shadow-inner">
            <Tv className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-black tracking-widest text-white uppercase">Takhleeq Central Signage</h1>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> Live Facility Feed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Unified Real-time Space Activity & Today's Reservations</p>
          </div>
        </div>

        {/* Digital Clock & Date Display */}
        <div className="flex items-center gap-6 bg-[#181D2A] border border-slate-800 rounded-2xl px-5 py-2.5 shadow-sm">
          <div className="text-right">
            <div className="text-2xl font-mono font-black text-amber-400 tracking-wider">{formattedTime}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formattedDate}</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <button 
            onClick={() => fetchUnifiedData(true)}
            className={`p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-all ${isRefreshing ? 'animate-spin text-amber-400' : ''}`}
            title="Refresh Facility Feed"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT CONTENT */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* LEFT & CENTER PANELS: TODAY'S ACTIVITY (ONGOING & UPCOMING) */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* SECTION 1: ONGOING NOW (Only renders if ongoing.length > 0) */}
          {ongoing.length > 0 && (
            <section className="space-y-3" id="ongoing-activity-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <h2 className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                    Ongoing Sessions Now ({ongoing.length})
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Active Space Utilization</span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {ongoing.map((b) => {
                  const colors = getRoomColor(b.room);
                  return (
                    <div 
                      key={b.id} 
                      className="bg-[#121824] border-2 border-emerald-500/60 rounded-2xl p-4.5 shadow-xl shadow-emerald-950/20 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-emerald-400"
                    >
                      {/* Left accent bar */}
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-emerald-500" />

                      <div className="pl-2 space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Room Badge */}
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-md border ${colors.badge} uppercase tracking-wider flex items-center gap-1.5`}>
                            <Building className="h-3 w-3" />
                            {b.room}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-md border border-slate-700">
                            {b.bookingType || 'Event'}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
                          {b.eventTitle || b.purpose || 'Active Meeting'}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Users className="h-3.5 w-3.5 text-slate-400" /> {b.name} {b.organization ? `(${b.organization})` : ''}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300 font-mono">
                            <Clock className="h-3.5 w-3.5 text-slate-400" /> {b.startTime} - {b.endTime}
                          </span>
                        </div>
                      </div>

                      {/* Countdown badge */}
                      <div className="shrink-0 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2 text-center self-stretch sm:self-center flex flex-col justify-center items-center">
                        <span className="text-[9px] font-black uppercase text-emerald-400/80 tracking-widest">Live Status</span>
                        <span className="text-sm font-mono font-black text-emerald-400">
                          {renderOngoingCountdown(b.end_timestamp, b.remaining_minutes)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION 2: UPCOMING TODAY */}
          <section className="space-y-3 flex-1" id="upcoming-today-section">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest">
                  Upcoming Today Across All Rooms ({upcomingToday.length})
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Time Sorted</span>
            </div>

            {isLoading ? (
              <div className="bg-[#121620] border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-400" />
                <p className="text-xs font-medium">Fetching real-time facility schedule...</p>
              </div>
            ) : upcomingToday.length === 0 ? (
              <div className="bg-[#121620]/60 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">No Further Bookings Scheduled Today</h3>
                <p className="text-xs text-slate-500">All spaces are open for unscheduled reservation requests for the rest of today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {upcomingToday.map((b) => {
                  const colors = getRoomColor(b.room);
                  return (
                    <div 
                      key={b.id}
                      className="bg-[#121620] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Colored Room Badge */}
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-md border ${colors.badge} uppercase tracking-wider`}>
                            {b.room}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-md border border-slate-700/60">
                            {b.bookingType || 'Event'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-100">
                          {b.eventTitle || b.purpose || 'Reserved Slot'}
                        </h4>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          <span>{b.name} {b.organization ? `• ${b.organization}` : ''}</span>
                        </div>
                      </div>

                      {/* Time slot pill */}
                      <div className="shrink-0 bg-[#1A202C] border border-slate-700/60 rounded-xl px-3.5 py-2 text-right">
                        <div className="text-xs font-mono font-extrabold text-amber-400 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-400/80" />
                          {b.startTime} - {b.endTime}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">Today</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* RIGHT PANEL: UPCOMING LATER THIS WEEK (ROOM AGNOSTIC) */}
        <div className="bg-[#121620] border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest">
                Facility Schedule (Rest of Week)
              </h2>
            </div>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-full">
              {upcomingWeek.length} Sessions
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="p-6 text-center text-slate-500 text-xs">Loading upcoming weekly schedule...</div>
            ) : upcomingWeek.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs space-y-1">
                <p className="font-bold text-slate-400">No Upcoming Week Bookings</p>
                <p>No further sessions registered for the remaining week.</p>
              </div>
            ) : (
              upcomingWeek.map((b) => {
                const colors = getRoomColor(b.room);
                return (
                  <div 
                    key={b.id}
                    className="bg-[#181E2B]/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9.5px] px-2 py-0.5 rounded border ${colors.badge} uppercase tracking-wider`}>
                        {b.room}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                        {b.date}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">
                      {b.eventTitle || b.purpose || 'Reserved Session'}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[150px]">{b.name}</span>
                      <span className="font-mono text-slate-300 font-medium">{b.startTime} - {b.endTime}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-400" /> Auto-updating real-time display
          </div>
        </div>

      </div>
    </div>
  );
}
