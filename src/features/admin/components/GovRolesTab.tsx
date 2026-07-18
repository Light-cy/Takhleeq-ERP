import React, { useState } from 'react';
import { Key, Plus, Check, Lock, Edit3, Trash2, AlertTriangle, Info } from 'lucide-react';
import { CustomRole } from '../../../types';

interface GovRolesTabProps {
  roles: CustomRole[];
  hasPermission: (permission: string) => boolean;
  onRefresh: () => void;
  onCreateRole: (roleData: any) => Promise<void>;
  onUpdateRole: (roleName: string, roleData: any) => Promise<void>;
  onDeleteRole: (roleName: string) => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  processing: boolean;
  setProcessing: (p: boolean) => void;
}

export function GovRolesTab({
  roles,
  hasPermission,
  onRefresh,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  setErrorMsg,
  setSuccessMsg,
  processing,
  setProcessing
}: GovRolesTabProps) {
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

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

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

  return (
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
              } text-gray-800`}
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
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Active Permission Nodes <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border p-3 rounded-xl bg-gray-50/30 text-gray-800">
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
            <div key={role.name} className="border border-gray-155 rounded-xl p-4 space-y-3 bg-white hover:border-gray-300 transition-all text-xs text-gray-700">
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
                  <span key={perm} className="bg-gray-50 border border-gray-155 text-gray-500 text-[8px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
