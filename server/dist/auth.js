import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET || 'loop_dev_secret_key_2026_super_secure';
export function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}
export function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}
export function signToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const user = await db.get('SELECT id, email, display_name, avatar_url, bio, is_online, last_seen_at, created_at FROM users WHERE id = ?', [payload.userId]);
    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
    }
    req.user = user;
    next();
}
