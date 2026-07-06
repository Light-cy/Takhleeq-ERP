import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Building, 
  Users, 
  Info, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  MapPin,
  HelpCircle,
  Copy
} from 'lucide-react';
import { Room } from '../../../types';
import { bookingsApi } from '../services/bookings.api';

interface BookingFormPageProps {
  rooms: Room[];
  selectedUserEmail: string;
  onBookingSubmitted: () => void;
  onNavigate: (path: string) => void;
}

export function BookingFormPage({ rooms, selectedUserEmail, onBookingSubmitted, onNavigate }: BookingFormPageProps) {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState(selectedUserEmail);
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [room, setRoom] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [bookingType, setBookingType] = useState('Student Society');
  const [expectedAttendance, setExpectedAttendance] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ id: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync email on simulation identity change
  useEffect(() => {
    setEmail(selectedUserEmail);
  }, [selectedUserEmail]);

  // Find room parameters
  const selectedRoomObj = rooms.find(r => r.name === room);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessData(null);
    setSubmitting(true);

    try {
      const result = await bookingsApi.submit({
        name,
        email,
        phone,
        organization,
        room,
        date,
        startTime,
        endTime,
        eventTitle,
        eventDescription,
        bookingType,
        expectedAttendance
      });

      setSuccessData({
        id: result.booking.id,
        message: result.message
      });

      // Reset form fields
      setName('');
      setPhone('');
      setOrganization('');
      setRoom('');
      setDate('');
      setStartTime('09:00');
      setEndTime('10:00');
      setEventTitle('');
      setEventDescription('');
      setExpectedAttendance('');
      
      onBookingSubmitted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting booking request');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0]/30 font-sans flex flex-col" id="takhleeq-booking-form-page">
      
      {/* Header Top Navbar */}
      <header className="bg-white border-b border-gray-100/80 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('/')}
            className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-primary tracking-tight">Takhleeq Public Space Booker</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">University of Central Punjab</p>
          </div>
        </div>

        <button 
          onClick={() => onNavigate('/track')}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
        >
          Track Bookings
        </button>
      </header>

      {/* Main Form container */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8 space-y-6">
        
        {/* Breadcrumb path */}
        <nav className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="hover:text-primary cursor-pointer" onClick={() => onNavigate('/')}>Takhleeq</span>
          <span>/</span>
          <span className="text-gray-800">Booking Portal</span>
        </nav>

        {successData ? (
          <div className="bg-white border border-green-100 rounded-2xl shadow-lg p-8 text-center space-y-6 animate-fade-in" id="booking-success-panel">
            <div className="h-16 w-16 bg-green-50 border border-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Booking Submitted Successfully</h2>
              <p className="text-xs text-gray-500">Your space reservation has been created and logged in the central verification stream.</p>
            </div>

            {/* Prominent booking ID highlight */}
            <div className="bg-green-50/50 border border-green-100 rounded-2xl p-6 max-w-md mx-auto space-y-3">
              <span className="text-[10px] text-green-700 font-black uppercase tracking-wider block">Reference Booking ID</span>
              <div className="flex items-center justify-center gap-3 bg-white border border-green-100 rounded-xl px-4 py-3 max-w-xs mx-auto">
                <span className="font-mono text-base font-black text-primary select-all">{successData.id}</span>
                <button 
                  onClick={() => copyToClipboard(successData.id)}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  title="Copy Reference ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copied && <p className="text-[10px] text-green-600 font-semibold">Copied Reference ID to clipboard!</p>}
              <p className="text-[11px] text-green-700 leading-normal font-medium mt-2">{successData.message}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-gray-50">
              <button 
                onClick={() => setSuccessData(null)}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Submit Another
              </button>
              <button 
                onClick={() => onNavigate('/track')}
                className="bg-primary hover:bg-primary/95 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Track Status
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="booking-form-card">
            
            {/* Header cover banner */}
            <div className="bg-primary px-6 py-6 text-white text-left relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
              <div className="relative z-10 space-y-1">
                <span className="text-accent text-[9px] font-black uppercase tracking-widest block">Operational Space Request</span>
                <h2 className="text-base font-black uppercase tracking-wider">Public Space Booking Form</h2>
                <p className="text-[11px] text-white/80 max-w-xl leading-relaxed">
                  Incubation startups, departmental managers, and UCP-affiliated student societies can reserve co-working desks, panels, and auditoriums.
                </p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {errorMsg && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex gap-3 text-left">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h3 className="font-bold uppercase tracking-wider text-rose-800">Submission Refused</h3>
                    <p className="text-rose-700 mt-1">{errorMsg}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8 text-left">
                
                {/* SECTION 1 */}
                <div className="space-y-4">
                  <div className="bg-primary/5 text-primary text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>1. Requester Information</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <User className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Usman Ghani"
                          className="w-full pl-9.5 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="e.g. student@ucp.edu.pk"
                          className="w-full pl-9.5 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Checked automatically against banned registry on submit.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <Phone className="h-4 w-4" />
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="e.g. +923001234567"
                          className="w-full pl-9.5 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Organization Name <span className="text-gray-400">(Optional)</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <Building className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          value={organization}
                          onChange={e => setOrganization(e.target.value)}
                          placeholder="e.g. ACM Society / PixelCraft Startup"
                          className="w-full pl-9.5 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 */}
                <div className="space-y-4">
                  <div className="bg-primary/5 text-primary text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>2. Space & Event Details</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Booking Type <span className="text-red-500">*</span></label>
                      <select
                        value={bookingType}
                        onChange={e => setBookingType(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer"
                      >
                        <option value="Student Society">Student Society</option>
                        <option value="Cohort Startup">Cohort Startup</option>
                        <option value="Department">Department</option>
                        <option value="Meeting / Event">Meeting / Event</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Select Room <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={room}
                        onChange={e => setRoom(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer"
                      >
                        <option value="">-- Choose Space --</option>
                        {rooms.filter(r => r.isActive).map(r => (
                          <option key={r.id} value={r.name}>{r.name} (Cap. {r.capacity})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Expected Attendance <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <Users className="h-4 w-4" />
                        </span>
                        <input
                          type="number"
                          required
                          value={expectedAttendance}
                          onChange={e => setExpectedAttendance(e.target.value)}
                          placeholder="e.g. 15"
                          className="w-full pl-9.5 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selected room policies */}
                  {selectedRoomObj && (
                    <div className="p-4 bg-[#F8F5F0] rounded-xl text-xs border border-amber-200/40 text-gray-700 space-y-2 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-primary font-bold">
                        <Info className="h-4 w-4 text-accent" />
                        <span>Room Guidelines: {selectedRoomObj.name}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-gray-600 font-medium">
                        <div><strong>Capacity limit:</strong> {selectedRoomObj.capacity} persons</div>
                        <div><strong>Hours of use:</strong> {selectedRoomObj.operatingHours}</div>
                        <div><strong>Min duration:</strong> {selectedRoomObj.minBookingDuration} mins</div>
                        <div><strong>Max duration:</strong> {selectedRoomObj.maxBookingDuration} mins</div>
                      </div>
                      <p className="text-[11px] text-gray-500 border-t border-gray-200/50 pt-1.5 mt-1.5"><strong>Purpose Restriction:</strong> {selectedRoomObj.purpose}</p>
                    </div>
                  )}
                </div>

                {/* SECTION 3 */}
                <div className="space-y-4">
                  <div className="bg-primary/5 text-primary text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>3. Date & Time Scheduling</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Booking Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">End Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4 */}
                <div className="space-y-4">
                  <div className="bg-primary/5 text-primary text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>4. Purpose & Descriptions</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Event/Meeting Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={eventTitle}
                        onChange={e => setEventTitle(e.target.value)}
                        placeholder="e.g. Incubation Pitching Webinar"
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Detailed Event/Meeting Description <span className="text-red-500">*</span></label>
                      <textarea
                        required
                        rows={3}
                        value={eventDescription}
                        onChange={e => setEventDescription(e.target.value)}
                        placeholder="Provide details about what you plan to accomplish in the space..."
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-5 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/95 text-white font-bold py-3 px-8 rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                  >
                    {submitting ? 'Submitting Request...' : 'Submit Booking Request'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
