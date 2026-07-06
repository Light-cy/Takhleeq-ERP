// Single source of truth for custom role permission nodes
export const Permissions = {
  VIEW_PENDING_QUEUE: 'VIEW_PENDING_QUEUE',
  APPROVE_REJECT_BOOKINGS: 'APPROVE_REJECT_BOOKINGS',
  BOOKING_OVERRIDE: 'BOOKING_OVERRIDE',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  MANAGE_BANS: 'MANAGE_BANS',
  LIFT_BAN: 'LIFT_BAN'
} as const;

export type PermissionType = typeof Permissions[keyof typeof Permissions];
