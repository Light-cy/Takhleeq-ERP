import React from 'react';
import { 
  Plus, 
  MapPin, 
  Users, 
  Clock, 
  Edit3, 
  Check, 
  X, 
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { Room } from '../../../../types';
import { useRoomManagement, ALL_BOOKING_CATEGORIES } from './hooks/useRoomManagement';

interface RoomManagementPageProps {
  rooms: Room[];
  onRefresh: () => void;
  onAddRoom: (roomData: any) => Promise<void>;
  onUpdateRoom: (roomId: string, updateData: any) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
}

export function RoomManagementPage({ 
  rooms, 
  onRefresh, 
  onAddRoom, 
  onUpdateRoom, 
  onDeleteRoom 
}: RoomManagementPageProps) {
  
  const {
    showAddModal,
    setShowAddModal,
    editingRoom,
    setEditingRoom,
    deletingRoom,
    setDeletingRoom,
    roomName,
    setRoomName,
    roomCapacity,
    setRoomCapacity,
    roomHours,
    setRoomHours,
    roomMinDur,
    setRoomMinDur,
    roomMaxDur,
    setRoomMaxDur,
    roomPurpose,
    setRoomPurpose,
    roomAllowedBookingTypes,
    setRoomAllowedBookingTypes,
    toggleBookingType,
    selectAllBookingTypes,
    deselectAllBookingTypes,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    processing,
    togglingRoomIds,
    handleToggleRoomStatus,
    handleAddSubmit,
    handleEditSubmit,
    startEditing,
    handleDeleteConfirm,
    startAdding
  } = useRoomManagement({
    rooms,
    onRefresh,
    onAddRoom,
    onUpdateRoom,
    onDeleteRoom
  });

  return (
    <div className="space-y-6 text-left animate-fade-in" id="room-management-view">
      
      {/* Floating Notifications Toast Container (Fixed position prevents any layout-shift or page jitter) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {errorMsg && (
          <div className="p-4 bg-white border border-rose-100 text-rose-950 text-xs rounded-xl flex gap-3 shadow-xl animate-fade-in pointer-events-auto">
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
            </div>
            <div className="flex-1 pr-1 py-0.5 font-medium leading-relaxed">
              <p className="font-extrabold text-rose-800 uppercase tracking-wider text-[9px] mb-0.5">Operation Failed</p>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-gray-400 hover:text-gray-600 self-start cursor-pointer transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-white border border-emerald-100 text-emerald-950 text-xs rounded-xl flex gap-3 shadow-xl animate-fade-in pointer-events-auto">
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Check className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div className="flex-1 pr-1 py-0.5 font-medium leading-relaxed">
              <p className="font-extrabold text-emerald-800 uppercase tracking-wider text-[9px] mb-0.5">Success</p>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-gray-400 hover:text-gray-600 self-start cursor-pointer transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

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
            className={`border rounded-2xl overflow-hidden bg-white shadow-3xs flex flex-col justify-between transition-all duration-300 ease-in-out ${
              room.isActive ? 'border-gray-150 opacity-100 scale-100 shadow-3xs' : 'border-gray-150 opacity-70 scale-[0.99] bg-gray-50/40'
            }`}
          >
            {/* Header top status block */}
            <div className={`p-4 border-b flex justify-between items-center transition-colors duration-300 ${
              room.isActive ? 'bg-emerald-50/20 border-gray-100' : 'bg-gray-100/60 border-gray-100'
            }`}>
              <div className="flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-primary" />
                <span className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">{room.name}</span>
              </div>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full transition-colors duration-300 ${
                room.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'
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

              {/* Allowed Booking Types */}
              <div className="space-y-1 pt-2 border-t border-gray-50">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Allowed Booking Types</span>
                <div className="flex flex-wrap gap-1">
                  {room.allowedBookingTypes && room.allowedBookingTypes.length > 0 ? (
                    room.allowedBookingTypes.map((t: string) => (
                      <span key={t} className="bg-gray-100 text-gray-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-gray-200/60">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-gray-400 italic">All booking types allowed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              
              {/* Toggle toggle button */}
              <button
                onClick={() => handleToggleRoomStatus(room)}
                disabled={togglingRoomIds[room.id]}
                className={`flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-800 transition-all duration-250 ${
                  togglingRoomIds[room.id] ? 'opacity-50 cursor-not-allowed' : ''
                }`}
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

              <div className="flex gap-1.5">
                <button
                  onClick={() => startEditing(room)}
                  className="text-primary hover:text-white hover:bg-primary border border-primary/20 hover:border-primary font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Configure
                </button>
                <button
                  onClick={() => setDeletingRoom(room)}
                  className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                  title="Delete this space room permanently"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD ROOM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-room-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Register New Space Room</span>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-left overflow-y-auto">
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
                    onChange={e => setRoomHours(e.target.value)}
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
                  placeholder="e.g. Restricted strictly to formal advisory pitching clinics and presentation mock webinars..."
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* ALLOWED BOOKING TYPES CONFIGURATION */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    Permitted Booking Categories ({roomAllowedBookingTypes.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllBookingTypes}
                      className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300 text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={deselectAllBookingTypes}
                      className="text-[9px] font-bold text-gray-400 hover:text-gray-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  Select which reservation categories are authorized to book this room.
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-gray-50 border border-gray-150 rounded-xl">
                  {ALL_BOOKING_CATEGORIES.map(category => {
                    const isChecked = roomAllowedBookingTypes.some(
                      t => t.trim().toLowerCase() === category.trim().toLowerCase()
                    );
                    return (
                      <div
                        key={category}
                        onClick={() => toggleBookingType(category)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[10.5px] font-medium cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded accent-primary text-primary cursor-pointer h-3.5 w-3.5 shrink-0"
                        />
                        <span className="truncate">{category}</span>
                      </div>
                    );
                  })}
                </div>
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
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Configure Room: {editingRoom.name}</span>
              <button onClick={() => setEditingRoom(null)} className="text-white hover:text-accent font-bold cursor-pointer text-sm">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-left overflow-y-auto">
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

              {/* ALLOWED BOOKING TYPES CONFIGURATION */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    Permitted Booking Categories ({roomAllowedBookingTypes.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllBookingTypes}
                      className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300 text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={deselectAllBookingTypes}
                      className="text-[9px] font-bold text-gray-400 hover:text-gray-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  Select which reservation categories are authorized to book this room.
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-gray-50 border border-gray-150 rounded-xl">
                  {ALL_BOOKING_CATEGORIES.map(category => {
                    const isChecked = roomAllowedBookingTypes.some(
                      t => t.trim().toLowerCase() === category.trim().toLowerCase()
                    );
                    return (
                      <div
                        key={category}
                        onClick={() => toggleBookingType(category)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[10.5px] font-medium cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded accent-primary text-primary cursor-pointer h-3.5 w-3.5 shrink-0"
                        />
                        <span className="truncate">{category}</span>
                      </div>
                    );
                  })}
                </div>
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

      {/* DELETE ROOM CONFIRMATION MODAL */}
      {deletingRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-room-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-rose-600 text-white p-5 font-black text-sm flex items-center justify-between shrink-0">
              <span className="uppercase tracking-wider">Delete Space Room</span>
              <button onClick={() => setDeletingRoom(null)} className="text-white hover:text-rose-200 font-bold cursor-pointer text-sm">✕</button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-full shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">Confirm Deletion of '{deletingRoom.name}'</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Are you sure you want to permanently delete this space from the register? This action is <strong className="text-rose-700">irreversible</strong>.
                  </p>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Any existing active, pending, or historical bookings for <strong className="text-gray-800">{deletingRoom.name}</strong> will be <strong className="text-rose-700">automatically cascaded and deleted</strong>.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setDeletingRoom(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteConfirm(deletingRoom.id)}
                  disabled={processing}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  {processing ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
