import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, type AuthenticatedRequest } from '../auth.js';
import type { User } from '../types.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res): Promise<void> => {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'Email, password, and display name are required' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(displayName).trim();

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = Date.now();

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=2b5bf4,06b6d4&textColor=ffffff`;

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, avatar_url, bio, is_online, last_seen_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [userId, cleanEmail, passwordHash, cleanName, defaultAvatar, 'Hey there! I am using Loop.', now, now]
  );

  const token = signToken(userId);
  const user: User = {
    id: userId,
    email: cleanEmail,
    display_name: cleanName,
    avatar_url: defaultAvatar,
    bio: 'Hey there! I am using Loop.',
    is_online: 1,
    last_seen_at: now,
    created_at: now,
  };

  res.status(201).json({ token, user });
});

authRouter.post('/login', async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const row = await db.get<User & { password_hash: string }>(
    'SELECT * FROM users WHERE email = ?',
    [cleanEmail]
  );

  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(row.id);
  const { password_hash, ...user } = row;

  res.json({ token, user });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res): void => {
  res.json({ user: req.user });
});

authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { displayName, bio, avatarUrl } = req.body;
  const userId = req.user!.id;

  const current = (await db.get<User>('SELECT * FROM users WHERE id = ?', [userId]))!;

  const updatedName = displayName ? String(displayName).trim() : current.display_name;
  const updatedBio = bio !== undefined ? String(bio).trim() : current.bio;
  const updatedAvatar = avatarUrl !== undefined ? String(avatarUrl).trim() : current.avatar_url;

  await db.run(
    'UPDATE users SET display_name = ?, bio = ?, avatar_url = ? WHERE id = ?',
    [updatedName, updatedBio, updatedAvatar, userId]
  );

  const updatedUser: User = {
    ...current,
    display_name: updatedName,
    bio: updatedBio,
    avatar_url: updatedAvatar,
  };

  res.json({ user: updatedUser });
});
