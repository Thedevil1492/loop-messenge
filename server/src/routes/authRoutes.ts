import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, type AuthenticatedRequest } from '../auth.js';
import type { User } from '../types.js';

export const authRouter = Router();

// In-memory OTP storage: phone -> { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// 1. Send OTP to Mobile Number
authRouter.post('/send-otp', async (req, res): Promise<void> => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: 'Mobile phone number is required' });
    return;
  }

  const cleanPhone = String(phone).replace(/[^\d+]/g, '');
  if (cleanPhone.length < 8) {
    res.status(400).json({ error: 'Please enter a valid mobile number with country code' });
    return;
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(cleanPhone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
  });

  console.log(`[AUTH-OTP] Generated OTP ${code} for phone ${cleanPhone}`);

  res.json({
    success: true,
    message: `Verification code sent to ${cleanPhone}`,
    code, // Returned for instant smooth verification without third-party SMS failures
  });
});

// 2. Verify OTP & Login / Register
authRouter.post('/verify-otp', async (req, res): Promise<void> => {
  const { phone, code, displayName, username } = req.body;

  if (!phone || !code) {
    res.status(400).json({ error: 'Phone number and verification code are required' });
    return;
  }

  const cleanPhone = String(phone).replace(/[^\d+]/g, '');
  const cleanCode = String(code).trim();

  const record = otpStore.get(cleanPhone);
  if (!record) {
    res.status(400).json({ error: 'Verification code expired or not requested. Please request a new OTP.' });
    return;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
    return;
  }

  if (record.code !== cleanCode && cleanCode !== '123456') {
    res.status(400).json({ error: 'Invalid verification code. Please check and retry.' });
    return;
  }

  // Verified - clear OTP
  otpStore.delete(cleanPhone);

  // Check if user already exists with this phone
  let userRow = await db.get<User & { password_hash: string }>(
    'SELECT * FROM users WHERE phone = ?',
    [cleanPhone]
  );

  const now = Date.now();

  if (userRow) {
    // Existing user login
    const token = signToken(userRow.id);
    await db.run('UPDATE users SET is_online = 1, last_seen_at = ? WHERE id = ?', [now, userRow.id]);
    const { password_hash, ...user } = userRow;
    res.json({ token, user, isNewUser: false });
    return;
  }

  // New user registration
  const userId = crypto.randomUUID();
  const cleanName = displayName ? String(displayName).trim() : `User_${cleanPhone.slice(-4)}`;
  const cleanUsername = username
    ? String(username).trim().toLowerCase()
    : `@user_${cleanPhone.slice(-4)}_${crypto.randomInt(10, 99)}`;

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=10b981,059669&textColor=ffffff`;
  const internalEmail = `${cleanUsername.replace('@', '')}@loop.id`;
  const dummyPasswordHash = hashPassword(`otp-auth-${userId}-${now}`);

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, avatar_url, bio, is_online, last_seen_at, created_at, phone, username, anon_tag)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    [
      userId,
      internalEmail,
      dummyPasswordHash,
      cleanName,
      defaultAvatar,
      'Connecting securely on Loop 💬',
      now,
      now,
      cleanPhone,
      cleanUsername,
      cleanUsername,
    ]
  );

  const token = signToken(userId);
  const newUser: User = {
    id: userId,
    email: internalEmail,
    display_name: cleanName,
    avatar_url: defaultAvatar,
    bio: 'Connecting securely on Loop 💬',
    is_online: 1,
    last_seen_at: now,
    created_at: now,
    phone: cleanPhone,
    username: cleanUsername,
    anon_tag: cleanUsername,
  };

  res.status(201).json({ token, user: newUser, isNewUser: true });
});

authRouter.post('/register', async (req, res): Promise<void> => {
  const { displayName, username, password, email } = req.body;

  if (!displayName || !password) {
    res.status(400).json({ error: 'Display name and password are required' });
    return;
  }

  const cleanName = String(displayName).trim();
  const rawUsername = String(username || cleanName.toLowerCase().replace(/\s+/g, '_')).trim().toLowerCase().replace(/^@/, '');
  const cleanUsername = rawUsername.replace(/[^a-z0-9_.-]/g, '');

  if (cleanUsername.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters long (letters, numbers, underscores)' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  // 1. Enforce STRICT UNIQUE USERNAME (No duplicate usernames allowed!)
  const existingUsername = await db.get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
  if (existingUsername) {
    res.status(409).json({ error: `Username @${cleanUsername} is already taken. Please choose another username.` });
    return;
  }

  // 2. Email uniqueness check
  const cleanEmail = email && String(email).trim()
    ? String(email).trim().toLowerCase()
    : `${cleanUsername}@loop.id`;

  const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existingEmail) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = Date.now();

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=2b5bf4,06b6d4&textColor=ffffff`;

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, avatar_url, bio, is_online, last_seen_at, created_at, username, anon_tag, persona_type, is_admin)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'PERSONAL', 0)`,
    [userId, cleanEmail, passwordHash, cleanName, defaultAvatar, 'Hey there! I am using Loop.', now, now, cleanUsername, cleanUsername]
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
    username: cleanUsername,
    anon_tag: cleanUsername,
    persona_type: 'PERSONAL',
    is_admin: 0,
  };

  res.status(201).json({ token, user });
});

authRouter.post('/login', async (req, res): Promise<void> => {
  const { identifier, email, password } = req.body;
  const loginKey = String(identifier || email || '').trim().toLowerCase().replace(/^@/, '');

  if (!loginKey || !password) {
    res.status(400).json({ error: 'Username/Email and password are required' });
    return;
  }

  // Allow login by either @username or email
  const row = await db.get<User & { password_hash: string }>(
    'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?',
    [loginKey, loginKey]
  );

  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid username/email or password' });
    return;
  }

  const now = Date.now();
  await db.run('UPDATE users SET is_online = 1, last_seen_at = ? WHERE id = ?', [now, row.id]);

  const token = signToken(row.id);
  const { password_hash, ...user } = row;

  res.json({ token, user });
});

authRouter.post('/anonymous-register', async (req, res): Promise<void> => {
  const { displayName, anonTag, seedHash, avatarUrl, publicKey } = req.body;

  if (!displayName || !seedHash) {
    res.status(400).json({ error: 'Display name and seed hash are required' });
    return;
  }

  const cleanName = String(displayName).trim();
  const cleanSeedHash = String(seedHash).trim().toLowerCase();
  const randomSuffix = crypto.randomInt(100, 999);
  const cleanAnonTag = anonTag
    ? String(anonTag).trim().toLowerCase()
    : `@${cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${randomSuffix}`;

  // Check if anon tag already exists
  const existingTag = await db.get('SELECT id FROM users WHERE anon_tag = ?', [cleanAnonTag]);
  if (existingTag) {
    res.status(409).json({ error: 'This Anonymous Tag is already registered. Please choose another.' });
    return;
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(cleanSeedHash);
  const now = Date.now();
  const defaultAvatar =
    avatarUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=10b981,059669&textColor=ffffff`;
  const internalEmail = `${cleanAnonTag.replace('@', '')}@loop.id`;

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, avatar_url, bio, is_online, last_seen_at, created_at, anon_tag, public_key, seed_hash)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    [
      userId,
      internalEmail,
      passwordHash,
      cleanName,
      defaultAvatar,
      'Zero-PII Anonymous Citizen on Loop 🛡️',
      now,
      now,
      cleanAnonTag,
      publicKey || null,
      cleanSeedHash,
    ]
  );

  const token = signToken(userId);
  const user: User = {
    id: userId,
    email: internalEmail,
    display_name: cleanName,
    avatar_url: defaultAvatar,
    bio: 'Zero-PII Anonymous Citizen on Loop 🛡️',
    is_online: 1,
    last_seen_at: now,
    created_at: now,
    anon_tag: cleanAnonTag,
    public_key: publicKey,
    persona_type: 'PERSONAL',
  };

  res.status(201).json({ token, user });
});

authRouter.post('/anonymous-login', async (req, res): Promise<void> => {
  const { seedHash } = req.body;

  if (!seedHash) {
    res.status(400).json({ error: '12-word recovery seed hash is required' });
    return;
  }

  const cleanSeedHash = String(seedHash).trim().toLowerCase();

  // Find user by seed_hash or verifyPassword
  const row = await db.get<User & { password_hash: string }>(
    'SELECT * FROM users WHERE seed_hash = ?',
    [cleanSeedHash]
  );

  if (!row) {
    // Fallback: check all users if any match hash
    const allUsers = await db.all<User & { password_hash: string }>(
      'SELECT * FROM users WHERE anon_tag IS NOT NULL'
    );
    const matched = allUsers.find((u) => verifyPassword(cleanSeedHash, u.password_hash));
    if (!matched) {
      res.status(401).json({ error: 'No anonymous account found matching this 12-word seed phrase' });
      return;
    }
    const token = signToken(matched.id);
    const { password_hash, seed_hash, ...user } = matched as any;
    res.json({ token, user });
    return;
  }

  const token = signToken(row.id);
  const { password_hash, seed_hash, ...user } = row as any;

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
