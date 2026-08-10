import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, AlertCircle } from 'lucide-react';
import { StartupProfile, Industry } from '../../../types/startup.types';
import { fetchFounderOwnProfile, fetchIndustries } from '../api/startupsApi';
import { StartupProfileDetailModal } from './StartupProfileDetailModal';

export const FounderSelfServiceView: React.FC = () => {
  const [profile, setProfile] = useState<StartupProfile | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [indData, profData] = await Promise.all([
        fetchIndustries(),
        fetchFounderOwnProfile()
      ]);
      setIndustries(indData);
      setProfile(profData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load founder profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-xs">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
        <p className="text-xs font-bold text-gray-600">Retrieving founder startup profile...</p>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-3xl space-y-3">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-black text-rose-900">Startup Profile Not Found</h3>
        <p className="text-xs text-rose-700 max-w-md mx-auto">
          {errorMsg || 'Your user account is not currently associated with an accepted incubator startup profile.'}
        </p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer"
        >
          Retry Search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StartupProfileDetailModal
        profile={profile}
        industries={industries}
        isStaff={false}
        onClose={() => {}}
        onProfileUpdated={loadData}
      />
    </div>
  );
};
