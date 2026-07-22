import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Room, Booking, Ban, CustomRole, User, AuditRecord } from '../src/types.ts';
import { pool } from './config/db.ts';

dotenv.config();

// --- LOCAL JSON DATABASE ENGINE FALLBACK ---
let useLocalDB = true;

const localDbPath = path.join(process.cwd(), 'server', 'local_db.json');

function initializeLocalDB() {
  let db: any = null;
  if (fs.existsSync(localDbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    } catch (e) {
      console.error("Failed to parse local_db.json, recreating...", e);
    }
  }

  const allAdminPermissions = [
    "SUBMIT_BOOKING",
    "CANCEL_OWN_BOOKING",
    "VIEW_PENDING_QUEUE",
    "APPROVE_BOOKING",
    "REJECT_BOOKING",
    "APPROVE_REJECT_BOOKINGS",
    "BOOKING_OVERRIDE",
    "ISSUE_BAN",
    "MANAGE_ROOMS",
    "CONFIGURE_ROOMS",
    "CONFIGURE_POLICIES",
    "VIEW_ANALYTICS_DASHBOARD",
    "EXPORT_AUDIT_LOGS",
    "MANAGE_ROLES",
    "MANAGE_USERS",
    "VIEW_AUDIT_LOGS",
    "LIFT_BAN",
    "MANAGE_BANS",
    "MANAGE_BOOKING_TYPES",
    "cohort:form_manage",
    "cohort:applicant_review",
    "cohort:session_manage",
    "cohort:attendance_write",
    "cohort:checkin_log",
    "cohort:warning_write",
    "cohort:profile_write",
    "cohort:feedback_submit",
    "cohort:assignment_upload"
  ];

  if (db) {
    let updated = false;
    
    // Core cohort tables dynamic schema migration
    if (!db.cohorts || !Array.isArray(db.cohorts)) {
      db.cohorts = [
        { id: 1, name: 'Takhleeq Cohort 1', status: 'ACTIVE', created_at: new Date().toISOString() }
      ];
      updated = true;
    }
    
    if (!db.cohort_form_settings) {
      db.cohort_form_settings = {
        is_active: true,
        fields: [
          { id: 'field_startup_name', label: 'Startup Name', type: 'text', required: true, placeholder: 'Enter your startup name' },
          { id: 'field_startup_desc', label: 'Idea Description', type: 'text', required: true, placeholder: 'Explain your business idea in 2-3 sentences' },
          { id: 'field_founder_name', label: 'Team Lead Name', type: 'text', required: true, placeholder: 'Enter full name of the team lead' },
          { id: 'field_founder_email', label: 'Email Address', type: 'email', required: true, placeholder: 'Enter team lead email' },
          { id: 'field_founder_phone', label: 'Phone Number', type: 'phone', required: true, placeholder: 'e.g. 03xx-xxxxxxx' },
          { id: 'field_founder_cnic', label: 'CNIC Number', type: 'cnic', required: true, placeholder: 'e.g. 35201-xxxxxxx-x' }
        ]
      };
      updated = true;
    }

    if (!db.applicants || !Array.isArray(db.applicants)) {
      db.applicants = [
        { id: 1, tracking_token: 'TK-STR-7821', name: 'Zohaib Niaz', email: 'zohaib@startup.pk', phone: '0300-1234567', cnic: '35201-1234567-1', startup_name: 'MedRoute', startup_description: 'An AI-powered pharmaceutical route planner reducing delivery times by 40%.', cohort_id: 1, status: 'CONFIRMED', panel_scores: { viability: 8, team: 9, scalability: 8, average: 8.3 }, parent_applicant_id: null, form_data: {}, orientation_conducted: true, created_at: '2026-07-20T00:00:00.000Z' },
        { id: 2, tracking_token: 'TK-STR-5921', name: 'Ayesha Malik', email: 'ayesha@fintech.pk', phone: '0321-7654321', cnic: '35201-7654321-2', startup_name: 'PaisaFlow', startup_description: 'Micro-lending platform for small merchants using alternative credit scoring.', cohort_id: 1, status: 'CONFIRMED', panel_scores: { viability: 9, team: 8, scalability: 9, average: 8.7 }, parent_applicant_id: null, form_data: {}, orientation_conducted: true, created_at: '2026-07-20T00:00:00.000Z' },
        { id: 3, tracking_token: 'TK-STR-4412', name: 'Imran Khan', email: 'imran@edtech.pk', phone: '0333-5551212', cnic: '35201-5551212-3', startup_name: 'Dars-e-Nau', startup_description: 'Localized video-based educational app for public school students in Urdu.', cohort_id: null, status: 'IN_REVIEW', panel_scores: null, parent_applicant_id: null, form_data: {}, orientation_conducted: false, created_at: '2026-07-20T00:00:00.000Z' },
        { id: 4, tracking_token: 'TK-STR-1092', name: 'Qasim Ali', email: 'qasim@agritech.pk', phone: '0345-9998887', cnic: '35201-9998887-4', startup_name: 'AgriSense', startup_description: 'IoT-enabled soil nutrient analysis probe for smallholder farmers.', cohort_id: null, status: 'BACKUP_CANDIDATE', panel_scores: { viability: 7, team: 7, scalability: 7, average: 7.0 }, parent_applicant_id: null, form_data: {}, orientation_conducted: false, created_at: '2026-07-20T00:00:00.000Z' },
        { id: 5, tracking_token: 'TK-STR-2291', name: 'Raza Jafar', email: 'raza@delivery.pk', phone: '0312-3334445', cnic: '35201-3334445-5', startup_name: 'LogiSwift', startup_description: 'B2B express delivery aggregator connecting local freight vans.', cohort_id: null, status: 'REJECTED', panel_scores: { viability: 4, team: 5, scalability: 4, average: 4.3 }, parent_applicant_id: null, form_data: {}, orientation_conducted: false, created_at: '2026-07-20T00:00:00.000Z' }
      ];
      updated = true;
    }

    if (!db.cohort_sessions || !Array.isArray(db.cohort_sessions)) {
      db.cohort_sessions = [
        { id: 1, cohort_id: 1, title: 'Orientation & Incubation Blueprint', date: '2026-07-22', start_time: '10:00:00', end_time: '12:00:00', mentor_name: 'Dr. Qaseeb Ahmed', created_at: '2026-07-20T00:00:00.000Z' },
        { id: 2, cohort_id: 1, title: 'Value Proposition & Customer Discovery', date: '2026-07-29', start_time: '14:00:00', end_time: '16:00:00', mentor_name: 'Syed Usman', created_at: '2026-07-20T00:00:00.000Z' }
      ];
      updated = true;
    }

    if (!db.session_attendance || !Array.isArray(db.session_attendance)) {
      db.session_attendance = [];
      updated = true;
    }

    if (!db.team_checkins || !Array.isArray(db.team_checkins)) {
      db.team_checkins = [];
      updated = true;
    }

    if (!db.performance_warnings || !Array.isArray(db.performance_warnings)) {
      db.performance_warnings = [];
      updated = true;
    }

    if (db.roles && Array.isArray(db.roles)) {
      // 1. Upgrade Administrator role
      const adminRole = db.roles.find((r: any) => r.name === 'Administrator');
      if (adminRole) {
        if (!adminRole.permissions) {
          adminRole.permissions = [...allAdminPermissions];
          updated = true;
        } else {
          for (const perm of allAdminPermissions) {
            if (!adminRole.permissions.includes(perm)) {
              adminRole.permissions.push(perm);
              updated = true;
            }
          }
        }
      }

      // 2. Remove MANAGE_BANS / LIFT_BAN from custom roles and replace with ISSUE_BAN
      db.roles.forEach((r: any) => {
        if (r.name !== 'Administrator' && r.permissions && Array.isArray(r.permissions)) {
          const originalLength = r.permissions.length;
          // Filter out prohibited permissions
          r.permissions = r.permissions.filter((p: string) => p !== 'MANAGE_BANS' && p !== 'LIFT_BAN');
          
          // If they are allowed to issue bans (were originally a manager or coordinator), add ISSUE_BAN
          if (['Booking Manager', 'Facility Coordinator'].includes(r.name)) {
            if (!r.permissions.includes('ISSUE_BAN')) {
              r.permissions.push('ISSUE_BAN');
            }
          }
          if (r.permissions.length !== originalLength || (['Booking Manager', 'Facility Coordinator'].includes(r.name) && !r.permissions.includes('ISSUE_BAN'))) {
            updated = true;
          }
        }
      });
    }

    if (!db.booking_types || !Array.isArray(db.booking_types)) {
      db.booking_types = [
        { id: 1, name: 'Student societies', description: 'Registered student clubs and societies', is_active: true },
        { id: 2, name: 'Startup teams', description: 'Incubated or acceleration stage startup ventures', is_active: true },
        { id: 3, name: 'Faculty members', description: 'Academic and research faculty staff', is_active: true },
        { id: 4, name: 'Department representatives', description: 'Official university department booking delegates', is_active: true },
        { id: 5, name: 'Cohort members', description: 'Incubation program cohort participants', is_active: true },
        { id: 6, name: 'Entrepreneurs in residence', description: 'In-house startup mentors and entrepreneurs', is_active: true },
        { id: 7, name: 'Professionals in residence', description: 'Industry professionals and technical consultants', is_active: true },
        { id: 8, name: 'Meeting / Event', description: 'General meetings, gatherings or community events', is_active: true },
        { id: 9, name: 'Cohort Startup', description: 'Incubated startup members', is_active: true },
        { id: 10, name: 'Department', description: 'Department sessions and operations', is_active: true }
      ];
      updated = true;
    }

    if (updated) {
      console.log("Migrated local_db.json roles, permissions, and booking types automatically.");
      try {
        fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2), 'utf8');
      } catch (saveErr) {
        console.error("Failed to save migrated local_db.json:", saveErr);
      }
    }
    return db;
  }

  // Seed data from migration.sql
  const initialData = {
    users: [
      { id: 1, microsoft_id: null, email: 'director@takhleeq.pk', full_name: 'Dr. Qaseeb (Director)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 2, microsoft_id: null, email: 'manager@takhleeq.pk', full_name: 'Syed Usman (Booking Manager)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 3, microsoft_id: null, email: 'coordinator@takhleeq.pk', full_name: 'Sara Khan (Coordinator)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 4, microsoft_id: null, email: 'usman@society.pk', full_name: 'Usman Ghani (Society Rep)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 5, microsoft_id: null, email: 'faisal@ucp.edu.pk', full_name: 'Faisal Mehmood (Coordinator)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 6, microsoft_id: null, email: 'maheen@ucp.edu.pk', full_name: 'Maheen Malik (Manager)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 7, microsoft_id: null, email: 'banned-test@ucp.edu.pk', full_name: 'Banned Student (Testing)', is_active: false, last_login: new Date().toISOString(), created_at: new Date().toISOString() }
    ],
    roles: [
      { id: 1, name: 'Administrator', description: 'Full access and policy management capabilities', permissions: ["SUBMIT_BOOKING", "CANCEL_OWN_BOOKING", "VIEW_PENDING_QUEUE", "APPROVE_BOOKING", "REJECT_BOOKING", "APPROVE_REJECT_BOOKINGS", "BOOKING_OVERRIDE", "ISSUE_BAN", "MANAGE_ROOMS", "CONFIGURE_ROOMS", "CONFIGURE_POLICIES", "VIEW_ANALYTICS_DASHBOARD", "EXPORT_AUDIT_LOGS", "MANAGE_ROLES", "MANAGE_USERS", "VIEW_AUDIT_LOGS", "LIFT_BAN", "MANAGE_BANS", "MANAGE_BOOKING_TYPES"], ban_duration_ceiling: 'permanent', created_by: null, created_at: new Date().toISOString() },
      { id: 2, name: 'Booking Manager', description: 'Approve, reject bookings, and issue bans up to 90 days', permissions: ["VIEW_PENDING_QUEUE", "APPROVE_REJECT_BOOKINGS", "ISSUE_BAN"], ban_duration_ceiling: '90', created_by: null, created_at: new Date().toISOString() },
      { id: 3, name: 'Facility Coordinator', description: 'View queue, apply manual time/room overrides, issue bans up to 7 days', permissions: ["VIEW_PENDING_QUEUE", "BOOKING_OVERRIDE", "ISSUE_BAN"], ban_duration_ceiling: '7', created_by: null, created_at: new Date().toISOString() },
      { id: 4, name: 'UCP Member', description: 'Regular student or staff member with standard public booking access', permissions: [], ban_duration_ceiling: null, created_by: null, created_at: new Date().toISOString() },
      { id: 5, name: 'Room Management', description: 'Manage incubator spaces, view and update space operating attributes, and delete spaces', permissions: ["MANAGE_ROOMS"], ban_duration_ceiling: '0', created_by: null, created_at: new Date().toISOString() }
    ],
    user_roles: [
      { user_id: 1, role_id: 1 },
      { user_id: 2, role_id: 2 },
      { user_id: 3, role_id: 3 },
      { user_id: 4, role_id: 4 },
      { user_id: 5, role_id: 3 },
      { user_id: 6, role_id: 2 },
      { user_id: 7, role_id: 4 }
    ],
    rooms: [
      { id: 1, name: 'Board Room', capacity: 15, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Formal executive meetings and syndicate sessions', policies: 'Authorized UCP societies and startups only. Strictly no external foods allowed. Leave room clean.', is_active: true, created_at: new Date().toISOString() },
      { id: 2, name: 'Presentation Hall', capacity: 50, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Large cohort presentations, talks, and community panels', policies: 'Pre-approval from Faculty advisor required. Keep setup reset after use.', is_active: true, created_at: new Date().toISOString() },
      { id: 3, name: 'Cube 1', capacity: 6, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 30, max_duration_minutes: 60, purpose: 'Small meetings and focused discussions', policies: 'Leave room clean. No loud noise.', is_active: true, created_at: new Date().toISOString() },
      { id: 4, name: 'Cube 2', capacity: 6, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 30, max_duration_minutes: 60, purpose: 'Small meetings and focused discussions', policies: 'Leave room clean. No loud noise.', is_active: true, created_at: new Date().toISOString() },
      { id: 5, name: 'Podcast Room', capacity: 4, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Podcast recording and audio sessions', policies: 'Technical staff assistance must be booked separately.', is_active: true, created_at: new Date().toISOString() }
    ],
    booking_types: [
      { id: 1, name: 'Student societies', description: 'Registered student clubs and societies', is_active: true },
      { id: 2, name: 'Startup teams', description: 'Incubated or acceleration stage startup ventures', is_active: true },
      { id: 3, name: 'Faculty members', description: 'Academic and research faculty staff', is_active: true },
      { id: 4, name: 'Department representatives', description: 'Official university department booking delegates', is_active: true },
      { id: 5, name: 'Cohort members', description: 'Incubation program cohort participants', is_active: true },
      { id: 6, name: 'Entrepreneurs in residence', description: 'In-house startup mentors and entrepreneurs', is_active: true },
      { id: 7, name: 'Professionals in residence', description: 'Industry professionals and technical consultants', is_active: true },
      { id: 8, name: 'Meeting / Event', description: 'General meetings, gatherings or community events', is_active: true },
      { id: 9, name: 'Cohort Startup', description: 'Incubated startup members', is_active: true },
      { id: 10, name: 'Department', description: 'Department sessions and operations', is_active: true }
    ],
    bookings: [],
    ban_records: [],
    audit_logs: []
  };

  try {
    fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
    fs.writeFileSync(localDbPath, JSON.stringify(initialData, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to write initial local_db.json file:", err);
  }
  return initialData;
}

function saveLocalDB(db: any) {
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write local_db.json", e);
  }
}

function getUsersWithRoles(db: any) {
  return db.users.map((u: any) => {
    const ur = db.user_roles.find((ur: any) => ur.user_id === u.id);
    const r = ur ? db.roles.find((r: any) => r.id === ur.role_id) : null;
    return {
      ...u,
      role_name: r ? r.name : 'UCP Member',
      permissions: r ? r.permissions : []
    };
  });
}

export function executeLocalQuery(text: string, params: any[] = []): { rows: any[] } {
  const db = initializeLocalDB();
  const q = text.toLowerCase().replace(/\s+/g, ' ').trim();

  // --- MODULE 02 COHORT QUERY INTERCEPTORS (JSON FALLBACK ENGINE) ---
  
  // 1. Cohort Form Settings Interceptors
  if (q.includes('select * from cohort_form_settings') || q.includes('select is_active, fields from cohort_form_settings')) {
    return { rows: [db.cohort_form_settings] };
  }
  if (q.includes('update cohort_form_settings')) {
    db.cohort_form_settings.is_active = params[0] === true || params[0] === 'true';
    db.cohort_form_settings.fields = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
    saveLocalDB(db);
    return { rows: [db.cohort_form_settings] };
  }

  // 2. Cohorts Interceptors
  if (q.includes('select * from cohorts') || q.includes('select * from cohorts order by id')) {
    return { rows: db.cohorts || [] };
  }
  if (q.includes('insert into cohorts')) {
    const id = Math.max(...(db.cohorts || []).map((c: any) => c.id), 0) + 1;
    const newCohort = { id, name: params[0], status: params[1] || 'DRAFT', created_at: new Date().toISOString() };
    db.cohorts = db.cohorts || [];
    db.cohorts.push(newCohort);
    saveLocalDB(db);
    return { rows: [newCohort] };
  }
  if (q.includes('update cohorts set status =')) {
    const status = params[0];
    const id = parseInt(params[1]);
    const c = (db.cohorts || []).find((x: any) => x.id === id);
    if (c) {
      c.status = status;
      saveLocalDB(db);
    }
    return { rows: c ? [c] : [] };
  }

  // 3. Applicants Interceptors
  if (q.includes('select * from applicants where tracking_token =') || (q.includes('select * from applicants') && q.includes('tracking_token = $1'))) {
    const tok = String(params[0] || '').toUpperCase();
    return { rows: (db.applicants || []).filter((a: any) => String(a.tracking_token).toUpperCase() === tok) };
  }
  if (q.includes('select * from applicants where id =') || (q.includes('select * from applicants') && q.includes('id = $1'))) {
    const aid = parseInt(params[0]);
    return { rows: (db.applicants || []).filter((a: any) => a.id === aid) };
  }
  if (q.includes('select * from applicants') && q.includes('cohort_id = $1')) {
    const cid = parseInt(params[0]);
    return { rows: (db.applicants || []).filter((a: any) => a.cohort_id === cid) };
  }
  if (q.includes('select * from applicants') || q.includes('select a.*')) {
    return { rows: db.applicants || [] };
  }
  if (q.includes('insert into applicants')) {
    const id = Math.max(...(db.applicants || []).map((a: any) => a.id), 0) + 1;
    const tracking_token = params[0];
    const name = params[1];
    const email = params[2];
    const phone = params[3];
    const cnic = params[4];
    const startup_name = params[5];
    const startup_description = params[6];
    const status = params[7];
    const panel_scores = params[8] ? (typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8]) : null;
    const parent_applicant_id = params[9] ? parseInt(params[9]) : null;
    const form_data = params[10] ? (typeof params[10] === 'string' ? JSON.parse(params[10]) : params[10]) : {};
    const orientation_conducted = params[11] === true || params[11] === 'true';
    const newApp = {
      id,
      tracking_token,
      name,
      email,
      phone,
      cnic,
      startup_name,
      startup_description,
      status,
      panel_scores,
      parent_applicant_id,
      form_data,
      orientation_conducted,
      cohort_id: null,
      created_at: new Date().toISOString()
    };
    db.applicants = db.applicants || [];
    db.applicants.push(newApp);
    saveLocalDB(db);
    return { rows: [newApp] };
  }
  if (q.includes('update applicants set')) {
    const idVal = parseInt(params[params.length - 1]);
    const app = (db.applicants || []).find((x: any) => x.id === idVal);
    if (app) {
      if (q.includes('status =') && q.includes('cohort_id =')) {
        app.status = params[0];
        app.cohort_id = params[1] ? parseInt(params[1]) : null;
      } else if (q.includes('status =') && q.includes('orientation_conducted =')) {
        app.status = params[0];
        app.orientation_conducted = params[1] === true || params[1] === 'true';
      } else if (q.includes('status =')) {
        app.status = params[0];
      } else if (q.includes('cohort_id =')) {
        app.cohort_id = params[0] ? parseInt(params[0]) : null;
      } else if (q.includes('panel_scores =')) {
        app.panel_scores = params[0] ? (typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0]) : null;
      } else if (q.includes('orientation_conducted =')) {
        app.orientation_conducted = params[0] === true || params[0] === 'true';
      }
      saveLocalDB(db);
    }
    return { rows: app ? [app] : [] };
  }

  // 4. Cohort Sessions Interceptors
  if (q.includes('select * from cohort_sessions') || q.includes('select * from cohort_sessions where cohort_id = $1')) {
    if (params.length > 0) {
      const cid = parseInt(params[0]);
      return { rows: (db.cohort_sessions || []).filter((s: any) => s.cohort_id === cid) };
    }
    return { rows: db.cohort_sessions || [] };
  }
  if (q.includes('insert into cohort_sessions')) {
    const id = Math.max(...(db.cohort_sessions || []).map((s: any) => s.id), 0) + 1;
    const newSession = {
      id,
      cohort_id: parseInt(params[0]),
      title: params[1],
      date: params[2],
      start_time: params[3],
      end_time: params[4],
      mentor_name: params[5] || null,
      topic_category: params[6] || null,
      venue: params[7] || null,
      recording_url: params[8] || null,
      created_at: new Date().toISOString()
    };
    db.cohort_sessions = db.cohort_sessions || [];
    db.cohort_sessions.push(newSession);
    saveLocalDB(db);
    return { rows: [newSession] };
  }
  if (q.includes('delete from cohort_sessions where id = $1')) {
    const sid = parseInt(params[0]);
    const idx = (db.cohort_sessions || []).findIndex((s: any) => s.id === sid);
    let deleted = null;
    if (idx !== -1) {
      deleted = db.cohort_sessions.splice(idx, 1)[0];
      saveLocalDB(db);
    }
    return { rows: deleted ? [deleted] : [] };
  }

  // 5. Session Attendance Interceptors
  if (q.includes('select * from session_attendance where session_id = $1')) {
    const sid = parseInt(params[0]);
    return { rows: (db.session_attendance || []).filter((a: any) => a.session_id === sid) };
  }
  if (q.includes('delete from session_attendance where session_id = $1')) {
    const sid = parseInt(params[0]);
    db.session_attendance = (db.session_attendance || []).filter((a: any) => a.session_id !== sid);
    saveLocalDB(db);
    return { rows: [] };
  }
  if (q.includes('insert into session_attendance')) {
    const id = Math.max(...(db.session_attendance || []).map((a: any) => a.id), 0) + 1;
    const newAtt = {
      id,
      session_id: parseInt(params[0]),
      applicant_id: parseInt(params[1]),
      status: params[2],
      marked_at: new Date().toISOString()
    };
    db.session_attendance = db.session_attendance || [];
    db.session_attendance.push(newAtt);
    saveLocalDB(db);
    return { rows: [newAtt] };
  }

  // 6. Team Check-ins Interceptors
  if (q.includes('select * from team_checkins') && q.includes('cohort_id = $1')) {
    const cid = parseInt(params[0]);
    return { rows: (db.team_checkins || []).filter((t: any) => t.cohort_id === cid) };
  }
  if (q.includes('insert into team_checkins')) {
    const id = Math.max(...(db.team_checkins || []).map((t: any) => t.id), 0) + 1;
    const newCheck = {
      id,
      cohort_id: parseInt(params[0]),
      applicant_id: parseInt(params[1]),
      logged_by: params[2],
      blockers: params[3],
      progress_score: parseInt(params[4]),
      mentor_notes: params[5],
      created_at: new Date().toISOString()
    };
    db.team_checkins = db.team_checkins || [];
    db.team_checkins.push(newCheck);
    saveLocalDB(db);
    return { rows: [newCheck] };
  }

  // 7. Performance Warnings Interceptors
  if (q.includes('select * from performance_warnings') && q.includes('cohort_id = $1')) {
    const cid = parseInt(params[0]);
    return { rows: (db.performance_warnings || []).filter((w: any) => w.cohort_id === cid) };
  }
  if (q.includes('insert into performance_warnings')) {
    const id = Math.max(...(db.performance_warnings || []).map((w: any) => w.id), 0) + 1;
    const newWarn = {
      id,
      cohort_id: parseInt(params[0]),
      applicant_id: parseInt(params[1]),
      issued_by: params[2],
      reason: params[3],
      severity: params[4],
      status: params[5],
      resolution_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.performance_warnings = db.performance_warnings || [];
    db.performance_warnings.push(newWarn);
    saveLocalDB(db);
    return { rows: [newWarn] };
  }
  if (q.includes('update performance_warnings set')) {
    const idVal = parseInt(params[2]);
    const warn = (db.performance_warnings || []).find((x: any) => x.id === idVal);
    if (warn) {
      warn.status = params[0];
      warn.resolution_notes = params[1];
      warn.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: warn ? [warn] : [] };
  }

  // --- EXISTING QUERIES BELOW ---

  // 1. SELECT * FROM rooms ORDER BY id ASC
  if (q.includes('select * from rooms') && q.includes('order by id asc')) {
    return { rows: db.rooms };
  }

  // Booking Types local queries
  if (q.includes('select * from booking_types') || q.includes('select * from booking_types order by id asc')) {
    const list = db.booking_types || [];
    return { rows: list };
  }

  if (q.includes('insert into booking_types')) {
    const name = params[0];
    const description = params[1] || '';
    const is_active = params[2] !== undefined ? params[2] : true;
    const list = db.booking_types || [];
    const id = Math.max(...list.map((bt: any) => bt.id), 0) + 1;
    const newBT = { id, name, description, is_active };
    list.push(newBT);
    db.booking_types = list;
    saveLocalDB(db);
    return { rows: [newBT] };
  }

  if (q.includes('update booking_types')) {
    const name = params[0];
    const description = params[1];
    const is_active = params[2];
    const id = parseInt(params[3]);
    const list = db.booking_types || [];
    const item = list.find((bt: any) => bt.id === id);
    if (item) {
      item.name = name;
      item.description = description;
      item.is_active = is_active;
      db.booking_types = list;
      saveLocalDB(db);
    }
    return { rows: item ? [item] : [] };
  }

  if (q.includes('delete from booking_types')) {
    const id = parseInt(params[0]);
    const list = db.booking_types || [];
    const index = list.findIndex((bt: any) => bt.id === id);
    let deleted = null;
    if (index !== -1) {
      deleted = list.splice(index, 1)[0];
      db.booking_types = list;
      saveLocalDB(db);
    }
    return { rows: deleted ? [deleted] : [] };
  }

  // 2. SELECT id FROM rooms WHERE LOWER(name) = LOWER($1)
  if (q.includes('select id from rooms where lower(name) = lower($1)')) {
    const val = String(params[0] || '').toLowerCase();
    const found = db.rooms.filter((r: any) => r.name.toLowerCase() === val);
    return { rows: found.map((r: any) => ({ id: r.id })) };
  }

  // 3. SELECT * FROM rooms WHERE id = $1
  if (q.includes('select * from rooms where id = $1')) {
    const id = parseInt(params[0]);
    const found = db.rooms.filter((r: any) => r.id === id);
    return { rows: found };
  }

  // 4. SELECT * FROM ban_records WHERE LOWER(email) = $1 AND is_active = TRUE
  if (q.includes('select * from ban_records') && q.includes('is_active = true') && q.includes('lower(email) = $1')) {
    const email = String(params[0] || '').toLowerCase();
    const found = db.ban_records.filter((b: any) => b.email.toLowerCase() === email && b.is_active === true);
    return { rows: found };
  }

  // 5. SELECT count(*) FROM bookings
  if (q.includes('select count(*) from bookings') && !q.includes('status')) {
    return { rows: [{ count: String(db.bookings.length) }] };
  }

  // 6. SELECT COUNT(*) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = $1
  if (q.includes('select count(*) from user_roles ur') && q.includes('r.name = $1')) {
    const roleName = params[0];
    const role = db.roles.find((r: any) => r.name === roleName);
    const count = role ? db.user_roles.filter((ur: any) => ur.role_id === role.id).length : 0;
    return { rows: [{ count: String(count) }] };
  }

  // 7. SELECT COUNT(*) FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = 'Administrator' AND u.is_active = TRUE
  if (q.includes('select count(*) from users u') && q.includes("r.name = 'administrator'") && q.includes('u.is_active = true')) {
    const adminRole = db.roles.find((r: any) => r.name === 'Administrator');
    const count = adminRole ? db.users.filter((u: any) => {
      if (!u.is_active) return false;
      const ur = db.user_roles.find((ur: any) => ur.user_id === u.id);
      return ur && ur.role_id === adminRole.id;
    }).length : 0;
    return { rows: [{ count: String(count) }] };
  }

  // 8. SELECT * FROM roles WHERE name = 'Administrator' / 'UCP Member' etc.
  if (q.includes('select permissions from roles where name =') || q.includes('select id from roles where name =') || q.includes('select id, name from roles where name =')) {
    const roleName = params[0] || (q.includes("'ucp member'") ? 'UCP Member' : q.includes("'administrator'") ? 'Administrator' : '');
    const found = db.roles.filter((r: any) => r.name.toLowerCase() === String(roleName).toLowerCase());
    return { rows: found };
  }

  // 9. SELECT * FROM roles ORDER BY id ASC
  if (q.includes('select * from roles') && q.includes('order by id asc')) {
    return { rows: db.roles };
  }

  // 10. SELECT r.ban_duration_ceiling FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1
  if (q.includes('ban_duration_ceiling') && q.includes('ur.user_id = $1')) {
    const userId = parseInt(params[0]);
    const ur = db.user_roles.find((ur: any) => ur.user_id === userId);
    const r = ur ? db.roles.find((r: any) => r.id === ur.role_id) : null;
    return { rows: r ? [{ ban_duration_ceiling: r.ban_duration_ceiling }] : [] };
  }

  // 11. SELECT * FROM ban_records WHERE id = $1
  if (q.includes('select * from ban_records where id = $1')) {
    const id = parseInt(params[0]);
    const found = db.ban_records.filter((b: any) => b.id === id);
    return { rows: found };
  }

  // 12. SELECT * FROM bookings WHERE booking_id = $1
  if (q.includes('select * from bookings where booking_id = $1')) {
    const found = db.bookings.filter((b: any) => b.booking_id === params[0]);
    return { rows: found };
  }

  // 13. SELECT * FROM bookings WHERE id = $1
  if (q.includes('select * from bookings b where b.id = $1') || q.includes('select * from bookings where id = $1')) {
    const id = parseInt(params[0]);
    const found = db.bookings.filter((b: any) => b.id === id);
    return { rows: found };
  }

  // 14. Overlapping bookings check
  if (q.includes('select * from bookings') && q.includes('room_id = $1') && q.includes('start_time < $3')) {
    const roomId = parseInt(params[0]);
    const date = params[1];
    const endTime = params[2];
    const startTime = params[3];
    const found = db.bookings.filter((b: any) => {
      return b.room_id === roomId &&
             b.date === date &&
             ['APPROVED', 'PENDING_REVIEW'].includes(b.status) &&
             b.start_time < endTime &&
             b.end_time > startTime;
    });
    return { rows: found };
  }

  // 15. SELECT b.*, r.name as room_name, u.full_name as approver_name... WHERE b.id = $1
  if (q.includes('select b.*, r.name as room_name') && q.includes('where b.id = $1')) {
    const id = parseInt(params[0]);
    const b = db.bookings.find((b: any) => b.id === id);
    if (!b) return { rows: [] };
    const room = db.rooms.find((r: any) => r.id === b.room_id);
    const approver = db.users.find((u: any) => u.id === b.approved_by);
    const cb = b.conflicting_booking_id ? db.bookings.find((item: any) => item.id === b.conflicting_booking_id) : null;
    return {
      rows: [{
        ...b,
        room_name: room ? room.name : '',
        approver_name: approver ? approver.full_name : '',
        conflicting_booking_ref: cb ? cb.booking_id : null
      }]
    };
  }

  // 16. SELECT b.*, r.name as room_name, u.full_name as approver_name... ORDER BY b.id DESC
  if (q.includes('select b.*, r.name as room_name') && q.includes('order by b.id desc')) {
    const list = db.bookings.map((b: any) => {
      const room = db.rooms.find((r: any) => r.id === b.room_id);
      const approver = db.users.find((u: any) => u.id === b.approved_by);
      const cb = b.conflicting_booking_id ? db.bookings.find((item: any) => item.id === b.conflicting_booking_id) : null;
      return {
        ...b,
        room_name: room ? room.name : '',
        approver_name: approver ? approver.full_name : '',
        conflicting_booking_ref: cb ? cb.booking_id : null
      };
    }).sort((a: any, b: any) => b.id - a.id);
    return { rows: list };
  }

  // 17. SELECT b.*, u1.full_name as issuer_name, u2.full_name as lifter_name FROM ban_records b...
  if (q.includes('select b.*, u1.full_name as issuer_name') && q.includes('order by b.id desc')) {
    const list = db.ban_records.map((b: any) => {
      const issuer = db.users.find((u: any) => u.id === b.issued_by);
      const lifter = db.users.find((u: any) => u.id === b.lifted_by);
      return {
        ...b,
        issuer_name: issuer ? issuer.full_name : 'System',
        lifter_name: lifter ? lifter.full_name : ''
      };
    }).sort((a: any, b: any) => b.id - a.id);
    return { rows: list };
  }

  // 18. SELECT b.*, u.full_name as issuer_name FROM ban_records b LEFT JOIN users u ON b.issued_by = u.id WHERE b.id = $1
  if (q.includes('select b.*, u.full_name as issuer_name') && q.includes('where b.id = $1')) {
    const id = parseInt(params[0]);
    const b = db.ban_records.find((b: any) => b.id === id);
    if (!b) return { rows: [] };
    const issuer = db.users.find((u: any) => u.id === b.issued_by);
    return {
      rows: [{
        ...b,
        issuer_name: issuer ? issuer.full_name : 'System'
      }]
    };
  }

  // 19. SELECT * FROM audit_logs ORDER BY id DESC LIMIT 1000
  if (q.includes('select * from audit_logs') && q.includes('order by id desc')) {
    return { rows: db.audit_logs.slice().sort((a: any, b: any) => b.id - a.id).slice(0, 1000) };
  }

  // 20. Reports - Status Breakdown
  if (q.includes('select status, count(*) as count from bookings group by status')) {
    const breakdown: Record<string, number> = {};
    db.bookings.forEach((b: any) => {
      breakdown[b.status] = (breakdown[b.status] || 0) + 1;
    });
    const rows = Object.entries(breakdown).map(([status, count]) => ({ status, count: String(count) }));
    return { rows };
  }

  // 21. Reports - Rooms reservation frequency
  if (q.includes('select r.name, count(b.id) as count from rooms r left join bookings b on r.id = b.room_id and b.status =') || q.includes('r.name, count(b.id) as count')) {
    const popularity: Record<string, number> = {};
    db.rooms.forEach((r: any) => {
      popularity[r.name] = 0;
    });
    db.bookings.filter((b: any) => b.status === 'APPROVED').forEach((b: any) => {
      const room = db.rooms.find((r: any) => r.id === b.room_id);
      if (room) {
        popularity[room.name] = (popularity[room.name] || 0) + 1;
      }
    });
    const rows = Object.entries(popularity).map(([name, count]) => ({ name, count: String(count) }))
      .sort((a: any, b: any) => parseInt(b.count) - parseInt(a.count));
    return { rows };
  }

  // 22. Reports - Active Bans Count
  if (q.includes('select count(*) as count from ban_records where is_active = true')) {
    const count = db.ban_records.filter((b: any) => b.is_active === true).length;
    return { rows: [{ count: String(count) }] };
  }

  // 23. Reports - Conflict Occurrence Count
  if (q.includes("select count(*) as count from bookings where conflict_status = 'conflict_detected'")) {
    const count = db.bookings.filter((b: any) => b.conflict_status === 'CONFLICT_DETECTED').length;
    return { rows: [{ count: String(count) }] };
  }

  // 24. Reports - Bookings by Type
  if (q.includes('select booking_type, count(*) as count from bookings where status =') || q.includes('booking_type, count(*) as count')) {
    const types: Record<string, number> = {};
    db.bookings.filter((b: any) => b.status === 'APPROVED').forEach((b: any) => {
      types[b.booking_type] = (types[b.booking_type] || 0) + 1;
    });
    const rows = Object.entries(types).map(([booking_type, count]) => ({ booking_type, count: String(count) }));
    return { rows };
  }

  // 25. SELECT * FROM users WHERE LOWER(email) = $1
  if (q.includes('select * from users where lower(email) = $1') || q.includes('select * from users where lower(email) = lower($1)')) {
    const email = String(params[0] || '').toLowerCase();
    const found = db.users.filter((u: any) => u.email.toLowerCase() === email);
    return { rows: found };
  }

  // 25b. SELECT id FROM users WHERE LOWER(email) = LOWER($1)
  if (q.includes('select id from users where lower(email) = lower($1)') || q.includes('select id from users where lower(email) = $1')) {
    const email = String(params[0] || '').toLowerCase();
    const found = db.users.filter((u: any) => u.email.toLowerCase() === email);
    return { rows: found.map((u: any) => ({ id: u.id })) };
  }

  // 26. SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER($1)
  if (q.includes('select id, email, full_name from users where lower(email) = lower($1)')) {
    const email = String(params[0] || '').toLowerCase();
    const found = db.users.filter((u: any) => u.email.toLowerCase() === email);
    return { rows: found.map((u: any) => ({ id: u.id, email: u.email, full_name: u.full_name })) };
  }

  // 27. SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name... WHERE LOWER(u.email) = $1
  if (q.includes('select u.id, u.email, u.full_name, u.is_active, r.name as role_name') && (q.includes('lower(u.email) = $1') || q.includes('lower(u.email) = lower($1)'))) {
    const email = String(params[0] || '').toLowerCase();
    const users = getUsersWithRoles(db);
    const found = users.filter((u: any) => u.email.toLowerCase() === email);
    return { rows: found };
  }

  // 28. SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name... WHERE u.id = $1
  if (q.includes('select u.id, u.email, u.full_name, u.is_active, r.name as role_name') && q.includes('u.id = $1')) {
    const id = parseInt(params[0]);
    const users = getUsersWithRoles(db);
    const found = users.filter((u: any) => u.id === id);
    return { rows: found };
  }

  // 29. SELECT u.id, u.email, u.full_name, u.is_active, u.last_login... ORDER BY u.id ASC
  if (q.includes('select u.id, u.email, u.full_name, u.is_active, u.last_login, r.name as role_name') && q.includes('order by u.id asc')) {
    const users = getUsersWithRoles(db);
    return { rows: users.sort((a: any, b: any) => a.id - b.id) };
  }

  // 30. INSERT INTO users (microsoft_id, email, full_name, is_active, last_login) VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP) RETURNING id
  if (q.includes('insert into users') && q.includes('returning id')) {
    const microsoft_id = params.length > 3 ? params[0] : null;
    const email = params.length > 3 ? params[1] : params[0];
    const full_name = params.length > 3 ? params[2] : params[1];
    const id = Math.max(...db.users.map((u: any) => u.id), 0) + 1;
    const newUser = {
      id,
      microsoft_id,
      email,
      full_name,
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveLocalDB(db);
    return { rows: [{ id }] };
  }

  // 31. INSERT INTO roles (...) RETURNING *
  if (q.includes('insert into roles') && (q.includes('returning *') || q.includes('returning id'))) {
    const name = params[0];
    const description = params[1];
    let permissions = params[2];
    if (typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions); } catch {}
    }
    const ban_duration_ceiling = params[3] || null;
    const created_by = params[4] || null;
    const id = Math.max(...db.roles.map((r: any) => r.id), 0) + 1;
    const newRole = {
      id,
      name,
      description,
      permissions,
      ban_duration_ceiling,
      created_by,
      created_at: new Date().toISOString()
    };
    db.roles.push(newRole);
    saveLocalDB(db);
    return { rows: [newRole] };
  }

  // 32. INSERT INTO user_roles (user_id, role_id)
  if (q.includes('insert into user_roles')) {
    const user_id = parseInt(params[0]);
    const role_id = parseInt(params[1]);
    db.user_roles = db.user_roles.filter((ur: any) => ur.user_id !== user_id);
    db.user_roles.push({ user_id, role_id });
    saveLocalDB(db);
    return { rows: [{ user_id, role_id }] };
  }

  // 33. UPDATE users SET last_login = CURRENT_TIMESTAMP... WHERE id = $2
  if (q.includes('update users') && q.includes('where id = $2')) {
    const microsoftId = params[0];
    const id = parseInt(params[1]);
    const user = db.users.find((u: any) => u.id === id);
    if (user) {
      user.last_login = new Date().toISOString();
      if (!user.microsoft_id) user.microsoft_id = microsoftId;
      saveLocalDB(db);
    }
    return { rows: user ? [user] : [] };
  }

  // 34. UPDATE roles SET description = $1, permissions = $2, ban_duration_ceiling = $3 WHERE name = $4 RETURNING *
  if (q.includes('update roles') && q.includes('where name = $4')) {
    const desc = params[0];
    let perms = params[1];
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch {}
    }
    const ceiling = params[2];
    const name = params[3];
    const role = db.roles.find((r: any) => r.name.toLowerCase() === name.toLowerCase());
    if (role) {
      role.description = desc;
      role.permissions = perms;
      role.ban_duration_ceiling = ceiling;
      saveLocalDB(db);
    }
    return { rows: role ? [role] : [] };
  }

  // 35. DELETE FROM roles WHERE name = $1 RETURNING *
  if (q.includes('delete from roles where name = $1')) {
    const name = params[0];
    const idx = db.roles.findIndex((r: any) => r.name.toLowerCase() === name.toLowerCase());
    let deleted = null;
    if (idx !== -1) {
      deleted = db.roles.splice(idx, 1)[0];
      saveLocalDB(db);
    }
    return { rows: deleted ? [deleted] : [] };
  }

  // 36. INSERT INTO rooms (...) VALUES (...) RETURNING *
  if (q.includes('insert into rooms') && q.includes('returning *')) {
    const name = params[0];
    const capacity = parseInt(params[1]);
    const operating_hours_start = params[2];
    const operating_hours_end = params[3];
    const min_duration_minutes = parseInt(params[4]);
    const max_duration_minutes = parseInt(params[5]);
    const purpose = params[6];
    const policies = params[7];
    const id = Math.max(...db.rooms.map((r: any) => r.id), 0) + 1;
    const newRoom = {
      id,
      name,
      capacity,
      operating_hours_start,
      operating_hours_end,
      min_duration_minutes,
      max_duration_minutes,
      purpose,
      policies,
      is_active: true,
      created_at: new Date().toISOString()
    };
    db.rooms.push(newRoom);
    saveLocalDB(db);
    return { rows: [newRoom] };
  }

  // 37. UPDATE rooms SET ... WHERE id = $X
  if (q.includes('update rooms set')) {
    const id = parseInt(params[params.length - 1]);
    const room = db.rooms.find((r: any) => r.id === id);
    if (room) {
      const setParts = text.substring(text.toLowerCase().indexOf('set') + 3, text.toLowerCase().indexOf('where')).split(',');
      setParts.forEach((part, index) => {
        const key = part.split('=')[0].trim().replace(/['"`]/g, '');
        let val = params[index];
        if (key === 'capacity' || key === 'min_duration_minutes' || key === 'max_duration_minutes') {
          val = parseInt(val);
        } else if (key === 'is_active') {
          val = val === 'true' || val === true;
        }
        room[key] = val;
      });
      saveLocalDB(db);
    }
    return { rows: room ? [room] : [] };
  }

  // DELETE FROM rooms WHERE id = $1
  if (q.includes('delete from rooms where id = $1')) {
    const id = parseInt(params[0]);
    const idx = db.rooms.findIndex((r: any) => r.id === id);
    let deleted = null;
    if (idx !== -1) {
      deleted = db.rooms.splice(idx, 1)[0];
      // Cascade delete bookings of this room
      db.bookings = db.bookings.filter((b: any) => b.room_id !== id);
      saveLocalDB(db);
    }
    return { rows: deleted ? [deleted] : [] };
  }

  // 38. INSERT INTO bookings ...
  if (q.includes('insert into bookings')) {
    const id = Math.max(...db.bookings.map((b: any) => b.id), 0) + 1;
    
    const booking_id = params[0];
    const requester_name = params[1];
    const requester_email = params[2];
    const requester_phone = params[3];
    const organization_name = params[4];
    
    let room_id = null;
    let booking_type = '';
    let event_title = '';
    let event_description = '';
    let date = '';
    let start_time = '';
    let end_time = '';
    let expected_attendance = 0;
    let status = '';
    let conflict_status = '';
    let conflicting_booking_id = null;
    let rejection_reason = null;

    if (params.length === 14) {
      booking_type = params[5];
      event_title = params[6];
      event_description = params[7];
      date = params[8];
      start_time = params[9];
      end_time = params[10];
      expected_attendance = parseInt(params[11]);
      status = params[12];
      conflict_status = params[13];
    } else if (params.length === 15) {
      booking_type = params[5];
      event_title = params[6];
      event_description = params[7];
      date = params[8];
      start_time = params[9];
      end_time = params[10];
      expected_attendance = parseInt(params[11]);
      status = params[12];
      conflict_status = params[13];
      rejection_reason = params[14];
    } else {
      room_id = parseInt(params[5]);
      booking_type = params[6];
      event_title = params[7];
      event_description = params[8];
      date = params[9];
      start_time = params[10];
      end_time = params[11];
      expected_attendance = parseInt(params[12]);
      status = params[13];
      conflict_status = params[14];
      conflicting_booking_id = params[15] ? parseInt(params[15]) : null;
      rejection_reason = params[16] || null;
    }

    const newBooking = {
      id,
      booking_id,
      requester_name,
      requester_email,
      requester_phone,
      organization_name,
      room_id,
      booking_type,
      event_title,
      event_description,
      date,
      start_time,
      end_time,
      expected_attendance,
      status,
      conflict_status,
      conflicting_booking_id,
      rejection_reason,
      cancellation_reason: null,
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.bookings.push(newBooking);
    saveLocalDB(db);
    return { rows: [newBooking] };
  }

  // 39. UPDATE bookings SET status = 'APPROVED' ...
  if (q.includes('update bookings') && q.includes('set status =') && q.includes('where id = $2')) {
    const approved_by = parseInt(params[0]);
    const id = parseInt(params[1]);
    const booking = db.bookings.find((b: any) => b.id === id);
    if (booking) {
      booking.status = 'APPROVED';
      booking.rejection_reason = null; // Clear rejection reason
      booking.approved_by = approved_by;
      booking.approved_at = new Date().toISOString();
      booking.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: booking ? [booking] : [] };
  }

  // 40. UPDATE bookings SET conflict_status = 'CONFLICT_DETECTED' ...
  if (q.includes('update bookings') && q.includes("set conflict_status = 'conflict_detected'")) {
    const conflicting_booking_id = parseInt(params[0]);
    const room_id = parseInt(params[1]);
    const date = params[2];
    const endTime = params[3];
    const startTime = params[4];

    db.bookings.forEach((b: any) => {
      if (b.id !== conflicting_booking_id &&
          b.room_id === room_id &&
          b.date === date &&
          b.status === 'PENDING_REVIEW' &&
          b.start_time < endTime &&
          b.end_time > startTime) {
        b.conflict_status = 'CONFLICT_DETECTED';
        b.conflicting_booking_id = conflicting_booking_id;
        b.updated_at = new Date().toISOString();
      }
    });
    saveLocalDB(db);
    return { rows: [] };
  }

  // 41. UPDATE bookings SET status = 'REJECTED_BY_STAFF' ...
  if (q.includes('update bookings') && q.includes("status = 'rejected_by_staff'") && q.includes('where id = $3')) {
    const reason = params[0];
    const approved_by = parseInt(params[1]);
    const id = parseInt(params[2]);
    const booking = db.bookings.find((b: any) => b.id === id);
    if (booking) {
      booking.status = 'REJECTED_BY_STAFF';
      booking.rejection_reason = reason;
      booking.approved_by = approved_by;
      booking.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: booking ? [booking] : [] };
  }

  // 42. UPDATE bookings SET status = 'CANCELLED' ...
  if (q.includes('update bookings') && q.includes("status = 'cancelled'") && q.includes('where booking_id = $2')) {
    const reason = params[0];
    const bookingId = params[1];
    const booking = db.bookings.find((b: any) => b.booking_id === bookingId);
    if (booking) {
      booking.status = 'CANCELLED';
      booking.cancellation_reason = reason;
      booking.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: booking ? [booking] : [] };
  }

  // 43. INSERT INTO ban_records ...
  if (q.includes('insert into ban_records') && q.includes('returning *')) {
    const email = params[0];
    const full_name = params[1];
    const reason = params[2];
    const duration_type = params[3];
    const custom_days = params[4] ? parseInt(params[4]) : null;
    const expires_at = params[5] || null;
    const issued_by = parseInt(params[6]);
    const id = Math.max(...db.ban_records.map((b: any) => b.id), 0) + 1;
    const newBan = {
      id,
      email,
      full_name,
      reason,
      duration_type,
      custom_days,
      expires_at,
      is_active: true,
      issued_by,
      issued_at: new Date().toISOString(),
      lifted_by: null,
      lifted_at: null,
      lifting_reason: null
    };
    db.ban_records.push(newBan);
    saveLocalDB(db);
    return { rows: [newBan] };
  }

  // 44. UPDATE ban_records SET is_active = FALSE ...
  if (q.includes('update ban_records') && q.includes('lifted_by = $1') && q.includes('where id = $3')) {
    const lifted_by = parseInt(params[0]);
    const lifting_reason = params[1];
    const id = parseInt(params[2]);
    const ban = db.ban_records.find((b: any) => b.id === id);
    if (ban) {
      ban.is_active = false;
      ban.lifted_by = lifted_by;
      ban.lifting_reason = lifting_reason;
      ban.lifted_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: ban ? [ban] : [] };
  }

  // 45. INSERT INTO audit_logs ...
  if (q.includes('insert into audit_logs')) {
    const action = params[0];
    const entity_type = params[1];
    const entity_id = params[2];
    const actor_email = params[3];
    const previous_value = params[4] ? JSON.parse(params[4]) : null;
    const new_value = params[5] ? JSON.parse(params[5]) : null;
    const id = Math.max(...db.audit_logs.map((a: any) => a.id), 0) + 1;
    const newLog = {
      id,
      action,
      entity_type,
      entity_id,
      actor_email,
      previous_value,
      new_value,
      timestamp: new Date().toISOString()
    };
    db.audit_logs.push(newLog);
    saveLocalDB(db);
    return { rows: [newLog] };
  }

  console.warn("Unmatched local query: ", text, params);
  return { rows: [] };
}

let dbReadyPromise: Promise<void> | null = null;

async function ensureDBReady() {
  if (dbReadyPromise) return dbReadyPromise;

  dbReadyPromise = (async () => {
    if (useLocalDB) {
      console.log("⚡ Using local JSON database engine (server/local_db.json). Online database connections bypassed.");
      initializeLocalDB();
      return;
    }
    try {
      await pool.query('SELECT 1');
      console.log("Successfully connected to PostgreSQL database.");

      // Check if table 'users' exists
      const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      const tableExists = res.rows[0]?.exists;
      if (!tableExists) {
        console.log("Database tables do not exist. Running migrations from migration.sql...");
        const migrationPath = path.join(process.cwd(), 'migration.sql');
        if (fs.existsSync(migrationPath)) {
          const sql = fs.readFileSync(migrationPath, 'utf8');
          await pool.query(sql);
          console.log("Database migrations executed successfully.");
        } else {
          console.warn("WARNING: migration.sql file not found. Skipping migration run.");
        }
      } else {
        console.log("Database tables already exist. Skipping migrations.");
      }

      // Update PostgreSQL serial sequences to prevent unique constraint violations on auto-increment IDs
      try {
        await pool.query(`
          SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
          SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE(MAX(id), 1)) FROM roles;
        `);
        console.log("PostgreSQL serial sequences synchronized successfully.");
      } catch (seqErr: any) {
        console.warn("Could not synchronize PostgreSQL serial sequences:", seqErr.message);
      }

      // Synchronize facility spaces (rooms) to match correct FRD specs exactly
      try {
        console.log("Synchronizing facility spaces (rooms) to match correct FRD specs...");
        await pool.query(`
          DELETE FROM rooms 
          WHERE name NOT IN ('Board Room', 'Presentation Hall', 'Cube 1', 'Cube 2', 'Podcast Room');
        `);
        
        await pool.query(`
          INSERT INTO rooms (id, name, capacity, operating_hours_start, operating_hours_end, min_duration_minutes, max_duration_minutes, purpose, policies, is_active)
          VALUES
          (1, 'Board Room', 15, '09:00:00', '17:00:00', 60, 180, 'Formal executive meetings and syndicate sessions', 'Authorized UCP societies and startups only. Strictly no external foods allowed. Leave room clean.', true),
          (2, 'Presentation Hall', 50, '09:00:00', '17:00:00', 60, 180, 'Large cohort presentations, talks, and community panels', 'Pre-approval from Faculty advisor required. Keep setup reset after use.', true),
          (3, 'Cube 1', 6, '09:00:00', '17:00:00', 30, 60, 'Small meetings and focused discussions', 'Leave room clean. No loud noise.', true),
          (4, 'Cube 2', 6, '09:00:00', '17:00:00', 30, 60, 'Small meetings and focused discussions', 'Leave room clean. No loud noise.', true),
          (5, 'Podcast Room', 4, '09:00:00', '17:00:00', 60, 180, 'Podcast recording and audio sessions', 'Technical staff assistance must be booked separately.', true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            capacity = EXCLUDED.capacity,
            operating_hours_start = EXCLUDED.operating_hours_start,
            operating_hours_end = EXCLUDED.operating_hours_end,
            min_duration_minutes = EXCLUDED.min_duration_minutes,
            max_duration_minutes = EXCLUDED.max_duration_minutes,
            purpose = EXCLUDED.purpose,
            policies = EXCLUDED.policies,
            is_active = EXCLUDED.is_active;
        `);

        await pool.query(`
          SELECT setval(pg_get_serial_sequence('rooms', 'id'), COALESCE(MAX(id), 1)) FROM rooms;
        `);
        console.log("Facility spaces successfully synchronized.");
      } catch (syncRoomsErr: any) {
        console.warn("Could not synchronize facility spaces in PostgreSQL:", syncRoomsErr.message);
      }

      // Synchronize Room Management role
      try {
        console.log("Synchronizing default roles (Room Management)...");
        await pool.query(`
          INSERT INTO roles (name, description, permissions, ban_duration_ceiling)
          VALUES ('Room Management', 'Manage incubator spaces, view and update space operating attributes, and delete spaces', '["MANAGE_ROOMS"]'::jsonb, '0')
          ON CONFLICT (name) DO NOTHING;
        `);
      } catch (syncRoleErr: any) {
        console.warn("Could not synchronize Room Management role in PostgreSQL:", syncRoleErr.message);
      }

      // Synchronize default Administrator role with new permission nodes
      try {
        console.log("Synchronizing default Administrator role with new permission nodes...");
        await pool.query(`
          UPDATE roles 
          SET permissions = '["SUBMIT_BOOKING", "CANCEL_OWN_BOOKING", "VIEW_PENDING_QUEUE", "APPROVE_BOOKING", "REJECT_BOOKING", "APPROVE_REJECT_BOOKINGS", "BOOKING_OVERRIDE", "ISSUE_BAN", "MANAGE_ROOMS", "CONFIGURE_ROOMS", "CONFIGURE_POLICIES", "VIEW_ANALYTICS_DASHBOARD", "EXPORT_AUDIT_LOGS", "MANAGE_ROLES", "MANAGE_USERS", "VIEW_AUDIT_LOGS", "LIFT_BAN", "MANAGE_BANS", "MANAGE_BOOKING_TYPES", "cohort:form_manage", "cohort:applicant_review", "cohort:session_manage", "cohort:attendance_write", "cohort:checkin_log", "cohort:warning_write", "cohort:profile_write", "cohort:feedback_submit", "cohort:assignment_upload"]'::jsonb
          WHERE name = 'Administrator';
        `);
      } catch (syncAdminErr: any) {
        console.warn("Could not synchronize Administrator role in PostgreSQL:", syncAdminErr.message);
      }

      // We do not unconditionally update or reset custom permissions/ceilings of default roles (Booking Manager and Facility Coordinator) on startup anymore.
      // This allows modifications made via the Admin UI/Governance Center to persist permanently across server restarts and redeployments.

      // Synchronize all simulated users and roles in PostgreSQL
      try {
        console.log("Synchronizing standard user profiles and roles in PostgreSQL...");
        // 1. Ensure UCP Member role exists
        await pool.query(`
          INSERT INTO roles (id, name, description, permissions, ban_duration_ceiling)
          VALUES (4, 'UCP Member', 'Regular student or staff member with standard public booking access', '[]'::jsonb, NULL)
          ON CONFLICT (name) DO NOTHING;
        `);

        // Ensure Cohort Founder role exists
        await pool.query(`
          INSERT INTO roles (id, name, description, permissions, ban_duration_ceiling)
          VALUES (5, 'Cohort Founder', 'Enrolled startup founder with access to Cohort Self-Service dashboard', '["cohort:profile_write", "cohort:feedback_submit", "cohort:assignment_upload"]'::jsonb, NULL)
          ON CONFLICT (name) DO NOTHING;
        `);

        // 2. Insert all simulated users
        await pool.query(`
          INSERT INTO users (id, email, full_name, is_active, last_login)
          VALUES 
          (1, 'director@takhleeq.pk', 'Dr. Qaseeb (Director)', TRUE, CURRENT_TIMESTAMP),
          (2, 'manager@takhleeq.pk', 'Syed Usman (Booking Manager)', TRUE, CURRENT_TIMESTAMP),
          (3, 'coordinator@takhleeq.pk', 'Sara Khan (Coordinator)', TRUE, CURRENT_TIMESTAMP),
          (4, 'usman@society.pk', 'Usman Ghani (Society Rep)', TRUE, CURRENT_TIMESTAMP),
          (5, 'faisal@ucp.edu.pk', 'Faisal Mehmood (Coordinator)', TRUE, CURRENT_TIMESTAMP),
          (6, 'maheen@ucp.edu.pk', 'Maheen Malik (Manager)', TRUE, CURRENT_TIMESTAMP),
          (7, 'banned-test@ucp.edu.pk', 'Banned Student (Testing)', FALSE, CURRENT_TIMESTAMP),
          (8, 'zohaib@startup.pk', 'Zohaib Niaz (MedRoute Founder)', TRUE, CURRENT_TIMESTAMP)
          ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            is_active = EXCLUDED.is_active;
        `);

        // Get actual role IDs to make sure we map user_roles correctly
        const rolesRes = await pool.query(`SELECT id, name FROM roles`);
        const roleMap: Record<string, number> = {};
        rolesRes.rows.forEach(r => {
          roleMap[r.name] = r.id;
        });

        // Get actual user IDs to match email
        const usersRes = await pool.query(`SELECT id, email FROM users`);
        const userMap: Record<string, number> = {};
        usersRes.rows.forEach(u => {
          userMap[u.email.toLowerCase()] = u.id;
        });

        // 3. Set standard user roles
        const assignments = [
          { email: 'director@takhleeq.pk', role: 'Administrator' },
          { email: 'manager@takhleeq.pk', role: 'Booking Manager' },
          { email: 'coordinator@takhleeq.pk', role: 'Facility Coordinator' },
          { email: 'usman@society.pk', role: 'UCP Member' },
          { email: 'faisal@ucp.edu.pk', role: 'Facility Coordinator' },
          { email: 'maheen@ucp.edu.pk', role: 'Booking Manager' },
          { email: 'banned-test@ucp.edu.pk', role: 'UCP Member' },
          { email: 'zohaib@startup.pk', role: 'Cohort Founder' }
        ];

        for (const assign of assignments) {
          const userId = userMap[assign.email.toLowerCase()];
          const roleId = roleMap[assign.role];
          if (userId && roleId) {
            await pool.query(`
              INSERT INTO user_roles (user_id, role_id)
              VALUES ($1, $2)
              ON CONFLICT (user_id, role_id) DO NOTHING;
            `, [userId, roleId]);
          }
        }
        
        await pool.query(`
          SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
          SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE(MAX(id), 1)) FROM roles;
        `);
        console.log("Simulated users and roles synchronized successfully.");
      } catch (syncUsersErr: any) {
        console.warn("Could not synchronize standard user profiles and roles in PostgreSQL:", syncUsersErr.message);
      }

      // Synchronize booking types table and initial seed data in PostgreSQL
      try {
        console.log("Synchronizing booking types in PostgreSQL...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS booking_types (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) UNIQUE NOT NULL,
              description TEXT,
              is_active BOOLEAN DEFAULT TRUE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await pool.query(`
          INSERT INTO booking_types (id, name, description, is_active)
          VALUES 
          (1, 'Student societies', 'Registered student clubs and societies', true),
          (2, 'Startup teams', 'Incubated or acceleration stage startup ventures', true),
          (3, 'Faculty members', 'Academic and research faculty staff', true),
          (4, 'Department representatives', 'Official university department booking delegates', true),
          (5, 'Cohort members', 'Incubation program cohort participants', true),
          (6, 'Entrepreneurs in residence', 'In-house startup mentors and entrepreneurs', true),
          (7, 'Professionals in residence', 'Industry professionals and technical consultants', true),
          (8, 'Meeting / Event', 'General meetings, gatherings or community events', true),
          (9, 'Cohort Startup', 'Incubated startup members', true),
          (10, 'Department', 'Department sessions and operations', true)
          ON CONFLICT (name) DO NOTHING;
        `);

        try {
          await pool.query(`
            SELECT setval(pg_get_serial_sequence('booking_types', 'id'), COALESCE(MAX(id), 1)) FROM booking_types;
          `);
        } catch (setvalErr: any) {
          // ignore if sequence isn't fully initialized yet
        }
        console.log("Booking types synchronized successfully in PostgreSQL.");
      } catch (syncBookingTypesErr: any) {
        console.warn("Could not synchronize booking types in PostgreSQL:", syncBookingTypesErr.message);
      }

      // Synchronize cohort tables and initial seed data in PostgreSQL
      try {
        console.log("Synchronizing cohort tables in PostgreSQL...");
        
        // 1. cohorts table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS cohorts (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              status VARCHAR(50) DEFAULT 'DRAFT',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Seed default cohort if none exists
        const cohortCountRes = await pool.query('SELECT count(*) FROM cohorts');
        if (parseInt(cohortCountRes.rows[0].count) === 0) {
          await pool.query(`
            INSERT INTO cohorts (id, name, status)
            VALUES (1, 'Takhleeq Cohort 1', 'ACTIVE')
            ON CONFLICT DO NOTHING;
          `);
          try {
            await pool.query(`SELECT setval(pg_get_serial_sequence('cohorts', 'id'), COALESCE(MAX(id), 1)) FROM cohorts;`);
          } catch (e) {}
        }

        // 2. cohort_form_settings table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS cohort_form_settings (
              is_active BOOLEAN DEFAULT TRUE,
              fields JSONB NOT NULL
          );
        `);

        // Seed default form settings if empty
        const settingsCountRes = await pool.query('SELECT count(*) FROM cohort_form_settings');
        if (parseInt(settingsCountRes.rows[0].count) === 0) {
          const defaultFields = [
            { id: 'field_startup_name', label: 'Startup Name', type: 'text', required: true, placeholder: 'Enter your startup name' },
            { id: 'field_startup_desc', label: 'Idea Description', type: 'text', required: true, placeholder: 'Explain your business idea in 2-3 sentences' },
            { id: 'field_founder_name', label: 'Team Lead Name', type: 'text', required: true, placeholder: 'Enter full name of the team lead' },
            { id: 'field_founder_email', label: 'Email Address', type: 'email', required: true, placeholder: 'Enter team lead email' },
            { id: 'field_founder_phone', label: 'Phone Number', type: 'phone', required: true, placeholder: 'e.g. 03xx-xxxxxxx' },
            { id: 'field_founder_cnic', label: 'CNIC Number', type: 'cnic', required: true, placeholder: 'e.g. 35201-xxxxxxx-x' }
          ];
          await pool.query(
            `INSERT INTO cohort_form_settings (is_active, fields) VALUES (TRUE, $1)`,
            [JSON.stringify(defaultFields)]
          );
        }

        // 3. applicants table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS applicants (
              id SERIAL PRIMARY KEY,
              tracking_token VARCHAR(100) UNIQUE NOT NULL,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              phone VARCHAR(255) NOT NULL,
              cnic VARCHAR(255) NOT NULL,
              startup_name VARCHAR(255) NOT NULL,
              startup_description TEXT NOT NULL,
              status VARCHAR(100) DEFAULT 'SUBMITTED',
              panel_scores JSONB,
              parent_applicant_id INTEGER REFERENCES applicants(id) ON DELETE SET NULL,
              form_data JSONB,
              orientation_conducted BOOLEAN DEFAULT FALSE,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Seed default applicants if empty
        const applicantsCountRes = await pool.query('SELECT count(*) FROM applicants');
        if (parseInt(applicantsCountRes.rows[0].count) === 0) {
          const defaultApplicants = [
            { id: 1, tracking_token: 'TK-STR-7821', name: 'Zohaib Niaz', email: 'zohaib@startup.pk', phone: '0300-1234567', cnic: '35201-1234567-1', startup_name: 'MedRoute', startup_description: 'An AI-powered pharmaceutical route planner reducing delivery times by 40%.', cohort_id: 1, status: 'CONFIRMED', panel_scores: { viability: 8, team: 9, scalability: 8, average: 8.3 }, form_data: {}, orientation_conducted: true },
            { id: 2, tracking_token: 'TK-STR-5921', name: 'Ayesha Malik', email: 'ayesha@fintech.pk', phone: '0321-7654321', cnic: '35201-7654321-2', startup_name: 'PaisaFlow', startup_description: 'Micro-lending platform for small merchants using alternative credit scoring.', cohort_id: 1, status: 'CONFIRMED', panel_scores: { viability: 9, team: 8, scalability: 9, average: 8.7 }, form_data: {}, orientation_conducted: true },
            { id: 3, tracking_token: 'TK-STR-4412', name: 'Imran Khan', email: 'imran@edtech.pk', phone: '0333-5551212', cnic: '35201-5551212-3', startup_name: 'Dars-e-Nau', startup_description: 'Localized video-based educational app for public school students in Urdu.', cohort_id: null, status: 'IN_REVIEW', panel_scores: null, form_data: {}, orientation_conducted: false },
            { id: 4, tracking_token: 'TK-STR-1092', name: 'Qasim Ali', email: 'qasim@agritech.pk', phone: '0345-9998887', cnic: '35201-9998887-4', startup_name: 'AgriSense', startup_description: 'IoT-enabled soil nutrient analysis probe for smallholder farmers.', cohort_id: null, status: 'BACKUP_CANDIDATE', panel_scores: { viability: 7, team: 7, scalability: 7, average: 7.0 }, form_data: {}, orientation_conducted: false },
            { id: 5, tracking_token: 'TK-STR-2291', name: 'Raza Jafar', email: 'raza@delivery.pk', phone: '0312-3334445', cnic: '35201-3334445-5', startup_name: 'LogiSwift', startup_description: 'B2B express delivery aggregator connecting local freight vans.', cohort_id: null, status: 'REJECTED', panel_scores: { viability: 4, team: 5, scalability: 4, average: 4.3 }, form_data: {}, orientation_conducted: false }
          ];

          for (const a of defaultApplicants) {
            await pool.query(
              `INSERT INTO applicants (id, tracking_token, name, email, phone, cnic, startup_name, startup_description, cohort_id, status, panel_scores, form_data, orientation_conducted)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               ON CONFLICT DO NOTHING`,
              [a.id, a.tracking_token, a.name, a.email, a.phone, a.cnic, a.startup_name, a.startup_description, a.cohort_id, a.status, JSON.stringify(a.panel_scores), JSON.stringify(a.form_data), a.orientation_conducted]
            );
          }
          try {
            await pool.query(`SELECT setval(pg_get_serial_sequence('applicants', 'id'), COALESCE(MAX(id), 1)) FROM applicants;`);
          } catch (e) {}
        }

        // 4. cohort_sessions table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS cohort_sessions (
              id SERIAL PRIMARY KEY,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
              title VARCHAR(255) NOT NULL,
              date DATE NOT NULL,
              start_time TIME NOT NULL,
              end_time TIME NOT NULL,
              mentor_name VARCHAR(255),
              topic_category VARCHAR(255),
              venue VARCHAR(255),
              recording_url VARCHAR(1024),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Add columns in case table was already created
        try {
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS topic_category VARCHAR(255);`);
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS venue VARCHAR(255);`);
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS recording_url VARCHAR(1024);`);
        } catch (e) {
          console.error("Failed to alter cohort_sessions table columns", e);
        }

        // Seed default cohort_sessions if empty
        const sessionsCountRes = await pool.query('SELECT count(*) FROM cohort_sessions');
        if (parseInt(sessionsCountRes.rows[0].count) === 0) {
          const defaultSessions = [
            { id: 1, cohort_id: 1, title: 'Orientation & Incubation Blueprint', date: '2026-07-22', start_time: '10:00:00', end_time: '12:00:00', mentor_name: 'Dr. Qaseeb Ahmed' },
            { id: 2, cohort_id: 1, title: 'Value Proposition & Customer Discovery', date: '2026-07-29', start_time: '14:00:00', end_time: '16:00:00', mentor_name: 'Syed Usman' }
          ];
          for (const s of defaultSessions) {
            await pool.query(
              `INSERT INTO cohort_sessions (id, cohort_id, title, date, start_time, end_time, mentor_name)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT DO NOTHING`,
              [s.id, s.cohort_id, s.title, s.date, s.start_time, s.end_time, s.mentor_name]
            );
          }
          try {
            await pool.query(`SELECT setval(pg_get_serial_sequence('cohort_sessions', 'id'), COALESCE(MAX(id), 1)) FROM cohort_sessions;`);
          } catch (e) {}
        }

        // 5. session_attendance table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS session_attendance (
              id SERIAL PRIMARY KEY,
              session_id INTEGER REFERENCES cohort_sessions(id) ON DELETE CASCADE,
              applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
              status VARCHAR(50) NOT NULL,
              marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 6. team_checkins table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS team_checkins (
              id SERIAL PRIMARY KEY,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
              applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
              logged_by VARCHAR(255) NOT NULL,
              blockers TEXT NOT NULL,
              progress_score INTEGER NOT NULL,
              mentor_notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 7. performance_warnings table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS performance_warnings (
              id SERIAL PRIMARY KEY,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
              applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
              issued_by VARCHAR(255) NOT NULL,
              reason TEXT NOT NULL,
              severity VARCHAR(50) NOT NULL,
              status VARCHAR(50) DEFAULT 'ACTIVE',
              resolution_notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        console.log("Cohort tables synchronized successfully in PostgreSQL.");
      } catch (syncCohortsErr: any) {
        console.error("Could not synchronize cohort tables in PostgreSQL:", syncCohortsErr.message);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error("CRITICAL FATAL ERROR: Failed to connect to PostgreSQL database in PRODUCTION mode. Refusing to fallback to local JSON database to prevent silent data loss.");
        throw err;
      }
      console.warn("PostgreSQL connection or migration failed. Falling back to local in-memory JSON database engine.", err.message);
      useLocalDB = true;
    }
  })();

  return dbReadyPromise;
}

// Trigger early initialization
ensureDBReady();

// Base Query Helper with retry and fallback
export async function query(text: string, params?: any[]): Promise<any> {
  await ensureDBReady();
  if (!useLocalDB) {
    let retries = 1;
    while (retries >= 0) {
      try {
        return await pool.query(text, params);
      } catch (err: any) {
        const errMsg = String(err.message || '');
        const errCode = String(err.code || '');
        const isConnectionError = 
          errCode === 'ECONNREFUSED' || 
          errMsg.includes('connect ECONNREFUSED') || 
          errMsg.includes('does not exist') ||
          errMsg.includes('terminated unexpectedly') ||
          errMsg.includes('closed') ||
          errMsg.includes('ECONNRESET') ||
          errMsg.includes('socket hang up') ||
          errMsg.includes('hand up') ||
          errMsg.includes('connection');

        if (isConnectionError) {
          if (retries > 0) {
            console.warn(`PostgreSQL connection error detected ("${errMsg}"). Retrying query with a fresh connection...`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          if (process.env.NODE_ENV === 'production') {
            console.error("CRITICAL CONNECTION LOST in Production Mode. Attempting fallback to keep the service responsive.");
          }
          console.warn("PostgreSQL query failed after retries. Switching to local JSON database engine.", err.message);
          useLocalDB = true;
          break;
        } else {
          throw err;
        }
      }
    }
  }

  return executeLocalQuery(text, params);
}

// Audit logger that inserts directly into PostgreSQL database (or fallback)
export async function logAudit(
  action: string,
  entityType: string | null,
  entityId: string | null,
  actorEmail: string,
  prevVal?: any,
  newVal?: any
) {
  try {
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, actor_email, previous_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        action,
        entityType,
        entityId,
        actorEmail,
        prevVal ? JSON.stringify(prevVal) : null,
        newVal ? JSON.stringify(newVal) : null
      ]
    );
  } catch (err) {
    console.error("Failed to write audit log to database:", err);
  }
}

// Helper to calculate expiration date of a ban
export function calculateBanExpiry(duration: string): Date | null {
  const now = new Date();
  if (duration === '3_days' || duration === '3 days') {
    now.setDate(now.getDate() + 3);
    return now;
  } else if (duration === '7_days' || duration === '7 days') {
    now.setDate(now.getDate() + 7);
    return now;
  } else if (duration === '30_days' || duration === '30 days') {
    now.setDate(now.getDate() + 30);
    return now;
  } else if (duration === '90_days' || duration === '90 days') {
    now.setDate(now.getDate() + 90);
    return now;
  } else if (duration === 'Permanent' || duration === 'permanent') {
    return null;
  } else {
    // Custom days parsing
    const match = duration.match(/Custom (\d+) days/);
    if (match) {
      const days = parseInt(match[1]);
      now.setDate(now.getDate() + days);
      return now;
    }
  }
  return null;
}

// Automatically expire and lift bans whose expires_at date/time has passed
export async function autoExpireBans() {
  try {
    const now = new Date();
    if (useLocalDB) {
      const db = initializeLocalDB();
      let updated = false;
      db.ban_records.forEach((b: any) => {
        if (b.is_active && b.expires_at && new Date(b.expires_at) <= now) {
          b.is_active = false;
          b.lifting_reason = 'Ban automatically expired';
          b.lifted_at = now.toISOString();
          updated = true;
          console.log(`[Auto-Expire Local Ban] Expired ban for ${b.email} (ID: ${b.id})`);
        }
      });
      if (updated) {
        saveLocalDB(db);
      }
    } else {
      // Fetch expired bans that are currently active in Postgres using server-side Date to avoid DB timezone differences
      const expiredBans = await pool.query(
        `SELECT id, email FROM ban_records 
         WHERE is_active = TRUE AND expires_at IS NOT NULL AND expires_at <= $1`,
        [now]
      );
      if (expiredBans.rows.length > 0) {
        for (const row of expiredBans.rows) {
          console.log(`[Auto-Expire Postgres Ban] Expiring ban for ${row.email} (ID: ${row.id})`);
          await pool.query(
            `UPDATE ban_records 
             SET is_active = FALSE, lifted_at = $1, lifting_reason = 'Ban automatically expired' 
             WHERE id = $2`,
            [now, row.id]
          );
          await logAudit(
            `Ban automatically expired and lifted for ${row.email}`,
            'ban',
            String(row.id),
            'System'
          );
        }
      }
    }
  } catch (err) {
    console.error('Failed to run autoExpireBans:', err);
  }
}

// Database snake_case row to CamelCase frontend schema mappers
export function mapUser(row: any): User {
  return {
    email: row.email,
    name: row.full_name,
    role: row.role_name || 'UCP Member', // Joined role name or default
    status: row.is_active ? 'Active' : 'Inactive'
  };
}

export function mapRoom(row: any): Room {
  const start = row.operating_hours_start ? row.operating_hours_start.slice(0, 5) : "09:00";
  const end = row.operating_hours_end ? row.operating_hours_end.slice(0, 5) : "17:00";
  
  let policies: string[] = [];
  if (row.policies) {
    try {
      policies = JSON.parse(row.policies);
    } catch {
      policies = row.policies.split('\n').map((p: string) => p.trim()).filter(Boolean);
    }
  }

  return {
    id: String(row.id),
    name: row.name,
    capacity: row.capacity,
    operatingHours: `${start} - ${end}`,
    minBookingDuration: row.min_duration_minutes,
    maxBookingDuration: row.max_duration_minutes,
    purpose: row.purpose || '',
    policies,
    isActive: row.is_active
  };
}

function safeFormatDate(d: any): string {
  if (!d) return '';
  if (d instanceof Date) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const str = String(d).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return str;
}

export function mapBooking(row: any): Booking {
  const startTime = row.start_time ? row.start_time.slice(0, 5) : "00:00";
  const endTime = row.end_time ? row.end_time.slice(0, 5) : "00:00";

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const duration = (eH * 60 + eM) - (sH * 60 + sM);

  return {
    id: row.booking_id,
    name: row.requester_name,
    email: row.requester_email,
    phone: row.requester_phone,
    organization: row.organization_name || '',
    room: row.room_name || '',
    date: row.date ? safeFormatDate(row.date) : '',
    startTime,
    endTime,
    duration,
    eventTitle: row.event_title,
    eventDescription: row.event_description,
    bookingType: row.booking_type,
    expectedAttendance: row.expected_attendance,
    status: row.status === 'PENDING_REVIEW' ? 'PENDING REVIEW' :
            row.status === 'PENDING_VALIDATION' ? 'PENDING VALIDATION' :
            row.status === 'REJECTED_BAN' ? 'REJECTED (BAN)' :
            row.status === 'REJECTED_VALIDATION' ? 'REJECTED (VALIDATION)' :
            row.status === 'REJECTED_BY_STAFF' ? 'REJECTED BY STAFF' :
            row.status === 'APPROVED' ? 'APPROVED' :
            row.status === 'CANCELLED' ? 'CANCELLED' : row.status,
    rejectionReason: row.rejection_reason || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    conflictStatus: row.conflict_status === 'CONFLICT_DETECTED' ? 'CONFLICT DETECTED' : 'NO CONFLICT',
    conflictingBookingId: row.conflicting_booking_id ? String(row.conflicting_booking_id) : undefined,
    approvedBy: row.approver_name || undefined,
    approvalDate: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

export function mapBan(row: any): Ban {
  let duration = 'Permanent';
  const dt = String(row.duration_type).toLowerCase().trim();
  if (dt === '3_days' || dt === '3 days') duration = '3 days';
  else if (dt === '7_days' || dt === '7 days') duration = '7 days';
  else if (dt === '30_days' || dt === '30 days') duration = '30 days';
  else if (dt === '90_days' || dt === '90 days') duration = '90 days';
  else if (dt === 'custom') duration = `Custom ${row.custom_days} days`;
  else if (dt === 'permanent') duration = 'Permanent';
  else if (row.duration_type) duration = row.duration_type;

  let status: 'Active' | 'Expired' | 'Lifted' = 'Active';
  if (!row.is_active) {
    if (row.lifted_at) {
      status = 'Lifted';
    } else {
      status = 'Expired';
    }
  }

  return {
    id: String(row.id),
    email: row.email,
    name: row.full_name,
    reason: row.reason,
    duration,
    bannedBy: row.issuer_name || 'System',
    createdAt: row.issued_at ? new Date(row.issued_at).toISOString() : new Date().toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : 'Never',
    status,
    liftedReason: row.lifting_reason || undefined,
    liftedBy: row.lifter_name || undefined,
    liftedAt: row.lifted_at ? new Date(row.lifted_at).toISOString() : undefined
  };
}

export function mapRole(row: any): CustomRole {
  let perms: string[] = [];
  if (row.permissions) {
    perms = Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions);
  }
  return {
    name: row.name,
    description: row.description,
    permissions: perms,
    banDurationCeiling: row.ban_duration_ceiling && row.ban_duration_ceiling !== 'permanent' ? parseInt(row.ban_duration_ceiling) : undefined
  };
}

export function mapAudit(row: any): AuditRecord {
  return {
    id: String(row.id),
    action: row.action,
    user: row.actor_email,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    previousValue: row.previous_value ? JSON.stringify(row.previous_value) : undefined,
    newValue: row.new_value ? JSON.stringify(row.new_value) : undefined
  };
}
