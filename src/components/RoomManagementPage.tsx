import React, { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Users, 
  Clock, 
  Info, 
  Edit3, 
  Check, 
  X, 
  HelpCircle,
  AlertTriangle,
  FileText,
  ToggleLeft,
  ToggleRight,
  ShieldAlert
} from 'lucide-react';
import { Room } from '../types';

interface RoomManagementPageProps {
  rooms: Room[];
  onRefresh: () => void;
  onAddRoom: (roomData: any) => Promise<void>;
  onUpdateRoom: (roomId: string, updateData: any) => Promise<void>;
}

export function RoomManagementPage({ rooms, onRefresh, onAddRoom, onUpdateRoom }: RoomManagementPageProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form states
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('30');
  const [roomHours, setRoomHours] = useState('09:00 - 17:00');
  const [roomMinDur, setRoomMinDur] = useState('30');
  const [roomMaxDur, setRoomMaxDur] = useState('180');
  const [roomPurpose, setRoomPurpose] = useState('');

  // UI States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleToggleRoomStatus = async (room: Room) => {
    clearMessages();
    setProcessing(true);
    try {
      await onUpdateRoom(room.id, { isActive: !room.isActive });
      setSuccessMsg(`Space availability status toggled for '${room.name}'.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update space status.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    clearMessages();
    setProcessing(true);

    try {
      await onAddRoom({
        name: roomName,
        capacity: roomCapacity,
        operatingHours: roomHours,
        minBookingDuration: roomMinDur,
        maxBookingDuration: roomMaxDur,
        purpose: roomPurpose
      });
      setSuccessMsg(`New space '${roomName}' registered in central facility registry.`);
      setRoomName('');
      setRoomPurpose('');
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register room.');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    clearMessages();
    setProcessing(true);

    try {
      await onUpdateRoom(editingRoom.id, {
        name: roomName,
        capacity: roomCapacity,
        operatingHours: roomHours,
        minBookingDuration: roomMinDur,
        maxBookingDuration: roomMaxDur,
        purpose: roomPurpose
      });
      setSuccessMsg(`Room attributes successfully updated for '${roomName}'.`);
      setEditingRoom(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update room record.');
    } finally {
      setProcessing(false);
    }
  };

  const startEditing = (room: Room) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomCapacity(room.capacity.toString());
    setRoomHours(room.operatingHours);
    setRoomMinDur(room.minBookingDuration.toString());
    setRoomMaxDur(room.maxBookingDuration.toString());
    setRoomPurpose(room.purpose);
    clearMessages();
  };

  const startAdding = () => {
    setRoomName('');
    setRoomCapacity('30');
    setRoomHours('09:00 - 17:00');
    setRoomMinDur('30');
    setRoomMaxDur('180');
    setRoomPurpose('');
    setShowAddModal(true);
    clearMessages();
  };

  return (
    <div className="space-y-6 text-left animate-fade-in" id="room-management-view">
      
      {/* Alert banners */}
      {(errorMsg || successMsg) && (
        <div className="space-y-2">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex gap-2">
              <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid header action bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Facility Spaces Register ({rooms.length})</h3>
          <p className="text-[11px] text-gray-400">Configure co-working zones, departmental boards, capacities, and active operating hours.</p>
        </div>
        <button
          onClick={startAdding}
          className="bg-primary hover:bg-primary/95 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-colors"
        >
          <Plus className="h-4.5 w-4.5" /> Add Space Room
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map(room => (
          <div 
            key={room.id} 
            className={`border rounded-2xl overflow-hidden bg-white shadow-3xs flex flex-col justify-between transition-all ${
              room.isActive ? 'border-gray-150' : 'border-dashed border-gray-200 opacity-65'
            }`}
          >
            {/* Header top status block */}
            <div className={`p-4 border-b flex justify-between items-center ${
              room.isActive ? 'bg-emerald-50/20 border-gray-100' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-primary" />
                <span className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">{room.name}</span>
              </div>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                room.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-150 text-gray-500'
              }`}>
                {room.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>

            {/* Core parameters details */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5 border-b pb-4.5 border-gray-50">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Max Capacity</span>
                  <div className="flex items-center gap-1 font-extrabold text-gray-800">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{room.capacity} persons</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Operating Hours</span>
                  <div className="flex items-center gap-1 font-extrabold text-gray-800">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-mono text-[11px]">{room.operatingHours}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 border-b pb-4.5 border-gray-50">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Min Booking Block</span>
                  <p className="font-bold text-gray-800 font-mono">{room.minBookingDuration} mins</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Max Booking Block</span>
                  <p className="font-bold text-gray-800 font-mono">{room.maxBookingDuration} mins</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Official Guideline Purpose</span>
                <p className="text-[11px] text-gray-500 leading-normal font-medium">{room.purpose}</p>
              </div>
            </div>

            {/* Actions footer */}
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              
              {/* Toggle toggle button */}
              <button
                onClick={() => handleToggleRoomStatus(room)}
                disabled={processing}
                className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-800 transition-colors"
                title="Toggle reservation availability status"
              >
                {room.isActive ? (
                  <>
                    <ToggleRight className="h-6 w-6 text-emerald-600 shrink-0" />
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Online</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-6 w-6 text-gray-400 shrink-0" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Offline</span>
                  </>
                )}
              </button>

              <button
                onClick={() => startEditing(room)}
                className="text-primary hover:text-white hover:bg-primary border border-primary/20 hover:border-primary font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
              >
                <Edit3 className="h-3.5 w-3.5" /> Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD ROOM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-room-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Register New Space Room</span>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Room Name/Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="e.g. Boardroom D-20"
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Max Capacity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={roomCapacity}
                    onChange={e => setRoomCapacity(e.target.value)}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Operating Block <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={roomHours}
                    placeholder="e.g. 09:00 - 17:00"
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Min Block (Mins) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={roomMinDur}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Max Block (Mins) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={roomMaxDur}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Official Guideline Purpose <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={roomPurpose}
                  onChange={e => setRoomPurpose(e.target.value)}
                  placeholder="e.g. Restricted strictly to formal advisory pitching clinics and presentation mock webinars..."
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  {processing ? 'Saving...' : 'Register Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROOM MODAL */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-room-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Configure Room: {editingRoom.name}</span>
              <button onClick={() => setEditingRoom(null)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Room Name/Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Max Capacity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={roomCapacity}
                    onChange={e => setRoomCapacity(e.target.value)}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Operating Block <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={roomHours}
                    onChange={e => setRoomHours(e.target.value)}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Min Block (Mins) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={roomMinDur}
                    onChange={e => setRoomMinDur(e.target.value)}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Max Block (Mins) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={roomMaxDur}
                    onChange={e => setRoomMaxDur(e.target.value)}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Official Guideline Purpose <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={roomPurpose}
                  onChange={e => setRoomPurpose(e.target.value)}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  {processing ? 'Saving...' : 'Commit Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
