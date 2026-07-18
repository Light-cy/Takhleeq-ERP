import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Room, Booking } from '../../../types';

interface BookingOverrideModalProps {
  editingBooking: Booking;
  setEditingBooking: (b: Booking | null) => void;
  rooms: Room[];
  isAllowedToOverride: boolean;
  onOverride: (id: string, updateData: any) => Promise<void>;
  onRefresh: () => void;
}

export function BookingOverrideModal({
  editingBooking,
  setEditingBooking,
  rooms,
  isAllowedToOverride,
  onOverride,
  onRefresh
}: BookingOverrideModalProps) {
  const [overrideRoom, setOverrideRoom] = useState(editingBooking.room);
  const [overrideDate, setOverrideDate] = useState(editingBooking.date);
  const [overrideStartTime, setOverrideStartTime] = useState(editingBooking.startTime);
  const [overrideEndTime, setOverrideEndTime] = useState(editingBooking.endTime);
  const [overrideForceApprove, setOverrideForceApprove] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="schedule-override-modal">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
          <span className="uppercase tracking-wider">Schedule Override: {editingBooking.id}</span>
          <button onClick={() => setEditingBooking(null)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
        </div>

        <form onSubmit={handleOverrideSubmit} className="p-6 space-y-5 text-left overflow-y-auto">
          
          {!isAllowedToOverride && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-rose-900 uppercase tracking-wide">Privilege Restriction</p>
                <p className="text-[11px] mt-1 text-rose-800 leading-normal">
                  Your account lacks the <strong>'BOOKING_OVERRIDE'</strong> permission. You can review the details, but you are not authorized to save or apply overrides on this system.
                </p>
              </div>
            </div>
          )}

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
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-805 font-medium"
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
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-805 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Override Start</label>
                <input
                  type="time"
                  value={overrideStartTime}
                  onChange={e => setOverrideStartTime(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-805 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Override End</label>
                <input
                  type="time"
                  value={overrideEndTime}
                  onChange={e => setOverrideEndTime(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-805 font-medium"
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
              disabled={processing || !isAllowedToOverride}
              className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            >
              {processing ? 'Processing Override...' : 'Commit Override'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
