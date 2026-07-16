import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Key, 
  UserCheck, 
  UserX, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Users, 
  Info,
  Calendar,
  Lock,
  Trash2,
  Edit3,
  Mail,
  Layers
} from 'lucide-react';
import { CustomRole, User, Ban, Booking } from '../../../types';

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

  // Inner Subtabs: 'bans' | 'roles' | 'users' | 'types'
  const [govTab, setGovTab] = useState<'bans' | 'roles' | 'users' | 'types'>(() => {
    if (hasPermission('ISSUE_BAN')) return 'bans';
    if (hasPermission('MANAGE_ROLES')) return 'roles';
    if (hasPermission('MANAGE_USERS')) return 'users';
    if (hasPermission('MANAGE_BOOKING_TYPES')) return 'types';
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
    } else if (hasPermission('MANAGE_BOOKING_TYPES')) {
      setGovTab('types');
    }
  }, [currentUser]);

  // Messaging / Processing state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // --- Roles Form States ---
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [banCeiling, setBanCeiling] = useState('7');

  const availablePermissions = [
    'SUBMIT_BOOKING',
    'CANCEL_OWN_BOOKING',
    'VIEW_PENDING_QUEUE',
    'APPROVE_REJECT_BOOKINGS',
    'BOOKING_OVERRIDE',
    'ISSUE_BAN',
    'MANAGE_ROOMS',
    'VIEW_ANALYTICS_DASHBOARD',
    'EXPORT_AUDIT_LOGS',
    'MANAGE_ROLES',
    'MANAGE_USERS',
    'MANAGE_BOOKING_TYPES'
  ];

  // --- Users Form States ---
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('UCP Member');

  // --- Bans Form States ---
  const [banEmail, setBanEmail] = useState('');
  const [banName, setBanName] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('7 days');
  const [customDays, setCustomDays] = useState('15');

  const matchedBanUser = users.find(u => u.email.trim().toLowerCase() === banEmail.trim().toLowerCase());

  // Ban Lift State
  const [liftingBan, setLiftingBan] = useState<Ban | null>(null);
  const [liftReason, setLiftReason] = useState('');

  // --- Booking Types management states ---
  const [bTypes, setBTypes] = useState<any[]>([]);
  const [btName, setBtName] = useState('');
  const [btDesc, setBtDesc] = useState('');
  const [btActive, setBtActive] = useState(true);
  const [editingBt, setEditingBt] = useState<any | null>(null);

  const fetchBTypes = () => {
    fetch('/api/booking-types')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch booking types');
        return res.json();
      })
      .then(data => {
        setBTypes(data);
      })
      .catch(err => {
        console.error('Error fetching booking types in admin:', err);
      });
  };

  useEffect(() => {
    if (govTab === 'types') {
      fetchBTypes();
    }
  }, [govTab]);

  // --- Booking Types handlers ---
  const [deletingBt, setDeletingBt] = useState<{ id: number, name: string } | null>(null);

  const handleCreateOrUpdateBt = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!btName.trim()) {
      setErrorMsg("Booking type name is required.");
      return;
    }
    setProcessing(true);
    const method = editingBt ? 'PUT' : 'POST';
    const url = editingBt ? `/api/booking-types/${editingBt.id}` : '/api/booking-types';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: btName.trim(),
          description: btDesc.trim(),
          isActive: btActive
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save booking type');
      }
      setSuccessMsg(editingBt ? `Booking type '${btName.trim()}' updated successfully.` : `Booking type '${btName.trim()}' created successfully.`);
      setBtName('');
      setBtDesc('');
      setBtActive(true);
      setEditingBt(null);
      fetchBTypes();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditBtClick = (bt: any) => {
    clearMessages();
    setEditingBt(bt);
    setBtName(bt.name);
    setBtDesc(bt.description || '');
    setBtActive(bt.isActive !== false);
  };

  const handleCancelBtEdit = () => {
    setEditingBt(null);
    setBtName('');
    setBtDesc('');
    setBtActive(true);
  };

  const handleConfirmDeleteBt = async () => {
    if (!deletingBt) return;
    clearMessages();
    setProcessing(true);
    try {
      const res = await fetch(`/api/booking-types/${deletingBt.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete booking type');
      }
      setSuccessMsg(`Booking type '${deletingBt.name}' deleted successfully.`);
      setDeletingBt(null);
      fetchBTypes();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  // Adjust default banDuration based on ceilingDays
  useEffect(() => {
    if (currentUser.role !== 'Administrator') {
      if (ceilingDays > 0 && ceilingDays < 7) {
        setBanDuration('3 days');
      } else if (ceilingDays === 0) {
        setBanDuration('');
      } else {
        setBanDuration('7 days');
      }
    } else {
      setBanDuration('7 days');
    }
  }, [ceilingDays, currentUser.role]);

  // Automatically fetch user name from simulated users list or bookings history if the email matches
  useEffect(() => {
    if (matchedBanUser) {
      setBanName(matchedBanUser.name);
    } else {
      const matchedBooking = bookings.find(b => b.email.trim().toLowerCase() === banEmail.trim().toLowerCase());
      if (matchedBooking) {
        setBanName(matchedBooking.name);
      } else if (banEmail.trim()) {
        setBanName("External / Booking Profile");
      } else {
        setBanName("");
      }
    }
  }, [matchedBanUser, banEmail, bookings]);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // BAN SUBMISSIONS
  const handleIssueBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const targetEmail = banEmail.trim().toLowerCase();

    // Prevent banning Administrators
    const targetUser = users.find(u => u.email.toLowerCase() === targetEmail);
    if (
      (targetUser && targetUser.role?.toLowerCase() === 'administrator') ||
      targetEmail === 'director@takhleeq.pk'
    ) {
      setErrorMsg("Validation Error: Administrators cannot be suspended or banned, and no Administrator can ban another Administrator.");
      return;
    }

    setProcessing(true);

    const days = banDuration === 'Custom' ? parseInt(customDays) : 
                 banDuration === '3 days' ? 3 :
                 banDuration === '7 days' ? 7 :
                 banDuration === '30 days' ? 30 : 999999;

    if (currentUser.role !== 'Administrator' && days > ceilingDays) {
      setErrorMsg(`Form Validation Error: Your role's ban ceiling is ${ceilingDays} days. You cannot issue a ban for ${days} days.`);
      setProcessing(false);
      return;
    }

    const actualDuration = banDuration === 'Custom' ? `${customDays} days` : banDuration;

    try {
      await onIssueBan({
        email: banEmail,
        name: banName,
        reason: banReason,
        duration: actualDuration
      });
      setSuccessMsg(`Ban restriction successfully registered for '${banEmail}'.`);
      setBanEmail('');
      setBanName('');
      setBanReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue ban.');
    } finally {
      setProcessing(false);
    }
  };

  const handleLiftBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liftingBan) return;
    if (!liftReason.trim()) {
      setErrorMsg('Mandatory lift reason required.');
      return;
    }

    clearMessages();
    setProcessing(true);

    try {
      await onLiftBan(liftingBan.id, liftReason);
      setSuccessMsg(`Active ban restriction early-lifted for '${liftingBan.email}'.`);
      setLiftingBan(null);
      setLiftReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lift ban.');
    } finally {
      setProcessing(false);
    }
  };

  // ROLE SUBMISSIONS
  const handlePermissionToggle = (perm: string) => {
    if (!hasPermission(perm)) {
      setErrorMsg(`Privilege Escalation Blocked: You cannot assign '${perm}' because you do not hold this permission yourself.`);
      return;
    }
    setSelectedPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const startEditingRole = (role: CustomRole) => {
    setEditingRole(role);
    setNewRoleName(role.name);
    setNewRoleDesc(role.description);
    setSelectedPermissions(role.permissions);
    setBanCeiling(role.banDurationCeiling !== undefined && role.banDurationCeiling !== null ? String(role.banDurationCeiling) : '7');
    clearMessages();
  };

  const cancelEditingRole = () => {
    setEditingRole(null);
    setNewRoleName('');
    setNewRoleDesc('');
    setSelectedPermissions([]);
    setBanCeiling('7');
    clearMessages();
  };

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (selectedPermissions.length === 0) {
      setErrorMsg('Role builder: Select at least one permission node.');
      return;
    }

    setProcessing(true);

    try {
      if (editingRole) {
        await onUpdateRole(editingRole.name, {
          description: newRoleDesc,
          permissions: selectedPermissions,
          banDurationCeiling: banCeiling
        });
        setSuccessMsg(`Custom role '${editingRole.name}' successfully updated in policy tree.`);
        cancelEditingRole();
      } else {
        await onCreateRole({
          name: newRoleName,
          description: newRoleDesc,
          permissions: selectedPermissions,
          banDurationCeiling: banCeiling
        });
        setSuccessMsg(`Custom role '${newRoleName}' successfully compiled into policy tree.`);
        setNewRoleName('');
        setNewRoleDesc('');
        setSelectedPermissions([]);
        setBanCeiling('7');
      }
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save role.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRoleSubmit = async (roleName: string) => {
    if (roleName === 'Administrator' || roleName === 'UCP Member') {
      setErrorMsg('System Block: Seed-level system roles cannot be purged.');
      return;
    }

    clearMessages();
    setProcessing(true);
    try {
      await onDeleteRole(roleName);
      setSuccessMsg(`Role '${roleName}' purged from policy tree.`);
      setDeletingRole(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete role.');
    } finally {
      setProcessing(false);
    }
  };

  // USER SUBMISSIONS
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (currentUser.role !== 'Administrator' && newUserRole === 'Administrator') {
      setErrorMsg("Privilege Escalation Blocked: Only existing Administrators can register profiles with the Administrator role.");
      return;
    }

    setProcessing(true);

    try {
      await onCreateUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        status: 'Active'
      });
      setSuccessMsg(`Simulated user workspace registered successfully for '${newUserEmail}'.`);
      setNewUserName('');
      setNewUserEmail('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user.');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickAssignRole = async (email: string, role: string) => {
    clearMessages();

    const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (currentUser.role !== 'Administrator') {
      if (targetUser?.role === 'Administrator') {
        setErrorMsg("Privilege Escalation Blocked: Non-Administrators cannot change the role of an Administrator account.");
        return;
      }
      if (role === 'Administrator') {
        setErrorMsg("Privilege Escalation Blocked: Only existing Administrators can assign or elevate another account to the Administrator role.");
        return;
      }
    }

    setProcessing(true);
    try {
      await onAssignRole(email, role);
      setSuccessMsg(`Role reassignment committed: ${email} -> ${role}.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign role.');
    } finally {
      setProcessing(false);
    }
  };

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
          <span>Simulated Users</span>
          {!hasPermission('MANAGE_USERS') && <Lock className="h-3 w-3 text-gray-400" />}
        </button>
        <button
          onClick={() => { setGovTab('types'); clearMessages(); }}
          disabled={!hasPermission('MANAGE_BOOKING_TYPES')}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            govTab === 'types' 
              ? 'bg-primary text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Layers className="h-4 w-4" /> 
          <span>Booking Types</span>
          {!hasPermission('MANAGE_BOOKING_TYPES') && <Lock className="h-3 w-3 text-gray-400" />}
        </button>
      </div>

      {govTab === 'bans' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Issue Ban Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Issue Blacklist Restriction</h3>
              <p className="text-[11px] text-gray-500">Temporarily or permanently restrict a user account from reserving rooms.</p>
            </div>

            <form onSubmit={handleIssueBanSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Blacklist Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={banEmail}
                  onChange={e => setBanEmail(e.target.value)}
                  placeholder="e.g. rebel@ucp.edu.pk"
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Account Holder Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={banName}
                  disabled={true}
                  placeholder="Will autofill based on email..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-gray-100 text-gray-400 cursor-not-allowed font-medium"
                />
                {matchedBanUser ? (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <Check className="h-3 w-3" /> Verified simulated profile: {matchedBanUser.name}
                  </p>
                ) : banEmail.trim() ? (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <Info className="h-3 w-3" /> External / Booking-only history profile
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Blacklist Duration <span className="text-red-500">*</span></label>
                <select
                  value={banDuration}
                  onChange={e => setBanDuration(e.target.value)}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                >
                  {(currentUser.role === 'Administrator' || ceilingDays >= 3) && <option value="3 days">3 Days Suspension</option>}
                  {(currentUser.role === 'Administrator' || ceilingDays >= 7) && <option value="7 days">7 Days Suspension</option>}
                  {(currentUser.role === 'Administrator' || ceilingDays >= 30) && <option value="30 days">30 Days Suspension</option>}
                  {currentUser.role === 'Administrator' && <option value="Permanent">Permanent Ban</option>}
                  {(currentUser.role === 'Administrator' || ceilingDays > 0) && <option value="Custom">Custom Days...</option>}
                </select>
              </div>

              {banDuration === 'Custom' && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                    Custom Duration (Days) {currentUser.role !== 'Administrator' && `— Max ${ceilingDays} days`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={currentUser.role === 'Administrator' ? undefined : ceilingDays}
                    value={customDays}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      if (currentUser.role !== 'Administrator' && val > ceilingDays) {
                        setCustomDays(String(ceilingDays));
                      } else {
                        setCustomDays(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Official Policy Violation Reason <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  placeholder="e.g. Double booking manipulation and failure to clean space after society session..."
                  className="w-full p-2.5 border border-gray-155 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {processing ? 'Processing restriction...' : 'Commit Blacklist Rule'}
              </button>
            </form>
          </div>

          {/* Active Bans Registry */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Active Blacklist Registry</h3>
              <p className="text-[11px] text-gray-500">Registry of suspended users. Conflict Engine automatically blocks active bans.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-[9px] font-black text-gray-400 uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Subject Account</th>
                    <th className="py-2.5 px-3">Violation Reason</th>
                    <th className="py-2.5 px-3">Duration Details</th>
                    <th className="py-2.5 px-3 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeBans.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-gray-400">No active blacklist suspensions recorded.</td>
                    </tr>
                  ) : (
                    activeBans.map(ban => (
                      <tr key={ban.id} className="hover:bg-gray-50/30 text-gray-700">
                        <td className="py-3 px-3">
                          <p className="font-extrabold text-gray-900">{ban.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{ban.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="line-clamp-2 max-w-xs text-gray-600">{ban.reason}</p>
                          {ban.status === 'Lifted' && <p className="text-[9px] text-emerald-600 font-semibold mt-1">Lifted: {ban.liftedReason}</p>}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            ban.status === 'Active' ? 'bg-rose-50 text-rose-800 border border-rose-100' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {ban.status} ({ban.duration})
                          </span>
                          <p className="text-[9px] text-gray-400 font-mono mt-1">Expires: {ban.expiresAt.split('T')[0]}</p>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {ban.status === 'Active' ? (
                            currentUser.role === 'Administrator' ? (
                              <button
                                onClick={() => { setLiftingBan(ban); clearMessages(); }}
                                className="text-emerald-700 hover:text-white hover:bg-emerald-700 border border-emerald-200 hover:border-emerald-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer"
                              >
                                Lift suspension
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10px] inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
                                <Lock className="h-3 w-3 text-gray-400" /> Admin Only
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 text-[10px]">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {govTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Custom Role Compiler Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {editingRole ? 'Configure Policy Role' : 'Compile Policy Role'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {editingRole 
                  ? `Configure active properties and permissions for '${editingRole.name}'.` 
                  : 'Design a custom security role and compile its active permission nodes.'}
              </p>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Role Identifier <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  disabled={!!editingRole}
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. Society Advisor"
                  className={`w-full p-2.5 border rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white ${
                    editingRole ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'border-gray-150 bg-gray-50/50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Policy Description <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Describe the operational scope of this custom role..."
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Active Permission Nodes <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border p-3 rounded-xl bg-gray-50/30">
                  {availablePermissions.map(perm => {
                    const isChecked = selectedPermissions.includes(perm);
                    const isAllowed = hasPermission(perm);
                    return (
                      <button
                        type="button"
                        key={perm}
                        disabled={!isAllowed}
                        onClick={() => handlePermissionToggle(perm)}
                        className={`p-2 rounded-lg border text-left text-[10px] font-mono font-bold transition-all flex items-center justify-between cursor-pointer ${
                          !isAllowed
                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50'
                            : isChecked 
                              ? 'bg-primary/5 text-primary border-primary/25' 
                              : 'bg-white text-gray-500 border-gray-150 hover:bg-gray-50'
                        }`}
                        title={!isAllowed ? `Locked: You do not hold the '${perm}' permission` : undefined}
                      >
                        <span className="truncate">{perm}</span>
                        {!isAllowed ? (
                          <Lock className="h-3 w-3 shrink-0 text-gray-400" />
                        ) : isChecked ? (
                          <Check className="h-3 w-3 shrink-0 text-primary" />
                        ) : (
                          <Plus className="h-3 w-3 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  {processing ? 'Saving role...' : (editingRole ? 'Update Role & Save' : 'Compile Role & Save')}
                </button>
                {editingRole && (
                  <button
                    type="button"
                    onClick={cancelEditingRole}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* compiled Role list */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Compiled Policy Roles</h3>
              <p className="text-[11px] text-gray-500">System roles compiling security bounds and operational permissions.</p>
            </div>

            <div className="space-y-4">
              {roles.map(role => (
                <div key={role.name} className="border border-gray-155 rounded-xl p-4 space-y-3 bg-white hover:border-gray-300 transition-all text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Key className="h-4 w-4 text-primary" />
                        {role.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">{role.description}</p>
                    </div>
                    {role.name !== 'Administrator' && role.name !== 'UCP Member' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditingRole(role)}
                          className="text-primary hover:bg-primary/5 p-1.5 rounded-lg border border-transparent hover:border-primary/10 transition-colors cursor-pointer"
                          title="Configure role"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingRole(role.name)}
                          className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                          title="Purge role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-50">
                    {role.permissions.map(perm => (
                      <span key={perm} className="bg-gray-50 border border-gray-150 text-gray-500 text-[8px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {govTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Add simulated user form */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Register Simulated Profile</h3>
              <p className="text-[11px] text-gray-500">Register a simulated Microsoft 365 profile to test portal and dashboard logic.</p>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Profile Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Bilal Haider"
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">M365 Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. bilal@ucp.edu.pk"
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Initial Security Role <span className="text-red-500">*</span></label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value)}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary"
                >
                  {roles.map(r => {
                    const isAllowed = currentUser.role === 'Administrator' || r.name !== 'Administrator';
                    return (
                      <option key={r.name} value={r.name} disabled={!isAllowed}>
                        {r.name} {!isAllowed ? '(Locked)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {processing ? 'Registering workspace...' : 'Register Workspace Profile'}
              </button>
            </form>
          </div>

          {/* Simulated Users list */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Simulated Workspace Profiles</h3>
              <p className="text-[11px] text-gray-500">Live test profiles mapped to the Microsoft Azure AD simulator.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-[9px] font-black text-gray-400 uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Simulated Identity</th>
                    <th className="py-2.5 px-3">Identity Email</th>
                    <th className="py-2.5 px-3">Assigned Role Mapping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(user => (
                    <tr key={user.email} className="hover:bg-gray-50/30 text-gray-700">
                      <td className="py-3 px-3 font-extrabold text-gray-900">{user.name}</td>
                      <td className="py-3 px-3 font-mono text-[10px]">{user.email}</td>
                      <td className="py-3 px-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleQuickAssignRole(user.email, e.target.value)}
                          disabled={currentUser.role !== 'Administrator' && user.role === 'Administrator'}
                          className={`p-1.5 border border-gray-100 rounded-lg text-[11px] bg-gray-50 font-semibold cursor-pointer ${
                            currentUser.role !== 'Administrator' && user.role === 'Administrator' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {roles.map(r => {
                            const isAllowed = currentUser.role === 'Administrator' || r.name !== 'Administrator';
                            return (
                              <option key={r.name} value={r.name} disabled={!isAllowed}>
                                {r.name} {!isAllowed ? '(Locked)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {govTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Create/Edit Booking Type Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {editingBt ? 'Modify Booking Type' : 'Register Booking Type'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {editingBt ? 'Update the active properties of the selected classification.' : 'Create a new organizational classification for submitting booking requests.'}
              </p>
            </div>

            <form onSubmit={handleCreateOrUpdateBt} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Classification Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={btName}
                  onChange={e => setBtName(e.target.value)}
                  placeholder="e.g. Entrepreneurs in residence"
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Scope / Usage Description</label>
                <textarea
                  value={btDesc}
                  onChange={e => setBtDesc(e.target.value)}
                  placeholder="Who does this booking classification cover?"
                  rows={3}
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
                />
              </div>

              <div className="flex items-center gap-2 py-1 bg-gray-50/40 p-3 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  id="bt-active-checkbox"
                  checked={btActive}
                  onChange={e => setBtActive(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="bt-active-checkbox" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  Active (Show on booking form)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                {editingBt && (
                  <button
                    type="button"
                    onClick={handleCancelBtEdit}
                    className="flex-1 border border-gray-150 text-gray-600 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  {processing ? 'Saving...' : editingBt ? 'Update Type' : 'Register Type'}
                </button>
              </div>
            </form>
          </div>

          {/* Booking Types List Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">System Booking Classifications</h3>
              <p className="text-[11px] text-gray-500">Organizations and groups authorized to book facility rooms.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-[9px] font-black text-gray-400 uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Scope Description</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bTypes.map((bt) => (
                    <tr key={bt.id} className="hover:bg-gray-50/30 text-gray-700">
                      <td className="py-3.5 px-3 font-extrabold text-gray-900">{bt.name}</td>
                      <td className="py-3.5 px-3 text-gray-500 leading-normal max-w-[200px] break-words">
                        {bt.description || <span className="text-gray-300 italic">No description provided</span>}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          bt.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-gray-100 text-gray-400 border border-gray-150'
                        }`}>
                          {bt.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleEditBtClick(bt)}
                            className="text-primary hover:bg-primary/5 p-1.5 rounded-lg border border-transparent hover:border-primary/10 transition-colors cursor-pointer"
                            title="Edit booking type"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingBt({ id: bt.id, name: bt.name })}
                            className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                            title="Purge booking type"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                        No booking classifications registered in the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BOOKING TYPE CONFIRMATION MODAL */}
      {deletingBt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-bt-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-155 overflow-hidden flex flex-col">
            <div className="bg-rose-600 text-white p-4 font-black text-xs flex items-center justify-between">
              <span className="uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Purge Booking Type
              </span>
              <button onClick={() => setDeletingBt(null)} className="text-white hover:text-rose-200 font-bold cursor-pointer text-xs">✕</button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <p className="text-xs text-gray-700 leading-relaxed">
                Are you sure you want to completely delete the booking type classification <strong className="text-rose-700 font-black">"{deletingBt.name}"</strong>? This will permanently decompile its active policy classification and is completely irreversible.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-normal flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>System Notice:</strong> Deleting a booking type classification removes it from future booking forms. Existing/historical bookings under this type will remain in the database unaltered.
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4">
                <button
                  type="button"
                  onClick={() => setDeletingBt(null)}
                  className="px-3.5 py-2 border border-gray-150 text-gray-600 hover:bg-gray-50 rounded-lg text-[10px] font-bold cursor-pointer uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleConfirmDeleteBt}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg text-[10px] cursor-pointer disabled:opacity-50 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  {processing ? 'Purging...' : 'Purge Type'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BAN LIFT MODAL */}
      {liftingBan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="lift-ban-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-155 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-4 font-black text-xs flex items-center justify-between">
              <span className="uppercase tracking-wider">Lift Blacklist: {liftingBan.name}</span>
              <button onClick={() => setLiftingBan(null)} className="text-white hover:text-accent font-bold cursor-pointer text-xs">✕</button>
            </div>

            <form onSubmit={handleLiftBanSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 leading-normal">
                <p><strong>Banned Email:</strong> {liftingBan.email}</p>
                <p><strong>Original Violation Reason:</strong> {liftingBan.reason}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Official Lift Justification <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={liftReason}
                  onChange={e => setLiftReason(e.target.value)}
                  placeholder="State the official resolution detail (e.g. Written apology submitted, or department head intervention)..."
                  className="w-full p-2 border border-gray-150 rounded-xl text-xs bg-white text-gray-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                <button
                  type="button"
                  onClick={() => setLiftingBan(null)}
                  className="px-3 py-2 border border-gray-150 text-gray-600 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  Confirm Lift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ROLE CONFIRMATION MODAL */}
      {deletingRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-role-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-155 overflow-hidden flex flex-col">
            <div className="bg-rose-600 text-white p-4 font-black text-xs flex items-center justify-between">
              <span className="uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Purge Policy Role
              </span>
              <button onClick={() => setDeletingRole(null)} className="text-white hover:text-rose-200 font-bold cursor-pointer text-xs">✕</button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <p className="text-xs text-gray-700 leading-relaxed">
                Are you sure you want to completely delete the custom role <strong className="text-rose-700 font-black">"{deletingRole}"</strong>? This will permanently decompile its active permission nodes and is completely irreversible.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-normal flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>System Notice:</strong> Deletion will only succeed if no active users are assigned to this role. Please ensure all members are reassigned before proceeding.
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4">
                <button
                  type="button"
                  onClick={() => setDeletingRole(null)}
                  className="px-3.5 py-2 border border-gray-150 text-gray-600 hover:bg-gray-50 rounded-lg text-[10px] font-bold cursor-pointer uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleDeleteRoleSubmit(deletingRole)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg text-[10px] cursor-pointer disabled:opacity-50 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  {processing ? 'Purging...' : 'Purge Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
