import React, { useState, useEffect, useCallback } from 'react';
import { Room } from '../../../../../types';
import apiClient from '../../../../../shared/apiClient';

interface UseRoomManagementParams {
  rooms: Room[];
  onRefresh: () => void;
  onAddRoom: (roomData: any) => Promise<void>;
  onUpdateRoom: (roomId: string, updateData: any) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  initialBookingCategories?: string[];
}

export const ALL_BOOKING_CATEGORIES = [
  'Student societies',
  'Startup teams',
  'Faculty members',
  'Department representatives',
  'Cohort members',
  'Entrepreneurs in residence',
  'Professionals in residence',
  'Meeting / Event',
  'Cohort Startup',
  'Department'
];

export function useRoomManagement({
  rooms,
  onRefresh,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  initialBookingCategories
}: UseRoomManagementParams) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  // Dynamic booking categories state loaded from the backend
  const [availableCategories, setAvailableCategories] = useState<string[]>(
    initialBookingCategories && initialBookingCategories.length > 0
      ? initialBookingCategories
      : ALL_BOOKING_CATEGORIES
  );
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      const res = await apiClient.get<any[]>('/api/booking-types');
      if (Array.isArray(res) && res.length > 0) {
        const activeNames = res
          .filter(bt => bt.isActive !== false && bt.is_active !== false)
          .map(bt => bt.name);
        if (activeNames.length > 0) {
          setAvailableCategories(activeNames);
        }
      }
    } catch (err) {
      console.warn('Silent note: fallback to current booking categories in useRoomManagement:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Fetch dynamic categories on mount and when rooms update
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, rooms]);

  // Form states
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('30');
  const [roomHours, setRoomHours] = useState('09:00 - 17:00');
  const [roomMinDur, setRoomMinDur] = useState('30');
  const [roomMaxDur, setRoomMaxDur] = useState('180');
  const [roomPurpose, setRoomPurpose] = useState('');
  const [roomAllowedBookingTypes, setRoomAllowedBookingTypes] = useState<string[]>([]);

  // UI States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [togglingRoomIds, setTogglingRoomIds] = useState<Record<string, boolean>>({});

  // Auto-dismiss success notifications
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Auto-dismiss error notifications
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleToggleRoomStatus = async (room: Room) => {
    if (togglingRoomIds[room.id]) return;
    
    const nextState = !room.isActive;
    
    // Immediate optimistic state update
    setTogglingRoomIds(prev => ({ ...prev, [room.id]: true }));
    setSuccessMsg(`Space '${room.name}' availability status toggled to ${nextState ? 'ONLINE' : 'OFFLINE'}.`);
    
    try {
      await onUpdateRoom(room.id, { isActive: nextState });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update space status.');
      setSuccessMsg(null); // Clear optimistic success message on error
    } finally {
      setTogglingRoomIds(prev => ({ ...prev, [room.id]: false }));
    }
  };

  const toggleBookingType = (type: string) => {
    setRoomAllowedBookingTypes(prev => {
      const exists = prev.some(t => t.trim().toLowerCase() === type.trim().toLowerCase());
      if (exists) {
        return prev.filter(t => t.trim().toLowerCase() !== type.trim().toLowerCase());
      } else {
        return [...prev, type];
      }
    });
  };

  const selectAllBookingTypes = () => setRoomAllowedBookingTypes([...availableCategories]);
  const deselectAllBookingTypes = () => setRoomAllowedBookingTypes([]);

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
        purpose: roomPurpose,
        allowedBookingTypes: roomAllowedBookingTypes
      });
      setSuccessMsg(`New space '${roomName}' registered in central facility registry.`);
      setRoomName('');
      setRoomPurpose('');
      setRoomAllowedBookingTypes([...availableCategories]);
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
        purpose: roomPurpose,
        allowedBookingTypes: roomAllowedBookingTypes
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
    
    // Filter room allowed types against current available active categories to remove deleted types
    const rawAllowed = room.allowedBookingTypes && room.allowedBookingTypes.length > 0
      ? room.allowedBookingTypes
      : availableCategories;
    const sanitized = rawAllowed.filter(t =>
      availableCategories.some(c => c.trim().toLowerCase() === t.trim().toLowerCase())
    );
    setRoomAllowedBookingTypes(sanitized.length > 0 ? sanitized : [...availableCategories]);
    clearMessages();
  };

  const handleDeleteConfirm = async (roomId: string) => {
    clearMessages();
    setProcessing(true);
    try {
      await onDeleteRoom(roomId);
      setSuccessMsg(`Space room successfully deleted.`);
      setDeletingRoom(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete room.');
    } finally {
      setProcessing(false);
    }
  };

  const startAdding = () => {
    setRoomName('');
    setRoomCapacity('30');
    setRoomHours('09:00 - 17:00');
    setRoomMinDur('30');
    setRoomMaxDur('180');
    setRoomPurpose('');
    setRoomAllowedBookingTypes([...availableCategories]);
    setShowAddModal(true);
    clearMessages();
  };

  return {
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
    startAdding,
    availableCategories,
    isLoadingCategories,
    refreshCategories: fetchCategories
  };
}
