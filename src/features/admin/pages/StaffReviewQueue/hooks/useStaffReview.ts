import React, { useState } from 'react';
import { Booking, Ban } from '../../../../../types';

interface UseStaffReviewParams {
  bookings: Booking[];
  activeBans: Ban[];
  onApprove: (bookingId: string) => Promise<void>;
  onReject: (bookingId: string, reason: string) => Promise<void>;
}

export function useStaffReview({
  bookings,
  activeBans,
  onApprove,
  onReject
}: UseStaffReviewParams) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Filter pending review list
  const pendingBookings = bookings.filter(b => b.status === 'PENDING REVIEW');

  // Filtered by search (e.g. name, ID, room)
  const displayedBookings = pendingBookings.filter(b => 
    b.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.room.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.eventTitle.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Helper to check ban flag details for any email
  const getEmailBanDetails = (email: string) => {
    const activeBan = activeBans.find(b => b.email.toLowerCase() === email.toLowerCase() && b.status === 'Active');
    if (!activeBan) return null;

    // Calculate days remaining
    let daysRemaining = 'Permanent';
    if (activeBan.expiresAt !== 'Never') {
      const msDiff = new Date(activeBan.expiresAt).getTime() - Date.now();
      const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      daysRemaining = days > 0 ? `${days} days remaining` : 'Expiring today';
    }

    return {
      reason: activeBan.reason,
      duration: activeBan.duration,
      daysRemaining
    };
  };

  const handleApproveAction = async (bookingId: string) => {
    setProcessing(true);
    setErrorMsg(null);
    try {
      await onApprove(bookingId);
      setSelectedBooking(null);
      setShowRejectionInput(false);
      setRejectionReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error approving request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectAction = async (e: React.FormEvent, bookingId: string) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setErrorMsg('Rejection reason is mandatory.');
      return;
    }

    setProcessing(true);
    setErrorMsg(null);
    try {
      await onReject(bookingId, rejectionReason);
      setSelectedBooking(null);
      setShowRejectionInput(false);
      setRejectionReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error rejecting request.');
    } finally {
      setProcessing(false);
    }
  };

  // Helper to find details about the conflicting booking
  const getConflictDetails = (booking: Booking) => {
    if (booking.conflictStatus !== 'CONFLICT DETECTED' || !booking.conflictingBookingId) return null;
    return bookings.find(b => b.id === booking.conflictingBookingId);
  };

  // Helper to find all overlapping/conflicting bookings (same room, same date, overlapping time window)
  const getOverlappingBookings = (booking: Booking) => {
    return bookings.filter(b => 
      b.id !== booking.id &&
      b.room === booking.room &&
      b.date === booking.date &&
      b.startTime < booking.endTime &&
      booking.startTime < b.endTime &&
      (b.status === 'APPROVED' || b.status === 'PENDING REVIEW')
    );
  };

  return {
    selectedBooking,
    setSelectedBooking,
    rejectionReason,
    setRejectionReason,
    showRejectionInput,
    setShowRejectionInput,
    errorMsg,
    setErrorMsg,
    processing,
    searchFilter,
    setSearchFilter,
    pendingBookings,
    displayedBookings,
    getEmailBanDetails,
    handleApproveAction,
    handleRejectAction,
    getConflictDetails,
    getOverlappingBookings
  };
}
