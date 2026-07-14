import React, { useState } from 'react';
import { Shield, Key, UserCheck, UserX, FileText, Plus, Check, X, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Room, CustomRole, User, Ban, AuditRecord } from '../../../types';

interface PolicyAdminPanelProps {
  rooms: Room[];
  roles: CustomRole[];
  users: User[];
  activeBans: Ban[];
  auditLogs: AuditRecord[];
  currentUser: User;
  onRefresh: () => void;
  onAddRoom: (roomData: any) => Promise<void>;
  onUpdateRoom: (roomId: string, updateData: any) => Promise<void>;
  onCreateRole: (roleData: any) => Promise<void>;
  onDeleteRole: (roleName: string) => Promise<void>;
  onAssignRole: (email: string, role: string) => Promise<void>;
  onCreateUser: (userData: any) => Promise<void>;
  onIssueBan: (banData: any) => Promise<void>;
  onLiftBan: (banId: string, reason: string) => Promise<void>;
}

export function PolicyAdminPanel({
  rooms,
  roles,
  users,
  activeBans,
  auditLogs,
  currentUser,
  onRefresh,
  onAddRoom,
  onUpdateRoom,
  onCreateRole,
  onDeleteRole,
  onAssignRole,
  onCreateUser,
  onIssueBan,
  onLiftBan
}: PolicyAdminPanelProps) {
  // Tabs for Policy Admin Panel
  const [subTab, setSubTab] = useState<'rooms' | 'roles' | 'users' | 'bans' | 'audits'>('rooms');

  // Error/Success displays
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // --- Rooms Form States ---
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('30');
  const [roomHours, setRoomHours] = useState('09:00 - 17:00');
  const [roomMinDur, setRoomMinDur] = useState('30');
  const [roomMaxDur, setRoomMaxDur] = useState('180');
  const [roomPurpose, setRoomPurpose] = useState('');

  // --- Roles Form States ---
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [banCeiling, setBanCeiling] = useState('7');

  // Available permissions lists
  const availablePermissions = [
    'SUBMIT_BOOKING',
    'CANCEL_OWN_BOOKING',
    'VIEW_PENDING_QUEUE',
    'APPROVE_BOOKING',
    'REJECT_BOOKING',
    'BOOKING_OVERRIDE',
    'MANAGE_BANS',
    'MANAGE_ROOMS',
    'MANAGE_ROLES',
    'VIEW_AUDIT_LOGS',
    'VIEW_ANALYTICS_DASHBOARD',
    'EXPORT_AUDIT_LOGS'
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
  const [liftingBanId, setLiftingBanId] = useState<string | null>(null);
  const [liftReason, setLiftReason] = useState('');

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // ROOM ACTIONS
  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setProcessing(true);

    try {
      await onAddRoom({
        name: roomName,
        capacity: roomCapacity,
        operatingHours: roomHours,
        minBookingDuration: roomMinDur,
        maxBookingDuration: roomMaxDur,
        purpose: roomPurpose
      });
      setSuccessMsg(`Room '${roomName}' added successfully to registry.`);
      setRoomName('');
      setRoomPurpose('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add room.');
    } finally {
      setProcessing(false);
    }
  };

  const toggleRoomStatus = async (room: Room) => {
    clearMessages();
    setProcessing(true);
    try {
      await onUpdateRoom(room.id, { isActive: !room.isActive });
      setSuccessMsg(`Space status updated for ${room.name}.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update space.');
    } finally {
      setProcessing(false);
    }
  };

  // ROLE ACTIONS
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
      setSuccessMsg(`Custom role '${newRoleName}' added to ERP permission model.`);
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedPermissions([]);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to construct role.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRoleClick = async (roleName: string) => {
    clearMessages();
    if (!window.confirm(`Are you sure you want to delete custom role '${roleName}'?`)) return;

    setProcessing(true);
    try {
      await onDeleteRole(roleName);
      setSuccessMsg(`Role ${roleName} deleted successfully.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete role.');
    } finally {
      setProcessing(false);
    }
  };

  // USER MANAGEMENT
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setProcessing(true);

    try {
      await onCreateUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole
      });
      setSuccessMsg(`Created simulation user account for ${newUserName}.`);
      setNewUserName('');
      setNewUserEmail('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add user account.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleAssignSubmit = async (email: string, role: string) => {
    clearMessages();
    setProcessing(true);

    try {
      await onAssignRole(email, role);
      setSuccessMsg(`Simulated user ${email} successfully promoted to ${role}.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reassign role.');
    } finally {
      setProcessing(false);
    }
  };

  // BAN MANAGEMENT
  const handleIssueBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setProcessing(true);

    let durationStr = banDuration;
    if (banDuration === 'Custom') {
      durationStr = `Custom ${customDays} days`;
    }

    try {
      await onIssueBan({
        email: banEmail,
        name: banName,
        reason: banReason,
        duration: durationStr
      });
      setSuccessMsg(`Strict ban actively set for ${banEmail}. Associated pending reviews blocked.`);
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
    if (!liftingBanId) return;
    clearMessages();
    setProcessing(true);

    try {
      await onLiftBan(liftingBanId, liftReason);
      setSuccessMsg('Ban lifted successfully. The email can now make space requests again.');
      setLiftingBanId(null);
      setLiftReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lift ban.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden" id="policy-admin-module">
      <div className="bg-primary text-white px-6 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Governance & Security Center</h2>
          <p className="text-xs text-white/80">
            Define space parameters, build custom roles, manage restricted users, and inspect immutable system audit logs.
          </p>
        </div>
        <span className="text-xs bg-accent text-primary font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          MOD-01C Control
        </span>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/50">
        <button
          onClick={() => { setSubTab('rooms'); clearMessages(); }}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            subTab === 'rooms' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield className="h-4 w-4" /> Room Configurations
        </button>

        <button
          onClick={() => { setSubTab('roles'); clearMessages(); }}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            subTab === 'roles' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Key className="h-4 w-4" /> Role & Permissions Matrix
        </button>

        <button
          onClick={() => { setSubTab('users'); clearMessages(); }}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            subTab === 'users' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserCheck className="h-4 w-4" /> Simulated Users
        </button>

        <button
          onClick={() => { setSubTab('bans'); clearMessages(); }}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            subTab === 'bans' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserX className="h-4 w-4" /> Ban List & Restrictions
        </button>

        <button
          onClick={() => { setSubTab('audits'); clearMessages(); }}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            subTab === 'audits' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="h-4 w-4" /> Immutable System Audits
        </button>
      </div>

      <div className="p-6 md:p-8">
        
        {/* Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex gap-3 text-xs animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-bold">Execution Blocked</h3>
              <p className="text-rose-700 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-900 flex gap-3 text-xs animate-fade-in">
            <Check className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <h3 className="font-bold">Action Completed Successfully</h3>
              <p className="text-green-700 mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        {/* SUBTAB 1: ROOMS */}
        {subTab === 'rooms' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Add Room Form */}
              <div className="md:col-span-1 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b">Add Operational Space</h3>
                <form onSubmit={handleAddRoomSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Room/Space Name *</label>
                    <input
                      type="text"
                      required
                      value={roomName}
                      onChange={e => setRoomName(e.target.value)}
                      placeholder="e.g. Executive Board Room"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Capacity *</label>
                      <input
                        type="number"
                        required
                        value={roomCapacity}
                        onChange={e => setRoomCapacity(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Min Dur (Mins) *</label>
                      <input
                        type="number"
                        required
                        value={roomMinDur}
                        onChange={e => setRoomMinDur(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Max Dur (Mins) *</label>
                      <input
                        type="number"
                        required
                        value={roomMaxDur}
                        onChange={e => setRoomMaxDur(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Operating Hours *</label>
                      <input
                        type="text"
                        required
                        value={roomHours}
                        onChange={e => setRoomHours(e.target.value)}
                        placeholder="09:00 - 17:00"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Room Guidelines / Purpose *</label>
                    <textarea
                      required
                      rows={2}
                      value={roomPurpose}
                      onChange={e => setRoomPurpose(e.target.value)}
                      placeholder="e.g. Only for formal student pitch events & panel reviews"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-2 rounded-lg text-xs cursor-pointer disabled:opacity-50"
                  >
                    Register Space Record
                  </button>
                </form>
              </div>

              {/* Rooms Registry Grid */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b">Active Spaces Registries</h3>
                <div className="grid grid-cols-1 gap-4">
                  {rooms.map(room => (
                    <div key={room.id} className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-all bg-white shadow-3xs flex justify-between items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{room.name}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>
                            {room.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 text-[11px] text-gray-500">
                          <div><strong>Max Cap:</strong> {room.capacity}</div>
                          <div><strong>Hours:</strong> {room.operatingHours}</div>
                          <div><strong>Min/Max Limit:</strong> {room.minBookingDuration}-{room.maxBookingDuration} mins</div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1"><strong>Allowed for:</strong> {room.purpose}</p>
                      </div>

                      <button
                        onClick={() => toggleRoomStatus(room)}
                        className={`px-3 py-1.5 font-bold text-xs rounded-lg cursor-pointer border ${
                          room.isActive 
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        }`}
                      >
                        {room.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: ROLE MATRIX & BUILDER */}
        {subTab === 'roles' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Role Builder Form */}
              <div className="md:col-span-1 space-y-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Custom Role Builder</h3>
                <p className="text-[11px] text-gray-500 mb-4">Create customized functional teams with distinct privilege scopes.</p>
                
                <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Role Title *</label>
                    <input
                      type="text"
                      required
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="e.g. Incubation Coach"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Description *</label>
                    <input
                      type="text"
                      required
                      value={newRoleDesc}
                      onChange={e => setNewRoleDesc(e.target.value)}
                      placeholder="e.g. Incubation coaches evaluating startups"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Ban Ceiling (Max Days) *</label>
                    <select
                      value={banCeiling}
                      onChange={e => setBanCeiling(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    >
                      <option value="7">7 Days maximum</option>
                      <option value="30">30 Days maximum</option>
                      <option value="90">90 Days maximum</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-600">Select Permissions Nodes:</label>
                    <div className="space-y-1 max-h-48 overflow-y-auto border p-2.5 rounded-lg bg-white">
                      {availablePermissions.map(perm => (
                        <label key={perm} className="flex items-center gap-2 text-[11px] text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm)}
                            onChange={() => handlePermissionToggle(perm)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>{perm.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                  >
                    Compile Custom Role
                  </button>
                </form>
              </div>

              {/* Roles matrix display */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b">System Permission Hierarchies</h3>
                
                <div className="space-y-4">
                  {roles.map(role => (
                    <div key={role.name} className="p-4 border border-gray-100 rounded-xl bg-white shadow-3xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4 text-primary" /> {role.name}
                          </h4>
                          <p className="text-[11px] text-gray-500">{role.description}</p>
                          <p className="text-[10px] text-primary font-semibold mt-1">Ban Authority limit: {role.banDurationCeiling || 'Permanent'} Days</p>
                        </div>
                        {role.name !== 'Administrator' && role.name !== 'UCP Member' && (
                          <button
                            onClick={() => handleDeleteRoleClick(role.name)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border rounded-lg cursor-pointer"
                            title="Delete custom role"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 border-t border-gray-50 pt-2">
                        {role.permissions.map(perm => (
                          <span key={perm} className="bg-gray-50 text-gray-500 border border-gray-100 text-[9px] font-bold px-2 py-0.5 rounded-md">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: SIMULATED IDENTITY USERS */}
        {subTab === 'users' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Create User Form */}
              <div className="md:col-span-1 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b">Register Simulation User</h3>
                <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">User Name *</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      placeholder="e.g. Bilal Ahmed"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      placeholder="e.g. bilal@ucp.edu.pk"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Assigned Role *</label>
                    <select
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    >
                      {roles.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                  >
                    Register Simulation Identity
                  </button>
                </form>
              </div>

              {/* User Accounts list */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b">Active Simulation Accounts</h3>
                <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white shadow-3xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase text-gray-400">
                        <th className="py-2.5 px-4">User</th>
                        <th className="py-2.5 px-4">Email</th>
                        <th className="py-2.5 px-4">Role Assigned</th>
                        <th className="py-2.5 px-4 text-right">Promote / Reassign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                      {users.map(u => (
                        <tr key={u.email} className="hover:bg-gray-50/20">
                          <td className="py-3 px-4 font-bold text-gray-900">{u.name}</td>
                          <td className="py-3 px-4 font-mono">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-0.5 rounded">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleAssignSubmit(u.email, e.target.value)}
                              className="p-1 border border-gray-200 rounded-lg text-[10px] bg-white cursor-pointer"
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
          </div>
        )}

        {/* SUBTAB 4: ACTIVE BANS */}
        {subTab === 'bans' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ban Issuer Form */}
              <div className="md:col-span-1 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b">Issue Active Restriction (Ban)</h3>
                <form onSubmit={handleIssueBanSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email Address to Ban *</label>
                    <input
                      type="email"
                      required
                      value={banEmail}
                      onChange={e => setBanEmail(e.target.value)}
                      placeholder="e.g. violator@ucp.edu.pk"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Checked history exists first in ERP registries</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Violator's Name *</label>
                    <input
                      type="text"
                      required
                      value={banName}
                      onChange={e => setBanName(e.target.value)}
                      placeholder="e.g. Hammad Malik"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Written Justification (Mandatory) *</label>
                    <textarea
                      required
                      rows={2}
                      value={banReason}
                      onChange={e => setBanReason(e.target.value)}
                      placeholder="e.g. Unannounced booking absence & multiple overlapping slot lock attempts"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Duration *</label>
                      <select
                        value={banDuration}
                        onChange={e => setBanDuration(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                      >
                        <option value="7 days">7 Days</option>
                        <option value="30 days">30 Days</option>
                        <option value="90 days">90 Days</option>
                        <option value="Permanent">Permanent (Admin only)</option>
                        <option value="Custom">Custom Days</option>
                      </select>
                    </div>

                    {banDuration === 'Custom' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">No. of Days *</label>
                        <input
                          type="number"
                          required
                          value={customDays}
                          onChange={e => setCustomDays(e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    Commit Active Ban Flag
                  </button>
                </form>
              </div>

              {/* Active Bans Registries */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-2 border-b">Active Ban registry</h3>
                <div className="grid grid-cols-1 gap-4">
                  {activeBans.length === 0 ? (
                    <div className="border border-dashed py-8 text-center text-xs text-gray-400">
                      No active bans found. The system is operating securely.
                    </div>
                  ) : (
                    activeBans.map(ban => (
                      <div key={ban.id} className="p-4 border border-rose-100 rounded-xl bg-rose-50/20 shadow-3xs flex justify-between items-start gap-4">
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-rose-800 flex items-center gap-1">
                            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" /> {ban.name} ({ban.email})
                          </p>
                          <p className="text-gray-600"><strong>Reason:</strong> {ban.reason}</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 text-[10px] text-gray-500 pt-1.5 border-t border-dashed border-rose-100 mt-2">
                            <div><strong>Banned By:</strong> {ban.bannedBy}</div>
                            <div><strong>Expiry:</strong> {ban.expiresAt === 'Never' ? 'Permanent Restriction' : new Date(ban.expiresAt).toLocaleDateString()}</div>
                            <div><strong>Status:</strong> <span className="font-bold">{ban.status}</span></div>
                          </div>
                          {ban.status === 'Lifted' && (
                            <div className="text-[10px] bg-green-50 border border-green-100 text-green-700 p-2 rounded-lg mt-2">
                              <strong>Lifted Reason:</strong> {ban.liftedReason} (by {ban.liftedBy})
                            </div>
                          )}
                        </div>

                        {ban.status === 'Active' && currentUser.role === 'Administrator' && (
                          <button
                            onClick={() => { setLiftingBanId(ban.id); setLiftReason(''); }}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap"
                          >
                            Lift Ban Early
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 5: SYSTEM AUDIT LOGS */}
        {subTab === 'audits' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Immutable Governance Trail</h3>
                <p className="text-[11px] text-gray-500">Every status update, schedule override, and security promotion is tracked automatically</p>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono font-bold">
                {auditLogs.length} Entries Logs
              </span>
            </div>

            {currentUser.role !== 'Administrator' ? (
              <div className="border border-dashed py-8 text-center text-xs text-rose-700 bg-rose-50 border-rose-100 rounded-xl">
                Privilege Blocked: Access Denied. Only the 'Administrator' role has visual clearance to read the raw system audit log.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3.5 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors bg-white shadow-3xs space-y-2">
                    <div className="flex flex-col md:flex-row justify-between text-xs gap-1">
                      <p className="font-bold text-gray-800">{log.action}</p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-[11px] text-gray-600">
                      <strong>Actor:</strong> {log.user}
                    </div>
                    {log.previousValue && (
                      <div className="text-[10px] font-mono bg-gray-50 p-1.5 rounded text-gray-500 max-w-full overflow-x-auto">
                        <strong className="text-rose-600 text-[9px] uppercase font-sans">Previous:</strong> {log.previousValue}
                      </div>
                    )}
                    {log.newValue && (
                      <div className="text-[10px] font-mono bg-gray-50 p-1.5 rounded text-gray-800 max-w-full overflow-x-auto">
                        <strong className="text-green-600 text-[9px] uppercase font-sans">New Value:</strong> {log.newValue}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* LIFT BAN MODAL */}
      {liftingBanId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleLiftBanSubmit} className="bg-white rounded-2xl max-w-md w-full shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-primary text-white p-4 font-bold text-sm flex items-center justify-between">
              <span>Early Ban Release Authorization</span>
              <button type="button" onClick={() => setLiftingBanId(null)} className="text-white hover:text-accent font-bold cursor-pointer">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                Rule BR-10: Only Administrators have clearance to lift active restrictions early. You must provide a formal written justification which will be stored on the immutable audit trail.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Formal Lifting Justification *</label>
                <textarea
                  required
                  rows={3}
                  value={liftReason}
                  onChange={e => setLiftReason(e.target.value)}
                  placeholder="e.g. User issued formal apology and has been briefed on operations guidelines"
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-800 focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLiftingBanId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {processing ? 'Processing Lift...' : 'Release Restriction'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
