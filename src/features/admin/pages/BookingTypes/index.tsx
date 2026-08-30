import React, { useState } from 'react';
import { Layers, ShieldAlert, ShieldCheck } from 'lucide-react';
import { GovBookingTypesTab } from '../../components/GovBookingTypesTab';

interface BookingTypesPageProps {
  onRefresh: () => void;
}

export function BookingTypesPage({ onRefresh }: BookingTypesPageProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  return (
    <div className="space-y-6 text-left" id="booking-types-page">
      {/* Header Banner */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">
              Booking Classifications & Types
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Configure purpose classifications, eligibility scopes, and permitted booking categories for university facility reservations.
          </p>
        </div>
      </div>

      {/* Alert Messages banner */}
      {(errorMsg || successMsg) && (
        <div className="space-y-2">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex gap-2 animate-fade-in">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex gap-2 animate-fade-in">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Booking Types Management Form and Table */}
      <GovBookingTypesTab
        onRefresh={onRefresh}
        setErrorMsg={setErrorMsg}
        setSuccessMsg={setSuccessMsg}
        processing={processing}
        setProcessing={setProcessing}
      />
    </div>
  );
}
