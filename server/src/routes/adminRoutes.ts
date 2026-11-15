import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, signToken, requireAuth, type AuthenticatedRequest } from '../auth.js';
import type { User } from '../types.js';

export const adminRouter = Router();

const ADMIN_MASTER_SECRET = process.env.ADMIN_MASTER_SECRET || 'loopadmin2026';

// Middleware to verify admin key or admin user
function verifyAdminSecret(req: any, res: any, next: any) {
  const secret = req.headers['x-admin-secret'] || req.body?.adminSecret;
  if (secret === ADMIN_MASTER_SECRET) {
    return next();
  }
  res.status(403).json({ error: 'Unauthorized: Invalid Admin Master Passcode' });
}

// 1. Verify Master Passcode
adminRouter.post('/admin/verify', (req, res): void => {
  const { passcode } = req.body;
  if (passcode === ADMIN_MASTER_SECRET) {
    res.json({ success: true, message: 'Admin Master Passcode accepted' });
  } else {
    res.status(401).json({ error: 'Incorrect Admin Master Passcode' });
  }
});

// 2. Platform Statistics
adminRouter.post('/admin/stats', verifyAdminSecret, async (_req, res): Promise<void> => {
  try {
    const userCount = (await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM users'))?.count || 0;
    const chatCount = (await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM chats'))?.count || 0;
    const messageCount = (await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM messages'))?.count || 0;

    res.json({
      stats: {
        totalUsers: Number(userCount),
        totalChats: Number(chatCount),
        totalMessages: Number(messageCount),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch platform stats' });
  }
});

// 3. List All Users
adminRouter.post('/admin/users', verifyAdminSecret, async (_req, res): Promise<void> => {
  try {
    const users = await db.all<User>(
      `SELECT id, email, display_name, username, anon_tag, avatar_url, bio, is_online, last_seen_at, created_at, is_admin
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list users' });
  }
});

// 4. Create Account as Admin (Can create normal or stealth admin accounts)
adminRouter.post('/admin/users/create', verifyAdminSecret, async (req, res): Promise<void> => {
  try {
    const { displayName, username, password, email, isAdmin } = req.body;

    if (!displayName || !username || !password) {
      res.status(400).json({ error: 'Display Name, Username, and Password are required' });
      return;
    }

    const cleanName = String(displayName).trim();
    const cleanUsername = String(username).trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.-]/g, '');

    if (cleanUsername.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters' });
      return;
    }

    // Check unique username
    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (existing) {
      res.status(409).json({ error: `Username @${cleanUsername} is already taken` });
      return;
    }

    const cleanEmail = email && String(email).trim()
      ? String(email).trim().toLowerCase()
      : `${cleanUsername}@loop.id`;

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = Date.now();
    const isMaster = isAdmin ? 1 : 0;

    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=10b981,059669&textColor=ffffff`;

    await db.run(
      `INSERT INTO users (id, email, password_hash, display_name, avatar_url, bio, is_online, last_seen_at, created_at, username, anon_tag, persona_type, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'PERSONAL', ?)`,
      [userId, cleanEmail, passwordHash, cleanName, defaultAvatar, 'Loop user', now, now, cleanUsername, cleanUsername, isMaster]
    );

    const token = signToken(userId);
    res.status(201).json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        display_name: cleanName,
        username: cleanUsername,
        avatar_url: defaultAvatar,
        is_admin: isMaster,
        created_at: now,
      },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user account' });
  }
});

// 5. Delete User (Ban/Remove completely)
adminRouter.post('/admin/users/delete', verifyAdminSecret, async (req, res): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Delete user cascades to chat_participants, messages, etc.
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

// 6. Direct Login As User (One-Click Impersonate / Switch)
adminRouter.post('/admin/login-as', verifyAdminSecret, async (req, res): Promise<void> => {
  try {
    const { userId } = req.body;
    const targetUser = await db.get<User>('SELECT * FROM users WHERE id = ?', [userId]);

    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    const token = signToken(targetUser.id);
    const { password_hash, ...user } = targetUser as any;
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to switch user' });
  }
});
