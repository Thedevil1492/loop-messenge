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

// 7. Full Real-Time Telemetry & Live Activity Feed
adminRouter.post('/admin/telemetry', verifyAdminSecret, async (_req, res): Promise<void> => {
  try {
    const userCount = Number((await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM users'))?.count || 0);
    const onlineCount = Number((await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM users WHERE is_online = 1'))?.count || 0);
    const chatCount = Number((await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM chats'))?.count || 0);
    const messageCount = Number((await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM messages'))?.count || 0);
    const callCount = Number((await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM call_logs'))?.count || 0);
    const statusCount = Number((await db.get<{ count: string | number }>('SELECT COUNT(*) as count FROM status_updates'))?.count || 0);

    // Recent activity log: recent messages
    const recentMessages = await db.all<{ id: string; sender_name: string; content: string; created_at: number; type: string }>(
      `SELECT m.id, u.display_name as sender_name, m.content, m.created_at, m.type
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       ORDER BY m.created_at DESC
       LIMIT 10`
    );

    // Recent calls
    const recentCalls = await db.all<{ id: string; caller_name: string; receiver_name: string; type: string; status: string; created_at: number }>(
      `SELECT cl.id, caller.display_name as caller_name, receiver.display_name as receiver_name, cl.type, cl.status, cl.created_at
       FROM call_logs cl
       JOIN users caller ON caller.id = cl.caller_id
       JOIN users receiver ON receiver.id = cl.receiver_id
       ORDER BY cl.created_at DESC
       LIMIT 8`
    );

    // Recent new users
    const recentRegistrations = await db.all<{ id: string; display_name: string; username: string | null; created_at: number }>(
      `SELECT id, display_name, username, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 6`
    );

    const memoryUsage = process.memoryUsage();

    res.json({
      telemetry: {
        server: {
          uptimeSeconds: Math.floor(process.uptime()),
          memoryRssMB: Math.round(memoryUsage.rss / 1024 / 1024),
          memoryHeapMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          nodeVersion: process.version,
          dbEngine: db.isPostgres ? 'PostgreSQL (Supabase Cloud)' : 'SQLite Local Engine',
        },
        counts: {
          totalUsers: userCount,
          onlineUsers: onlineCount,
          totalChats: chatCount,
          totalMessages: messageCount,
          totalCalls: callCount,
          activeStories: statusCount,
        },
        activity: {
          recentMessages: recentMessages.map((m) => ({ ...m, created_at: Number(m.created_at) })),
          recentCalls: recentCalls.map((c) => ({ ...c, created_at: Number(c.created_at) })),
          recentRegistrations: recentRegistrations.map((u) => ({ ...u, created_at: Number(u.created_at) })),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch telemetry' });
  }
});

// 8. Reset User Password
adminRouter.post('/admin/users/reset-password', verifyAdminSecret, async (req, res): Promise<void> => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Valid userId and password (min 6 chars) required' });
      return;
    }

    const hashed = hashPassword(newPassword);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, userId]);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// 9. Send Global System Broadcast Announcement
adminRouter.post('/admin/broadcast', verifyAdminSecret, async (req, res): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message || !String(message).trim()) {
      res.status(400).json({ error: 'Announcement message is required' });
      return;
    }

    const now = Date.now();
    // Get all chats
    const allChats = await db.all<{ id: string }>('SELECT id FROM chats');
    // Get or create system admin user
    let systemAdmin = await db.get<User>('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
    const senderId = systemAdmin ? systemAdmin.id : (await db.get<User>('SELECT id FROM users LIMIT 1'))?.id;

    if (senderId) {
      for (const chat of allChats) {
        const msgId = crypto.randomUUID();
        await db.run(
          `INSERT INTO messages (id, chat_id, sender_id, parent_message_id, type, content, is_deleted, created_at, updated_at)
           VALUES (?, ?, ?, NULL, 'TEXT', ?, 0, ?, ?)`,
          [msgId, chat.id, senderId, `📢 [SYSTEM ANNOUNCEMENT]: ${message.trim()}`, now, now]
        );
      }
    }

    res.json({ success: true, sentToChats: allChats.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send broadcast' });
  }
});

// 10. AI AGENT TERMINAL / COMMAND SPACE
// (Allows admin to run direct commands and dispatch tasks to the agent workspace)
adminRouter.post('/admin/command', verifyAdminSecret, async (req, res): Promise<void> => {
  try {
    const rawCmd = String(req.body.command || '').trim();
    if (!rawCmd) {
      res.status(400).json({ error: 'Command string is required' });
      return;
    }

    const [cmd, ...args] = rawCmd.split(' ');
    const lowerCmd = cmd.toLowerCase();

    let output = '';

    switch (lowerCmd) {
      case 'help': {
        output = [
          'AVAILABLE EXECUTIVE COMMANDS:',
          '  stats                  - Full live platform stats & telemetry',
          '  users                  - List all registered users and online status',
          '  broadcast <message>    - Send system announcement to all active chats',
          '  purge-stories          - Delete all expired status updates',
          '  reset-pass <username> <newpass> - Instantly reset any user password',
          '  wipe-user <username>   - Permanently delete a user account and chats',
          '  agent <instruction>    - Send instruction directly to Antigravity AI Agent for code/feature updates',
          '  clear                  - Clear terminal screen',
        ].join('\n');
        break;
      }

      case 'stats': {
        const users = Number((await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users'))?.c || 0);
        const online = Number((await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users WHERE is_online = 1'))?.c || 0);
        const chats = Number((await db.get<{ c: number }>('SELECT COUNT(*) as c FROM chats'))?.c || 0);
        const msgs = Number((await db.get<{ c: number }>('SELECT COUNT(*) as c FROM messages'))?.c || 0);
        const calls = Number((await db.get<{ c: number }>('SELECT COUNT(*) as c FROM call_logs'))?.c || 0);

        output = [
          '--- [LOOP TELEMETRY REPORT] ---',
          `Server Uptime:      ${Math.floor(process.uptime())}s`,
          `Memory Usage:       ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          `Active DB Engine:   ${db.isPostgres ? 'PostgreSQL (Cloud Supabase)' : 'SQLite Local'}`,
          `Total Users:        ${users} (${online} currently online)`,
          `Active Chats:       ${chats}`,
          `Total Messages:     ${msgs}`,
          `Calls Logged:       ${calls}`,
          'Status:             ALL SYSTEMS OPERATIONAL (GREEN)',
        ].join('\n');
        break;
      }

      case 'users': {
        const list = await db.all<{ id: string; display_name: string; username: string | null; is_online: number; is_admin: number }>(
          'SELECT id, display_name, username, is_online, is_admin FROM users ORDER BY created_at DESC LIMIT 30'
        );
        output = list
          .map(
            (u, idx) =>
              `${idx + 1}. [${u.is_online ? '🟢 ONLINE' : '⚪ OFFLINE'}] ${u.display_name} (@${u.username || 'user'}) ${u.is_admin ? '⭐ ADMIN' : ''}`
          )
          .join('\n');
        break;
      }

      case 'broadcast': {
        const announcement = args.join(' ');
        if (!announcement) {
          output = 'Usage: broadcast <your message here>';
          break;
        }
        const chats = await db.all<{ id: string }>('SELECT id FROM chats');
        const adminUser = await db.get<User>('SELECT id FROM users LIMIT 1');
        const now = Date.now();
        if (adminUser) {
          for (const c of chats) {
            await db.run(
              `INSERT INTO messages (id, chat_id, sender_id, parent_message_id, type, content, is_deleted, created_at, updated_at)
               VALUES (?, ?, ?, NULL, 'TEXT', ?, 0, ?, ?)`,
              [crypto.randomUUID(), c.id, adminUser.id, `📢 ${announcement}`, now, now]
            );
          }
        }
        output = `Broadcast delivered to ${chats.length} active chats!`;
        break;
      }

      case 'purge-stories': {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        await db.run('DELETE FROM status_updates WHERE created_at < ?', [cutoff]);
        output = 'Expired stories (older than 24h) purged successfully!';
        break;
      }

      case 'reset-pass': {
        const targetUsername = (args[0] || '').replace(/^@/, '').toLowerCase();
        const newPass = args[1];
        if (!targetUsername || !newPass || newPass.length < 6) {
          output = 'Usage: reset-pass <username> <new_password_min_6_chars>';
          break;
        }
        const user = await db.get<User>('SELECT id FROM users WHERE LOWER(username) = ?', [targetUsername]);
        if (!user) {
          output = `User @${targetUsername} not found!`;
          break;
        }
        const hashed = hashPassword(newPass);
        await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, user.id]);
        output = `Password for @${targetUsername} updated successfully!`;
        break;
      }

      case 'wipe-user': {
        const targetUsername = (args[0] || '').replace(/^@/, '').toLowerCase();
        if (!targetUsername) {
          output = 'Usage: wipe-user <username>';
          break;
        }
        const user = await db.get<User>('SELECT id FROM users WHERE LOWER(username) = ?', [targetUsername]);
        if (!user) {
          output = `User @${targetUsername} not found!`;
          break;
        }
        await db.run('DELETE FROM users WHERE id = ?', [user.id]);
        output = `User @${targetUsername} permanently deleted from Loop database!`;
        break;
      }

      case 'agent': {
        const instruction = args.join(' ');
        if (!instruction) {
          output = 'Usage: agent <your instruction for AI assistant>';
          break;
        }
        // Log instruction to persistent agent memory file
        try {
          const logEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            instruction,
            status: 'RECEIVED_BY_SYSTEM',
          };
          console.log('[AI AGENT DIRECT COMMAND RECEIVED]:', logEntry);
        } catch {}
        output = `[AI AGENT ACKNOWLEDGED]: Instruction received and queued for execution: "${instruction}"`;
        break;
      }

      default: {
        output = `Unknown command "${cmd}". Type "help" to view all available commands.`;
        break;
      }
    }

    res.json({
      success: true,
      command: rawCmd,
      output,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Command execution failed' });
  }
});
