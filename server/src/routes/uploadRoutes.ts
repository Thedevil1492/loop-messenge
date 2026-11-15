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
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)
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

uploadRouter.post('/upload', requireAuth, upload.single('file'), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const mimeType = req.file.mimetype;
  let mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' = 'DOCUMENT';

  if (mimeType.startsWith('image/')) {
    mediaType = 'IMAGE';
  } else if (mimeType.startsWith('video/')) {
    mediaType = 'VIDEO';
  }

  let fileUrl = '';

  if (isSupabaseStorage && supabase && req.file.buffer) {
    let uploadedToCloud = false;
    try {
      const bucket = process.env.SUPABASE_BUCKET || 'loop-media';
      const ext = path.extname(req.file.originalname) || '.jpg';
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(fileName, req.file.buffer, {
        contentType: mimeType,
        upsert: true,
      });

      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        fileUrl = data.publicUrl;
        uploadedToCloud = true;
      } else {
        console.warn('[Supabase Storage Warning, fallback to local disk]:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Storage Exception, fallback to local disk]:', err);
    }

    if (!uploadedToCloud) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      if (req.file.buffer) {
        fs.writeFileSync(filePath, req.file.buffer);
      }
      fileUrl = `/uploads/${fileName}`;
    }
  } else {
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

// Direct Base64 upload for instant camera photos & canvas captures
uploadRouter.post('/upload-base64', requireAuth, async (req, res): Promise<void> => {
  try {
    const { dataUrl, filename } = req.body;
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Valid image dataUrl is required' });
      return;
    }

    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ error: 'Malformed base64 image data' });
      return;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = mimeType === 'image/png' ? '.png' : '.jpg';
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/${fileName}`;

    res.json({
      url: fileUrl,
      name: filename || `camera-${Date.now()}${ext}`,
      size: buffer.length,
      mimeType,
      mediaType: 'IMAGE',
    });
  } catch (err: any) {
    console.error('Base64 upload error:', err);
    res.status(500).json({ error: 'Failed to process camera capture' });
  }
});
