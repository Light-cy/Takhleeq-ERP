import { Router, Response } from 'express';
import { query, logAudit, mapRole } from '../db.ts';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth.ts';

const router = Router();

// Manage custom roles
router.get('/roles', requireAuth, requirePermission('MANAGE_ROLES'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rolesRes = await query(`SELECT * FROM roles ORDER BY id ASC`);
    const roles = rolesRes.rows.map(mapRole);
    res.json(roles);
  } catch (err) {
    console.error('Failed to query roles:', err);
    res.status(500).json({ error: 'Failed to retrieve roles.' });
  }
});

// Create a new custom role (Admin / Privilege Escalation Prevention checks)
router.post('/roles', requireAuth, requirePermission('MANAGE_ROLES'), async (req: AuthenticatedRequest, res: Response) => {
  const creator = req.currentUser!;
  const { name, description, permissions, banDurationCeiling } = req.body;

  if (!name || !description || !permissions) {
    return res.status(400).json({ error: 'Missing required fields: name, description, permissions' });
  }

  try {
    // 1. Role builder security check (Privilege escalation prevention):
    // "A role creator cannot grant permissions they do not themselves hold"
    const adminRoleRes = await query(`SELECT permissions FROM roles WHERE name = 'Administrator'`);
    if (adminRoleRes.rows.length === 0) {
      return res.status(500).json({ error: 'Internal Error: Base Administrator role permissions not found.' });
    }
    
    // Admin permissions check
    const adminPermissions = Array.isArray(adminRoleRes.rows[0].permissions) 
      ? adminRoleRes.rows[0].permissions 
      : JSON.parse(adminRoleRes.rows[0].permissions || '[]');

    const invalidPermissions = permissions.filter((p: string) => !adminPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({ 
        error: `Privilege Escalation Blocked: You cannot grant permissions you do not hold: ${invalidPermissions.join(', ')}` 
      });
    }

    // 1.5 BR-11: Custom roles may not be assigned Administrator-reserved permissions
    const prohibitedForCustom = [
      'MANAGE_ROLES',
      'VIEW_AUDIT_LOGS',
      'MANAGE_USERS',
      'CONFIGURE_ROOMS',
      'CONFIGURE_POLICIES',
      'LIFT_BAN'
    ];
    const containsProhibited = permissions.some((p: string) => prohibitedForCustom.includes(p));
    if (containsProhibited) {
      return res.status(403).json({
        error: 'Privilege Restriction: Custom roles cannot be assigned Administrator-reserved permissions (MANAGE_ROLES, VIEW_AUDIT_LOGS, MANAGE_USERS, CONFIGURE_ROOMS, CONFIGURE_POLICIES, LIFT_BAN).'
      });
    }

    // 1.6 BR-12/11: Validate banDurationCeiling
    const creatorCeilingRes = await query(
      `SELECT r.ban_duration_ceiling 
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [creator.id]
    );
    const creatorCeilingRaw = creatorCeilingRes.rows[0]?.ban_duration_ceiling;
    
    let creatorCeilingDays = 0;
    if (creator.role === 'Administrator' || creatorCeilingRaw === 'permanent' || !creatorCeilingRaw) {
      creatorCeilingDays = 999999;
    } else {
      creatorCeilingDays = parseInt(creatorCeilingRaw);
    }

    let requestedCeilingDays = 0;
    if (banDurationCeiling === 'Permanent' || banDurationCeiling === 'permanent' || !banDurationCeiling) {
      requestedCeilingDays = 999999;
    } else {
      requestedCeilingDays = parseInt(banDurationCeiling);
    }

    if (creator.role !== 'Administrator' && (banDurationCeiling === 'Permanent' || banDurationCeiling === 'permanent' || !banDurationCeiling)) {
      return res.status(403).json({
        error: "Privilege Restriction: Only Administrator can authorize Permanent/unlimited ban ceilings."
      });
    }

    if (requestedCeilingDays > creatorCeilingDays) {
      return res.status(403).json({
        error: `Privilege Restriction: Requested ban ceiling (${banDurationCeiling} days) exceeds your authority limit (${creatorCeilingDays === 999999 ? 'Permanent' : creatorCeilingDays} days).`
      });
    }

    // 2. Check if role exists
    const existing = await query(`SELECT id FROM roles WHERE LOWER(name) = LOWER($1)`, [name]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `A role named '${name}' already exists.` });
    }

    // 3. Insert new custom role
    const ceilingStr = banDurationCeiling ? String(banDurationCeiling) : null;
    const insertRes = await query(
      `INSERT INTO roles (name, description, permissions, ban_duration_ceiling, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, JSON.stringify(permissions), ceilingStr, creator.id]
    );

    const newRole = mapRole(insertRes.rows[0]);

    await logAudit(`Created Custom Role: ${name}`, 'role', String(insertRes.rows[0].id), creator.email, null, newRole);

    res.json({ success: true, role: newRole });
  } catch (err) {
    console.error('Failed to create role:', err);
    res.status(500).json({ error: 'Failed to create role due to database error.' });
  }
});

// Delete a role
router.delete('/roles/:name', requireAuth, requirePermission('MANAGE_ROLES'), async (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser!;
  const roleName = req.params.name;

  if (roleName === 'Administrator' || roleName === 'UCP Member') {
    return res.status(400).json({ error: 'System safety rule: Standard system roles (Administrator, UCP Member) cannot be deleted.' });
  }

  try {
    // 1. Role Deletion check: "A role cannot be deleted while users are assigned to it"
    const assignedRes = await query(
      `SELECT COUNT(*) FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = $1`,
      [roleName]
    );
    const assignedCount = parseInt(assignedRes.rows[0].count);

    if (assignedCount > 0) {
      return res.status(400).json({ 
        error: `System blocks deletion: ${assignedCount} user(s) are currently assigned to the '${roleName}' role. Reassign them first.` 
      });
    }

    // 2. Perform deletion
    const delRes = await query(`DELETE FROM roles WHERE name = $1 RETURNING *`, [roleName]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: `Role '${roleName}' not found.` });
    }

    const deletedRole = mapRole(delRes.rows[0]);

    await logAudit(`Deleted Custom Role: ${roleName}`, 'role', String(delRes.rows[0].id), admin.email, deletedRole, null);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete role:', err);
    res.status(500).json({ error: 'Failed to delete role due to database error.' });
  }
});

export default router;
