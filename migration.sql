-- SQL Migration Script for Takhleeq ERP System
-- Database: PostgreSQL

-- Enable UUID or any extensions if required (optional)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    microsoft_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL, -- e.g. ["VIEW_PENDING_QUEUE", "BOOKING_OVERRIDE", "MANAGE_USERS"]
    ban_duration_ceiling VARCHAR(50), -- '7_days', '30_days', '90_days', 'permanent', or NULL
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    operating_hours_start TIME NOT NULL,
    operating_hours_end TIME NOT NULL,
    min_duration_minutes INTEGER NOT NULL DEFAULT 30,
    max_duration_minutes INTEGER NOT NULL DEFAULT 180,
    purpose TEXT,
    policies TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(100) UNIQUE NOT NULL, -- e.g. TBK-2026-001
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_phone VARCHAR(255) NOT NULL,
    organization_name VARCHAR(255),
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    booking_type VARCHAR(100) NOT NULL, -- Student Society, Cohort Startup, Department, Meeting/Event
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    expected_attendance INTEGER NOT NULL,
    status VARCHAR(100) NOT NULL, -- PENDING_VALIDATION, REJECTED_BAN, REJECTED_VALIDATION, PENDING_REVIEW, APPROVED, REJECTED_BY_STAFF, CANCELLED
    conflict_status VARCHAR(100) DEFAULT 'NO_CONFLICT', -- NO_CONFLICT, CONFLICT_DETECTED
    conflicting_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL, -- Self-referential for track overlap
    rejection_reason TEXT,
    cancellation_reason TEXT,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ban_records (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    duration_type VARCHAR(100) NOT NULL, -- 7_days, 30_days, 90_days, custom, permanent
    custom_days INTEGER,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    lifted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    lifted_at TIMESTAMPTZ,
    lifting_reason TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255),
    entity_id VARCHAR(255),
    actor_email VARCHAR(255) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial System Data if empty
-- Create simulated core admin user
INSERT INTO users (id, email, full_name, is_active, last_login)
VALUES (1, 'director@takhleeq.pk', 'Dr. Qaseeb (Director)', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, full_name, is_active, last_login)
VALUES (2, 'manager@takhleeq.pk', 'Syed Usman (Booking Manager)', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, full_name, is_active, last_login)
VALUES (3, 'coordinator@takhleeq.pk', 'Sara Khan (Coordinator)', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, full_name, is_active, last_login)
VALUES (4, 'usman@society.pk', 'Usman Ghani (Society Rep)', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, full_name, is_active, last_login)
VALUES (5, 'faisal@ucp.edu.pk', 'Faisal Mehmood (Coordinator)', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, full_name, is_active, last_login)
VALUES (6, 'maheen@ucp.edu.pk', 'Maheen Malik (Manager)', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, full_name, is_active, last_login)
VALUES (7, 'banned-test@ucp.edu.pk', 'Banned Student (Testing)', FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Seed system roles
INSERT INTO roles (id, name, description, permissions, ban_duration_ceiling)
VALUES (
    1, 
    'Administrator', 
    'Full access and policy management capabilities', 
    '["SUBMIT_BOOKING", "CANCEL_OWN_BOOKING", "VIEW_PENDING_QUEUE", "APPROVE_BOOKING", "REJECT_BOOKING", "APPROVE_REJECT_BOOKINGS", "BOOKING_OVERRIDE", "ISSUE_BAN", "MANAGE_ROOMS", "CONFIGURE_ROOMS", "CONFIGURE_POLICIES", "VIEW_ANALYTICS_DASHBOARD", "EXPORT_AUDIT_LOGS", "MANAGE_ROLES", "MANAGE_USERS", "VIEW_AUDIT_LOGS", "LIFT_BAN", "MANAGE_BANS", "MANAGE_BOOKING_TYPES"]'::jsonb, 
    'permanent'
) ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description, permissions, ban_duration_ceiling)
VALUES (
    2, 
    'Booking Manager', 
    'Approve, reject bookings, and issue bans up to 90 days', 
    '["VIEW_PENDING_QUEUE", "APPROVE_REJECT_BOOKINGS", "ISSUE_BAN"]'::jsonb, 
    '90'
) ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description, permissions, ban_duration_ceiling)
VALUES (
    3, 
    'Facility Coordinator', 
    'View queue, apply manual time/room overrides, issue bans up to 7 days', 
    '["VIEW_PENDING_QUEUE", "BOOKING_OVERRIDE", "ISSUE_BAN"]'::jsonb, 
    '7'
) ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description, permissions, ban_duration_ceiling)
VALUES (
    4, 
    'UCP Member', 
    'Regular student or staff member with standard public booking access', 
    '[]'::jsonb, 
    NULL
) ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description, permissions, ban_duration_ceiling)
VALUES (
    5, 
    'Room Management', 
    'Manage incubator spaces, view and update space operating attributes, and delete spaces', 
    '["MANAGE_ROOMS"]'::jsonb, 
    '0'
) ON CONFLICT (name) DO NOTHING;

-- Assign Initial Roles
INSERT INTO user_roles (user_id, role_id)
VALUES (1, 1)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES (2, 2)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES (3, 3)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES (4, 4)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES (5, 3)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES (6, 2)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES (7, 4)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Seed Initial Rooms
INSERT INTO rooms (id, name, capacity, operating_hours_start, operating_hours_end, min_duration_minutes, max_duration_minutes, purpose, policies)
VALUES 
(1, 'Board Room', 15, '09:00:00', '17:00:00', 60, 180, 'Formal executive meetings and syndicate sessions', 'Authorized UCP societies and startups only. Strictly no external foods allowed. Leave room clean.'),
(2, 'Presentation Hall', 50, '09:00:00', '17:00:00', 60, 180, 'Large cohort presentations, talks, and community panels', 'Pre-approval from Faculty advisor required. Keep setup reset after use.'),
(3, 'Cube 1', 6, '09:00:00', '17:00:00', 30, 60, 'Small meetings and focused discussions', 'Leave room clean. No loud noise.'),
(4, 'Cube 2', 6, '09:00:00', '17:00:00', 30, 60, 'Small meetings and focused discussions', 'Leave room clean. No loud noise.'),
(5, 'Podcast Room', 4, '09:00:00', '17:00:00', 60, 180, 'Podcast recording and audio sessions', 'Technical staff assistance must be booked separately.')
ON CONFLICT (name) DO NOTHING;

-- Create Booking Types table if not exists
CREATE TABLE IF NOT EXISTS booking_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Booking Types
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

-- COHORT TABLES SCHEMA
CREATE TABLE IF NOT EXISTS cohorts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cohort_form_settings (
    is_active BOOLEAN DEFAULT TRUE,
    fields JSONB NOT NULL
);

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

CREATE TABLE IF NOT EXISTS cohort_sessions (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mentor_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_attendance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES cohort_sessions(id) ON DELETE CASCADE,
    applicant_id INTEGER REFERENCES applicants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- SEED COHORT DATA
INSERT INTO cohorts (id, name, status)
VALUES (1, 'Takhleeq Cohort 1', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO cohort_form_settings (is_active, fields)
VALUES (TRUE, '[
  {"id": "field_startup_name", "label": "Startup Name", "type": "text", "required": true, "placeholder": "Enter your startup name"},
  {"id": "field_startup_desc", "label": "Idea Description", "type": "text", "required": true, "placeholder": "Explain your business idea in 2-3 sentences"},
  {"id": "field_founder_name", "label": "Team Lead Name", "type": "text", "required": true, "placeholder": "Enter full name of the team lead"},
  {"id": "field_founder_email", "label": "Email Address", "type": "email", "required": true, "placeholder": "Enter team lead email"},
  {"id": "field_founder_phone", "label": "Phone Number", "type": "phone", "required": true, "placeholder": "e.g. 03xx-xxxxxxx"},
  {"id": "field_founder_cnic", "label": "CNIC Number", "type": "cnic", "required": true, "placeholder": "e.g. 35201-xxxxxxx-x"}
]'::jsonb);

INSERT INTO applicants (id, tracking_token, name, email, phone, cnic, startup_name, startup_description, cohort_id, status, panel_scores, form_data, orientation_conducted)
VALUES 
(1, 'TK-STR-7821', 'Zohaib Niaz', 'zohaib@startup.pk', '0300-1234567', '35201-1234567-1', 'MedRoute', 'An AI-powered pharmaceutical route planner reducing delivery times by 40%.', 1, 'CONFIRMED', '{"viability": 8, "team": 9, "scalability": 8, "average": 8.3}'::jsonb, '{}'::jsonb, TRUE),
(2, 'TK-STR-5921', 'Ayesha Malik', 'ayesha@fintech.pk', '0321-7654321', '35201-7654321-2', 'PaisaFlow', 'Micro-lending platform for small merchants using alternative credit scoring.', 1, 'CONFIRMED', '{"viability": 9, "team": 8, "scalability": 9, "average": 8.7}'::jsonb, '{}'::jsonb, TRUE),
(3, 'TK-STR-4412', 'Imran Khan', 'imran@edtech.pk', '0333-5551212', '35201-5551212-3', 'Dars-e-Nau', 'Localized video-based educational app for public school students in Urdu.', null, 'IN_REVIEW', NULL, '{}'::jsonb, FALSE),
(4, 'TK-STR-1092', 'Qasim Ali', 'qasim@agritech.pk', '0345-9998887', '35201-9998887-4', 'AgriSense', 'IoT-enabled soil nutrient analysis probe for smallholder farmers.', null, 'BACKUP_CANDIDATE', '{"viability": 7, "team": 7, "scalability": 7, "average": 7.0}'::jsonb, '{}'::jsonb, FALSE),
(5, 'TK-STR-2291', 'Raza Jafar', 'raza@delivery.pk', '0312-3334445', '35201-3334445-5', 'LogiSwift', 'B2B express delivery aggregator connecting local freight vans.', null, 'REJECTED', '{"viability": 4, "team": 5, "scalability": 4, "average": 4.3}'::jsonb, '{}'::jsonb, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO cohort_sessions (id, cohort_id, title, date, start_time, end_time, mentor_name)
VALUES 
(1, 1, 'Orientation & Incubation Blueprint', '2026-07-22', '10:00:00', '12:00:00', 'Dr. Qaseeb Ahmed'),
(2, 1, 'Value Proposition & Customer Discovery', '2026-07-29', '14:00:00', '16:00:00', 'Syed Usman')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('cohorts', 'id'), COALESCE(MAX(id), 1)) FROM cohorts;
SELECT setval(pg_get_serial_sequence('applicants', 'id'), COALESCE(MAX(id), 1)) FROM applicants;
SELECT setval(pg_get_serial_sequence('cohort_sessions', 'id'), COALESCE(MAX(id), 1)) FROM cohort_sessions;


