import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Key, 
  UserX, 
  ShieldCheck, 
  Users, 
  Lock
} from 'lucide-react';
import { CustomRole, User, Ban, Booking } from '../../../../types';
import { useGovernance } from './hooks/useGovernance';
import { BanForm } from './components/BanForm';
import { ActiveBansTable } from './components/ActiveBansTable';
import { GovRolesTab } from '../../components/GovRolesTab';
import { GovUsersTab } from '../../components/GovUsersTab';

interface GovernanceCenterPageProps {
  roles: CustomRole[];
  users: User[];
  bookings: Booking[];
  activeBans: Ban[];
  currentUser: User;
  hasPermission: (permission: string) => boolean;
  onRefresh: () => void;
  onCreateRole: (roleData: any) => Promise<void>;
  onUpdateRole: (roleName: string, roleData: any) => Promise<void>;
  onDeleteRole: (roleName: string) => Promise<void>;
  onAssignRole: (email: string, role: string) => Promise<void>;
  onCreateUser: (userData: any) => Promise<void>;
  onDeleteUser: (email: string) => Promise<void>;
  onIssueBan: (banData: any) => Promise<void>;
  onLiftBan: (banId: string, reason: string) => Promise<void>;
}

export function GovernanceCenterPage({
  roles,
  users,
  bookings,
  activeBans,
  currentUser,
  hasPermission,
  onRefresh,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onAssignRole,
  onCreateUser,
  onDeleteUser,
  onIssueBan,
  onLiftBan
}: GovernanceCenterPageProps) {
  const currentUserRoleObj = roles.find(r => r.name === currentUser.role);
  let ceilingDays = 0;
  if (currentUser.role === 'Administrator') {
    ceilingDays = 999999;
  } else if (currentUserRoleObj) {
    if (currentUserRoleObj.banDurationCeiling !== undefined && currentUserRoleObj.banDurationCeiling !== null) {
      ceilingDays = Number(currentUserRoleObj.banDurationCeiling);
    } else if (hasPermission('ISSUE_BAN') || currentUserRoleObj.permissions.includes('ISSUE_BAN')) {
      ceilingDays = 999999; // undefined/null represents infinite/permanent for roles with issue ban permission
    }
  }

  // Inner Subtabs: 'bans' | 'roles' | 'users'
  const [govTab, setGovTab] = useState<'bans' | 'roles' | 'users'>(() => {
    if (hasPermission('ISSUE_BAN')) return 'bans';
    if (hasPermission('MANAGE_ROLES')) return 'roles';
    if (hasPermission('MANAGE_USERS')) return 'users';
    return 'bans';
  });

  // Sync subtab to user's permissions on mount/update
  useEffect(() => {
    if (hasPermission('ISSUE_BAN')) {
      setGovTab('bans');
    } else if (hasPermission('MANAGE_ROLES')) {
      setGovTab('roles');
    } else if (hasPermission('MANAGE_USERS')) {
      setGovTab('users');
    }
  }, [currentUser]);

  // Messaging / Processing state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const {
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
    handleLiftBanSubmit
  } = useGovernance({
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
  });

  return (
    <div className="space-y-6 text-left" id="governance-center-view">
      
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

      {/* Primary Section selector */}
      <div className="flex border-b border-gray-100 bg-white p-2 rounded-2xl border flex-wrap gap-1 shadow-3xs">
        <button
          onClick={() => { setGovTab('bans'); clearMessages(); }}
          disabled={!hasPermission('ISSUE_BAN')}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            govTab === 'bans' 
              ? 'bg-primary text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <UserX className="h-4 w-4" /> 
          <span>Blacklist & Bans</span>
          {!hasPermission('ISSUE_BAN') && <Lock className="h-3 w-3 text-gray-400" />}
        </button>
        <button
          onClick={() => { setGovTab('roles'); clearMessages(); }}
          disabled={!hasPermission('MANAGE_ROLES')}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            govTab === 'roles' 
              ? 'bg-primary text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Key className="h-4 w-4" /> 
          <span>Policy Role Compiler</span>
          {!hasPermission('MANAGE_ROLES') && <Lock className="h-3 w-3 text-gray-400" />}
        </button>
        <button
          onClick={() => { setGovTab('users'); clearMessages(); }}
          disabled={!hasPermission('MANAGE_USERS')}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            govTab === 'users' 
              ? 'bg-primary text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Users className="h-4 w-4" /> 
          <span>System Users</span>
          {!hasPermission('MANAGE_USERS') && <Lock className="h-3 w-3 text-gray-400" />}
        </button>
      </div>

      {govTab === 'bans' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-5">
            <BanForm 
              banEmail={banEmail}
              setBanEmail={setBanEmail}
              banName={banName}
              matchedBanUser={matchedBanUser}
              banDuration={banDuration}
              setBanDuration={setBanDuration}
              customDays={customDays}
              setCustomDays={setCustomDays}
              banReason={banReason}
              setBanReason={setBanReason}
              ceilingDays={ceilingDays}
              currentUser={currentUser}
              processing={processing}
              onSubmit={handleIssueBanSubmit}
            />
          </div>
          <div className="lg:col-span-7">
            <ActiveBansTable 
              activeBans={activeBans}
              currentUser={currentUser}
              liftingBan={liftingBan}
              setLiftingBan={setLiftingBan}
              liftReason={liftReason}
              setLiftReason={setLiftReason}
              onLiftSubmit={handleLiftBanSubmit}
              processing={processing}
            />
          </div>
        </div>
      )}

      {govTab === 'roles' && (
        <GovRolesTab 
          roles={roles}
          hasPermission={hasPermission}
          onRefresh={onRefresh}
          onCreateRole={onCreateRole}
          onUpdateRole={onUpdateRole}
          onDeleteRole={onDeleteRole}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
          processing={processing}
          setProcessing={setProcessing}
        />
      )}

      {govTab === 'users' && (
        <GovUsersTab 
          users={users}
          roles={roles}
          currentUser={currentUser}
          onRefresh={onRefresh}
          onCreateUser={onCreateUser}
          onDeleteUser={onDeleteUser}
          onAssignRole={onAssignRole}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
          processing={processing}
          setProcessing={setProcessing}
        />
      )}

    </div>
  );
}
