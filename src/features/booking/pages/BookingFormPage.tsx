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
  Copy,
  Search
} from 'lucide-react';
import { Room, BookingType } from '../../../types';
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
  const [bookingType, setBookingType] = useState('Student societies');
  const [expectedAttendance, setExpectedAttendance] = useState('');
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch dynamic booking types on mount
  useEffect(() => {
    fetch('/api/booking-types')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch booking types');
        return res.json();
      })
      .then((data: BookingType[]) => {
        const activeTypes = data.filter(bt => bt.isActive !== false);
        setBookingTypes(activeTypes);
        if (activeTypes.length > 0) {
          // Default to the first active booking type
          setBookingType(activeTypes[0].name);
        }
      })
      .catch(err => {
        console.error('Error loading booking types:', err);
        // Fallback to initial seed types if backend fails
        const fallback: BookingType[] = [
          { id: 1, name: 'Student societies', isActive: true },
          { id: 2, name: 'Startup teams', isActive: true },
          { id: 3, name: 'Faculty members', isActive: true },
          { id: 4, name: 'Department representatives', isActive: true },
          { id: 5, name: 'Cohort members', isActive: true },
          { id: 6, name: 'Entrepreneurs in residence', isActive: true },
          { id: 7, name: 'Professionals in residence', isActive: true }
        ];
        setBookingTypes(fallback);
        setBookingType('Student societies');
      });
  }, []);
  const [successData, setSuccessData] = useState<{ id: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync email on simulation identity change
  useEffect(() => {
    setEmail(selectedUserEmail);
  }, [selectedUserEmail]);

  // Find room parameters
  const selectedRoomObj = rooms.find(r => r.name === room);

  // Dynamically compute permitted booking types based on selected room
  const availableBookingTypes = React.useMemo(() => {
    if (!selectedRoomObj || !selectedRoomObj.allowedBookingTypes || selectedRoomObj.allowedBookingTypes.length === 0) {
      return bookingTypes;
    }

    const allowedList = selectedRoomObj.allowedBookingTypes;

    // Filter active bookingTypes that match the room's allowed list
    const matched = bookingTypes.filter(bt =>
      allowedList.some(a => a.trim().toLowerCase() === bt.name.trim().toLowerCase())
    );

    // Also include any allowed strings from room configuration if not already in bookingTypes
    const existingLower = new Set(matched.map(m => m.name.trim().toLowerCase()));
    const extras: BookingType[] = allowedList
      .filter(a => !existingLower.has(a.trim().toLowerCase()))
      .map((a, idx) => ({
        id: 9900 + idx,
        name: a,
        isActive: true
      }));

    return [...matched, ...extras];
  }, [selectedRoomObj, bookingTypes]);

  // When room selection or available booking types change, ensure selected bookingType is valid for the room
  useEffect(() => {
    if (availableBookingTypes.length > 0) {
      const isValid = availableBookingTypes.some(
        bt => bt.name.trim().toLowerCase() === bookingType.trim().toLowerCase()
      );
      if (!isValid) {
        setBookingType(availableBookingTypes[0].name);
      }
    }
  }, [availableBookingTypes, bookingType]);

  // Real-time Validations
  const getNameValidationError = (val: string) => {
    if (/\d/.test(val)) {
      return "Name must not contain numbers/digits.";
    }
    if (val.trim() !== '' && !/^[a-zA-Z\s.'-]*$/.test(val)) {
      return "Name can only contain alphabetic characters, spaces, and standard punctuation (., \', -).";
    }
    return null;
  };

  const nameError = getNameValidationError(name);

  const getOrganizationValidationError = (val: string) => {
    if (/\d/.test(val)) {
      return "Organization name must not contain numbers/digits.";
    }
    if (val.trim() !== '' && !/^[a-zA-Z\s.'-]*$/.test(val)) {
      return "Organization name can only contain alphabetic characters, spaces, and standard punctuation (., \', -).";
    }
    return null;
  };

  const organizationError = getOrganizationValidationError(organization);

  const getPhoneValidationError = (val: string) => {
    if (val.trim() === '') return null;
    if (/[^\d]/.test(val)) {
      return "Phone number must contain only digits (no characters or symbols allowed).";
    }
    if (val.length !== 11) {
      return `Phone number must be exactly 11 digits long (currently ${val.length} digits).`;
    }
    return null;
  };

  const phoneError = getPhoneValidationError(phone);

  const attendanceNum = parseInt(expectedAttendance, 10);
  const isAttendanceOverCapacity = selectedRoomObj && !isNaN(attendanceNum) && attendanceNum > selectedRoomObj.capacity;
  const attendanceError = isAttendanceOverCapacity 
    ? `Expected attendance exceeds the selected space's maximum capacity (${selectedRoomObj.capacity} persons).` 
    : (attendanceNum < 0 ? "Expected attendance cannot be negative." : null);

  const getOperatingHoursError = () => {
    if (!selectedRoomObj) return null;
    if (!startTime || !endTime) return null;
    
    // Parse operatingHours, e.g., "09:00 - 17:00"
    const parts = selectedRoomObj.operatingHours.split('-');
    if (parts.length !== 2) return null;
    
    const opStart = parts[0].trim();
    const opEnd = parts[1].trim();
    
    if (startTime < opStart) {
      return `Selected start time (${startTime}) is before the room's opening hours (${opStart}).`;
    }
    if (endTime > opEnd) {
      return `Selected end time (${endTime}) is after the room's closing hours (${opEnd}).`;
    }
    if (startTime >= endTime) {
      return "Start time must be strictly before end time.";
    }
    
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const durationMins = (eH * 60 + eM) - (sH * 60 + sM);
    
    if (durationMins < selectedRoomObj.minBookingDuration) {
      return `Booking duration (${durationMins} mins) is below the room's minimum threshold (${selectedRoomObj.minBookingDuration} mins).`;
    }
    if (durationMins > selectedRoomObj.maxBookingDuration) {
      return `Booking duration (${durationMins} mins) exceeds the room's maximum threshold (${selectedRoomObj.maxBookingDuration} mins).`;
    }
    
    return null;
  };

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMaxBookingDateString = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekendError = () => {
    if (!date) return null;
    const parts = date.split('-').map(Number);
    if (parts.length === 3) {
      const selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayOfWeek = selectedDate.getDay(); // 0 is Sunday, 6 is Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return "Bookings are only allowed on working days (Monday to Friday). Saturday and Sunday bookings are not permitted.";
      }
    }
    return null;
  };

  const getPastDateTimeError = () => {
    if (!date || !startTime) return null;
    const todayStr = getLocalDateString();
    const maxDateStr = getMaxBookingDateString();
    
    if (date < todayStr) {
      return "Booking date cannot be in the past.";
    }

    if (date > maxDateStr) {
      return `Booking date must be within the next three months (up to ${maxDateStr}).`;
    }
    
    if (date === todayStr) {
      const d = new Date();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const nowTimeStr = `${hours}:${minutes}`;
      if (startTime < nowTimeStr) {
        return `Start time (${startTime}) cannot be in the past. It is currently ${nowTimeStr}.`;
      }
    }
    return null;
  };

  const operatingHoursError = getOperatingHoursError();
  const pastDateTimeError = getPastDateTimeError();
  const weekendError = getWeekendError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessData(null);

    // Client-side Validations
    if (nameError) {
      setErrorMsg(`Validation Error: ${nameError}`);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Validation Error: Invalid email address format.");
      return;
    }

    if (phoneError) {
      setErrorMsg(`Validation Error: ${phoneError}`);
      return;
    }

    if (organizationError) {
      setErrorMsg(`Validation Error: ${organizationError}`);
      return;
    }

    if (isNaN(attendanceNum) || attendanceNum < 0) {
      setErrorMsg("Validation Error: Expected Attendance cannot be negative.");
      return;
    }

    if (attendanceError) {
      setErrorMsg(`Validation Error: ${attendanceError}`);
      return;
    }

    if (weekendError) {
      setErrorMsg(`Validation Error: ${weekendError}`);
      return;
    }

    if (pastDateTimeError) {
      setErrorMsg(`Validation Error: ${pastDateTimeError}`);
      return;
    }

    if (operatingHoursError) {
      setErrorMsg(`Validation Error: ${operatingHoursError}`);
      return;
    }

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
        id: result?.booking?.id || result?.booking?.booking_id || 'TBK-2026',
        message: result?.message || 'Your space booking request has been submitted.'
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
    <div className="w-full max-w-5xl mx-auto space-y-6" id="takhleeq-booking-form-page">
      
        {/* Breadcrumb path */}
        <nav className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="hover:text-primary cursor-pointer" onClick={() => onNavigate('/')}>Takhleeq</span>
          <span>/</span>
          <span className="text-gray-800">Booking Portal</span>
        </nav>

        {/* BLOCKING SUCCESS CONFIRMATION MODAL */}
        {successData && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" id="booking-success-modal-overlay">
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-emerald-100 text-center space-y-6 relative overflow-hidden animate-scale-up">
              
              <div className="h-20 w-20 bg-emerald-50 border-2 border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-12 w-12 animate-bounce" />
              </div>

              <div className="space-y-2">
                <span className="inline-block bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Status: Request Pending Approval
                </span>
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Your Request is Pending Approval</h2>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Your space booking request has been logged in the system. Our operations team is reviewing it and you can check live progress anytime.
                </p>
              </div>

              {/* Reference ID Box */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 space-y-2.5">
                <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">Your Booking Tracking Code</span>
                <div className="flex items-center justify-center gap-3 bg-white border border-emerald-200 rounded-xl px-4 py-3 shadow-xs">
                  <span className="font-mono text-lg font-black text-primary select-all tracking-wider">{successData.id}</span>
                  <button 
                    onClick={() => copyToClipboard(successData.id)}
                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    title="Copy Reference Code"
                  >
                    <Copy className="h-4.5 w-4.5" />
                  </button>
                </div>
                {copied && <p className="text-[10px] text-emerald-600 font-bold">Copied code to clipboard!</p>}
                <p className="text-[11px] text-emerald-800 font-medium">{successData.message}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button 
                  onClick={() => onNavigate(`/track?token=${successData.id}`)}
                  className="w-full sm:w-auto flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" /> Track Status Page
                </button>
                <button 
                  onClick={() => setSuccessData(null)}
                  className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Close & Submit Another
                </button>
              </div>

            </div>
          </div>
        )}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="booking-form-card">
            
            {/* Header cover banner */}
            <div className="bg-primary px-6 py-6 text-white text-left relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
              <div className="relative z-10 space-y-1">
                <span className="text-accent text-[9px] font-black uppercase tracking-widest block">Operational Space Request</span>
                <h2 className="text-base font-black uppercase tracking-wider">Public Space Booking Form</h2>
                <p className="text-[11px] text-white/80 max-w-3xl leading-relaxed">
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
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center">
                          <User className={`h-4 w-4 ${nameError ? 'text-rose-500' : 'text-gray-400'}`} />
                        </span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Usman Ghani"
                          className={`w-full pl-9.5 pr-3 py-2.5 border rounded-xl text-xs font-medium transition-colors ${
                            nameError 
                              ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 focus:border-rose-500' 
                              : 'border-gray-200 focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800'
                          }`}
                        />
                      </div>
                      {nameError && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1.5 animate-fade-in flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                          <span>{nameError}</span>
                        </p>
                      )}
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
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center">
                          <Phone className={`h-4 w-4 ${phoneError ? 'text-rose-500' : 'text-gray-400'}`} />
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="e.g. 03001234567"
                          className={`w-full pl-9.5 pr-3 py-2.5 border rounded-xl text-xs font-medium transition-colors ${
                            phoneError 
                              ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 focus:border-rose-500' 
                              : 'border-gray-200 focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800'
                          }`}
                        />
                      </div>
                      {phoneError ? (
                        <p className="text-[10px] text-rose-600 font-bold mt-1.5 animate-fade-in flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                          <span>{phoneError}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1">Must be exactly 11 digits (numbers only).</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Organization Name <span className="text-gray-400">(Optional)</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center">
                          <Building className={`h-4 w-4 ${organizationError ? 'text-rose-500' : 'text-gray-400'}`} />
                        </span>
                        <input
                          type="text"
                          value={organization}
                          onChange={e => setOrganization(e.target.value)}
                          placeholder="e.g. ACM Society / PixelCraft Startup"
                          className={`w-full pl-9.5 pr-3 py-2.5 border rounded-xl text-xs font-medium transition-colors ${
                            organizationError 
                              ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 focus:border-rose-500' 
                              : 'border-gray-200 focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800'
                          }`}
                        />
                      </div>
                      {organizationError && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1.5 animate-fade-in flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                          <span>{organizationError}</span>
                        </p>
                      )}
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
                      <label className="block text-xs font-bold text-gray-700 mb-1">Select Room <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={room}
                        onChange={e => setRoom(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer"
                      >
                        <option value="">-- Choose Space First --</option>
                        {rooms.filter(r => r.isActive).map(r => (
                          <option key={r.id} value={r.name}>{r.name} (Cap. {r.capacity})</option>
                        ))}
                      </select>
                      {selectedRoomObj ? (
                        <p className="text-[10px] text-emerald-700 font-medium mt-1">
                          Space selected: {selectedRoomObj.name}
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Select a room to view permitted booking categories.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Booking Type <span className="text-red-500">*</span></label>
                      <select
                        value={bookingType}
                        onChange={e => setBookingType(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer"
                      >
                        {availableBookingTypes.map(bt => (
                          <option key={bt.id} value={bt.name}>{bt.name}</option>
                        ))}
                      </select>
                      {selectedRoomObj ? (
                        <p className="text-[10px] text-emerald-700 font-medium mt-1">
                          Permitted categories for {selectedRoomObj.name} ({availableBookingTypes.length} available).
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Showing default categories.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Expected Attendance <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center">
                          <Users className={`h-4 w-4 ${attendanceError ? 'text-rose-500' : 'text-gray-400'}`} />
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          value={expectedAttendance}
                          onChange={e => setExpectedAttendance(e.target.value)}
                          placeholder="e.g. 15"
                          className={`w-full pl-9.5 pr-3 py-2.5 border rounded-xl text-xs font-medium transition-colors ${
                            attendanceError 
                              ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 focus:border-rose-500' 
                              : 'border-gray-200 focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800'
                          }`}
                        />
                      </div>
                      {attendanceError ? (
                        <p className="text-[10px] text-rose-600 font-bold mt-1.5 animate-fade-in flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                          <span>{attendanceError}</span>
                        </p>
                      ) : selectedRoomObj ? (
                        <p className="text-[10px] text-gray-400 mt-1">Maximum allowed for {selectedRoomObj.name} is {selectedRoomObj.capacity} persons.</p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1">Please select a room to check maximum allowed capacity.</p>
                      )}
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
                        min={getLocalDateString()}
                        max={getMaxBookingDateString()}
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800 font-medium cursor-pointer ${
                          pastDateTimeError || weekendError
                            ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500' 
                            : 'border-gray-200'
                        }`}
                      />
                      {weekendError && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium leading-tight">{weekendError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          operatingHoursError || (pastDateTimeError && date === getLocalDateString())
                            ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 focus:border-rose-500' 
                            : 'border-gray-200 focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">End Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          operatingHoursError 
                            ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-500 focus:border-rose-500' 
                            : 'border-gray-200 focus:ring-1 focus:ring-primary focus:border-primary bg-white text-gray-800'
                        }`}
                      />
                    </div>
                  </div>
                  {pastDateTimeError && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1.5 animate-fade-in flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span>{pastDateTimeError}</span>
                    </p>
                  )}
                  {operatingHoursError && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1.5 animate-fade-in flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span>{operatingHoursError}</span>
                    </p>
                  )}
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

    </div>
  );
}
