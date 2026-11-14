import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { initDatabase, db } from './db.js';
import { authRouter } from './routes/authRoutes.js';
import { chatRouter } from './routes/chatRoutes.js';
import { uploadRouter } from './routes/uploadRoutes.js';
import { setupWebSocketServer } from './ws.js';
import { hashPassword } from './auth.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function seedInitialData() {
    try {
        const res = await db.get('SELECT COUNT(*) as count FROM users');
        const count = Number(res?.count || 0);
        if (count === 0) {
            console.log('[Seed] Seeding demo accounts (alice@loop.app / bob@loop.app)...');
            const now = Date.now();
            const aliceId = crypto.randomUUID();
            const bobId = crypto.randomUUID();
            const pwd = hashPassword('password123');
            await db.run(`INSERT INTO users (id, email, password_hash, display_name, avatar_url, bio, is_online, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`, [
                aliceId,
                'alice@loop.app',
                pwd,
                'Alice Chen',
                'https://api.dicebear.com/7.x/initials/svg?seed=Alice%20Chen&backgroundColor=2b5bf4,06b6d4&textColor=ffffff',
                'Always in the loop!',
                now,
                now,
            ]);
            await db.run(`INSERT INTO users (id, email, password_hash, display_name, avatar_url, bio, is_online, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`, [
                bobId,
                'bob@loop.app',
                pwd,
                'Bob Miller',
                'https://api.dicebear.com/7.x/initials/svg?seed=Bob%20Miller&backgroundColor=1e38b6,4376fb&textColor=ffffff',
                'Available on mobile and desktop',
                now,
                now,
            ]);
            const chatId = crypto.randomUUID();
            await db.run(`INSERT INTO chats (id, type, name, avatar_url, description, created_by, created_at, updated_at)
         VALUES (?, 'DIRECT', NULL, '', '', ?, ?, ?)`, [chatId, aliceId, now, now]);
            await db.run(`INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at, last_read_at)
         VALUES (?, ?, ?, 'MEMBER', ?, ?)`, [crypto.randomUUID(), chatId, aliceId, now, now]);
            await db.run(`INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at, last_read_at)
         VALUES (?, ?, ?, 'MEMBER', ?, ?)`, [crypto.randomUUID(), chatId, bobId, now, 0]);
            const msgId = crypto.randomUUID();
            await db.run(`INSERT INTO messages (id, chat_id, sender_id, parent_message_id, type, content, media_url, media_mime_type, media_size, media_name, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 'TEXT', 'Welcome to Loop! Fast, real-time messaging ready for mobile and desktop.', NULL, NULL, NULL, NULL, 0, ?, ?)`, [msgId, chatId, aliceId, now, now]);
            await db.run(`INSERT INTO delivery_receipts (id, message_id, recipient_id, status, updated_at)
         VALUES (?, ?, ?, 'SENT', ?)`, [crypto.randomUUID(), msgId, bobId, now]);
        }
    }
    catch (err) {
        console.error('Error during initial data seeding:', err);
    }
}
async function startServer() {
    await initDatabase();
    await seedInitialData();
    const app = express();
    const server = http.createServer(app);
    // Configure CORS
    const corsOrigin = process.env.CORS_ORIGIN || '*';
    app.use(cors({
        origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
        credentials: true,
    }));
    app.use(express.json());
    // Serve static uploaded files
    const uploadDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    app.use('/uploads', express.static(uploadDir));
    // Mount API routes
    app.use('/api/auth', authRouter);
    app.use('/api', chatRouter);
    app.use('/api', uploadRouter);
    // Health check endpoint for Render/Railway
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: Date.now() });
    });
    // Serve static frontend assets when bundled
    const publicDir = path.resolve(__dirname, '../public');
    if (fs.existsSync(publicDir)) {
        app.use(express.static(publicDir));
        app.get('*', (_req, res) => {
            res.sendFile(path.join(publicDir, 'index.html'));
        });
    }
    // Attach WebSockets
    setupWebSocketServer(server);
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
    const HOST = '0.0.0.0';
    server.listen(PORT, HOST, () => {
        console.log(`====================================================`);
        console.log(`  Loop Messenger Server is running!`);
        console.log(`  Port:      ${PORT}`);
        console.log(`  Database:  ${db.isPostgres ? 'PostgreSQL (Supabase/Cloud)' : 'Local SQLite'}`);
        console.log(`====================================================`);
    });
}
startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
