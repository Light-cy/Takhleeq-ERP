import React, { useState } from 'react';
import { UserCheck, Lock } from 'lucide-react';
import { User, CustomRole } from '../../../types';

interface GovUsersTabProps {
  users: User[];
  roles: CustomRole[];
  currentUser: User;
  onRefresh: () => void;
  onCreateUser: (userData: any) => Promise<void>;
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
