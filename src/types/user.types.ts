import { Room } from './room.types';
import { Booking, Ban, AuditRecord } from './booking.types';
import { CustomRole } from './role.types';

export interface User {
  email: string;
  name: string;
  role: string; // e.g. "UCP Member" | "Administrator" | custom role names
  status: 'Active' | 'Inactive';
}

export interface ERPData {
  rooms: Room[];
  bookings: Booking[];
  bans: Ban[];
  roles: CustomRole[];
  users: User[];
  auditLogs: AuditRecord[];
}
