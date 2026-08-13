import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.ts';
import { AuthenticatedRequest } from '../shared/types/index.ts';
export type { AuthenticatedRequest };

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.currentUser = null;
    return next();
  }

  let token = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = authHeader.trim();
  }

  // Strip possible surrounding quotes
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }
  if (token.startsWith("'") && token.endsWith("'")) {
    token = token.slice(1, -1);
  }

  if (!token || token === 'undefined' || token === 'null') {
    req.currentUser = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; id: number };
    
    // Fetch user and their associated roles and permissions from PostgreSQL
    const userRes = await query(
      `SELECT u.id, u.email, u.full_name, u.is_active, r.name as role_name, r.permissions
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [decoded.email]
    );

    if (userRes.rows.length > 0) {
      const row = userRes.rows[0];
      let perms: string[] = [];
      if (row.permissions) {
        perms = Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions);
      }

      // Check for active ban
      const banCheck = await query(
        `SELECT * FROM ban_records WHERE LOWER(email) = LOWER($1) AND is_active = TRUE`,
        [decoded.email]
      );
      let isBanned = false;
      if (banCheck.rows.length > 0) {
        const activeBan = banCheck.rows[0];
        if (activeBan.expires_at && new Date(activeBan.expires_at) <= new Date()) {
          await query(
            `UPDATE ban_records SET is_active = FALSE, lifted_at = CURRENT_TIMESTAMP, lifting_reason = 'Ban automatically expired' WHERE id = $1`,
            [activeBan.id]
          );
        } else {
          isBanned = true;
        }
      }

      req.currentUser = {
        id: row.id,
        email: row.email,
        name: row.full_name,
        role: row.role_name || 'UCP Member',
        status: (row.is_active && !isBanned) ? 'Active' : 'Inactive',
        permissions: perms
      };
    } else {
      req.currentUser = null;
    }
  } catch (err: any) {
    if (err.name === 'TokenExpiredError' || err.message === 'jwt expired') {
      console.warn("JWT token expired for incoming request");
    } else {
      console.warn("JWT verification failed:", err.message);
    }
    req.currentUser = null;
  }
  next();
}

// Access guard to require valid active session
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Session expired or unauthorized. Please sign in with Microsoft SSO.', code: 'TOKEN_EXPIRED' });
  }
  if (req.currentUser.status === 'Inactive') {
    return res.status(401).json({ error: 'Access Denied: Your account has been set to Inactive.' });
  }
  next();
}

// Permission level authorization check helper
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Session expired or unauthorized.' });
    }
    if (req.currentUser.status === 'Inactive') {
      return res.status(401).json({ error: 'Access Denied: Your account is inactive.' });
    }
    
    // Administrators bypass all individual permission restrictions
    if (req.currentUser.role === 'Administrator') {
      return next();
    }

    if (!req.currentUser.permissions.includes(permission)) {
      return res.status(401).json({ error: `Privilege Restriction: Missing permission '${permission}' required for this action.` });
    }
    next();
  };
}

// Check if current user holds any of the allowed permissions list
export function requireAnyPermission(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Session expired or unauthorized.' });
    }
    if (req.currentUser.status === 'Inactive') {
      return res.status(401).json({ error: 'Access Denied: Your account is inactive.' });
    }
    
    // Administrators bypass all individual permission restrictions
    if (req.currentUser.role === 'Administrator') {
      return next();
    }

    const hasAny = permissions.some(p => req.currentUser!.permissions.includes(p));
    if (!hasAny) {
      return res.status(401).json({ error: `Privilege Restriction: Missing one of the required permissions: ${permissions.join(', ')}` });
    }
    next();
  };
}
