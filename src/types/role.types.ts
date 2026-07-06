export interface CustomRole {
  name: string;
  description: string;
  permissions: string[]; // e.g. ["review_bookings", "view_calendar", "issue_temp_ban", ...]
  banDurationCeiling?: number; // maximum days they can ban (e.g. 90, or undefined for infinite/permanent)
}
