// Single source of truth for booking status strings
export const BookingStatus = {
  PENDING_VALIDATION: 'PENDING VALIDATION',
  REJECTED_BAN: 'REJECTED (BAN)',
  REJECTED_VALIDATION: 'REJECTED (VALIDATION)',
  PENDING_REVIEW: 'PENDING REVIEW',
  APPROVED: 'APPROVED',
  REJECTED_BY_STAFF: 'REJECTED BY STAFF',
  CANCELLED: 'CANCELLED'
} as const;

export type BookingStatusType = typeof BookingStatus[keyof typeof BookingStatus];

// Corresponding database status strings (stored as underscores)
export const DbBookingStatus = {
  PENDING_VALIDATION: 'PENDING_VALIDATION',
  REJECTED_BAN: 'REJECTED_BAN',
  REJECTED_VALIDATION: 'REJECTED_VALIDATION',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED_BY_STAFF: 'REJECTED_BY_STAFF',
  CANCELLED: 'CANCELLED'
} as const;

export type DbBookingStatusType = typeof DbBookingStatus[keyof typeof DbBookingStatus];
