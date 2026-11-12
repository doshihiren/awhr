'use strict';
const jwt = require('jsonwebtoken');
const db = require('../db/db');

const DISABLED_STATUSES = new Set(['resigned', 'inactive', 'terminated']);

// Read current account status and role on every authenticated request.
// This immediately revokes access for archived users and applies role transfers
// even if the existing JWT still contains the user's old role.
const auth = (roles = []) => async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const [[account]] = await db.query(
      `SELECT u.id,u.name,u.email,u.role,u.avatar,
              COALESCE(ed.status,'active') AS employee_status
       FROM users u
       LEFT JOIN employee_details ed ON ed.user_id=u.id
       WHERE u.id=? LIMIT 1`,
      [decoded.id]
    );
    if (!account) return res.status(401).json({ message: 'Account not found' });
    if (DISABLED_STATUSES.has(String(account.employee_status).toLowerCase())) {
      return res.status(403).json({ message: 'Account archived or disabled. Contact your administrator.' });
    }

    req.user = { ...decoded, ...account };
    if (roles.length && !roles.includes(account.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  } catch (err) {
    console.error('Authentication account lookup failed:', err.code || err.name || 'unknown');
    return res.status(503).json({ message: 'Unable to verify account status. Please try again.' });
  }
};

module.exports = auth;
