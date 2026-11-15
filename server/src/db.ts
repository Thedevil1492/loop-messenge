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

const DEFAULT_SUPABASE_POOLER_URL = 'postgresql://postgres.asnefjwtogfbhsmvdbvj:Theayushjha88%40@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

let databaseUrl = process.env.DATABASE_URL;

// Automatically upgrade any direct IPv6 Supabase connection to the verified IPv4 pooler
if (!databaseUrl || databaseUrl.includes('db.asnefjwtogfbhsmvdbvj.supabase.co')) {
  console.log('[DB] Using verified IPv4 Cloud PostgreSQL Pooler (Supabase)...');
  databaseUrl = DEFAULT_SUPABASE_POOLER_URL;
}

let isPostgres = !!(databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')));

let sqliteDb: DatabaseSync | null = null;
let pgPool: pg.Pool | null = null;

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
  console.log('[DB] Connecting to Cloud Database (Supabase PostgreSQL)...');
  pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl!.includes('localhost') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
} else {
  initSqlite();
}

function toPgSql(sql: string): string {
  let paramIdx = 1;
  return sql.replace(/\?/g, () => `$${paramIdx++}`);
}

export const db = {
  isPostgres,

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (isPostgres && pgPool) {
      const res = await pgPool.query(toPgSql(sql), params);
      return res.rows as T[];
    }
    const stmt = sqliteDb!.prepare(sql);
    return stmt.all(...params) as unknown as T[];
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (isPostgres && pgPool) {
      const res = await pgPool.query(toPgSql(sql), params);
      return (res.rows[0] as T) || undefined;
    }
    const stmt = sqliteDb!.prepare(sql);
    return stmt.get(...params) as unknown as T | undefined;
  },

  async run(sql: string, params: any[] = []): Promise<void> {
    if (isPostgres && pgPool) {
      await pgPool.query(toPgSql(sql), params);
      return;
    }
    const stmt = sqliteDb!.prepare(sql);
    stmt.run(...params);
  },

  async exec(sql: string): Promise<void> {
    if (isPostgres && pgPool) {
      await pgPool.query(sql);
      return;
    }
    sqliteDb!.exec(sql);
  },
};

export async function initDatabase() {
  if (isPostgres && pgPool) {
    try {
      await pgPool.query('SELECT 1');
      console.log('[DB] ✅ PostgreSQL Cloud Database connected successfully.');
    } catch {
      console.log('[DB] Notice: Cloud direct IPv6 not supported by host network. Operating on high-performance SQLite engine.');
      isPostgres = false;
      db.isPostgres = false;
      try {
        await pgPool.end();
      } catch {}
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

      -- Anonymous & Phone Zero-PII columns migration
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS anon_tag TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS seed_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS persona_type TEXT DEFAULT 'PERSONAL';
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_anon_tag ON users(anon_tag);
      CREATE INDEX IF NOT EXISTS idx_users_seed_hash ON users(seed_hash);

      -- Status Stories Table
      CREATE TABLE IF NOT EXISTS status_updates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT DEFAULT '',
        media_url TEXT,
        bg_color TEXT DEFAULT '#10b981',
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_status_user ON status_updates(user_id, created_at);

      -- Call Logs Table
      CREATE TABLE IF NOT EXISTS call_logs (
        id TEXT PRIMARY KEY,
        caller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chat_id TEXT REFERENCES chats(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('AUDIO', 'VIDEO')),
        status TEXT NOT NULL CHECK(status IN ('MISSED', 'COMPLETED', 'DECLINED')),
        duration INTEGER DEFAULT 0,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_calls_receiver ON call_logs(receiver_id, created_at);
    `);
  } else {
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

    // Safe column additions for SQLite
    try { sqliteDb!.exec('ALTER TABLE users ADD COLUMN username TEXT;'); } catch {}
    try { sqliteDb!.exec('ALTER TABLE users ADD COLUMN phone TEXT;'); } catch {}
    try { sqliteDb!.exec('ALTER TABLE users ADD COLUMN anon_tag TEXT;'); } catch {}
    try { sqliteDb!.exec('ALTER TABLE users ADD COLUMN public_key TEXT;'); } catch {}
    try { sqliteDb!.exec('ALTER TABLE users ADD COLUMN seed_hash TEXT;'); } catch {}
    try { sqliteDb!.exec("ALTER TABLE users ADD COLUMN persona_type TEXT DEFAULT 'PERSONAL';"); } catch {}
    try { sqliteDb!.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);'); } catch {}
    try { sqliteDb!.exec('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);'); } catch {}
    try { sqliteDb!.exec('CREATE INDEX IF NOT EXISTS idx_users_anon_tag ON users(anon_tag);'); } catch {}
    try { sqliteDb!.exec('CREATE INDEX IF NOT EXISTS idx_users_seed_hash ON users(seed_hash);'); } catch {}

    try {
      sqliteDb!.exec(`
        CREATE TABLE IF NOT EXISTS status_updates (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          text TEXT DEFAULT '',
          media_url TEXT,
          bg_color TEXT DEFAULT '#10b981',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_status_user ON status_updates(user_id, created_at);

        CREATE TABLE IF NOT EXISTS call_logs (
          id TEXT PRIMARY KEY,
          caller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          chat_id TEXT REFERENCES chats(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK(type IN ('AUDIO', 'VIDEO')),
          status TEXT NOT NULL CHECK(status IN ('MISSED', 'COMPLETED', 'DECLINED')),
          duration INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_calls_receiver ON call_logs(receiver_id, created_at);
      `);
    } catch {}
  }
}
