import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Explicitly load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
let isPostgres = !!(databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')));
let sqliteDb = null;
let pgPool = null;
function initSqlite() {
    if (!sqliteDb) {
        console.log('[DB] Initializing local SQLite database (loop.db)...');
        const dataDir = path.resolve(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = path.join(dataDir, 'loop.db');
        sqliteDb = new DatabaseSync(dbPath);
        sqliteDb.exec('PRAGMA journal_mode = WAL;');
        sqliteDb.exec('PRAGMA foreign_keys = ON;');
    }
}
if (isPostgres) {
    console.log('[DB] Connecting to PostgreSQL (Supabase / Cloud Database)...');
    pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });
}
else {
    initSqlite();
}
function toPgSql(sql) {
    let paramIdx = 1;
    return sql.replace(/\?/g, () => `$${paramIdx++}`);
}
export const db = {
    isPostgres,
    async all(sql, params = []) {
        if (isPostgres && pgPool) {
            const res = await pgPool.query(toPgSql(sql), params);
            return res.rows;
        }
        const stmt = sqliteDb.prepare(sql);
        return stmt.all(...params);
    },
    async get(sql, params = []) {
        if (isPostgres && pgPool) {
            const res = await pgPool.query(toPgSql(sql), params);
            return res.rows[0] || undefined;
        }
        const stmt = sqliteDb.prepare(sql);
        return stmt.get(...params);
    },
    async run(sql, params = []) {
        if (isPostgres && pgPool) {
            await pgPool.query(toPgSql(sql), params);
            return;
        }
        const stmt = sqliteDb.prepare(sql);
        stmt.run(...params);
    },
    async exec(sql) {
        if (isPostgres && pgPool) {
            await pgPool.query(sql);
            return;
        }
        sqliteDb.exec(sql);
    },
};
export async function initDatabase() {
    if (isPostgres && pgPool) {
        try {
            await pgPool.query('SELECT 1');
            console.log('[DB] PostgreSQL connection verified successfully.');
        }
        catch (err) {
            console.error('[DB] PostgreSQL connection failed (e.g. IPv6/ENETUNREACH). Falling back to SQLite:', err);
            isPostgres = false;
            db.isPostgres = false;
            try {
                await pgPool.end();
            }
            catch { }
            pgPool = null;
            initSqlite();
        }
    }
    if (isPostgres) {
        await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT DEFAULT '',
        bio TEXT DEFAULT 'Hey there! I am using Loop.',
        is_online INTEGER DEFAULT 0,
        last_seen_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('DIRECT', 'GROUP')),
        name TEXT,
        avatar_url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_participants (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('ADMIN', 'MEMBER')),
        joined_at BIGINT NOT NULL,
        last_read_at BIGINT NOT NULL,
        UNIQUE(chat_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_message_id TEXT,
        type TEXT NOT NULL DEFAULT 'TEXT' CHECK(type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO')),
        content TEXT NOT NULL DEFAULT '',
        media_url TEXT,
        media_mime_type TEXT,
        media_size INTEGER,
        media_name TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_receipts (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'SENT' CHECK(status IN ('SENT', 'DELIVERED', 'READ')),
        updated_at BIGINT NOT NULL,
        UNIQUE(message_id, recipient_id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_participants_user_id ON chat_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_message_id ON delivery_receipts(message_id);
    `);
    }
    else {
        await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT DEFAULT '',
        bio TEXT DEFAULT 'Hey there! I am using Loop.',
        is_online INTEGER DEFAULT 0,
        last_seen_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('DIRECT', 'GROUP')),
        name TEXT,
        avatar_url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_participants (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('ADMIN', 'MEMBER')),
        joined_at INTEGER NOT NULL,
        last_read_at INTEGER NOT NULL,
        UNIQUE(chat_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_message_id TEXT,
        type TEXT NOT NULL DEFAULT 'TEXT' CHECK(type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO')),
        content TEXT NOT NULL DEFAULT '',
        media_url TEXT,
        media_mime_type TEXT,
        media_size INTEGER,
        media_name TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_receipts (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'SENT' CHECK(status IN ('SENT', 'DELIVERED', 'READ')),
        updated_at INTEGER NOT NULL,
        UNIQUE(message_id, recipient_id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_participants_user_id ON chat_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_message_id ON delivery_receipts(message_id);
    `);
    }
}
