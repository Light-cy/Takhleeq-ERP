export interface Room {
  id: string;
  name: string;
  capacity: number;
  operatingHours: string; // e.g. "09:00 - 17:00"
  minBookingDuration: number; // in minutes
  maxBookingDuration: number; // in minutes
  purpose: string;
  policies: string[];
  isActive: boolean;
  allowedBookingTypes?: string[];
}
