const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Avatar upload — images only, 5MB
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  },
});

// Chat file upload — images + docs, 10MB
const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/', 'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'text/plain', 'application/zip',
    ];
    const ok = allowed.some(t => file.mimetype.startsWith(t));
    if (!ok) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

// POST /api/upload/avatar
router.post('/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'collabcity/avatars',
          public_id: `user_${req.user.id}`,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: result.secure_url },
      select: { id: true, avatar: true },
    });

    res.json({ url: updated.avatar });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// POST /api/upload/chat-file
router.post('/chat-file', auth, chatUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const isImage = req.file.mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';
    const publicId = `chat_${req.user.id}_${Date.now()}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'collabcity/chat',
          resource_type: resourceType,
          public_id: publicId,
          ...(isImage && {
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          }),
        },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    // Set expiry 7 days from now
    const fileExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    res.json({
      url: result.secure_url,
      cloudinaryId: result.public_id,
      type: isImage ? 'image' : 'file',
      name: req.file.originalname,
      expiresAt: fileExpiresAt,
    });
  } catch (err) {
    console.error('Chat file upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

module.exports = router;
