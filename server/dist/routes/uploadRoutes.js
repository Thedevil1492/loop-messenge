import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../auth.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Memory storage if Supabase is configured; otherwise disk storage
const isSupabaseStorage = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
const supabase = isSupabaseStorage
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;
const upload = multer({
    storage: isSupabaseStorage ? multer.memoryStorage() : multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname);
            const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
            cb(null, unique);
        },
    }),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
});
export const uploadRouter = Router();
uploadRouter.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const mimeType = req.file.mimetype;
    let mediaType = 'DOCUMENT';
    if (mimeType.startsWith('image/')) {
        mediaType = 'IMAGE';
    }
    else if (mimeType.startsWith('video/')) {
        mediaType = 'VIDEO';
    }
    let fileUrl = '';
    if (isSupabaseStorage && supabase && req.file.buffer) {
        const bucket = process.env.SUPABASE_BUCKET || 'loop-media';
        const ext = path.extname(req.file.originalname);
        const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, req.file.buffer, {
            contentType: mimeType,
            upsert: true,
        });
        if (error) {
            console.error('[Supabase Storage Error]:', error);
            res.status(500).json({ error: 'Failed to upload media to cloud storage' });
            return;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        fileUrl = data.publicUrl;
    }
    else {
        fileUrl = `/uploads/${req.file.filename}`;
    }
    res.json({
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        mediaType,
    });
});
