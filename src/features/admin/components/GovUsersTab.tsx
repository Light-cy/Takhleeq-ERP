import React, { useState } from 'react';
import { UserCheck, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { User, CustomRole } from '../../../types';

interface GovUsersTabProps {
  users: User[];
  roles: CustomRole[];
  currentUser: User;
  onRefresh: () => void;
  onCreateUser: (userData: any) => Promise<void>;
  onDeleteUser?: (email: string) => Promise<void>;
  onAssignRole: (email: string, role: string) => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  processing: boolean;
  setProcessing: (p: boolean) => void;
}

export function GovUsersTab({
  users,
  roles,
  currentUser,
  onRefresh,
  onCreateUser,
  onDeleteUser,
  onAssignRole,
  setErrorMsg,
  setSuccessMsg,
  processing,
  setProcessing
}: GovUsersTabProps) {
  // --- Users Form States ---
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('UCP Member');
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

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

  const handleDeleteUserSubmit = async () => {
    if (!deletingUser || !onDeleteUser) return;
    if (deletingUser.role === 'Administrator' || deletingUser.role?.toLowerCase() === 'admin') {
      setErrorMsg('System Safety Rule: Accounts with the Administrator role cannot be deleted.');
      setDeletingUser(null);
      return;
    }
    clearMessages();
    setProcessing(true);
    try {
      await onDeleteUser(deletingUser.email);
      setSuccessMsg(`User account '${deletingUser.email}' removed from system successfully.`);
      setDeletingUser(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user account.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* Add simulated user form */}
      <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit text-left">
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
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
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
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:bg-white bg-gray-50/50 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Initial Security Role <span className="text-red-500">*</span></label>
            <select
              value={newUserRole}
              onChange={e => setNewUserRole(e.target.value)}
              className="w-full p-2.5 border border-gray-150 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-primary text-gray-800"
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
                <th className="py-2.5 px-3 text-right">Actions</th>
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
                      className={`p-1.5 border border-gray-150 rounded-lg text-[11px] bg-gray-50 font-semibold cursor-pointer ${
                        currentUser.role !== 'Administrator' && user.role === 'Administrator' ? 'opacity-50 cursor-not-allowed' : ''
                      } text-gray-800`}
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
                  <td className="py-3 px-3 text-right">
                    {user.role === 'Administrator' || user.role?.toLowerCase() === 'admin' ? (
                      <span
                        title="Administrator accounts cannot be deleted"
                        className="inline-flex items-center justify-center p-1.5 text-gray-300 cursor-not-allowed"
                      >
                        <Lock className="h-4 w-4" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingUser(user)}
                        disabled={processing || user.email.toLowerCase() === currentUser.email.toLowerCase()}
                        title={
                          user.email.toLowerCase() === currentUser.email.toLowerCase()
                            ? 'Cannot delete your own account'
                            : `Delete ${user.name}`
                        }
                        className="inline-flex items-center justify-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-user-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Delete User Account</h3>
                <p className="text-xs text-gray-500">This action will permanently remove this user profile.</p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Full Name:</span>
                <span className="font-bold text-gray-900">{deletingUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email Address:</span>
                <span className="font-mono text-gray-800">{deletingUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Role:</span>
                <span className="font-semibold text-primary">{deletingUser.role}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{deletingUser.name}</strong> from the system? The user will lose access to all role permissions immediately.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={processing}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUserSubmit}
                disabled={processing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {processing ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
