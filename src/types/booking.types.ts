export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization?: string;
  room: string; // e.g. "Board Room", "Presentation Hall", etc.
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // in minutes
  eventTitle: string;
  eventDescription: string;
  bookingType: 'Student Society' | 'Cohort Startup' | 'Department' | 'Meeting' | 'Event' | string;
  expectedAttendance: number;
  status: 'PENDING VALIDATION' | 'REJECTED (BAN)' | 'REJECTED (VALIDATION)' | 'PENDING REVIEW' | 'APPROVED' | 'REJECTED BY STAFF' | 'CANCELLED';
  rejectionReason?: string;
  cancellationReason?: string;
  conflictStatus: 'NO CONFLICT' | 'CONFLICT DETECTED';
  conflictingBookingId?: string;
  approvedBy?: string;
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ban {
  id: string;
  email: string;
  name: string;
  reason: string;
  duration: string; // "7 days" | "30 days" | "90 days" | "Permanent" | "Custom [N] days"
  bannedBy: string;
  createdAt: string;
  expiresAt: string; // ISO string or "Never"
  status: 'Active' | 'Expired' | 'Lifted';
  liftedReason?: string;
  liftedBy?: string;
  liftedAt?: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}
