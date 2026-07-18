import React, { useState, useEffect } from 'react';
import { User, Ban, Booking } from '../../../../../types';

interface UseGovernanceParams {
  users: User[];
  bookings: Booking[];
  currentUser: User;
  ceilingDays: number;
  onIssueBan: (banData: any) => Promise<void>;
  onLiftBan: (banId: string, reason: string) => Promise<void>;
  onRefresh: () => void;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  setProcessing: (p: boolean) => void;
}

export function useGovernance({
  users,
  bookings,
  currentUser,
  ceilingDays,
  onIssueBan,
  onLiftBan,
  onRefresh,
  setErrorMsg,
  setSuccessMsg,
  setProcessing
}: UseGovernanceParams) {
  // --- Bans Form States ---
  const [banEmail, setBanEmail] = useState('');
  const [banName, setBanName] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('7 days');
  const [customDays, setCustomDays] = useState('15');

  const matchedBanUser = users.find(u => u.email.trim().toLowerCase() === banEmail.trim().toLowerCase());

  // Ban Lift State
  const [liftingBan, setLiftingBan] = useState<Ban | null>(null);
  const [liftReason, setLiftReason] = useState('');

  // Adjust default banDuration based on ceilingDays
  useEffect(() => {
    if (currentUser.role !== 'Administrator') {
      if (ceilingDays > 0 && ceilingDays < 7) {
        setBanDuration('3 days');
      } else if (ceilingDays === 0) {
        setBanDuration('');
      } else {
        setBanDuration('7 days');
      }
    } else {
      setBanDuration('7 days');
    }
  }, [ceilingDays, currentUser.role]);

  // Automatically fetch user name from simulated users list or bookings history if the email matches
  useEffect(() => {
    if (matchedBanUser) {
      setBanName(matchedBanUser.name);
    } else {
      const matchedBooking = bookings.find(b => b.email.trim().toLowerCase() === banEmail.trim().toLowerCase());
      if (matchedBooking) {
        setBanName(matchedBooking.name);
      } else if (banEmail.trim()) {
        setBanName("External / Booking Profile");
      } else {
        setBanName("");
      }
    }
  }, [matchedBanUser, banEmail, bookings]);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // BAN SUBMISSIONS
  const handleIssueBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const targetEmail = banEmail.trim().toLowerCase();

    // Prevent banning Administrators
    const targetUser = users.find(u => u.email.toLowerCase() === targetEmail);
    if (
      (targetUser && targetUser.role?.toLowerCase() === 'administrator') ||
      targetEmail === 'director@takhleeq.pk'
    ) {
      setErrorMsg("Validation Error: Administrators cannot be suspended or banned, and no Administrator can ban another Administrator.");
      return;
    }

    setProcessing(true);

    const days = banDuration === 'Custom' ? parseInt(customDays) : 
                 banDuration === '3 days' ? 3 :
                 banDuration === '7 days' ? 7 :
                 banDuration === '30 days' ? 30 : 999999;

    if (currentUser.role !== 'Administrator' && days > ceilingDays) {
      setErrorMsg(`Form Validation Error: Your role's ban ceiling is ${ceilingDays} days. You cannot issue a ban for ${days} days.`);
      setProcessing(false);
      return;
    }

    const actualDuration = banDuration === 'Custom' ? `${customDays} days` : banDuration;

    try {
      await onIssueBan({
        email: banEmail,
        name: banName,
        reason: banReason,
        duration: actualDuration
      });
      setSuccessMsg(`Ban restriction successfully registered for '${banEmail}'.`);
      setBanEmail('');
      setBanName('');
      setBanReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue ban.');
    } finally {
      setProcessing(false);
    }
  };

  const handleLiftBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liftingBan) return;
    if (!liftReason.trim()) {
      setErrorMsg('Mandatory lift reason required.');
      return;
    }

    clearMessages();
    setProcessing(true);

    try {
      await onLiftBan(liftingBan.id, liftReason);
      setSuccessMsg(`Active ban restriction early-lifted for '${liftingBan.email}'.`);
      setLiftingBan(null);
      setLiftReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lift ban.');
    } finally {
      setProcessing(false);
    }
  };

  return {
    banEmail,
    setBanEmail,
    banName,
    banReason,
    setBanReason,
    banDuration,
    setBanDuration,
    customDays,
    setCustomDays,
    matchedBanUser,
    liftingBan,
    setLiftingBan,
    liftReason,
    setLiftReason,
    handleIssueBanSubmit,
    handleLiftBanSubmit,
    clearMessages
  };
}
