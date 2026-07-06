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
  Mail
} from 'lucide-react';
import { CustomRole, User, Ban } from '../../../types';

interface GovernanceCenterPageProps {
  roles: CustomRole[];
  users: User[];
  activeBans: Ban[];
  currentUser: User;
  onRefresh: () => void;
  onCreateRole: (roleData: any) => Promise<void>;
  onDeleteRole: (roleName: string) => Promise<void>;
  onAssignRole: (email: string, role: string) => Promise<void>;
  onCreateUser: (userData: any) => Promise<void>;
  onIssueBan: (banData: any) => Promise<void>;
  onLiftBan: (banId: string, reason: string) => Promise<void>;
}

export function GovernanceCenterPage({
  roles,
  users,
  activeBans,
  currentUser,
  onRefresh,
  onCreateRole,
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
    }
  }

  // Inner Subtabs: 'bans' | 'roles' | 'users'
  const [govTab, setGovTab] = useState<'bans' | 'roles' | 'users'>('bans');

  // Messaging / Processing state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // --- Roles Form States ---
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [banCeiling, setBanCeiling] = useState('7');

  const availablePermissions = [
    'SUBMIT_BOOKING',
    'CANCEL_OWN_BOOKING',
    'VIEW_PENDING_QUEUE',
    'APPROVE_BOOKING',
    'REJECT_BOOKING',
    'BOOKING_OVERRIDE',
    'ISSUE_BAN'
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

  // Ban Lift State
  const [liftingBan, setLiftingBan] = useState<Ban | null>(null);
  const [liftReason, setLiftReason] = useState('');

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

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // BAN SUBMISSIONS
  const handleIssueBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
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
    setSelectedPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
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
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compile role.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRoleSubmit = async (roleName: string) => {
    if (roleName === 'Administrator' || roleName === 'UCP Member') {
      alert('System Block: Seed-level system roles cannot be purged.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${roleName}"? This is irreversible.`)) return;

    clearMessages();
    setProcessing(true);
    try {
      await onDeleteRole(roleName);
      setSuccessMsg(`Role '${roleName}' purged from policy tree.`);
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
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            govTab === 'bans' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <UserX className="h-4 w-4" /> Blacklist & Bans
        </button>
        <button
          onClick={() => { setGovTab('roles'); clearMessages(); }}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            govTab === 'roles' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Key className="h-4 w-4" /> Policy Role Compiler
        </button>
        <button
          onClick={() => { setGovTab('users'); clearMessages(); }}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            govTab === 'users' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Users className="h-4 w-4" /> Simulated Users
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
                  onChange={e => setBanName(e.target.value)}
                  placeholder="e.g. Asad Jamil"
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
                />
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
                            <button
                              onClick={() => { setLiftingBan(ban); clearMessages(); }}
                              className="text-emerald-700 hover:text-white hover:bg-emerald-700 border border-emerald-200 hover:border-emerald-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer"
                            >
                              Lift suspension
                            </button>
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
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Compile Policy Role</h3>
              <p className="text-[11px] text-gray-500">Design a custom security role and compile its active permission nodes.</p>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Role Identifier <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. Society Advisor"
                  className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50"
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
                    return (
                      <button
                        type="button"
                        key={perm}
                        onClick={() => handlePermissionToggle(perm)}
                        className={`p-2 rounded-lg border text-left text-[10px] font-mono font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isChecked 
                            ? 'bg-primary/5 text-primary border-primary/25' 
                            : 'bg-white text-gray-500 border-gray-150 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{perm}</span>
                        {isChecked ? <Check className="h-3 w-3 shrink-0 text-primary" /> : <Plus className="h-3 w-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {processing ? 'Compiling role...' : 'Compile Role & Save'}
              </button>
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
                      <button
                        onClick={() => handleDeleteRoleSubmit(role.name)}
                        className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                        title="Purge role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                  {roles.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
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
                          className="p-1.5 border border-gray-100 rounded-lg text-[11px] bg-gray-50 font-semibold cursor-pointer"
                        >
                          {roles.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
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

    </div>
  );
}
