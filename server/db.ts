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
    "cohort:dashboard_view",
    "cohort:settings_manage",
    "cohort:form_manage",
    "cohort:applicant_review",
    "cohort:startups_manage",
    "cohort:session_manage",
    "cohort:assignment_manage",
    "cohort:feedback_view",
    "cohort:feedback_forms_manage",
    "cohort:attendance_write",
    "cohort:checkin_log",
    "cohort:warning_write",
    "cohort:profile_write",
    "cohort:feedback_submit",
    "cohort:assignment_upload",
    "SUBMIT_BOOKING",
    "CANCEL_OWN_BOOKING",
    "VIEW_PENDING_QUEUE",
    "APPROVE_REJECT_BOOKINGS",
    "BOOKING_OVERRIDE",
    "MANAGE_ROOMS",
    "MANAGE_BOOKING_TYPES",
    "VIEW_BOOKING_ANALYTICS",
    "MANAGE_ROLES",
    "MANAGE_USERS",
    "ISSUE_BAN",
    "VIEW_ANALYTICS_DASHBOARD",
    "VIEW_AUDIT_LOGS",
    "EXPORT_AUDIT_LOGS"
  ];

  if (db) {
    let updated = false;
    
    // Core cohort tables dynamic schema migration
    if (!db.cohorts || !Array.isArray(db.cohorts)) {
      db.cohorts = [];
      updated = true;
    }
    
    if (!db.cohort_form_settings) {
      db.cohort_form_settings = {
        is_active: true,
        fields: [
          { id: 'field_startup_name', label: 'Q1. What is the name of your startup?', type: 'text', required: true, placeholder: 'Enter startup name' },
          { id: 'field_q2_venture_type', label: 'Q2. Is this a product-based or service-based venture?', type: 'select', required: true, options: ['Product-based', 'Service-based', 'Hybrid / Both'] },
          { id: 'field_startup_desc', label: 'Q3. Describe your idea/startup. What does it do, and how does it work?', type: 'textarea', required: true, placeholder: 'Be concise but clear about your concept or business model' },
          { id: 'field_q4_services', label: 'Q4. If you’re providing services, describe your offerings and any clients you’ve worked with', type: 'textarea', required: false, placeholder: 'Describe service offerings and client history if applicable' },
          { id: 'field_q5_business_model', label: 'Q5. What is your business model? (e.g., B2B, B2C, subscription-based, etc.)', type: 'text', required: true, placeholder: 'e.g. B2B SaaS, B2C Subscription, Marketplace commission' },
          { id: 'field_q6_discovery', label: 'Q6. How did you get to know about Takhleeq Cohort 11 Incubation Program?', type: 'select', required: true, options: ['Email', 'Takhleeq Socials', 'UCP Socials', 'Dean/hod/faculty email or word', 'Digital display across ucp (tv screens etc)'] },
          { id: 'field_q7_stage', label: 'Q7. What stage is your startup currently at?', type: 'select', required: true, options: ['Idea stage', 'Problem Discovery / validation', 'Proof of Concept / MVP', 'Post Revenue', 'Scale'] },
          { id: 'field_q8_team_size', label: 'Q8. Number of members in Team', type: 'select', required: true, options: ['Solo', '2', '3', '4'] },
          { id: 'field_founder_name', label: 'Q9. Team lead name', type: 'text', required: true, placeholder: 'Enter full name of the team lead' },
          { id: 'field_q10_father_name', label: "Q10. Team Lead Father's Name", type: 'text', required: true, placeholder: "Enter father's name" },
          { id: 'field_q11_gender', label: "Q11. Team Lead's Gender", type: 'select', required: true, options: ['Male', 'Female'] },
          { id: 'field_founder_email', label: "Q12. Team Lead's Email", type: 'email', required: true, placeholder: 'Enter email address' },
          { id: 'field_founder_phone', label: "Q13. Team Lead's Contact Number", type: 'phone', required: true, placeholder: 'e.g. 0300-1234567' },
          { id: 'field_q14_roll_number', label: "Q14. Team Lead's Roll Number", type: 'text', required: false, placeholder: 'Enter student roll number if applicable' },
          { id: 'field_founder_cnic', label: "Q15. Team Lead's CNIC/Passport Number", type: 'cnic', required: true, placeholder: 'e.g. 35201-1234567-1' },
          { id: 'field_q16_location', label: "Q16. Team Lead's Location", type: 'text', required: true, placeholder: 'e.g. Lahore, Pakistan' },
          { id: 'field_q17_postal_address', label: "Q17. Team Lead's Postal Address", type: 'text', required: true, placeholder: 'Enter full home/postal address' },
          { id: 'field_q18_team_role', label: 'Q18. Team Lead: Role in the Team', type: 'text', required: true, placeholder: 'e.g. Founder & CEO, Chief Technology Officer' },
          { id: 'field_q19_skillset', label: 'Q19. Team Lead: How does your skillset contribute to this venture?', type: 'textarea', required: true, placeholder: 'Explain technical, business or domain expertise' },
          { id: 'field_q20_linkedin', label: 'Q20. Team Lead: LinkedIn Profile (optional)', type: 'text', required: false, placeholder: 'https://linkedin.com/in/username' },
          { id: 'field_q21_past_projects', label: 'Q21. Team Lead: Have you worked on a project before? If yes, describe briefly.', type: 'textarea', required: false, placeholder: 'Describe previous projects, hackathons or research' },
          { id: 'field_q22_status', label: "Q22. Team Lead: What's your current status?", type: 'select', required: true, options: ['Current Student/Faculty/Staff', 'Alumni Student'] },
          { id: 'field_q23_batch_year', label: "Q23. What is your batch's starting year", type: 'text', required: true, placeholder: 'e.g. 2022' },
          { id: 'field_q24_department', label: 'Q24. Department', type: 'text', required: true, placeholder: 'e.g. Computer Science, Business School' },
          { id: 'field_q25_degree', label: 'Q25. Degree/Position', type: 'text', required: true, placeholder: 'e.g. BS Computer Science, Assistant Professor' },
          { id: 'field_q26_working', label: 'Q26. Are you currently working?', type: 'select', required: true, options: ['Yes', 'No'] },
          { id: 'field_q27_work_details', label: 'Q27. If Yes, Where are you working? Provide Company name and designation.', type: 'text', required: false, placeholder: 'Company name & designation if working' }
        ]
      };
      updated = true;
    } else if (!db.cohort_form_settings.fields || !Array.isArray(db.cohort_form_settings.fields) || db.cohort_form_settings.fields.length === 0) {
      db.cohort_form_settings.fields = [
        { id: 'field_startup_name', label: 'Q1. What is the name of your startup?', type: 'text', required: true, placeholder: 'Enter startup name' },
        { id: 'field_q2_venture_type', label: 'Q2. Is this a product-based or service-based venture?', type: 'select', required: true, options: ['Product-based', 'Service-based', 'Hybrid / Both'] },
        { id: 'field_startup_desc', label: 'Q3. Describe your idea/startup. What does it do, and how does it work?', type: 'textarea', required: true, placeholder: 'Be concise but clear about your concept or business model' },
        { id: 'field_q4_services', label: 'Q4. If you’re providing services, describe your offerings and any clients you’ve worked with', type: 'textarea', required: false, placeholder: 'Describe service offerings and client history if applicable' },
        { id: 'field_q5_business_model', label: 'Q5. What is your business model? (e.g., B2B, B2C, subscription-based, etc.)', type: 'text', required: true, placeholder: 'e.g. B2B SaaS, B2C Subscription, Marketplace commission' },
        { id: 'field_q6_discovery', label: 'Q6. How did you get to know about Takhleeq Cohort 11 Incubation Program?', type: 'select', required: true, options: ['Email', 'Takhleeq Socials', 'UCP Socials', 'Dean/hod/faculty email or word', 'Digital display across ucp (tv screens etc)'] },
        { id: 'field_q7_stage', label: 'Q7. What stage is your startup currently at?', type: 'select', required: true, options: ['Idea stage', 'Problem Discovery / validation', 'Proof of Concept / MVP', 'Post Revenue', 'Scale'] },
        { id: 'field_q8_team_size', label: 'Q8. Number of members in Team', type: 'select', required: true, options: ['Solo', '2', '3', '4'] },
        { id: 'field_founder_name', label: 'Q9. Team lead name', type: 'text', required: true, placeholder: 'Enter full name of the team lead' },
        { id: 'field_q10_father_name', label: "Q10. Team Lead Father's Name", type: 'text', required: true, placeholder: "Enter father's name" },
        { id: 'field_q11_gender', label: "Q11. Team Lead's Gender", type: 'select', required: true, options: ['Male', 'Female'] },
        { id: 'field_founder_email', label: "Q12. Team Lead's Email", type: 'email', required: true, placeholder: 'Enter email address' },
        { id: 'field_founder_phone', label: "Q13. Team Lead's Contact Number", type: 'phone', required: true, placeholder: 'e.g. 0300-1234567' },
        { id: 'field_q14_roll_number', label: "Q14. Team Lead's Roll Number", type: 'text', required: false, placeholder: 'Enter student roll number if applicable' },
        { id: 'field_founder_cnic', label: "Q15. Team Lead's CNIC/Passport Number", type: 'cnic', required: true, placeholder: 'e.g. 35201-1234567-1' },
        { id: 'field_q16_location', label: "Q16. Team Lead's Location", type: 'text', required: true, placeholder: 'e.g. Lahore, Pakistan' },
        { id: 'field_q17_postal_address', label: "Q17. Team Lead's Postal Address", type: 'text', required: true, placeholder: 'Enter full home/postal address' },
        { id: 'field_q18_team_role', label: 'Q18. Team Lead: Role in the Team', type: 'text', required: true, placeholder: 'e.g. Founder & CEO, Chief Technology Officer' },
        { id: 'field_q19_skillset', label: 'Q19. Team Lead: How does your skillset contribute to this venture?', type: 'textarea', required: true, placeholder: 'Explain technical, business or domain expertise' },
        { id: 'field_q20_linkedin', label: 'Q20. Team Lead: LinkedIn Profile (optional)', type: 'text', required: false, placeholder: 'https://linkedin.com/in/username' },
        { id: 'field_q21_past_projects', label: 'Q21. Team Lead: Have you worked on a project before? If yes, describe briefly.', type: 'textarea', required: false, placeholder: 'Describe previous projects, hackathons or research' },
        { id: 'field_q22_status', label: "Q22. Team Lead: What's your current status?", type: 'select', required: true, options: ['Current Student/Faculty/Staff', 'Alumni Student'] },
        { id: 'field_q23_batch_year', label: "Q23. What is your batch's starting year", type: 'text', required: true, placeholder: 'e.g. 2022' },
        { id: 'field_q24_department', label: 'Q24. Department', type: 'text', required: true, placeholder: 'e.g. Computer Science, Business School' },
        { id: 'field_q25_degree', label: 'Q25. Degree/Position', type: 'text', required: true, placeholder: 'e.g. BS Computer Science, Assistant Professor' },
        { id: 'field_q26_working', label: 'Q26. Are you currently working?', type: 'select', required: true, options: ['Yes', 'No'] },
        { id: 'field_q27_work_details', label: 'Q27. If Yes, Where are you working? Provide Company name and designation.', type: 'text', required: false, placeholder: 'Company name & designation if working' }
      ];
      updated = true;
    }

    if (!db.applicants || !Array.isArray(db.applicants)) {
      db.applicants = [];
      updated = true;
    } else {
      // Migrate existing applicants in memory DB to have valid program_status
      db.applicants.forEach((app: any) => {
        if (!app.program_status || app.program_status === '{}' || typeof app.program_status !== 'string') {
          if (['ACTIVE', 'PAUSED', 'GRADUATED', 'KICKED_OUT'].includes(app.status)) {
            app.program_status = app.status;
            app.status = 'CONFIRMED';
            updated = true;
          } else if (app.status === 'CONFIRMED' || app.status === 'ENROLLED') {
            app.program_status = 'ACTIVE';
            updated = true;
          } else {
            app.program_status = 'NOT_ENROLLED';
            updated = true;
          }
        } else if (!['ACTIVE', 'PAUSED', 'GRADUATED', 'KICKED_OUT', 'NOT_ENROLLED'].includes(app.program_status)) {
          if (app.status === 'CONFIRMED' || app.status === 'ENROLLED') {
            app.program_status = 'ACTIVE';
            updated = true;
          } else {
            app.program_status = 'NOT_ENROLLED';
            updated = true;
          }
        }
      });
    }

    if (!db.cohort_sessions || !Array.isArray(db.cohort_sessions)) {
      db.cohort_sessions = [];
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

    if (!db.cohort_feedback || !Array.isArray(db.cohort_feedback)) {
      db.cohort_feedback = [];
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

    if (db.rooms && Array.isArray(db.rooms)) {
      db.rooms.forEach((r: any) => {
        if (!r.allowed_booking_types) {
          if (r.name === 'Board Room') {
            r.allowed_booking_types = JSON.stringify(['Startup teams', 'Faculty members', 'Department representatives', 'Cohort members', 'Entrepreneurs in residence', 'Professionals in residence', 'Cohort Startup', 'Department']);
          } else {
            r.allowed_booking_types = JSON.stringify(['Student societies', 'Startup teams', 'Faculty members', 'Department representatives', 'Cohort members', 'Entrepreneurs in residence', 'Professionals in residence', 'Meeting / Event', 'Cohort Startup', 'Department']);
          }
          updated = true;
        }
      });
    }

    if (!db.booking_types || !Array.isArray(db.booking_types) || db.booking_types.length === 0) {
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

    if (!db.bookings || !Array.isArray(db.bookings)) {
      db.bookings = [];
      updated = true;
    }

    if (!db.audit_logs || !Array.isArray(db.audit_logs) || db.audit_logs.length === 0) {
      db.audit_logs = [
        {
          id: 1,
          actor_email: 'director@takhleeq.pk',
          action: 'APPROVED_BOOKING',
          target_type: 'BOOKING',
          target_id: 'BK-2026-003',
          details: 'Approved booking request for Cohort 1 Orientation Briefing in Board Room',
          created_at: '2026-07-20T09:00:00.000Z'
        },
        {
          id: 2,
          actor_email: 'manager@takhleeq.pk',
          action: 'APPROVED_BOOKING',
          target_type: 'BOOKING',
          target_id: 'BK-2026-004',
          details: 'Approved Mentor Advisory Session booking in Cube 1',
          created_at: '2026-07-21T09:00:00.000Z'
        },
        {
          id: 3,
          actor_email: 'director@takhleeq.pk',
          action: 'UPDATE_POLICY',
          target_type: 'SETTINGS',
          target_id: '1',
          details: 'Updated local database configuration to offline JSON storage mode',
          created_at: '2026-07-22T05:00:00.000Z'
        }
      ];
      updated = true;
    }

    if (!db.industries || !Array.isArray(db.industries) || db.industries.length === 0) {
      db.industries = [
        { id: 1, name: 'EdTech & Learning', description: 'Educational software and tools' },
        { id: 2, name: 'HealthTech & Bio', description: 'Healthcare, wellness, medical software' },
        { id: 3, name: 'FinTech & Commerce', description: 'Financial tech and e-commerce' },
        { id: 4, name: 'CleanTech & Agri', description: 'Green energy and agricultural tech' },
        { id: 5, name: 'SaaS & Enterprise', description: 'B2B software and productivity tools' },
        { id: 6, name: 'AI & DeepTech', description: 'Artificial Intelligence & Machine Learning' }
      ];
      updated = true;
    }

    if (!db.startup_profiles || !Array.isArray(db.startup_profiles)) {
      db.startup_profiles = [];
      updated = true;
    }

    if (!db.startup_stage_history || !Array.isArray(db.startup_stage_history)) {
      db.startup_stage_history = [];
      updated = true;
    }

    if (!db.startup_pivots || !Array.isArray(db.startup_pivots)) {
      db.startup_pivots = [];
      updated = true;
    }

    if (!db.startup_audit_logs || !Array.isArray(db.startup_audit_logs)) {
      db.startup_audit_logs = [];
      updated = true;
    }

    if (!db.checkins || !Array.isArray(db.checkins)) {
      db.checkins = [];
      updated = true;
    }

    if (!db.checkin_checklist_items || !Array.isArray(db.checkin_checklist_items)) {
      db.checkin_checklist_items = [];
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
      { id: 1, name: 'Administrator', description: 'Full access and policy management capabilities', permissions: ["cohort:dashboard_view", "cohort:settings_manage", "cohort:form_manage", "cohort:applicant_review", "cohort:startups_manage", "cohort:session_manage", "cohort:assignment_manage", "cohort:feedback_view", "cohort:feedback_forms_manage", "cohort:attendance_write", "cohort:checkin_log", "cohort:warning_write", "cohort:profile_write", "cohort:feedback_submit", "cohort:assignment_upload", "SUBMIT_BOOKING", "CANCEL_OWN_BOOKING", "VIEW_PENDING_QUEUE", "APPROVE_REJECT_BOOKINGS", "BOOKING_OVERRIDE", "MANAGE_ROOMS", "MANAGE_BOOKING_TYPES", "VIEW_BOOKING_ANALYTICS", "MANAGE_ROLES", "MANAGE_USERS", "ISSUE_BAN", "VIEW_ANALYTICS_DASHBOARD", "VIEW_AUDIT_LOGS", "EXPORT_AUDIT_LOGS"], ban_duration_ceiling: 'permanent', created_by: null, created_at: new Date().toISOString() },
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
      { id: 1, name: 'Board Room', capacity: 15, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Formal executive meetings and syndicate sessions', policies: 'Authorized UCP societies and startups only. Strictly no external foods allowed. Leave room clean.', allowed_booking_types: JSON.stringify(['Startup teams', 'Faculty members', 'Department representatives', 'Cohort members', 'Entrepreneurs in residence', 'Professionals in residence', 'Cohort Startup', 'Department']), is_active: true, created_at: new Date().toISOString() },
      { id: 2, name: 'Presentation Hall', capacity: 50, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Large cohort presentations, talks, and community panels', policies: 'Pre-approval from Faculty advisor required. Keep setup reset after use.', allowed_booking_types: JSON.stringify(['Student societies', 'Startup teams', 'Faculty members', 'Department representatives', 'Cohort members', 'Entrepreneurs in residence', 'Professionals in residence', 'Meeting / Event', 'Cohort Startup', 'Department']), is_active: true, created_at: new Date().toISOString() },
      { id: 3, name: 'Cube 1', capacity: 6, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 30, max_duration_minutes: 60, purpose: 'Small meetings and focused discussions', policies: 'Leave room clean. No loud noise.', allowed_booking_types: JSON.stringify(['Startup teams', 'Faculty members', 'Cohort members', 'Entrepreneurs in residence', 'Professionals in residence', 'Cohort Startup', 'Student societies']), is_active: true, created_at: new Date().toISOString() },
      { id: 4, name: 'Cube 2', capacity: 6, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 30, max_duration_minutes: 60, purpose: 'Small meetings and focused discussions', policies: 'Leave room clean. No loud noise.', allowed_booking_types: JSON.stringify(['Startup teams', 'Faculty members', 'Cohort members', 'Entrepreneurs in residence', 'Professionals in residence', 'Cohort Startup', 'Student societies']), is_active: true, created_at: new Date().toISOString() },
      { id: 5, name: 'Podcast Room', capacity: 4, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Podcast recording and audio sessions', policies: 'Technical staff assistance must be booked separately.', allowed_booking_types: JSON.stringify(['Student societies', 'Startup teams', 'Faculty members', 'Department representatives', 'Cohort members', 'Entrepreneurs in residence', 'Professionals in residence', 'Cohort Startup']), is_active: true, created_at: new Date().toISOString() }
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
    audit_logs: [],
    applicant_stage_history: []
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
  if (q.includes('cohort_form_settings')) {
    if (q.includes('update')) {
      db.cohort_form_settings = db.cohort_form_settings || { is_active: true, fields: [] };
      db.cohort_form_settings.is_active = Boolean(params[0] === true || params[0] === 'true' || params[0] === 1);
      if (params[1] !== undefined) {
        db.cohort_form_settings.fields = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
      }
      saveLocalDB(db);
      return { rows: [db.cohort_form_settings] };
    }
    if (q.includes('insert into')) {
      db.cohort_form_settings = db.cohort_form_settings || { is_active: true, fields: [] };
      db.cohort_form_settings.is_active = Boolean(params[0] === true || params[0] === 'true' || params[0] === 1);
      if (params[1] !== undefined) {
        db.cohort_form_settings.fields = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
      }
      saveLocalDB(db);
      return { rows: [db.cohort_form_settings] };
    }
    return { rows: db.cohort_form_settings ? [db.cohort_form_settings] : [] };
  }

  // 2. Cohorts Interceptors
  if (q.includes('from cohorts')) {
    if (q.includes('where id =') || q.includes('where c.id =')) {
      let targetId = params && params[0] !== undefined ? parseInt(params[0]) : NaN;
      if (isNaN(targetId)) {
        const match = q.match(/where\s+(?:c\.)?id\s*=\s*(\d+)/);
        if (match) targetId = parseInt(match[1]);
      }
      const found = (db.cohorts || []).find((c: any) => c.id === targetId);
      return { rows: found ? [found] : [] };
    }
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
  if (q.includes('update cohorts set')) {
    if (q.includes('set status =') && !q.includes('name =')) {
      const status = params[0];
      const id = parseInt(params[1]);
      const c = (db.cohorts || []).find((x: any) => x.id === id);
      if (c) {
        c.status = status;
        c.updated_at = new Date().toISOString();
        saveLocalDB(db);
      }
      return { rows: c ? [c] : [] };
    }
    // Full cohort settings update:
    // UPDATE cohorts SET name = $1, intake_year = $2, start_date = $3, end_date = $4, max_capacity = $5, assigned_manager_id = $6, assigned_manager_name = $7, status = $8, description = $9 WHERE id = $10
    const id = parseInt(params[params.length - 1]);
    const c = (db.cohorts || []).find((x: any) => x.id === id);
    if (c) {
      if (params[0] !== undefined) c.name = params[0];
      if (params[1] !== undefined) c.intake_year = params[1];
      if (params[2] !== undefined) c.start_date = params[2];
      if (params[3] !== undefined) c.end_date = params[3];
      if (params[4] !== undefined) c.max_capacity = parseInt(params[4]) || 20;
      if (params[5] !== undefined) c.assigned_manager_id = params[5];
      if (params[6] !== undefined) c.assigned_manager_name = params[6];
      if (params[7] !== undefined && params[7] !== null) c.status = params[7];
      if (params[8] !== undefined) c.description = params[8];
      c.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: c ? [c] : [] };
  }

  // 3. Applicants Interceptors
  if (q.includes('from applicants') && !q.includes('insert into applicants') && !q.includes('update applicants')) {
    if (q.includes('tracking_token')) {
      const tok = String(params[0] || '').toUpperCase().trim();
      return { rows: (db.applicants || []).filter((a: any) => String(a.tracking_token).toUpperCase().trim() === tok) };
    }
    if (q.includes('where cohort_id =') || q.includes('where a.cohort_id =') || q.includes('cohort_id = $1')) {
      const cid = parseInt(params[0]);
      return { rows: (db.applicants || []).filter((a: any) => a.cohort_id === cid) };
    }
    if (q.includes('where id =') || q.includes('where a.id =') || /\b(a\.)?id\s*=\s*\$1\b/.test(q)) {
      const aid = parseInt(params[0]);
      return { rows: (db.applicants || []).filter((a: any) => a.id === aid) };
    }
    if (q.includes('lower(email) =') || q.includes('email = $1')) {
      const em = String(params[0] || '').toLowerCase().trim();
      return { rows: (db.applicants || []).filter((a: any) => String(a.email || '').toLowerCase().trim() === em) };
    }
    if (q.includes('replace(cnic')) {
      const c = String(params[0] || '').replace(/-/g, '').trim();
      return { rows: (db.applicants || []).filter((a: any) => String(a.cnic || '').replace(/-/g, '').trim() === c) };
    }
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

    let status = 'SUBMITTED';
    let program_status = 'NOT_ENROLLED';
    let panel_scores = null;
    let parent_applicant_id = null;
    let form_data = {};
    let orientation_conducted = false;

    if (q.includes("'submitted'") || q.includes("'not_enrolled'")) {
      status = 'SUBMITTED';
      program_status = 'NOT_ENROLLED';
      parent_applicant_id = params[7] ? parseInt(params[7]) : null;
      form_data = params[8] ? (typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8]) : {};
    } else {
      status = typeof params[7] === 'string' && params[7] !== '{}' ? params[7] : 'SUBMITTED';
      program_status = typeof params[8] === 'string' && params[8] !== '{}' ? params[8] : 'NOT_ENROLLED';
      panel_scores = params[9] ? (typeof params[9] === 'string' ? JSON.parse(params[9]) : params[9]) : null;
      parent_applicant_id = params[10] ? parseInt(params[10]) : null;
      form_data = params[11] ? (typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11]) : {};
      orientation_conducted = params[12] === true || params[12] === 'true';
    }

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
      program_status,
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
      const isAlreadyKicked = app.program_status === 'KICKED_OUT' || app.status === 'KICKED_OUT';
      if (q.includes('founder_password = $1')) {
        app.founder_password = params[0];
      } else if (q.includes('status = $1') && q.includes('program_status = $2') && q.includes('cohort_id = $3')) {
        if (!isAlreadyKicked || params[0] === 'KICKED_OUT') {
          app.status = params[0];
          app.program_status = typeof params[1] === 'string' && params[1] !== '{}' ? params[1] : (['CONFIRMED', 'ENROLLED'].includes(app.status) ? 'ACTIVE' : 'NOT_ENROLLED');
          app.cohort_id = params[2] ? parseInt(params[2]) : null;
        }
      } else if (q.includes('program_status = $1') || q.includes('program_status =')) {
        if (q.includes("'graduated'") || q.includes('graduated')) {
          if (!isAlreadyKicked) app.program_status = 'GRADUATED';
        } else if (q.includes("'kicked_out'") || q.includes('kicked_out')) {
          app.program_status = 'KICKED_OUT';
        } else {
          if (!isAlreadyKicked || params[0] === 'KICKED_OUT') {
            app.program_status = typeof params[0] === 'string' && params[0] !== '{}' ? params[0] : 'NOT_ENROLLED';
          }
        }
      } else if (q.includes('status = $1') && q.includes('cohort_id = $2')) {
        if (!isAlreadyKicked) {
          app.status = params[0];
          app.cohort_id = params[1] ? parseInt(params[1]) : null;
          if (['CONFIRMED', 'ENROLLED'].includes(app.status) && (!app.program_status || app.program_status === '{}' || app.program_status === 'NOT_ENROLLED')) {
            app.program_status = 'ACTIVE';
          }
        }
      } else if (q.includes('status = $1')) {
        if (!isAlreadyKicked || params[0] === 'KICKED_OUT') {
          app.status = params[0];
          if (['CONFIRMED', 'ENROLLED'].includes(app.status) && (!app.program_status || app.program_status === '{}' || app.program_status === 'NOT_ENROLLED')) {
            app.program_status = 'ACTIVE';
          }
        }
      } else if (q.includes('cohort_id = $1')) {
        app.cohort_id = params[0] ? parseInt(params[0]) : null;
      } else if (q.includes('panel_scores = $1')) {
        app.panel_scores = params[0] ? (typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0]) : null;
      } else if (q.includes('orientation_conducted = $1')) {
        app.orientation_conducted = params[0] === true || params[0] === 'true';
      } else if (q.includes('phone = $1') && q.includes('startup_description = $2') && q.includes('form_data = $3')) {
        app.phone = params[0];
        app.startup_description = params[1];
        app.form_data = params[2] ? (typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2]) : app.form_data;
      } else if (q.includes('phone = $1') && q.includes('startup_description = $2')) {
        app.phone = params[0];
        app.startup_description = params[1];
        if (params[2]) {
          app.form_data = typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2];
        }
      } else if (q.includes('phone = $1') && q.includes('form_data = $2')) {
        app.phone = params[0];
        app.form_data = params[1] ? (typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1]) : app.form_data;
      } else if (q.includes('form_data = $1')) {
        app.form_data = params[0] ? (typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0]) : app.form_data;
      } else if (q.includes('stage = $1')) {
        app.stage = params[0];
      } else if (q.includes('startup_name = $1')) {
        app.startup_name = params[0];
      } else if (q.includes('startup_description = $1')) {
        app.startup_description = params[0];
      } else if (q.includes('name = $1')) {
        app.name = params[0];
      } else if (q.includes('phone = $1')) {
        app.phone = params[0];
      } else if (q.includes('cnic = $1')) {
        app.cnic = params[0];
      } else if (q.includes('cohort_id = $1')) {
        app.cohort_id = params[0] ? parseInt(params[0]) : null;
      }

      // Synchronize linked startup_profile
      if (db.startup_profiles && Array.isArray(db.startup_profiles)) {
        let matchingProfile = db.startup_profiles.find((p: any) => p.applicant_id === app.id || (p.startup_name && app.startup_name && p.startup_name.toLowerCase() === app.startup_name.toLowerCase()));
        if (!matchingProfile && (app.status === 'ACCEPTED' || app.program_status === 'ACTIVE' || app.cohort_id)) {
          // Provision startup profile if not already present
          const newId = (db.startup_profiles.reduce((max: number, p: any) => Math.max(max, p.id || 0), 0) || 0) + 1;
          matchingProfile = {
            id: newId,
            applicant_id: app.id,
            startup_name: app.startup_name || 'My Startup',
            description: app.startup_description || '',
            program_status: app.program_status || 'ACTIVE',
            cohort_id: app.cohort_id || null,
            current_progress_stage: app.stage || 'IDEA_STAGE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.startup_profiles.push(matchingProfile);
        }

        if (matchingProfile) {
          if (app.startup_name) matchingProfile.startup_name = app.startup_name;
          if (app.startup_description) matchingProfile.description = app.startup_description;
          if (app.program_status) matchingProfile.program_status = app.program_status;
          if (app.cohort_id) matchingProfile.cohort_id = app.cohort_id;
          if (app.stage) matchingProfile.current_progress_stage = app.stage;
          if (app.phone) matchingProfile.founder_phone = app.phone;

          const pf = app.form_data?.profile || {};
          if (pf.description) matchingProfile.description = pf.description;
          if (pf.website !== undefined && pf.website !== '') matchingProfile.website = pf.website;
          if (pf.revenue_status !== undefined && pf.revenue_status !== '') matchingProfile.revenue_status = pf.revenue_status;
          if (pf.monthly_revenue !== undefined && pf.monthly_revenue !== '') matchingProfile.monthly_revenue = pf.monthly_revenue;
          if (pf.annual_recurring_revenue !== undefined && pf.annual_recurring_revenue !== '') matchingProfile.annual_recurring_revenue = pf.annual_recurring_revenue;
          if (pf.funding_status !== undefined && pf.funding_status !== '') matchingProfile.funding_status = pf.funding_status;
          if (pf.funding_raised !== undefined && pf.funding_raised !== '') matchingProfile.funding_raised = pf.funding_raised;
          if (pf.burn_rate !== undefined && pf.burn_rate !== '') matchingProfile.burn_rate = pf.burn_rate;
          if (pf.team_size !== undefined && pf.team_size !== '') matchingProfile.team_size = parseInt(pf.team_size) || matchingProfile.team_size || 1;
          if (pf.pitch_deck_url !== undefined && pf.pitch_deck_url !== '') matchingProfile.pitch_deck_url = pf.pitch_deck_url;
          if (pf.logo_url !== undefined && pf.logo_url !== '') matchingProfile.logo_url = pf.logo_url;
          if (pf.social_links !== undefined) matchingProfile.social_links = pf.social_links;
          if (pf.contact_info !== undefined) matchingProfile.contact_info = pf.contact_info;

          matchingProfile.updated_at = new Date().toISOString();
        }
      }

      // Synchronize linked user is_active status (Deactivate on KICKED_OUT)
      if (db.users && Array.isArray(db.users) && app.email) {
        const matchingUser = db.users.find((u: any) => u.email && u.email.toLowerCase() === app.email.toLowerCase());
        if (matchingUser) {
          if (app.program_status === 'KICKED_OUT' || app.status === 'KICKED_OUT') {
            matchingUser.is_active = false;
          } else if (app.program_status === 'ACTIVE') {
            matchingUser.is_active = true;
          }
        }
      }

      saveLocalDB(db);
    }
    return { rows: app ? [app] : [] };
  }

  // 4. Cohort Sessions Interceptors
  if (q.includes('cohort_sessions') && !q.includes('from assignments') && !q.includes('assignments a') && !q.includes('delete from assignments') && !q.includes('insert into assignments')) {
    if (q.includes('update cohort_sessions')) {
      if (q.includes('is_design_thinking_bootcamp')) {
        const isDt = params[0] === true || params[0] === 'true' || params[0] === 1;
        const sid = parseInt(params[1]);
        const sess = (db.cohort_sessions || []).find((s: any) => s.id === sid);
        if (sess) {
          sess.is_design_thinking_bootcamp = isDt;
          saveLocalDB(db);
        }
        return { rows: sess ? [sess] : [] };
      }
      const photoUrl = params[0];
      const sid = parseInt(params[1]);
      const sess = (db.cohort_sessions || []).find((s: any) => s.id === sid);
      if (sess) {
        sess.attendance_sheet_photo_url = photoUrl;
        saveLocalDB(db);
      }
      return { rows: sess ? [sess] : [] };
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
        is_design_thinking_bootcamp: params[9] === true || params[9] === 'true' || params[9] === 1 || false,
        attendance_sheet_photo_url: null,
        created_at: new Date().toISOString()
      };
      db.cohort_sessions = db.cohort_sessions || [];
      db.cohort_sessions.push(newSession);
      saveLocalDB(db);
      return { rows: [newSession] };
    }
    if (q.includes('delete from cohort_sessions')) {
      const sid = parseInt(params[0]);
      const idx = (db.cohort_sessions || []).findIndex((s: any) => s.id === sid);
      let deleted = null;
      if (idx !== -1) {
        deleted = db.cohort_sessions.splice(idx, 1)[0];
        saveLocalDB(db);
      }
      return { rows: deleted ? [deleted] : [] };
    }

    let list: any[] = [];
    if (q.includes('date = $1') || (q.includes('mentor_name') && params.length >= 2)) {
      const targetDate = params[0] ? String(params[0]).split('T')[0] : '';
      const targetMentor = params[1] ? String(params[1]).trim().toLowerCase() : '';
      const toMin = (t: string) => {
        if (!t) return 0;
        const [h, m] = String(t).split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const targetStart = params[2] ? toMin(params[2]) : 0;
      const targetEnd = params[3] ? toMin(params[3]) : 1440;

      list = (db.cohort_sessions || []).filter((s: any) => {
        const sDate = s.date ? String(s.date).split('T')[0] : '';
        if (sDate !== targetDate) return false;

        const sMentor = s.mentor_name ? String(s.mentor_name).trim().toLowerCase() : '';
        if (sMentor !== targetMentor) return false;

        if (params.length >= 4) {
          const sStart = toMin(s.start_time);
          const sEnd = toMin(s.end_time);
          return sStart < targetEnd && sEnd > targetStart;
        }
        return true;
      });
    } else if (params.length > 0 && (q.includes('where cohort_id = $1') || q.includes('cohort_id = $1') || q.includes('cohort_id ='))) {
      const cid = parseInt(params[0]);
      list = (db.cohort_sessions || []).filter((s: any) => s.cohort_id === cid);
    } else if (params.length > 0 && (q.includes('where id =') || q.includes('where s.id =') || /\b(s\.)?id\s*=\s*\$1\b/.test(q))) {
      const sid = parseInt(params[0]);
      list = (db.cohort_sessions || []).filter((s: any) => s.id === sid);
    } else {
      list = db.cohort_sessions || [];
    }

    const enriched = list.map((sess: any) => {
      const totalStartups = (db.applicants || []).filter((a: any) => a.cohort_id === sess.cohort_id || a.status === 'CONFIRMED').length || 8;
      const attRecords = (db.session_attendance || []).filter((att: any) => att.session_id === sess.id);
      let attendance_summary = "Attendance not marked yet";
      if (attRecords.length > 0) {
        const presentCount = attRecords.filter((att: any) => att.status === 'PRESENT').length;
        const totalTarget = totalStartups > 0 ? totalStartups : attRecords.length;
        attendance_summary = `${presentCount} of ${totalTarget} marked present`;
      }

      const asgs = (db.assignments || []).filter((a: any) => a.session_id === sess.id);
      let assignments_summary = "No assignments yet";
      if (asgs.length > 0) {
        const asgIds = asgs.map((a: any) => a.id);
        const subCount = (db.assignment_submissions || []).filter((sub: any) => asgIds.includes(sub.assignment_id)).length;
        assignments_summary = `${asgs.length} assignment${asgs.length > 1 ? 's' : ''} · ${subCount} submission${subCount === 1 ? '' : 's'}`;
      }

      return {
        ...sess,
        attendance_summary,
        assignments_summary
      };
    });

    return { rows: enriched };
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
    const sid = parseInt(params[0]);
    const aid = parseInt(params[1]);
    const st = params[2] || 'not_marked';
    db.session_attendance = db.session_attendance || [];
    let existing = db.session_attendance.find((a: any) => a.session_id === sid && a.applicant_id === aid);
    if (existing) {
      existing.status = st;
      existing.marked_at = new Date().toISOString();
      saveLocalDB(db);
      return { rows: [existing] };
    } else {
      const id = Math.max(...db.session_attendance.map((a: any) => a.id), 0) + 1;
      const newAtt = {
        id,
        session_id: sid,
        applicant_id: aid,
        status: st,
        marked_at: new Date().toISOString()
      };
      db.session_attendance.push(newAtt);
      saveLocalDB(db);
      return { rows: [newAtt] };
    }
  }

  // 5b. Assignments Interceptors
  if (q.includes('delete from assignments')) {
    const aid = parseInt(params[0]);
    const idx = (db.assignments || []).findIndex((a: any) => a.id === aid);
    let deleted = null;
    if (idx !== -1) {
      deleted = db.assignments.splice(idx, 1)[0];
    }
    db.assignment_submissions = (db.assignment_submissions || []).filter((s: any) => s.assignment_id !== aid);

    // Deep clean from applicants and startup profiles to avoid any resurrection
    if (db.applicants && Array.isArray(db.applicants)) {
      db.applicants.forEach((app: any) => {
        if (app.form_data) {
          const fd = typeof app.form_data === 'string' ? JSON.parse(app.form_data) : app.form_data;
          if (fd.profile && Array.isArray(fd.profile.assignments)) {
            fd.profile.assignments = fd.profile.assignments.filter((pa: any) => 
              String(pa.id) !== String(aid) && 
              (!deleted || !deleted.title || !pa.title || pa.title.toLowerCase().trim() !== deleted.title.toLowerCase().trim())
            );
            app.form_data = fd;
          }
        }
      });
    }

    if (db.startup_profiles && Array.isArray(db.startup_profiles)) {
      db.startup_profiles.forEach((sp: any) => {
        if (sp.assignments && Array.isArray(sp.assignments)) {
          sp.assignments = sp.assignments.filter((pa: any) => 
            String(pa.id) !== String(aid) && 
            (!deleted || !deleted.title || !pa.title || pa.title.toLowerCase().trim() !== deleted.title.toLowerCase().trim())
          );
        }
      });
    }

    saveLocalDB(db);
    return { rows: deleted ? [deleted] : [] };
  }

  if (q.includes('insert into assignments')) {
    db.assignments = db.assignments || [];
    const id = Math.max(...db.assignments.map((a: any) => a.id), 0) + 1;
    let cohort_id: number | null = 1;
    let session_id: number | null = null;
    let title = '';
    let description: string | null = null;
    let due_date = '';
    let attachment_url: string | null = null;
    let created_by_user_id: number | null = null;

    if (q.includes('(cohort_id, session_id')) {
      cohort_id = (params[0] !== undefined && params[0] !== null && !isNaN(parseInt(params[0]))) ? parseInt(params[0]) : 1;
      session_id = null;
      title = params[1] || '';
      description = params[2] || null;
      due_date = params[3] || '';
      attachment_url = params[4] || null;
      created_by_user_id = params[5] ? parseInt(params[5]) : null;
    } else if (q.includes('(session_id, cohort_id')) {
      session_id = (params[0] !== undefined && params[0] !== null && !isNaN(parseInt(params[0]))) ? parseInt(params[0]) : null;
      cohort_id = (params[1] !== undefined && params[1] !== null && !isNaN(parseInt(params[1]))) ? parseInt(params[1]) : 1;
      title = params[2] || '';
      description = params[3] || null;
      due_date = params[4] || '';
      attachment_url = params[5] || null;
      created_by_user_id = params[6] ? parseInt(params[6]) : null;
    } else {
      title = params[0] || '';
      due_date = params[1] || '';
    }

    const newAsg = {
      id,
      cohort_id,
      session_id,
      title,
      description,
      due_date,
      attachment_url,
      created_by_user_id,
      created_at: new Date().toISOString()
    };
    db.assignments.push(newAsg);
    saveLocalDB(db);
    return { rows: [newAsg] };
  }

  if (q.includes('session_id = $1') || q.includes('a.session_id = $1')) {
    const sid = parseInt(params[0]);
    const list = (db.assignments || []).filter((a: any) => a.session_id === sid).map((asg: any) => {
      const sub_count = (db.assignment_submissions || []).filter((s: any) => s.assignment_id === asg.id).length;
      return { ...asg, sub_count };
    });
    return { rows: list };
  }

  if (q.includes('session_id is null') || q.includes('a.session_id is null')) {
    db.assignments = db.assignments || [];
    const targetCohortId = (params && params[0] !== undefined && params[0] !== null && !isNaN(parseInt(params[0]))) ? parseInt(params[0]) : null;
    let list = db.assignments.filter((a: any) => !a.session_id);
    if (targetCohortId !== null) {
      list = list.filter((a: any) => {
        const cId = a.cohort_id ? parseInt(a.cohort_id) : null;
        return cId === targetCohortId || cId === null;
      });
    }
    list = list.map((a: any) => ({ ...a, session_title: null }));
    return { rows: list };
  }

  if (q.includes('select * from assignments where id = $1')) {
    const aid = parseInt(params[0]);
    const found = (db.assignments || []).find((a: any) => a.id === aid);
    return { rows: found ? [found] : [] };
  }

  if (q.includes('select') && q.includes('assignments')) {
    db.assignments = db.assignments || [];
    const targetCohortId = (params && params[0] !== undefined && params[0] !== null && !isNaN(parseInt(params[0]))) ? parseInt(params[0]) : null;
    let list = db.assignments.map((asg: any) => {
      let session_title = null;
      if (asg.session_id) {
        const sess = (db.cohort_sessions || []).find((s: any) => s.id === asg.session_id);
        if (sess) session_title = sess.title;
      }
      return { ...asg, session_title };
    });

    if (q.includes('session_id is null') || q.includes('a.session_id is null')) {
      list = list.filter((a: any) => !a.session_id);
    }

    if (targetCohortId !== null) {
      list = list.filter((a: any) => {
        const cId = a.cohort_id ? parseInt(a.cohort_id) : null;
        return cId === targetCohortId || cId === null;
      });
    }

    return { rows: list };
  }

  if (q.includes('update assignments set')) {
    db.assignments = db.assignments || [];
    const asgId = parseInt(params[3]);
    const found = db.assignments.find((a: any) => a.id === asgId);
    if (found) {
      found.title = params[0];
      found.description = params[1];
      found.due_date = params[2];
      saveLocalDB(db);
      return { rows: [found] };
    }
    return { rows: [] };
  }

  // 5c. Assignment Submissions Interceptors
  if (q.includes('assignment_submissions')) {
    if (q.includes('delete from assignment_submissions')) {
      const aid = parseInt(params[0]);
      db.assignment_submissions = (db.assignment_submissions || []).filter((s: any) => s.assignment_id !== aid);
      saveLocalDB(db);
      return { rows: [] };
    }
    if (q.includes('insert into assignment_submissions')) {
      db.assignment_submissions = db.assignment_submissions || [];
      const asgId = parseInt(params[0]);
      const appId = parseInt(params[1]);
      const fileUrl = params[2];
      let existing = db.assignment_submissions.find((s: any) => s.assignment_id === asgId && s.applicant_id === appId);
      if (existing) {
        existing.file_url = fileUrl;
        existing.updated_at = new Date().toISOString();
        saveLocalDB(db);
        return { rows: [existing] };
      } else {
        const id = Math.max(...db.assignment_submissions.map((s: any) => s.id), 0) + 1;
        const newSub = {
          id,
          assignment_id: asgId,
          applicant_id: appId,
          file_url: fileUrl,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.assignment_submissions.push(newSub);
        saveLocalDB(db);
        return { rows: [newSub] };
      }
    }
    if (q.includes('count')) {
      const aid = parseInt(params[0]);
      const count = (db.assignment_submissions || []).filter((s: any) => s.assignment_id === aid).length;
      return { rows: [{ count: count.toString() }] };
    }
    if (params.length >= 2 && q.includes('applicant_id = $2')) {
      const asgId = parseInt(params[0]);
      const appId = parseInt(params[1]);
      const found = (db.assignment_submissions || []).find((s: any) => s.assignment_id === asgId && s.applicant_id === appId);
      return { rows: found ? [found] : [] };
    }
    const aid = parseInt(params[0]);
    return { rows: (db.assignment_submissions || []).filter((s: any) => s.assignment_id === aid) };
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

  // 7b. Cohort Feedback Interceptors
  if (q.includes('from cohort_feedback') || q.includes('select * from cohort_feedback') || q.includes('select rating from cohort_feedback')) {
    db.cohort_feedback = db.cohort_feedback || [];
    let list = [...db.cohort_feedback];
    if (q.includes('cohort_id = $1') || q.includes('cohort_id = $2')) {
      const cIndex = q.indexOf('cohort_id = $1') !== -1 ? 0 : 1;
      const cid = parseInt(params[cIndex]);
      if (cid) list = list.filter((f: any) => f.cohort_id === cid);
    }
    if (q.includes('session_id = $1') || q.includes('session_id = $2')) {
      const sIndex = q.indexOf('session_id = $1') !== -1 ? 0 : 1;
      const sid = parseInt(params[sIndex]);
      if (sid) list = list.filter((f: any) => f.session_id === sid);
    }
    if (q.includes('applicant_id = $2') || q.includes('applicant_id = $1')) {
      const aIndex = q.indexOf('applicant_id = $2') !== -1 ? 1 : 0;
      const aid = parseInt(params[aIndex]);
      if (aid) list = list.filter((f: any) => f.applicant_id === aid);
    }
    if (q.includes('feedback_type = $')) {
      const fType = params.find((p: any) => typeof p === 'string' && ['SESSION', 'PROGRAM', 'MENTORSHIP', 'FACILITY', 'CURRICULUM', 'OTHER'].includes(p));
      if (fType) list = list.filter((f: any) => f.feedback_type === fType);
    }
    const processed = list.map((f: any) => {
      const isAnon = f.is_anonymous === true || f.is_anonymous === 'true';
      if (isAnon) {
        return {
          ...f,
          founder_name: 'Anonymous Founder',
          startup_name: 'Anonymous Startup',
          user_id: null,
          applicant_id: null
        };
      }
      return f;
    });
    processed.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows: processed };
  }

  if (q.includes('delete from cohort_feedback')) {
    db.cohort_feedback = db.cohort_feedback || [];
    if (q.includes('where id = $1')) {
      const targetId = parseInt(params[0]);
      db.cohort_feedback = db.cohort_feedback.filter((f: any) => f.id !== targetId);
    } else if (q.includes('where session_id = $1')) {
      const sid = parseInt(params[0]);
      db.cohort_feedback = db.cohort_feedback.filter((f: any) => f.session_id !== sid);
    }
    saveLocalDB(db);
    return { rows: [] };
  }

  if (q.includes('insert into cohort_feedback')) {
    db.cohort_feedback = db.cohort_feedback || [];
    const id = Math.max(...db.cohort_feedback.map((f: any) => f.id || 0), 0) + 1;
    const isAnonBool = params[10] === true || params[10] === 'true';
    const newFeedback = {
      id,
      cohort_id: params[0] ? parseInt(params[0]) : null,
      session_id: params[1] ? parseInt(params[1]) : null,
      user_id: params[2] ? parseInt(params[2]) : null,
      applicant_id: params[3] ? parseInt(params[3]) : null,
      founder_name: isAnonBool ? 'Anonymous Founder' : (params[4] || 'Cohort Founder'),
      startup_name: isAnonBool ? 'Anonymous Startup' : (params[5] || 'Cohort Startup'),
      feedback_type: params[6] || 'PROGRAM',
      rating: parseInt(params[7]) || 5,
      title: params[8] || '',
      comment: params[9] || '',
      is_anonymous: isAnonBool,
      status: 'SUBMITTED',
      staff_response: null,
      created_at: new Date().toISOString()
    };
    db.cohort_feedback.push(newFeedback);
    saveLocalDB(db);
    return { rows: [newFeedback] };
  }

  if (q.includes('update cohort_feedback set')) {
    db.cohort_feedback = db.cohort_feedback || [];
    const idVal = parseInt(params[params.length - 1]);
    const item = db.cohort_feedback.find((f: any) => f.id === idVal);
    if (item) {
      if (q.includes('rating = $1')) {
        item.rating = parseInt(params[0]) || 5;
        item.title = params[1] || item.title;
        item.comment = params[2] || item.comment;
        item.is_anonymous = params[3] === true || params[3] === 'true';
        if (item.is_anonymous) {
          item.founder_name = 'Anonymous Founder';
          item.startup_name = 'Anonymous Startup';
        } else {
          item.founder_name = params[4] || item.founder_name;
          item.startup_name = params[5] || item.startup_name;
        }
        item.status = 'SUBMITTED';
      }
      if (q.includes('status = $1')) item.status = params[0];
      if (q.includes('staff_response = $2')) item.staff_response = params[1];
      saveLocalDB(db);
    }
    return { rows: item ? [item] : [] };
  }

  // 7c. Generalized Feedback Forms Interceptors
  if (q.includes('insert into feedback_forms')) {
    db.feedback_forms = db.feedback_forms || [];
    const id = Math.max(...db.feedback_forms.map((f: any) => f.id || 0), 0) + 1;
    const isAnon = params[3] === true || params[3] === 'true';
    const newForm = {
      id,
      cohort_id: parseInt(params[0]) || 1,
      title: params[1] || 'Feedback Survey',
      description: params[2] || '',
      is_anonymous: isAnon,
      created_by: params[4] ? parseInt(params[4]) : null,
      expiry_date: params[5] || null,
      status: params[6] || 'Active',
      session_id: params[7] ? parseInt(params[7]) : null,
      created_at: new Date().toISOString()
    };
    db.feedback_forms.push(newForm);
    saveLocalDB(db);
    return { rows: [newForm] };
  }

  if (q.includes('update feedback_forms')) {
    db.feedback_forms = db.feedback_forms || [];
    const idVal = parseInt(params[params.length - 1]);
    const form = db.feedback_forms.find((f: any) => f.id === idVal);
    if (form) {
      if (q.includes('status = $1')) form.status = params[0];
      if (q.includes('title = $1')) form.title = params[0];
      if (q.includes('description = $2')) form.description = params[1];
      if (q.includes('expiry_date = $3')) form.expiry_date = params[2];
      saveLocalDB(db);
    }
    return { rows: form ? [form] : [] };
  }

  if (q.includes('delete from feedback_forms')) {
    db.feedback_forms = db.feedback_forms || [];
    const formId = parseInt(params[0]);
    db.feedback_forms = db.feedback_forms.filter((f: any) => f.id !== formId);
    if (db.feedback_questions) {
      db.feedback_questions = db.feedback_questions.filter((q: any) => q.feedback_form_id !== formId);
    }
    if (db.feedback_responses) {
      db.feedback_responses = db.feedback_responses.filter((r: any) => r.feedback_form_id !== formId);
    }
    saveLocalDB(db);
    return { rows: [] };
  }

  if (q.includes('from feedback_forms') && !q.includes('insert into') && !q.includes('update') && !q.includes('delete')) {
    db.feedback_forms = db.feedback_forms || [];
    let list = [...db.feedback_forms];
    if (q.includes('where id = $1') || q.includes('where ff.id = $1')) {
      const fid = parseInt(params[0]);
      list = list.filter((f: any) => f.id === fid);
    } else if (q.includes('cohort_id = $1') || q.includes('ff.cohort_id = $1')) {
      const cid = parseInt(params[0]);
      if (cid) list = list.filter((f: any) => f.cohort_id === cid);
    }
    if (q.includes("status = 'Active'") || q.includes("status = $2")) {
      list = list.filter((f: any) => f.status === 'Active');
    }
    // Enrich with session title & creator name if available
    const enriched = list.map((f: any) => {
      let session_title = null;
      if (f.session_id) {
        const s = (db.cohort_sessions || []).find((sess: any) => sess.id === f.session_id);
        if (s) session_title = s.title;
      }
      let created_by_name = 'Incubator Admin';
      if (f.created_by) {
        const u = (db.users || []).find((usr: any) => usr.id === f.created_by);
        if (u) created_by_name = u.name;
      }
      return {
        ...f,
        session_title,
        created_by_name
      };
    });
    enriched.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows: enriched };
  }

  // 7d. Feedback Questions Interceptors
  if (q.includes('insert into feedback_questions')) {
    db.feedback_questions = db.feedback_questions || [];
    const id = Math.max(...db.feedback_questions.map((q: any) => q.id || 0), 0) + 1;
    const newQ = {
      id,
      feedback_form_id: parseInt(params[0]),
      question_text: params[1],
      question_type: params[2],
      question_order: params[3] ? parseInt(params[3]) : 0
    };
    db.feedback_questions.push(newQ);
    saveLocalDB(db);
    return { rows: [newQ] };
  }

  if (q.includes('from feedback_questions') && !q.includes('insert into') && !q.includes('delete')) {
    db.feedback_questions = db.feedback_questions || [];
    let list = [...db.feedback_questions];
    if (q.includes('feedback_form_id = $1')) {
      const fid = parseInt(params[0]);
      list = list.filter((q: any) => q.feedback_form_id === fid);
    }
    list.sort((a: any, b: any) => (a.question_order || 0) - (b.question_order || 0));
    return { rows: list };
  }

  if (q.includes('delete from feedback_questions')) {
    db.feedback_questions = db.feedback_questions || [];
    const fid = parseInt(params[0]);
    db.feedback_questions = db.feedback_questions.filter((q: any) => q.feedback_form_id !== fid);
    saveLocalDB(db);
    return { rows: [] };
  }

  // 7e. Feedback Responses Interceptors
  if (q.includes('insert into feedback_responses')) {
    db.feedback_responses = db.feedback_responses || [];
    const id = Math.max(...db.feedback_responses.map((r: any) => r.id || 0), 0) + 1;
    const newResp = {
      id,
      feedback_form_id: parseInt(params[0]),
      question_id: parseInt(params[1]),
      startup_id: parseInt(params[2]),
      user_id: params[3] ? parseInt(params[3]) : null,
      answer_value: String(params[4] || ''),
      submitted_at: new Date().toISOString()
    };
    db.feedback_responses.push(newResp);
    saveLocalDB(db);
    return { rows: [newResp] };
  }

  if (q.includes('delete from feedback_responses')) {
    db.feedback_responses = db.feedback_responses || [];
    const fid = parseInt(params[0]);
    const sid = parseInt(params[1]);
    db.feedback_responses = db.feedback_responses.filter((r: any) => !(r.feedback_form_id === fid && r.startup_id === sid));
    saveLocalDB(db);
    return { rows: [] };
  }

  if (q.includes('from feedback_responses') && !q.includes('insert into') && !q.includes('delete')) {
    db.feedback_responses = db.feedback_responses || [];
    let list = [...db.feedback_responses];
    if (q.includes('feedback_form_id = $1')) {
      const fid = parseInt(params[0]);
      list = list.filter((r: any) => r.feedback_form_id === fid);
    }
    if (q.includes('startup_id = $2') || q.includes('startup_id = $1')) {
      const sid = parseInt(params[q.includes('startup_id = $2') ? 1 : 0]);
      const uid = params[2] ? parseInt(params[2]) : null;
      if (sid) {
        list = list.filter((r: any) => r.startup_id === sid || (uid && r.user_id === uid));
      }
    }
    return { rows: list };
  }


  // 8. 1-on-1 Check-ins Interceptors
  if (q.includes('from checkins') && !q.includes('insert into checkins') && !q.includes('update checkins') && !q.includes('delete from checkins')) {
    db.checkins = db.checkins || [];
    let list = [...db.checkins];

    if (q.includes('where c.id = $1') || q.includes('where id = $1')) {
      const chkId = parseInt(params[0]);
      list = list.filter((c: any) => c.id === chkId);
    } else if (q.includes('where c.startup_profile_id = $1') || q.includes('where startup_profile_id = $1')) {
      const spId = parseInt(params[0]);
      list = list.filter((c: any) => c.startup_profile_id === spId);
      if (q.includes('id != $2')) {
        const excludeId = parseInt(params[1]);
        list = list.filter((c: any) => c.id !== excludeId);
      }
    } else if (q.includes('where c.cohort_id = $1') || q.includes('where cohort_id = $1')) {
      const cid = parseInt(params[0]);
      list = list.filter((c: any) => c.cohort_id === cid);
    }

    // Sort by scheduled_at / created_at DESC if requested
    list.sort((a: any, b: any) => new Date(b.scheduled_at || b.created_at).getTime() - new Date(a.scheduled_at || a.created_at).getTime());

    if (q.includes('limit 1')) {
      list = list.slice(0, 1);
    }

    // Enrich with startup_name & cohort_name
    const enriched = list.map((c: any) => {
      let startup_name = 'Unknown Startup';
      let applicant_id = null;
      let founder_name = '';
      let founder_email = '';

      const sp = (db.startup_profiles || []).find((s: any) => s.id === c.startup_profile_id);
      if (sp) {
        startup_name = sp.startup_name;
        applicant_id = sp.applicant_id;
        const app = (db.applicants || []).find((a: any) => a.id === sp.applicant_id);
        if (app) {
          founder_name = app.name;
          founder_email = app.email;
        }
      }

      let cohort_name = 'Unassigned Cohort';
      const ch = (db.cohorts || []).find((x: any) => x.id === c.cohort_id);
      if (ch) cohort_name = ch.name;

      return {
        ...c,
        startup_name,
        applicant_id,
        founder_name,
        founder_email,
        cohort_name
      };
    });

    return { rows: enriched };
  }

  if (q.includes('insert into checkins')) {
    db.checkins = db.checkins || [];
    const id = Math.max(...db.checkins.map((c: any) => c.id), 0) + 1;
    const newCheckin = {
      id,
      startup_profile_id: parseInt(params[0]),
      cohort_id: parseInt(params[1]),
      scheduled_at: params[2] || new Date().toISOString(),
      notes: params[3] || null,
      attendance_status: params[4] || 'unmarked',
      created_by_user_id: params[5] ? parseInt(params[5]) : null,
      created_by_email: params[6] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.checkins.push(newCheckin);
    saveLocalDB(db);
    return { rows: [newCheckin] };
  }

  if (q.includes('update checkins set')) {
    const chkId = parseInt(params[params.length - 1]);
    const chk = (db.checkins || []).find((c: any) => c.id === chkId);
    if (chk) {
      chk.notes = params[0] !== undefined ? params[0] : chk.notes;
      chk.attendance_status = params[1] || chk.attendance_status;
      chk.scheduled_at = params[2] || chk.scheduled_at;
      chk.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: chk ? [chk] : [] };
  }

  if (q.includes('delete from checkins where id = $1')) {
    const chkId = parseInt(params[0]);
    db.checkins = (db.checkins || []).filter((c: any) => c.id !== chkId);
    db.checkin_checklist_items = (db.checkin_checklist_items || []).filter((i: any) => i.checkin_id !== chkId);
    saveLocalDB(db);
    return { rows: [] };
  }

  // 9. Checkin Checklist Items Interceptors
  if (q.includes('from checkin_checklist_items') && !q.includes('insert into') && !q.includes('update') && !q.includes('delete')) {
    db.checkin_checklist_items = db.checkin_checklist_items || [];
    let list = [...db.checkin_checklist_items];
    if (q.includes('where checkin_id = $1')) {
      const chkId = parseInt(params[0]);
      list = list.filter((i: any) => i.checkin_id === chkId);
      if (q.includes('is_completed = false')) {
        list = list.filter((i: any) => !i.is_completed);
      }
    } else if (q.includes('where id = $1')) {
      const itemId = parseInt(params[0]);
      list = list.filter((i: any) => i.id === itemId);
    }
    list.sort((a: any, b: any) => a.id - b.id);
    return { rows: list };
  }

  if (q.includes('insert into checkin_checklist_items')) {
    db.checkin_checklist_items = db.checkin_checklist_items || [];
    const id = Math.max(...db.checkin_checklist_items.map((i: any) => i.id), 0) + 1;
    const chkId = parseInt(params[0]);
    let origId = chkId;
    let desc = '';

    if (params.length === 2) {
      // params = [checkinId, description]
      desc = String(params[1] || '');
    } else if (params.length >= 3) {
      // check if second param is numeric originating_checkin_id
      const p1Num = parseInt(params[1]);
      if (!isNaN(p1Num) && String(params[1]) === String(p1Num)) {
        origId = p1Num;
        desc = String(params[2] || '');
      } else {
        desc = String(params[1] || '');
      }
    }

    const newItem = {
      id,
      checkin_id: chkId,
      originating_checkin_id: origId,
      description: desc,
      is_completed: false,
      created_at: new Date().toISOString()
    };
    db.checkin_checklist_items.push(newItem);
    saveLocalDB(db);
    return { rows: [newItem] };
  }

  if (q.includes('update checkin_checklist_items set')) {
    const itemId = parseInt(params[params.length - 1]);
    const item = (db.checkin_checklist_items || []).find((i: any) => i.id === itemId);
    if (item) {
      if (params[0] !== undefined && params[0] !== null) {
        item.is_completed = params[0] === true || params[0] === 'true';
      }
      if (params[1] !== undefined && params[1] !== null) {
        item.description = params[1];
      }
      saveLocalDB(db);
    }
    return { rows: item ? [item] : [] };
  }

  if (q.includes('delete from checkin_checklist_items')) {
    if (q.includes('where checkin_id = $1')) {
      const chkId = parseInt(params[0]);
      db.checkin_checklist_items = (db.checkin_checklist_items || []).filter((i: any) => i.checkin_id !== chkId);
    } else if (q.includes('where id = $1')) {
      const itemId = parseInt(params[0]);
      db.checkin_checklist_items = (db.checkin_checklist_items || []).filter((i: any) => i.id !== itemId);
    }
    saveLocalDB(db);
    return { rows: [] };
  }

  // --- EXISTING QUERIES BELOW ---

  // 1. SELECT * FROM rooms ORDER BY id ASC
  if (q.includes('select * from rooms') && q.includes('order by id asc')) {
    return { rows: db.rooms };
  }

  // Booking Types local queries
  if (q.includes('select * from booking_types where id = $1')) {
    const id = parseInt(params[0]);
    const list = db.booking_types || [];
    const item = list.find((bt: any) => bt.id === id);
    return { rows: item ? [item] : [] };
  }

  if (q.includes('select id from booking_types where lower(name) = lower($1) and id <> $2')) {
    const name = String(params[0] || '').toLowerCase();
    const id = parseInt(params[1]);
    const list = db.booking_types || [];
    const found = list.filter((bt: any) => bt.name.toLowerCase() === name && bt.id !== id);
    return { rows: found.map((bt: any) => ({ id: bt.id })) };
  }

  if (q.includes('select id from booking_types where lower(name) = lower($1)')) {
    const name = String(params[0] || '').toLowerCase();
    const list = db.booking_types || [];
    const found = list.filter((bt: any) => bt.name.toLowerCase() === name);
    return { rows: found.map((bt: any) => ({ id: bt.id })) };
  }

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

  // SELECT * FROM rooms WHERE LOWER(name) = LOWER($1) OR id = $2
  if (q.includes('from rooms') && q.includes('lower(name) = lower($1) or id = $2')) {
    const nameVal = String(params[0] || '').toLowerCase();
    const idVal = parseInt(params[1]);
    const found = db.rooms.filter((r: any) => r.name.toLowerCase() === nameVal || r.id === idVal || String(r.id) === String(params[0]));
    console.log(`[DB ROOM LOOKUP] q="${q}" params=`, params, `found=`, found);
    return { rows: found };
  }

  // SELECT id FROM rooms WHERE name = $1 OR id = $2
  if (q.includes('from rooms') && q.includes('name = $1 or id = $2')) {
    const nameVal = String(params[0] || '').toLowerCase();
    const idVal = parseInt(params[1]);
    const found = db.rooms.filter((r: any) => r.name.toLowerCase() === nameVal || r.id === idVal || String(r.id) === String(params[0]));
    return { rows: found.map((r: any) => ({ id: r.id })) };
  }

  // 3. SELECT * FROM rooms WHERE id = $1
  if (q.includes('select * from rooms where id = $1')) {
    const id = parseInt(params[0]);
    const found = db.rooms.filter((r: any) => r.id === id);
    return { rows: found };
  }

  // 4. SELECT * FROM ban_records WHERE LOWER(email) = $1 AND is_active = TRUE
  if (q.includes('select * from ban_records') && q.includes('is_active = true') && (q.includes('lower(email) = $1') || q.includes('lower(email) = lower($1)'))) {
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
  if (q.includes('select b.*, r.name as room_name') && q.includes("b.status = 'pending_review'")) {
    const list = db.bookings
      .filter((b: any) => b.status === 'PENDING_REVIEW')
      .map((b: any) => {
        const room = db.rooms.find((r: any) => r.id === b.room_id);
        return {
          ...b,
          room_name: room ? room.name : ''
        };
      });
    return { rows: list };
  }

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

  // 15b. SELECT b.*, r.name as room_name, r.id as room_id FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.date = $1 AND (b.status = 'APPROVED' OR b.status = 'approved') AND r.is_active = TRUE ORDER BY b.start_time ASC
  if (q.includes('select b.*, r.name as room_name') && (q.includes('b.date = $1') || q.includes('where b.date = $1'))) {
    const targetDate = params[0];
    const list = db.bookings
      .filter((b: any) => {
        const room = db.rooms.find((r: any) => r.id === b.room_id);
        const isRoomActive = room ? (room.is_active !== false) : true;
        const isApproved = ['APPROVED', 'approved'].includes(b.status);
        return b.date === targetDate && isApproved && isRoomActive;
      })
      .map((b: any) => {
        const room = db.rooms.find((r: any) => r.id === b.room_id);
        return {
          ...b,
          room_name: room ? room.name : '',
          room_id: b.room_id
        };
      })
      .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
    return { rows: list };
  }

  // 15c. SELECT b.*, r.name as room_name, r.id as room_id FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.date > $1 AND (b.status = 'APPROVED' OR b.status = 'approved') AND r.is_active = TRUE ORDER BY b.date ASC, b.start_time ASC
  if (q.includes('select b.*, r.name as room_name') && (q.includes('b.date > $1') || q.includes('where b.date > $1'))) {
    const targetDate = params[0];
    const list = db.bookings
      .filter((b: any) => {
        const room = db.rooms.find((r: any) => r.id === b.room_id);
        const isRoomActive = room ? (room.is_active !== false) : true;
        const isApproved = ['APPROVED', 'approved'].includes(b.status);
        return b.date > targetDate && isApproved && isRoomActive;
      })
      .map((b: any) => {
        const room = db.rooms.find((r: any) => r.id === b.room_id);
        return {
          ...b,
          room_name: room ? room.name : '',
          room_id: b.room_id
        };
      })
      .sort((a: any, b: any) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
    return { rows: list };
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

  // 24b. SELECT * FROM applicant_stage_history WHERE applicant_id = $1 ORDER BY change_date DESC
  if (q.includes('from applicant_stage_history') && q.includes('applicant_id = $1')) {
    const applicantId = parseInt(params[0]);
    if (!db.applicant_stage_history) db.applicant_stage_history = [];
    const list = db.applicant_stage_history
      .filter((h: any) => h.applicant_id === applicantId)
      .sort((a: any, b: any) => new Date(b.change_date || 0).getTime() - new Date(a.change_date || 0).getTime());
    return { rows: list };
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

  // 27. SELECT u.id, u.email... FROM users u... WHERE LOWER(u.email) = $1
  if ((q.includes('from users u') || q.includes('from users')) && (q.includes('lower(u.email) = $1') || q.includes('lower(u.email) = lower($1)') || q.includes('lower(email) = $1'))) {
    const email = String(params[0] || '').toLowerCase();
    const users = getUsersWithRoles(db);
    const found = users.filter((u: any) => u.email.toLowerCase() === email);
    return { rows: found };
  }

  // 28. SELECT u.id, u.email... FROM users u... WHERE u.id = $1
  if (q.includes('from users u') && q.includes('u.id = $1')) {
    const id = parseInt(params[0]);
    const users = getUsersWithRoles(db);
    const found = users.filter((u: any) => u.id === id);
    return { rows: found };
  }

  // 29. SELECT u.id, u.email, u.full_name, u.is_active, u.last_login... ORDER BY u.id ASC
  if (q.includes('from users u') && q.includes('order by u.id asc')) {
    const users = getUsersWithRoles(db);
    return { rows: users.sort((a: any, b: any) => a.id - b.id) };
  }

  // 30. INSERT INTO users
  if (q.includes('insert into users') && (q.includes('returning id') || q.includes('returning *'))) {
    let email = null;
    let full_name = null;
    let password = null;
    let microsoft_id = null;

    if (q.includes('microsoft_id')) {
      // Form: INSERT INTO users (microsoft_id, email, full_name, ...) VALUES ($1, $2, $3, ...)
      microsoft_id = params[0];
      email = params[1];
      full_name = params[2];
    } else if (q.includes('password') || (params.length === 3 && typeof params[2] === 'string')) {
      // Form: INSERT INTO users (email, full_name, is_active, password) VALUES ($1, $2, TRUE, $3)
      email = params[0];
      full_name = params[1];
      password = params[2];
    } else {
      // Form: INSERT INTO users (email, full_name, is_active) VALUES ($1, $2, TRUE)
      email = params[0];
      full_name = params[1];
    }

    // Check if user already exists in db.users
    let existingUser = db.users.find((u: any) => u.email.toLowerCase() === String(email).toLowerCase());
    if (existingUser) {
      if (password) existingUser.password = password;
      if (microsoft_id && !existingUser.microsoft_id) existingUser.microsoft_id = microsoft_id;
      saveLocalDB(db);
      return { rows: [{ id: existingUser.id }] };
    }

    const id = Math.max(...db.users.map((u: any) => u.id), 0) + 1;
    const newUser = {
      id,
      microsoft_id,
      email,
      full_name,
      password,
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

  // 31b. SELECT * FROM user_roles
  if (q.includes('select * from user_roles')) {
    const userId = parseInt(params[0]);
    const roleId = params[1] ? parseInt(params[1]) : null;
    let list = (db.user_roles || []).filter((ur: any) => ur.user_id === userId);
    if (roleId) {
      list = list.filter((ur: any) => ur.role_id === roleId);
    }
    return { rows: list };
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

  // 33. UPDATE users SET password = $1... WHERE id = $2 OR UPDATE users SET last_login ...
  if (q.includes('update users set password = $1')) {
    const pwd = params[0];
    const id = parseInt(params[1]);
    const user = (db.users || []).find((u: any) => u.id === id);
    if (user) {
      user.password = pwd;
      user.is_active = true;
      saveLocalDB(db);
    }
    return { rows: user ? [user] : [] };
  }

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

  // 39a. UPDATE bookings SET status = 'REJECTED_BY_STAFF' ...
  if (q.includes('update bookings') && q.includes("status = 'rejected_by_staff'")) {
    const reason = params[0];
    const id = parseInt(params[1]);
    const booking = db.bookings.find((b: any) => b.id === id);
    if (booking) {
      booking.status = 'REJECTED_BY_STAFF';
      booking.rejection_reason = reason;
      booking.conflict_status = 'NO_CONFLICT';
      booking.conflicting_booking_id = null;
      booking.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: booking ? [booking] : [] };
  }

  // 39b. UPDATE bookings SET status = 'APPROVED' ...
  if (q.includes('update bookings') && q.includes("status = 'approved'") && q.includes('where id = $2')) {
    const approved_by = parseInt(params[0]);
    const id = parseInt(params[1]);
    const booking = db.bookings.find((b: any) => b.id === id);
    if (booking) {
      booking.status = 'APPROVED';
      booking.rejection_reason = null; // Clear rejection reason
      booking.approved_by = approved_by;
      booking.approved_at = new Date().toISOString();
      booking.conflict_status = 'NO_CONFLICT';
      booking.conflicting_booking_id = null;
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

  // 41. UPDATE bookings SET override fields (where id = $11) ...
  if (q.includes('update bookings') && q.includes('where id = $11')) {
    const targetRoomId = parseInt(params[0]);
    const cleanDate = params[1];
    const cleanStart = params[2];
    const cleanEnd = params[3];
    const statusVal = params[4];
    const approvedByVal = params[5] ? parseInt(params[5]) : null;
    const approvedAtVal = params[6] ? new Date(params[6]).toISOString() : null;
    const conflictStatus = params[7];
    const conflictingBookingId = params[8] ? parseInt(params[8]) : null;
    const rejectionReasonVal = params[9] || null;
    const id = parseInt(params[10]);

    const booking = db.bookings.find((b: any) => b.id === id);
    if (booking) {
      booking.room_id = targetRoomId;
      booking.date = cleanDate;
      booking.start_time = cleanStart;
      booking.end_time = cleanEnd;
      booking.status = statusVal;
      booking.approved_by = approvedByVal;
      booking.approved_at = approvedAtVal;
      booking.conflict_status = conflictStatus;
      booking.conflicting_booking_id = conflictingBookingId;
      booking.rejection_reason = rejectionReasonVal;
      booking.updated_at = new Date().toISOString();
      saveLocalDB(db);
    }
    return { rows: booking ? [booking] : [] };
  }

  // 42. UPDATE bookings SET status = 'CANCELLED' ...
  if (q.includes('update bookings') && q.includes("status = 'cancelled'")) {
    const reason = params[0];
    const target = params[1];
    const booking = db.bookings.find((b: any) => b.booking_id === target || b.id === parseInt(target));
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

  // 44b. INSERT INTO applicant_stage_history
  if (q.includes('insert into applicant_stage_history')) {
    if (!db.applicant_stage_history) db.applicant_stage_history = [];
    const id = Math.max(...db.applicant_stage_history.map((h: any) => h.id || 0), 0) + 1;
    const newRecord = {
      id,
      applicant_id: parseInt(params[0]),
      previous_stage: params[1],
      new_stage: params[2],
      updated_by_email: params[3],
      comments: params[4] || null,
      include_in_email: params[5] !== undefined ? Boolean(params[5]) : true,
      change_date: new Date().toISOString()
    };
    db.applicant_stage_history.push(newRecord);
    saveLocalDB(db);
    return { rows: [newRecord] };
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

  // 46. Industries Query Interceptor
  if (q.includes('from industries')) {
    if (!db.industries || !Array.isArray(db.industries) || db.industries.length === 0) {
      db.industries = [
        { id: 1, name: 'EdTech & Learning', description: 'Educational software and tools' },
        { id: 2, name: 'HealthTech & Bio', description: 'Healthcare, wellness, medical software' },
        { id: 3, name: 'FinTech & Commerce', description: 'Financial tech and e-commerce' },
        { id: 4, name: 'CleanTech & Agri', description: 'Green energy and agricultural tech' },
        { id: 5, name: 'SaaS & Enterprise', description: 'B2B software and productivity tools' },
        { id: 6, name: 'AI & DeepTech', description: 'Artificial Intelligence & Machine Learning' }
      ];
      saveLocalDB(db);
    }
    return { rows: db.industries };
  }

  // 47. Startup Profiles Query Interceptor
  if (q.includes('from startup_profiles') && q.includes('select')) {
    if (!db.startup_profiles) db.startup_profiles = [];
    if (q.includes('where sp.id = $1') || q.includes('where id = $1')) {
      const spId = parseInt(params[0]);
      const p = db.startup_profiles.find((x: any) => x.id === spId);
      if (p) {
        const ind = (db.industries || []).find((i: any) => i.id === p.industry_id);
        const coh = (db.cohorts || []).find((c: any) => c.id === p.cohort_id);
        const app = (db.applicants || []).find((a: any) => a.id === p.applicant_id);
        return { rows: [{
          ...p,
          industry_name: ind?.name || 'General Tech',
          cohort_name: coh?.name || 'Cohort 1',
          founder_name: app?.name || p.founder_name || 'Founder',
          founder_email: app?.email || p.founder_email || '',
          founder_phone: app?.phone || p.founder_phone || '',
          founder_cnic: app?.cnic || p.founder_cnic || '',
          founder_tracking_token: app?.tracking_token || '',
          founder_password: app?.founder_password || '',
          form_data: app?.form_data || {},
          applicant_status: app?.status || 'ENROLLED',
          applicant_program_status: app?.program_status || p.program_status || 'ACTIVE'
        }] };
      }
      return { rows: [] };
    }
    if (q.includes('where applicant_id = $1') || q.includes('where sp.applicant_id = $1')) {
      const appId = parseInt(params[0]);
      const p = db.startup_profiles.find((x: any) => x.applicant_id === appId);
      if (p) {
        const ind = (db.industries || []).find((i: any) => i.id === p.industry_id);
        const coh = (db.cohorts || []).find((c: any) => c.id === p.cohort_id);
        const app = (db.applicants || []).find((a: any) => a.id === p.applicant_id);
        return { rows: [{
          ...p,
          industry_name: ind?.name || 'General Tech',
          cohort_name: coh?.name || 'Cohort 1',
          founder_name: app?.name || p.founder_name || 'Founder',
          founder_email: app?.email || p.founder_email || '',
          founder_phone: app?.phone || p.founder_phone || '',
          founder_cnic: app?.cnic || p.founder_cnic || '',
          founder_tracking_token: app?.tracking_token || '',
          founder_password: app?.founder_password || '',
          form_data: app?.form_data || {},
          applicant_status: app?.status || 'ENROLLED',
          applicant_program_status: app?.program_status || p.program_status || 'ACTIVE'
        }] };
      }
      return { rows: [] };
    }

    const rows = (db.startup_profiles || []).map((p: any) => {
      const ind = (db.industries || []).find((i: any) => i.id === p.industry_id);
      const coh = (db.cohorts || []).find((c: any) => c.id === p.cohort_id);
      const app = (db.applicants || []).find((a: any) => a.id === p.applicant_id);
      return {
        ...p,
        industry_name: ind?.name || 'General Tech',
        cohort_name: coh?.name || 'Cohort 1',
        founder_name: app?.name || p.founder_name || 'Founder',
        founder_email: app?.email || p.founder_email || '',
        founder_phone: app?.phone || p.founder_phone || '',
        founder_cnic: app?.cnic || p.founder_cnic || '',
        founder_tracking_token: app?.tracking_token || '',
        founder_password: app?.founder_password || '',
        form_data: app?.form_data || {},
        applicant_status: app?.status || 'ENROLLED',
        applicant_program_status: app?.program_status || p.program_status || 'ACTIVE'
      };
    });
    return { rows };
  }

  if (q.includes('insert into startup_profiles')) {
    if (!db.startup_profiles) db.startup_profiles = [];
    const id = Math.max(...db.startup_profiles.map((sp: any) => sp.id || 0), 0) + 1;
    const applicant_id = parseInt(params[0]);
    const startup_name = params[1];
    const industry_id = params[2] ? parseInt(params[2]) : 1;
    const description = params[3];
    const cohort_id = params[4] ? parseInt(params[4]) : 1;

    const newProfile = {
      id,
      applicant_id,
      startup_name,
      industry_id,
      description,
      cohort_id,
      enrollment_date: new Date().toISOString(),
      current_progress_stage: 'IDEA_STAGE',
      program_status: 'ACTIVE',
      team_size: 1,
      revenue_status: 'PRE_REVENUE',
      funding_status: 'BOOTSTRAPPED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.startup_profiles.push(newProfile);
    saveLocalDB(db);
    return { rows: [newProfile] };
  }

  if (q.includes('update startup_profiles')) {
    if (!db.startup_profiles) db.startup_profiles = [];

    // Extract target ID from WHERE clause
    let idVal: number | null = null;
    const whereIdMatch = q.match(/where\s+(?:sp\.)?id\s*=\s*(?:\$(\d+)|(\d+))/i);
    const whereAppIdMatch = q.match(/where\s+(?:sp\.)?applicant_id\s*=\s*(?:\$(\d+)|(\d+))/i);

    if (whereIdMatch) {
      if (whereIdMatch[1]) {
        const pIdx = parseInt(whereIdMatch[1], 10) - 1;
        idVal = parseInt(params[pIdx], 10);
      } else if (whereIdMatch[2]) {
        idVal = parseInt(whereIdMatch[2], 10);
      }
    } else if (whereAppIdMatch) {
      let appIdVal: number | null = null;
      if (whereAppIdMatch[1]) {
        const pIdx = parseInt(whereAppIdMatch[1], 10) - 1;
        appIdVal = parseInt(params[pIdx], 10);
      } else if (whereAppIdMatch[2]) {
        appIdVal = parseInt(whereAppIdMatch[2], 10);
      }
      if (appIdVal) {
        const found = db.startup_profiles.find((p: any) => p.applicant_id === appIdVal);
        if (found) idVal = found.id;
      }
    }

    if (!idVal && params.length > 0) {
      idVal = parseInt(params[params.length - 1], 10);
    }

    let profile = db.startup_profiles.find((p: any) => p.id === idVal);
    if (!profile && idVal) {
      profile = db.startup_profiles.find((p: any) => p.applicant_id === idVal);
    }

    if (profile) {
      const isAlreadyKicked = profile.program_status === 'KICKED_OUT';

      // Parse SET clause (multiline support)
      const setMatch = q.match(/set\s+([\s\S]*?)(?:\s+where|\s*$)/i);
      if (setMatch) {
        const setBody = setMatch[1];
        const assignmentRegex = /([a-z0-9_]+)\s*=\s*(?:COALESCE\s*\(\s*(?:\$(\d+)|'[^']*'|[^,\s)]+)\s*,\s*([a-z0-9_]+|'[^']*'|[^)]+)\s*\)|(\$(\d+))|current_timestamp|now\(\)|'([^']*)'|([^,;]+))/gi;
        let m: RegExpExecArray | null;

        while ((m = assignmentRegex.exec(setBody)) !== null) {
          const col = m[1].toLowerCase().trim();

          if (col === 'updated_at') {
            profile.updated_at = new Date().toISOString();
            continue;
          }

          let val: any;
          if (m[2]) {
            // COALESCE with param
            const pIdx = parseInt(m[2], 10) - 1;
            const paramVal = params[pIdx];
            if (paramVal !== null && paramVal !== undefined) {
              val = paramVal;
            } else {
              val = profile[col];
            }
          } else if (m[4]) {
            // Direct param $X
            const pIdx = parseInt(m[5], 10) - 1;
            val = params[pIdx];
          } else if (m[0].toLowerCase().includes('current_timestamp') || m[0].toLowerCase().includes('now()')) {
            val = new Date().toISOString();
          } else if (m[6] !== undefined) {
            val = m[6];
          } else if (m[7] !== undefined) {
            const raw = m[7].trim();
            val = raw === 'null' ? null : raw === 'true' ? true : raw === 'false' ? false : !isNaN(Number(raw)) ? Number(raw) : raw;
          }

          // Termination lock
          if (col === 'program_status') {
            if (isAlreadyKicked && String(val).toUpperCase() !== 'KICKED_OUT') {
              continue; // locked
            }
            profile.program_status = String(val).toUpperCase();
          } else if (col === 'current_progress_stage') {
            if (isAlreadyKicked) {
              continue; // locked
            }
            profile.current_progress_stage = val;
          } else {
            if (['industry_id', 'cohort_id', 'team_size'].includes(col) && val !== null && val !== undefined && val !== '') {
              const numVal = parseInt(val, 10);
              profile[col] = isNaN(numVal) ? val : numVal;
            } else {
              profile[col] = val;
            }
          }
        }
      }

      profile.updated_at = new Date().toISOString();

      // Synchronize linked applicant in db.applicants
      if (db.applicants && Array.isArray(db.applicants)) {
        const matchingApp = db.applicants.find((a: any) =>
          a.id === profile.applicant_id ||
          (a.startup_name && profile.startup_name && a.startup_name.toLowerCase() === profile.startup_name.toLowerCase())
        );
        if (matchingApp) {
          if (profile.startup_name) matchingApp.startup_name = profile.startup_name;
          if (profile.description) matchingApp.startup_description = profile.description;
          if (profile.program_status) matchingApp.program_status = profile.program_status;
          if (profile.cohort_id) matchingApp.cohort_id = profile.cohort_id;
          if (profile.current_progress_stage) matchingApp.stage = profile.current_progress_stage;
          if (profile.website) matchingApp.website = profile.website;
          if (profile.founder_phone) matchingApp.phone = profile.founder_phone;

          // Keep form_data.profile synchronized
          matchingApp.form_data = matchingApp.form_data || {};
          matchingApp.form_data.profile = matchingApp.form_data.profile || {};
          if (profile.description) matchingApp.form_data.profile.description = profile.description;
          if (profile.website) matchingApp.form_data.profile.website = profile.website;
          if (profile.revenue_status) matchingApp.form_data.profile.revenue_status = profile.revenue_status;
          if (profile.monthly_revenue) matchingApp.form_data.profile.monthly_revenue = profile.monthly_revenue;
          if (profile.annual_recurring_revenue) matchingApp.form_data.profile.annual_recurring_revenue = profile.annual_recurring_revenue;
          if (profile.funding_status) matchingApp.form_data.profile.funding_status = profile.funding_status;
          if (profile.funding_raised) matchingApp.form_data.profile.funding_raised = profile.funding_raised;
          if (profile.burn_rate) matchingApp.form_data.profile.burn_rate = profile.burn_rate;
          if (profile.team_size) matchingApp.form_data.profile.team_size = String(profile.team_size);
          if (profile.pitch_deck_url) matchingApp.form_data.profile.pitch_deck_url = profile.pitch_deck_url;
          if (profile.logo_url) matchingApp.form_data.profile.logo_url = profile.logo_url;
          if (profile.social_links) matchingApp.form_data.profile.social_links = profile.social_links;
          if (profile.contact_info) matchingApp.form_data.profile.contact_info = profile.contact_info;
        }
      }

      // Synchronize linked user is_active status
      if (db.users && Array.isArray(db.users)) {
        const targetEmail = profile.founder_email || (db.applicants?.find((a: any) => a.id === profile.applicant_id)?.email);
        if (targetEmail) {
          const matchingUser = db.users.find((u: any) => u.email && u.email.toLowerCase() === targetEmail.toLowerCase());
          if (matchingUser) {
            if (profile.program_status === 'KICKED_OUT') {
              matchingUser.is_active = false;
            } else if (profile.program_status === 'ACTIVE') {
              matchingUser.is_active = true;
            }
          }
        }
      }

      saveLocalDB(db);
    }
    return { rows: profile ? [profile] : [] };
  }

  // 48. Startup Stage History
  if (q.includes('from startup_stage_history')) {
    if (!db.startup_stage_history) db.startup_stage_history = [];
    if (q.includes('where startup_profile_id = $1')) {
      const spId = parseInt(params[0]);
      return { rows: db.startup_stage_history.filter((h: any) => h.startup_profile_id === spId) };
    }
    return { rows: db.startup_stage_history };
  }
  if (q.includes('insert into startup_stage_history')) {
    if (!db.startup_stage_history) db.startup_stage_history = [];
    const id = Math.max(...db.startup_stage_history.map((h: any) => h.id || 0), 0) + 1;
    let userId = null;
    let email = '';
    let comments = null;
    if (params.length >= 6) {
      userId = params[3];
      email = params[4] || '';
      comments = params[5] || null;
    } else if (params.length === 5) {
      email = params[3] || '';
      comments = params[4] || null;
    } else {
      email = params[3] || '';
    }
    const newHist = {
      id,
      startup_profile_id: parseInt(params[0]),
      previous_stage: params[1],
      new_stage: params[2],
      change_date: new Date().toISOString(),
      updated_by_user_id: userId,
      updated_by_email: email,
      comments: comments
    };
    db.startup_stage_history.push(newHist);
    saveLocalDB(db);
    return { rows: [newHist] };
  }

  // 49. Startup Pivots (Request-Approval Workflow)
  if (q.includes('from startup_pivots') && !q.includes('insert into') && !q.includes('update') && !q.includes('delete')) {
    if (!db.startup_pivots) db.startup_pivots = [];
    let list = [...db.startup_pivots];

    if (q.includes('where p.id = $1') || q.includes('where id = $1')) {
      const pid = parseInt(params[0]);
      list = list.filter((p: any) => p.id === pid);
    } else if (q.includes('startup_profile_id = $1') || q.includes('startup_id = $1') || q.includes('p.startup_profile_id = $1') || q.includes('p.startup_id = $1')) {
      const spId = parseInt(params[0]);
      list = list.filter((p: any) => p.startup_profile_id === spId || p.startup_id === spId);
    }

    if (q.includes("status = 'PENDING'") || q.includes("status = $1") || q.includes("p.status = 'PENDING'") || q.includes("p.status = $1")) {
      const statusParam = params.find((p: any) => ['PENDING', 'APPROVED', 'REJECTED'].includes(String(p).toUpperCase())) || 'PENDING';
      list = list.filter((p: any) => (p.status || 'APPROVED').toUpperCase() === String(statusParam).toUpperCase());
    }

    // Enrich with startup, founder, and industry metadata
    const enriched = list.map((p: any) => {
      const spId = p.startup_profile_id || p.startup_id;
      const sp = (db.startup_profiles || []).find((s: any) => s.id === spId || s.applicant_id === spId);
      const app = sp ? (db.applicants || []).find((a: any) => a.id === sp.applicant_id) : (db.applicants || []).find((a: any) => a.id === spId);
      
      const prevIndId = p.previous_industry_id;
      const newIndId = p.new_industry_id;
      const prevInd = prevIndId ? (db.industries || []).find((i: any) => i.id === prevIndId) : null;
      const newInd = newIndId ? (db.industries || []).find((i: any) => i.id === newIndId) : null;

      const prevIndName = p.previous_industry || (prevInd ? prevInd.name : (p.previous_industry_name || 'General Tech'));
      const newIndName = p.new_industry || (newInd ? newInd.name : (p.new_industry_name || 'General Tech'));

      let reviewerName = null;
      if (p.reviewed_by) {
        const u = (db.users || []).find((usr: any) => usr.id === parseInt(p.reviewed_by) || usr.email === String(p.reviewed_by));
        if (u) reviewerName = u.full_name || u.name || u.email;
      }

      return {
        ...p,
        startup_id: spId,
        startup_profile_id: spId,
        startup_name: sp?.startup_name || app?.startup_name || 'Startup',
        founder_name: app?.name || 'Founder',
        founder_email: app?.email || '',
        previous_idea_description: p.previous_idea_description || p.previous_idea || p.previous_model || '',
        new_idea_description: p.new_idea_description || p.new_idea || p.new_model || '',
        previous_industry: prevIndName,
        previous_industry_name: prevIndName,
        new_industry: newIndName,
        new_industry_name: newIndName,
        status: p.status || 'APPROVED',
        requested_at: p.requested_at || p.pivot_date || p.created_at || new Date().toISOString(),
        reviewer_name: reviewerName
      };
    });

    enriched.sort((a: any, b: any) => new Date(b.requested_at || b.pivot_date).getTime() - new Date(a.requested_at || a.pivot_date).getTime());
    return { rows: enriched };
  }

  if (q.includes('insert into startup_pivots')) {
    if (!db.startup_pivots) db.startup_pivots = [];
    const id = Math.max(...db.startup_pivots.map((p: any) => p.id || 0), 0) + 1;
    
    // Support new full schema
    let newPivot: any = {
      id,
      startup_profile_id: parseInt(params[0]),
      startup_id: parseInt(params[0]),
      previous_idea_description: params[1] || null,
      previous_idea: params[1] || null,
      new_idea_description: params[2] || '',
      new_idea: params[2] || '',
      previous_industry_id: params[3] ? (isNaN(parseInt(params[3])) ? null : parseInt(params[3])) : null,
      previous_industry: typeof params[3] === 'string' && isNaN(parseInt(params[3])) ? params[3] : (params[5] || null),
      new_industry_id: params[4] ? (isNaN(parseInt(params[4])) ? null : parseInt(params[4])) : null,
      new_industry: typeof params[4] === 'string' && isNaN(parseInt(params[4])) ? params[4] : (params[6] || null),
      reason: params[5] || params[3] || '',
      status: params[6] || 'PENDING',
      requested_at: new Date().toISOString(),
      pivot_date: new Date().toISOString(),
      reviewed_by: params[7] ? parseInt(params[7]) : null,
      reviewed_at: params[8] || null,
      admin_remarks: params[9] || null,
      created_at: new Date().toISOString()
    };

    // If param array has explicit fields passed from controller
    if (params.length >= 7 && (params[6] === 'PENDING' || params[6] === 'APPROVED' || params[7] === 'PENDING')) {
      newPivot = {
        id,
        startup_profile_id: parseInt(params[0]),
        startup_id: parseInt(params[0]),
        previous_idea_description: params[1] || null,
        previous_idea: params[1] || null,
        new_idea_description: params[2] || '',
        new_idea: params[2] || '',
        previous_industry: params[3] || null,
        new_industry: params[4] || null,
        previous_industry_id: !isNaN(parseInt(params[3])) ? parseInt(params[3]) : null,
        new_industry_id: !isNaN(parseInt(params[4])) ? parseInt(params[4]) : null,
        reason: params[5] || '',
        status: params[6] || 'PENDING',
        requested_at: new Date().toISOString(),
        pivot_date: new Date().toISOString(),
        reviewed_by: params[7] ? parseInt(params[7]) : null,
        reviewed_at: params[8] || null,
        admin_remarks: params[9] || null,
        created_at: new Date().toISOString()
      };
    }

    db.startup_pivots.push(newPivot);
    saveLocalDB(db);
    return { rows: [newPivot] };
  }

  if (q.includes('update startup_pivots set')) {
    if (!db.startup_pivots) db.startup_pivots = [];
    const pid = parseInt(params[params.length - 1]);
    const pivot = db.startup_pivots.find((p: any) => p.id === pid);
    if (pivot) {
      if (q.includes('status = $1')) {
        pivot.status = params[0];
        pivot.reviewed_by = params[1] !== undefined ? params[1] : pivot.reviewed_by;
        pivot.reviewed_at = params[2] || new Date().toISOString();
        pivot.admin_remarks = params[3] !== undefined ? params[3] : pivot.admin_remarks;
      } else {
        const setMatch = q.match(/set\s+([a-z0-9_]+)\s*=/i);
        if (setMatch && setMatch[1]) {
          pivot[setMatch[1].toLowerCase()] = params[0];
        }
      }
      saveLocalDB(db);
    }
    return { rows: pivot ? [pivot] : [] };
  }

  // 50. Startup Audit Logs
  if (q.includes('from startup_audit_logs')) {
    if (!db.startup_audit_logs) db.startup_audit_logs = [];
    if (q.includes('where startup_profile_id = $1')) {
      const spId = parseInt(params[0]);
      return { rows: db.startup_audit_logs.filter((l: any) => l.startup_profile_id === spId) };
    }
    return { rows: db.startup_audit_logs };
  }
  if (q.includes('insert into startup_audit_logs')) {
    if (!db.startup_audit_logs) db.startup_audit_logs = [];
    const id = Math.max(...db.startup_audit_logs.map((l: any) => l.id || 0), 0) + 1;
    let userId = null;
    let email = '';
    let field = '';
    let oldVal = null;
    let newVal = null;

    if (params.length >= 6) {
      userId = params[1];
      email = params[2];
      field = params[3];
      oldVal = params[4];
      newVal = params[5];
    } else if (params.length === 5) {
      userId = params[1];
      email = params[2];
      const fieldMatch = q.match(/values\s*\([^,]+,\s*[^,]+,\s*[^,]+,\s*'([^']+)'/i);
      field = fieldMatch ? fieldMatch[1] : 'general';
      oldVal = params[3];
      newVal = params[4];
    } else if (params.length === 3) {
      userId = params[1];
      email = params[2];
      const fieldMatch = q.match(/values\s*\([^,]+,\s*[^,]+,\s*[^,]+,\s*'([^']+)'/i);
      field = fieldMatch ? fieldMatch[1] : 'general';
      oldVal = '***';
      newVal = '***';
    } else {
      email = params[1] || '';
      field = params[2] || 'general';
      oldVal = params[3] || null;
      newVal = params[4] || null;
    }

    const newLog = {
      id,
      startup_profile_id: parseInt(params[0]),
      changed_by_user_id: userId,
      changed_by_email: email,
      field_name: field,
      old_value: oldVal ? String(oldVal) : null,
      new_value: newVal ? String(newVal) : null,
      created_at: new Date().toISOString()
    };
    db.startup_audit_logs.push(newLog);
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
          SET permissions = '["cohort:dashboard_view", "cohort:settings_manage", "cohort:form_manage", "cohort:applicant_review", "cohort:startups_manage", "cohort:session_manage", "cohort:assignment_manage", "cohort:feedback_view", "cohort:feedback_forms_manage", "cohort:attendance_write", "cohort:checkin_log", "cohort:warning_write", "cohort:profile_write", "cohort:feedback_submit", "cohort:assignment_upload", "SUBMIT_BOOKING", "CANCEL_OWN_BOOKING", "VIEW_PENDING_QUEUE", "APPROVE_REJECT_BOOKINGS", "BOOKING_OVERRIDE", "MANAGE_ROOMS", "MANAGE_BOOKING_TYPES", "VIEW_BOOKING_ANALYTICS", "MANAGE_ROLES", "MANAGE_USERS", "ISSUE_BAN", "VIEW_ANALYTICS_DASHBOARD", "VIEW_AUDIT_LOGS", "EXPORT_AUDIT_LOGS"]'::jsonb
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
          (1, 'qaseebahmed@gmail.com', 'Qaseeb Ahmed', TRUE, CURRENT_TIMESTAMP)
          ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            is_active = EXCLUDED.is_active;

          INSERT INTO users (email, full_name, is_active, last_login)
          VALUES 
          ('takhleeqadmin@gmail.com', 'Takhleeq Admin', TRUE, CURRENT_TIMESTAMP)
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
          { email: 'qaseebahmed@gmail.com', role: 'Administrator' },
          { email: 'takhleeqadmin@gmail.com', role: 'Administrator' }
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
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS intake_year VARCHAR(50);
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS start_date VARCHAR(50);
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS end_date VARCHAR(50);
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 20;
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS assigned_manager_id VARCHAR(50);
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS assigned_manager_name VARCHAR(255);
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS description TEXT;
          ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

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
              program_status VARCHAR(50) DEFAULT 'NOT_ENROLLED',
              panel_scores JSONB,
              parent_applicant_id INTEGER REFERENCES applicants(id) ON DELETE SET NULL,
              form_data JSONB,
              orientation_conducted BOOLEAN DEFAULT FALSE,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Migration for existing PostgreSQL databases: ensure program_status column exists and data is migrated
        try {
          await pool.query(`ALTER TABLE applicants ADD COLUMN IF NOT EXISTS program_status VARCHAR(50) DEFAULT 'NOT_ENROLLED';`);
          await pool.query(`
            UPDATE applicants 
            SET program_status = status, status = 'CONFIRMED' 
            WHERE status IN ('ACTIVE', 'PAUSED', 'GRADUATED', 'KICKED_OUT');
          `);
          await pool.query(`
            UPDATE applicants 
            SET program_status = 'ACTIVE' 
            WHERE (status = 'CONFIRMED' OR status = 'ACCEPTED') AND cohort_id IS NOT NULL AND (program_status IS NULL OR program_status = 'NOT_ENROLLED');
          `);
          await pool.query(`
            UPDATE applicants 
            SET program_status = 'NOT_ENROLLED' 
            WHERE program_status IS NULL;
          `);
          await pool.query(`ALTER TABLE applicants ADD COLUMN IF NOT EXISTS founder_password VARCHAR(255);`);
          await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);`);
        } catch (mErr) {
          console.error('Applicants schema migration notice:', mErr);
        }

        // Applicants initialization complete

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
              attendance_sheet_photo_url TEXT,
              is_design_thinking_bootcamp BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Add columns in case table was already created
        try {
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS topic_category VARCHAR(255);`);
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS venue VARCHAR(255);`);
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS recording_url VARCHAR(1024);`);
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS attendance_sheet_photo_url TEXT;`);
          await pool.query(`ALTER TABLE cohort_sessions ADD COLUMN IF NOT EXISTS is_design_thinking_bootcamp BOOLEAN DEFAULT FALSE;`);
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
              status VARCHAR(50) DEFAULT 'not_marked',
              marked_by_user_id INTEGER,
              marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT unique_session_applicant UNIQUE (session_id, applicant_id)
          );
        `);

        // 5b. assignments table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS assignments (
              id SERIAL PRIMARY KEY,
              session_id INTEGER REFERENCES cohort_sessions(id) ON DELETE CASCADE,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
              title VARCHAR(255) NOT NULL,
              description TEXT,
              due_date VARCHAR(100) NOT NULL,
              attachment_url TEXT,
              created_by_user_id INTEGER,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE;`);

        // 5c. assignment_submissions table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS assignment_submissions (
              id SERIAL PRIMARY KEY,
              assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
              applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
              file_url TEXT NOT NULL,
              submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT unique_assignment_applicant UNIQUE (assignment_id, applicant_id)
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

        // 7b. cohort_feedback table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS cohort_feedback (
              id SERIAL PRIMARY KEY,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
              session_id INTEGER REFERENCES cohort_sessions(id) ON DELETE SET NULL,
              user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
              applicant_id INTEGER REFERENCES applicants(id) ON DELETE SET NULL,
              founder_name VARCHAR(255),
              startup_name VARCHAR(255),
              feedback_type VARCHAR(50) DEFAULT 'PROGRAM',
              rating INTEGER CHECK (rating >= 1 AND rating <= 5),
              title VARCHAR(255),
              comment TEXT,
              is_anonymous BOOLEAN DEFAULT FALSE,
              status VARCHAR(50) DEFAULT 'SUBMITTED',
              staff_response TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 7c. Generalized feedback_forms, feedback_questions, feedback_responses
        await pool.query(`
          CREATE TABLE IF NOT EXISTS feedback_forms (
              id SERIAL PRIMARY KEY,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
              title VARCHAR(255) NOT NULL,
              description TEXT,
              is_anonymous BOOLEAN DEFAULT FALSE,
              created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              expiry_date VARCHAR(100),
              status VARCHAR(50) DEFAULT 'Active',
              session_id INTEGER REFERENCES cohort_sessions(id) ON DELETE SET NULL
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS feedback_questions (
              id SERIAL PRIMARY KEY,
              feedback_form_id INTEGER REFERENCES feedback_forms(id) ON DELETE CASCADE,
              question_text TEXT NOT NULL,
              question_type VARCHAR(50) NOT NULL,
              question_order INTEGER DEFAULT 0
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS feedback_responses (
              id SERIAL PRIMARY KEY,
              feedback_form_id INTEGER REFERENCES feedback_forms(id) ON DELETE CASCADE,
              question_id INTEGER REFERENCES feedback_questions(id) ON DELETE CASCADE,
              startup_id INTEGER NOT NULL,
              user_id INTEGER,
              answer_value TEXT NOT NULL,
              submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 8. Startup Profile & Progress Management Module Tables
        await pool.query(`
          CREATE TABLE IF NOT EXISTS industries (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) UNIQUE NOT NULL
          );
        `);

        // Seed default industries if empty
        const indCount = await pool.query('SELECT count(*) FROM industries');
        if (parseInt(indCount.rows[0].count) === 0) {
          const defaultIndustries = [
            'FinTech', 'EdTech', 'AgriTech', 'HealthTech', 
            'E-Commerce & Retail', 'Logistics & Supply Chain', 
            'SaaS & Enterprise Software', 'CleanTech & Energy', 
            'AI & DeepTech', 'Other Services'
          ];
          for (const ind of defaultIndustries) {
            await pool.query(
              `INSERT INTO industries (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`,
              [ind]
            );
          }
        }

        // Create custom ENUM types safely if not present
        try {
          await pool.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'startup_progress_stage_enum') THEN
                    CREATE TYPE startup_progress_stage_enum AS ENUM ('IDEA_STAGE', 'PROBLEM_DISCOVERY', 'MARKET_VALIDATION', 'POC_MVP', 'POST_REVENUE', 'SCALE_STAGE');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'program_status_enum') THEN
                    CREATE TYPE program_status_enum AS ENUM ('ACTIVE', 'PAUSED', 'GRADUATED', 'KICKED_OUT');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'startup_type_enum') THEN
                    CREATE TYPE startup_type_enum AS ENUM ('PRODUCT', 'SERVICE', 'HYBRID');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_model_enum') THEN
                    CREATE TYPE business_model_enum AS ENUM ('B2B', 'B2C', 'SUBSCRIPTION');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revenue_status_enum') THEN
                    CREATE TYPE revenue_status_enum AS ENUM ('PRE_REVENUE', 'POST_REVENUE', 'PROFITABLE');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funding_status_enum') THEN
                    CREATE TYPE funding_status_enum AS ENUM ('BOOTSTRAPPED', 'GRANT_FUNDED', 'PRE_SEED', 'SEED', 'SERIES_A_PLUS');
                END IF;
            END $$;
          `);
        } catch (e) {
          console.error("Custom types notice:", e);
        }

        // 9. startup_profiles table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS startup_profiles (
              id SERIAL PRIMARY KEY,
              applicant_id INTEGER UNIQUE REFERENCES applicants(id) ON DELETE CASCADE,
              startup_name VARCHAR(255) NOT NULL,
              logo_url TEXT,
              industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
              description TEXT,
              website VARCHAR(255),
              social_links JSONB DEFAULT '{}'::jsonb,
              contact_info JSONB DEFAULT '{}'::jsonb,
              startup_type startup_type_enum,
              business_model business_model_enum,
              cohort_id INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
              enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              current_progress_stage startup_progress_stage_enum DEFAULT 'IDEA_STAGE',
              program_status program_status_enum DEFAULT 'ACTIVE',
              team_size INTEGER DEFAULT 1,
              revenue_status revenue_status_enum DEFAULT 'PRE_REVENUE',
              funding_status funding_status_enum DEFAULT 'BOOTSTRAPPED',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 10. startup_stage_history table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS startup_stage_history (
              id SERIAL PRIMARY KEY,
              startup_profile_id INTEGER REFERENCES startup_profiles(id) ON DELETE CASCADE,
              previous_stage startup_progress_stage_enum,
              new_stage startup_progress_stage_enum NOT NULL,
              change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
              updated_by_email VARCHAR(255),
              comments TEXT
          );
        `);

        // 10b. applicant_stage_history table (Intake Admissions Evaluator)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS applicant_stage_history (
              id SERIAL PRIMARY KEY,
              applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
              previous_stage VARCHAR(100),
              new_stage VARCHAR(100) NOT NULL,
              change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
              updated_by_email VARCHAR(255),
              comments TEXT,
              include_in_email BOOLEAN NOT NULL DEFAULT true
          );
        `);
        try {
          await pool.query(`ALTER TABLE applicant_stage_history ADD COLUMN IF NOT EXISTS include_in_email BOOLEAN NOT NULL DEFAULT true;`);
          await pool.query(`ALTER TABLE applicant_stage_history ADD COLUMN IF NOT EXISTS comments TEXT;`);
        } catch (ashErr) {
          console.error("applicant_stage_history migration notice:", ashErr);
        }

        // 11. startup_pivots table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS startup_pivots (
              id SERIAL PRIMARY KEY,
              startup_profile_id INTEGER REFERENCES startup_profiles(id) ON DELETE CASCADE,
              previous_idea TEXT,
              new_idea TEXT NOT NULL,
              previous_industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
              new_industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
              pivot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              reason TEXT NOT NULL,
              approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
              approved_by_email VARCHAR(255),
              supporting_notes TEXT
          );
        `);

        // 12. startup_audit_logs table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS startup_audit_logs (
              id SERIAL PRIMARY KEY,
              startup_profile_id INTEGER REFERENCES startup_profiles(id) ON DELETE CASCADE,
              changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
              changed_by_email VARCHAR(255) NOT NULL,
              field_name VARCHAR(100) NOT NULL,
              old_value TEXT,
              new_value TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 13. checkins table (ON DELETE RESTRICT on startup_profile_id and cohort_id)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS checkins (
              id SERIAL PRIMARY KEY,
              startup_profile_id INTEGER NOT NULL REFERENCES startup_profiles(id) ON DELETE RESTRICT,
              cohort_id INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE RESTRICT,
              scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              notes TEXT,
              attendance_status VARCHAR(50) DEFAULT 'unmarked',
              created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
              created_by_email VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 14. checkin_checklist_items table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS checkin_checklist_items (
              id SERIAL PRIMARY KEY,
              checkin_id INTEGER NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
              originating_checkin_id INTEGER REFERENCES checkins(id) ON DELETE SET NULL,
              description TEXT NOT NULL,
              is_completed BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 15. Ensure all startup_profiles financial columns exist
        await pool.query(`
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS monthly_revenue TEXT DEFAULT 'PKR 0';
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS annual_recurring_revenue TEXT DEFAULT 'PKR 0';
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS funding_raised TEXT DEFAULT '0';
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS burn_rate TEXT DEFAULT 'PKR 0';
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS pitch_deck_url TEXT;
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS founder_email VARCHAR(255);
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS founder_name VARCHAR(255);
          ALTER TABLE startup_profiles ADD COLUMN IF NOT EXISTS founder_phone VARCHAR(50);
        `);

        console.log("Cohort & Startup tables synchronized successfully in PostgreSQL.");

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

  let allowedBookingTypes: string[] = [];
  if (row.allowed_booking_types) {
    try {
      allowedBookingTypes = typeof row.allowed_booking_types === 'string'
        ? JSON.parse(row.allowed_booking_types)
        : row.allowed_booking_types;
    } catch {
      allowedBookingTypes = [];
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
    isActive: row.is_active,
    allowedBookingTypes
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
