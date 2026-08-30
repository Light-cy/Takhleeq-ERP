import React, { useState } from 'react';
import { Key, Plus, Check, Lock, Edit3, Trash2, AlertTriangle, Info, GraduationCap, Building, Shield, Sparkles } from 'lucide-react';
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

export interface PermissionNodeDef {
  key: string;
  label: string;
  category: 'INCUBATION' | 'FACILITY' | 'GOVERNANCE';
  description: string;
}

export const PERMISSION_NODES: PermissionNodeDef[] = [
  // --- COHORT & INCUBATION GRANULAR SECTION NODES ---
  { key: 'cohort:dashboard_view', label: '1. Cohort Dashboard & KPIs', category: 'INCUBATION', description: 'Access incubator dashboard, venture overview, milestone metrics, and cohort health stats' },
  { key: 'cohort:settings_manage', label: '2. Cohort Settings & Status', category: 'INCUBATION', description: 'Create cohorts, modify timeline configurations, adjust batch parameters, and toggle cohort status' },
  { key: 'cohort:form_manage', label: '3. Application Form Configuration', category: 'INCUBATION', description: 'Configure application intake fields, custom form questions, and application portal state' },
  { key: 'cohort:applicant_review', label: '4. Review Applications & Admissions', category: 'INCUBATION', description: 'Screen startup applications, score interviews/pitches, change admissions pipeline stage & issue credentials' },
  { key: 'cohort:startups_manage', label: '5. Active Startups Directory', category: 'INCUBATION', description: 'Browse and manage incubated startups, team profiles, founder metrics, and venture progress' },
  { key: 'cohort:session_manage', label: '6. Workshop & Session Scheduling', category: 'INCUBATION', description: 'Schedule workshop lectures, assign guest mentors, update masterclass calendar & manage curriculum' },
  { key: 'cohort:assignment_manage', label: '7. Assignments & Deliverables', category: 'INCUBATION', description: 'Create cohort milestone assignments, set submission deadlines, and evaluate founder deliverables' },
  { key: 'cohort:feedback_view', label: '8. Founder Feedback Monitor', category: 'INCUBATION', description: 'View submitted founder ratings, mentor satisfaction surveys, and workshop feedback responses' },
  { key: 'cohort:feedback_forms_manage', label: '9. Feedback Forms & Surveys', category: 'INCUBATION', description: 'Create, distribute, and manage custom evaluation survey forms and feedback questionnaires' },

  // --- COHORT OPERATIONAL SUB-PERMISSIONS ---
  { key: 'cohort:attendance_write', label: 'Attendance & Compliance Marking', category: 'INCUBATION', description: 'Mark session attendance (Present/Late/Absent), log orientation compliance & review submissions' },
  { key: 'cohort:checkin_log', label: 'Mentorship Check-ins & Progress', category: 'INCUBATION', description: 'Log team check-ins, record founder progress scores, mentor notes & velocity metrics' },
  { key: 'cohort:warning_write', label: 'Probation Notices & Warnings', category: 'INCUBATION', description: 'Issue official performance/attendance warnings to startups and resolve probation status' },
  { key: 'cohort:profile_write', label: 'Founder Startup Self-Service', category: 'INCUBATION', description: 'Founder access to manage startup profile, team members, pitch details & metrics' },
  { key: 'cohort:feedback_submit', label: 'Founder Workshop Feedback Submit', category: 'INCUBATION', description: 'Founder access to rate workshop sessions and submit mentor feedback' },
  { key: 'cohort:assignment_upload', label: 'Founder Deliverable Uploads', category: 'INCUBATION', description: 'Founder access to upload completed assignment deliverables and milestone proofs' },

  // --- FACILITY & RESERVATION NODES ---
  { key: 'SUBMIT_BOOKING', label: 'Submit Facility Booking', category: 'FACILITY', description: 'Request space reservations for incubator/university rooms and labs' },
  { key: 'CANCEL_OWN_BOOKING', label: 'Cancel Own Reservations', category: 'FACILITY', description: 'Cancel active or pending space booking requests submitted by user' },
  { key: 'VIEW_PENDING_QUEUE', label: 'View Booking Review Queue', category: 'FACILITY', description: 'Access pending facility booking requests queue and review details' },
  { key: 'APPROVE_REJECT_BOOKINGS', label: 'Approve / Reject Bookings', category: 'FACILITY', description: 'Approve or decline pending space reservation applications' },
  { key: 'BOOKING_OVERRIDE', label: 'Booking Schedule Override', category: 'FACILITY', description: 'Override existing room bookings and resolve calendar scheduling conflicts' },
  { key: 'MANAGE_ROOMS', label: 'Facility Spaces & Rooms', category: 'FACILITY', description: 'Configure room attributes, operating parameters, and add new facility spaces' },
  { key: 'MANAGE_BOOKING_TYPES', label: 'Booking Classifications', category: 'FACILITY', description: 'Manage classification categories and policy constraints for space requests' },
  { key: 'VIEW_BOOKING_ANALYTICS', label: 'Booking Analytics & Utilization', category: 'FACILITY', description: 'Inspect room booking analytics, peak usage heatmaps, and facility utilization stats' },

  // --- GOVERNANCE & SECURITY NODES ---
  { key: 'MANAGE_ROLES', label: 'Role & Policy Compiler', category: 'GOVERNANCE', description: 'Create, edit, and assign custom RBAC roles and permission node policies' },
  { key: 'MANAGE_USERS', label: 'User Directory & Role Mapping', category: 'GOVERNANCE', description: 'Register workspace user profiles and map security roles' },
  { key: 'ISSUE_BAN', label: 'Blacklist & Account Bans', category: 'GOVERNANCE', description: 'Suspend user facility/portal access and manage active ban records' },
  { key: 'VIEW_ANALYTICS_DASHBOARD', label: 'Executive Analytics', category: 'GOVERNANCE', description: 'Access executive analytics dashboards, facility utilization, and cohort KPIs' },
  { key: 'VIEW_AUDIT_LOGS', label: 'View System Audit Logs', category: 'GOVERNANCE', description: 'Inspect system compliance audit ledger and user activity records' },
  { key: 'EXPORT_AUDIT_LOGS', label: 'Export Audit Reports (PDF)', category: 'GOVERNANCE', description: 'Download executive compliance audit summaries and PDF reports' },
];

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
  const [permCategoryFilter, setPermCategoryFilter] = useState<'ALL' | 'INCUBATION' | 'FACILITY' | 'GOVERNANCE'>('ALL');

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handlePermissionToggle = (permKey: string) => {
    if (!hasPermission(permKey)) {
      setErrorMsg(`Privilege Escalation Blocked: You cannot assign '${permKey}' because you do not hold this permission yourself.`);
      return;
    }
    setSelectedPermissions(prev => 
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  const applyPreset = (presetType: 'ALL_COHORT' | 'EVALUATOR' | 'INCUBATOR_STAFF' | 'FOUNDER' | 'FACILITY_MGR' | 'CLEAR') => {
    clearMessages();
    let keysToSelect: string[] = [];

    switch (presetType) {
      case 'ALL_COHORT':
        keysToSelect = PERMISSION_NODES.filter(p => p.category === 'INCUBATION').map(p => p.key);
        break;
      case 'EVALUATOR':
        keysToSelect = ['cohort:applicant_review'];
        break;
      case 'INCUBATOR_STAFF':
        keysToSelect = [
          'cohort:dashboard_view',
          'cohort:settings_manage',
          'cohort:form_manage',
          'cohort:applicant_review',
          'cohort:startups_manage',
          'cohort:session_manage',
          'cohort:assignment_manage',
          'cohort:feedback_view',
          'cohort:feedback_forms_manage',
          'cohort:attendance_write',
          'cohort:checkin_log',
          'cohort:warning_write'
        ];
        break;
      case 'FOUNDER':
        keysToSelect = ['cohort:profile_write', 'cohort:feedback_submit', 'cohort:assignment_upload'];
        break;
      case 'FACILITY_MGR':
        keysToSelect = ['SUBMIT_BOOKING', 'CANCEL_OWN_BOOKING', 'VIEW_PENDING_QUEUE', 'APPROVE_REJECT_BOOKINGS', 'BOOKING_OVERRIDE', 'MANAGE_ROOMS', 'MANAGE_BOOKING_TYPES', 'VIEW_BOOKING_ANALYTICS'];
        break;
      case 'CLEAR':
        keysToSelect = [];
        break;
    }

    // Filter by permissions creator actually holds
    const allowedKeys = keysToSelect.filter(k => hasPermission(k));
    if (keysToSelect.length > allowedKeys.length) {
      setErrorMsg(`Preset partially applied: Some nodes were omitted because you do not hold those permissions yourself.`);
    }

    if (presetType === 'CLEAR') {
      setSelectedPermissions([]);
    } else {
      // Merge with current selection or replace
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...allowedKeys])));
    }
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

  const filteredPermissionNodes = PERMISSION_NODES.filter(node => 
    permCategoryFilter === 'ALL' || node.category === permCategoryFilter
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-left">
      
      {/* Custom Role Compiler Form */}
      <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            {editingRole ? 'Configure Policy Role' : 'Compile Policy Role'}
          </h3>
          <p className="text-[11px] text-gray-500">
            {editingRole 
              ? `Configure active properties and permissions for '${editingRole.name}'.` 
              : 'Design a custom security role and compile its active permission nodes for Cohort & Facility access.'}
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
              placeholder="e.g. Incubation Evaluator, Cohort Director..."
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

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Quick Role Presets
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('ALL_COHORT')}
                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold border border-primary/20 transition-all cursor-pointer flex items-center gap-1"
              >
                <GraduationCap className="w-3 h-3" />
                All Incubation
              </button>
              <button
                type="button"
                onClick={() => applyPreset('INCUBATOR_STAFF')}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition-all cursor-pointer"
              >
                Incubator Staff
              </button>
              <button
                type="button"
                onClick={() => applyPreset('EVALUATOR')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200 transition-all cursor-pointer"
              >
                Panel Evaluator
              </button>
              <button
                type="button"
                onClick={() => applyPreset('FOUNDER')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 transition-all cursor-pointer"
              >
                Cohort Founder
              </button>
              <button
                type="button"
                onClick={() => applyPreset('FACILITY_MGR')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 transition-all cursor-pointer flex items-center gap-1"
              >
                <Building className="w-3 h-3" />
                Facility Ops
              </button>
              <button
                type="button"
                onClick={() => applyPreset('CLEAR')}
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold transition-all cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Active Permission Nodes Selection */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                Active Permission Nodes ({selectedPermissions.length} Selected) <span className="text-red-500">*</span>
              </label>

              {/* Category Filters */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPermCategoryFilter('ALL')}
                  className={`px-2 py-0.5 rounded ${permCategoryFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500'}`}
                >
                  All ({PERMISSION_NODES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPermCategoryFilter('INCUBATION')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${permCategoryFilter === 'INCUBATION' ? 'bg-primary text-white shadow-2xs font-black' : 'text-gray-500'}`}
                >
                  <GraduationCap className="w-2.5 h-2.5" />
                  Cohort ({PERMISSION_NODES.filter(p => p.category === 'INCUBATION').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPermCategoryFilter('FACILITY')}
                  className={`px-2 py-0.5 rounded ${permCategoryFilter === 'FACILITY' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500'}`}
                >
                  Facility
                </button>
                <button
                  type="button"
                  onClick={() => setPermCategoryFilter('GOVERNANCE')}
                  className={`px-2 py-0.5 rounded ${permCategoryFilter === 'GOVERNANCE' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500'}`}
                >
                  Gov
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 p-3 rounded-xl bg-gray-50/40 text-gray-800 divide-y divide-gray-100">
              {filteredPermissionNodes.map(node => {
                const isChecked = selectedPermissions.includes(node.key);
                const isAllowed = hasPermission(node.key);

                return (
                  <div
                    key={node.key}
                    onClick={() => isAllowed && handlePermissionToggle(node.key)}
                    className={`pt-2 first:pt-0 pb-1 cursor-pointer transition-all ${!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            {node.key}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded font-mono ${
                            node.category === 'INCUBATION'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : node.category === 'FACILITY'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {node.category}
                          </span>
                          <span className="text-xs font-bold text-gray-800">{node.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-normal pl-0.5">{node.description}</p>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {!isAllowed ? (
                          <span className="p-1.5 rounded-lg bg-gray-100 text-gray-400 inline-block" title="Locked: You do not hold this permission node">
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        ) : isChecked ? (
                          <span className="p-1.5 rounded-lg bg-primary text-white inline-block shadow-2xs">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="p-1.5 rounded-lg bg-white border border-gray-300 text-gray-400 hover:border-gray-400 inline-block">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-3xs"
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

      {/* Compiled Role list */}
      <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Compiled Policy Roles ({roles.length})
          </h3>
          <p className="text-[11px] text-gray-500">Active system security roles defining cohort, facility, and administrative operational bounds.</p>
        </div>

        <div className="space-y-4">
          {roles.map(role => {
            const cohortNodeCount = role.permissions.filter(p => p.startsWith('cohort:')).length;
            const facilityNodeCount = role.permissions.filter(p => !p.startsWith('cohort:') && p !== 'MANAGE_ROLES' && p !== 'MANAGE_USERS' && p !== 'ISSUE_BAN' && p !== 'VIEW_ANALYTICS_DASHBOARD' && p !== 'EXPORT_AUDIT_LOGS').length;
            const govNodeCount = role.permissions.length - cohortNodeCount - facilityNodeCount;

            return (
              <div key={role.name} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white hover:border-gray-300 transition-all text-xs text-gray-700">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5 text-sm">
                      <Key className="h-4 w-4 text-primary shrink-0" />
                      <span>{role.name}</span>
                      {role.name === 'Administrator' && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono border border-amber-200">
                          Superuser
                        </span>
                      )}
                      {role.name === 'Cohort Founder' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono border border-emerald-200">
                          Founder Default
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500">{role.description}</p>
                    
                    {/* Node count badges */}
                    <div className="flex items-center gap-2 pt-1 font-mono text-[9px]">
                      {cohortNodeCount > 0 && (
                        <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {cohortNodeCount} Cohort Nodes
                        </span>
                      )}
                      {facilityNodeCount > 0 && (
                        <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {facilityNodeCount} Facility Nodes
                        </span>
                      )}
                      {govNodeCount > 0 && (
                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {govNodeCount} Governance Nodes
                        </span>
                      )}
                    </div>
                  </div>

                  {role.name !== 'Administrator' && role.name !== 'UCP Member' && (
                    <div className="flex gap-1 shrink-0">
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

                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-100">
                  {role.permissions.length === 0 ? (
                    <span className="text-[10px] text-gray-400 font-italic italic">No permission nodes assigned</span>
                  ) : (
                    role.permissions.map(perm => (
                      <span
                        key={perm}
                        className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
                          perm.startsWith('cohort:')
                            ? 'bg-primary/5 border-primary/20 text-primary'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        {perm}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
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

