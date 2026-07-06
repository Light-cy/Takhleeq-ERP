import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, Building, Users, Info, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Room } from '../types';

interface BookingFormProps {
  rooms: Room[];
  selectedUserEmail: string;
  onBookingSubmitted: () => void;
}

export function BookingForm({ rooms, selectedUserEmail, onBookingSubmitted }: BookingFormProps) {
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

  // Sync email if user changes simulation
  useEffect(() => {
    setEmail(selectedUserEmail);
  }, [selectedUserEmail]);

  // Selected room details
  const selectedRoomObj = rooms.find(r => r.name === room);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessData(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': email
        },
        body: JSON.stringify({
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
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong during submission');
      }

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

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden" id="booking-form-module">
      <div className="bg-primary px-6 py-5 text-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Public Space Booking Request Form</h2>
          <p className="text-xs text-white/80">UCP affiliated societies, cohort startups, & faculty members can request event spaces</p>
        </div>
        <span className="text-xs bg-accent text-primary font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          MOD-01A Usage
        </span>
      </div>

      <div className="p-6 md:p-8">
        {successData && (
          <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-xl text-green-900 flex gap-4 animate-fade-in">
            <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Booking Request Submitted Successfully</h3>
              <p className="text-xs text-green-700 mt-1">
                Your request ID is <strong className="font-mono text-primary bg-white px-2 py-0.5 rounded border border-green-200">{successData.id}</strong>.
              </p>
              <p className="text-xs text-green-700 mt-2">{successData.message}</p>
              <button 
                onClick={() => setSuccessData(null)}
                className="mt-3 text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-lg cursor-pointer"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-xs">Submission Refused</h3>
              <p className="text-xs text-rose-700 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Requester Info */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> 1. Requester Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Usman Ghani"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. student@ucp.edu.pk"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Checked against banned registry on form submission</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +923001234567"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Organization Name <span className="text-gray-400">(Optional)</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Building className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. ACM Society / PixelCraft Startup"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Booking Info */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> 2. Space & Event Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Booking Type <span className="text-red-500">*</span></label>
                <select
                  value={bookingType}
                  onChange={e => setBookingType(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                >
                  <option value="Student Society">Student Society</option>
                  <option value="Cohort Startup">Cohort Startup</option>
                  <option value="Department">Department</option>
                  <option value="Meeting / Event">Meeting / Event</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Room <span className="text-red-500">*</span></label>
                <select
                  required
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                >
                  <option value="">-- Choose Space --</option>
                  {rooms.filter(r => r.isActive).map(r => (
                    <option key={r.id} value={r.name}>{r.name} (Cap. {r.capacity})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Attendance <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Users className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    required
                    value={expectedAttendance}
                    onChange={e => setExpectedAttendance(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Room details helper banner */}
            {selectedRoomObj && (
              <div className="mb-4 p-3.5 bg-surface-card rounded-xl text-xs border border-amber-200/50 text-gray-700 flex gap-2 animate-fade-in">
                <Info className="h-4.5 w-4.5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-primary">{selectedRoomObj.name} Details & Limits:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-gray-600">
                    <div><strong>Max Capacity:</strong> {selectedRoomObj.capacity} persons</div>
                    <div><strong>Hours:</strong> {selectedRoomObj.operatingHours}</div>
                    <div><strong>Min Duration:</strong> {selectedRoomObj.minBookingDuration} mins</div>
                    <div><strong>Max Duration:</strong> {selectedRoomObj.maxBookingDuration} mins</div>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    <strong>Rule:</strong> {selectedRoomObj.purpose}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Booking Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Time <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Event/Meeting Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder="e.g. Incubation Pitch Session"
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Event/Meeting Description <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  placeholder="Provide details about what you plan to accomplish in the space..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary/95 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Submitting Request...' : 'Submit Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
