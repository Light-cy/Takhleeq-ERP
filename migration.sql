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

