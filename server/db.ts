import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Room, Booking, Ban, CustomRole, User, AuditRecord } from '../src/types.ts';

dotenv.config();

const { Pool } = pg;

// Use the user-defined DATABASE_URL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL environment variable is not defined. Falling back to local postgres default.");
}

// Object configuration mapping (connection pooling)
export const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/takhleeq',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
  max: 20, // max clients in pool
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// --- LOCAL JSON DATABASE ENGINE FALLBACK ---
let useLocalDB = false;

const localDbPath = path.join(process.cwd(), 'server', 'local_db.json');

function initializeLocalDB() {
  if (fs.existsSync(localDbPath)) {
    try {
      return JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    } catch (e) {
      console.error("Failed to parse local_db.json, recreating...", e);
    }
  }

  // Seed data from migration.sql
  const initialData = {
    users: [
      { id: 1, microsoft_id: null, email: 'director@takhleeq.pk', full_name: 'Dr. Qaseeb (Director)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 2, microsoft_id: null, email: 'manager@takhleeq.pk', full_name: 'Syed Usman (Booking Manager)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 3, microsoft_id: null, email: 'coordinator@takhleeq.pk', full_name: 'Sara Khan (Coordinator)', is_active: true, last_login: new Date().toISOString(), created_at: new Date().toISOString() }
    ],
    roles: [
      { id: 1, name: 'Administrator', description: 'Full access and policy management capabilities', permissions: ["VIEW_PENDING_QUEUE", "APPROVE_REJECT_BOOKINGS", "BOOKING_OVERRIDE", "MANAGE_ROLES", "MANAGE_USERS", "VIEW_AUDIT_LOGS", "MANAGE_BANS"], ban_duration_ceiling: 'permanent', created_by: null, created_at: new Date().toISOString() },
      { id: 2, name: 'Booking Manager', description: 'Approve, reject bookings, and issue bans up to 90 days', permissions: ["VIEW_PENDING_QUEUE", "APPROVE_REJECT_BOOKINGS", "MANAGE_BANS"], ban_duration_ceiling: '90', created_by: null, created_at: new Date().toISOString() },
      { id: 3, name: 'Facility Coordinator', description: 'View queue, apply manual time/room overrides, issue bans up to 7 days', permissions: ["VIEW_PENDING_QUEUE", "BOOKING_OVERRIDE", "MANAGE_BANS"], ban_duration_ceiling: '7', created_by: null, created_at: new Date().toISOString() },
      { id: 4, name: 'UCP Member', description: 'Regular student or staff member with standard public booking access', permissions: [], ban_duration_ceiling: null, created_by: null, created_at: new Date().toISOString() }
    ],
    user_roles: [
      { user_id: 1, role_id: 1 },
      { user_id: 2, role_id: 2 },
      { user_id: 3, role_id: 3 }
    ],
    rooms: [
      { id: 1, name: 'Board Room', capacity: 15, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Meeting / formal discussions', policies: 'Standard booking policy. Cancellation notice required. No external food.', is_active: true, created_at: new Date().toISOString() },
      { id: 2, name: 'Presentation Hall', capacity: 50, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Events, workshops', policies: 'Standard booking policy. Furniture rules apply. Sound system request in advance.', is_active: true, created_at: new Date().toISOString() },
      { id: 3, name: 'Cube 1', capacity: 6, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 30, max_duration_minutes: 60, purpose: 'Meeting / small discussions', policies: 'Standard booking policy. Leave room clean.', is_active: true, created_at: new Date().toISOString() },
      { id: 4, name: 'Cube 2', capacity: 6, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 30, max_duration_minutes: 60, purpose: 'Meeting / small discussions', policies: 'Standard booking policy. Leave room clean.', is_active: true, created_at: new Date().toISOString() },
      { id: 5, name: 'Podcast Room', capacity: 4, operating_hours_start: '09:00:00', operating_hours_end: '17:00:00', min_duration_minutes: 60, max_duration_minutes: 180, purpose: 'Podcast recording', policies: 'Standard booking policy. Technical staff assistance must be booked separately.', is_active: true, created_at: new Date().toISOString() }
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

  // 1. SELECT * FROM rooms ORDER BY id ASC
  if (q.includes('select * from rooms') && q.includes('order by id asc')) {
    return { rows: db.rooms };
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
    } catch (err: any) {
      console.warn("PostgreSQL connection or migration failed. Falling back to local in-memory JSON database engine.", err.message);
      useLocalDB = true;
    }
  })();

  return dbReadyPromise;
}

// Trigger early initialization
ensureDBReady();

// Base Query Helper
export async function query(text: string, params?: any[]): Promise<any> {
  await ensureDBReady();
  if (!useLocalDB) {
    try {
      return await pool.query(text, params);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.message.includes('connect ECONNREFUSED') || err.message.includes('does not exist')) {
        console.warn("PostgreSQL query failed with connection error. Switching to local JSON database engine.", err.message);
        useLocalDB = true;
      } else {
        throw err;
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
  if (duration === '7_days' || duration === '7 days') {
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
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
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
  if (row.duration_type === '7_days') duration = '7 days';
  else if (row.duration_type === '30_days') duration = '30 days';
  else if (row.duration_type === '90_days') duration = '90 days';
  else if (row.duration_type === 'custom') duration = `Custom ${row.custom_days} days`;

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
