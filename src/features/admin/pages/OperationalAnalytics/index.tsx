import React from 'react';
import { Booking, Room } from '../../../../types';
import { BookingOperationalAnalytics } from './BookingOperationalAnalytics';

interface OperationalAnalyticsPageProps {
  bookings?: Booking[];
  rooms?: Room[];
}

export function OperationalAnalyticsPage({ bookings = [], rooms = [] }: OperationalAnalyticsPageProps) {
  return (
    <div className="space-y-6 text-left" id="operational-analytics-page">
      <BookingOperationalAnalytics bookings={bookings} rooms={rooms} />
    </div>
  );
}
