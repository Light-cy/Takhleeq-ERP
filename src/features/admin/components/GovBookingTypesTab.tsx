import React, { useState, useEffect } from 'react';
import { Layers, Edit3, Trash2, AlertTriangle, Info } from 'lucide-react';

interface GovBookingTypesTabProps {
  onRefresh: () => void;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  processing: boolean;
  setProcessing: (p: boolean) => void;
}

export function GovBookingTypesTab({
  onRefresh,
  setErrorMsg,
  setSuccessMsg,
  processing,
  setProcessing
}: GovBookingTypesTabProps) {
  // --- Booking Types management states ---
  const [bTypes, setBTypes] = useState<any[]>([]);
  const [btName, setBtName] = useState('');
  const [btDesc, setBtDesc] = useState('');
  const [btActive, setBtActive] = useState(true);
  const [editingBt, setEditingBt] = useState<any | null>(null);
  const [deletingBt, setDeletingBt] = useState<{ id: number, name: string } | null>(null);

  const fetchBTypes = () => {
    fetch('/api/booking-types')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch booking types');
        return res.json();
      })
      .then(data => {
        setBTypes(data);
      })
      .catch(err => {
        console.error('Error fetching booking types in admin:', err);
      });
  };

  useEffect(() => {
    fetchBTypes();
  }, []);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCreateOrUpdateBt = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!btName.trim()) {
      setErrorMsg("Booking type name is required.");
      return;
    }
    setProcessing(true);
    const method = editingBt ? 'PUT' : 'POST';
    const url = editingBt ? `/api/booking-types/${editingBt.id}` : '/api/booking-types';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: btName.trim(),
          description: btDesc.trim(),
          isActive: btActive
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save booking type');
      }
      setSuccessMsg(editingBt ? `Booking type '${btName.trim()}' updated successfully.` : `Booking type '${btName.trim()}' created successfully.`);
      setBtName('');
      setBtDesc('');
      setBtActive(true);
      setEditingBt(null);
      fetchBTypes();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditBtClick = (bt: any) => {
    clearMessages();
    setEditingBt(bt);
    setBtName(bt.name);
    setBtDesc(bt.description || '');
    setBtActive(bt.isActive !== false);
  };

  const handleCancelBtEdit = () => {
    setEditingBt(null);
    setBtName('');
    setBtDesc('');
    setBtActive(true);
  };

  const handleConfirmDeleteBt = async () => {
    if (!deletingBt) return;
    clearMessages();
    setProcessing(true);
    try {
      const res = await fetch(`/api/booking-types/${deletingBt.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete booking type');
      }
      setSuccessMsg(`Booking type '${deletingBt.name}' deleted successfully.`);
      setDeletingBt(null);
      fetchBTypes();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-left">
      
      {/* Create/Edit Booking Type Form */}
      <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            {editingBt ? 'Modify Booking Type' : 'Register Booking Type'}
          </h3>
          <p className="text-[11px] text-gray-500">
            {editingBt ? 'Update the active properties of the selected classification.' : 'Create a new organizational classification for submitting booking requests.'}
          </p>
        </div>

        <form onSubmit={handleCreateOrUpdateBt} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Classification Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={btName}
              onChange={e => setBtName(e.target.value)}
              placeholder="e.g. Entrepreneurs in residence"
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-850"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Scope / Usage Description</label>
            <textarea
              value={btDesc}
              onChange={e => setBtDesc(e.target.value)}
              placeholder="Who does this booking classification cover?"
              rows={3}
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-850"
            />
          </div>

          <div className="flex items-center gap-2 py-1 bg-gray-50/40 p-3 rounded-xl border border-gray-100">
            <input
              type="checkbox"
              id="bt-active-checkbox"
              checked={btActive}
              onChange={e => setBtActive(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="bt-active-checkbox" className="text-xs font-bold text-gray-750 cursor-pointer select-none">
              Active (Show on booking form)
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            {editingBt && (
              <button
                type="button"
                onClick={handleCancelBtEdit}
                className="flex-1 border border-gray-150 text-gray-600 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              {processing ? 'Saving...' : editingBt ? 'Update Type' : 'Register Type'}
            </button>
          </div>
        </form>
      </div>

      {/* Booking Types List Table */}
      <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">System Booking Classifications</h3>
          <p className="text-[11px] text-gray-500">Organizations and groups authorized to book facility rooms.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-150 text-[9px] font-black text-gray-400 uppercase bg-gray-50/50">
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Scope Description</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bTypes.map((bt) => (
                <tr key={bt.id} className="hover:bg-gray-50/30 text-gray-700">
                  <td className="py-3.5 px-3 font-extrabold text-gray-900">{bt.name}</td>
                  <td className="py-3.5 px-3 text-gray-500 leading-normal max-w-[200px] break-words">
                    {bt.description || <span className="text-gray-300 italic">No description provided</span>}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      bt.isActive !== false
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-100 text-gray-400 border border-gray-150'
                    }`}>
                      {bt.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleEditBtClick(bt)}
                        className="text-primary hover:bg-primary/5 p-1.5 rounded-lg border border-transparent hover:border-primary/10 transition-colors cursor-pointer"
                        title="Edit booking type"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingBt({ id: bt.id, name: bt.name })}
                        className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                        title="Purge booking type"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {bTypes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                    No booking classifications registered in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE BOOKING TYPE CONFIRMATION MODAL */}
      {deletingBt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-bt-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-155 overflow-hidden flex flex-col">
            <div className="bg-rose-600 text-white p-4 font-black text-xs flex items-center justify-between">
              <span className="uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Purge Booking Type
              </span>
              <button onClick={() => setDeletingBt(null)} className="text-white hover:text-rose-200 font-bold cursor-pointer text-xs">✕</button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <p className="text-xs text-gray-700 leading-relaxed">
                Are you sure you want to completely delete the booking type classification <strong className="text-rose-700 font-black">"{deletingBt.name}"</strong>? This will permanently decompile its active policy classification and is completely irreversible.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-normal flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>System Notice:</strong> Deleting a booking type classification removes it from future booking forms. Existing/historical bookings under this type will remain in the database unaltered.
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4">
                <button
                  type="button"
                  onClick={() => setDeletingBt(null)}
                  className="px-3.5 py-2 border border-gray-150 text-gray-600 hover:bg-gray-50 rounded-lg text-[10px] font-bold cursor-pointer uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleConfirmDeleteBt}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg text-[10px] cursor-pointer disabled:opacity-50 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  {processing ? 'Purging...' : 'Purge Type'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
