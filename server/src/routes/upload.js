const path = require('path');
const crypto = require('crypto');
const router = require('express').Router();
const multer = require('multer');
const HttpError = require('../utils/httpError');
const { protect, admin } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (ALLOWED[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed'))),
});

router.post('/', protect, admin, upload.single('image'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

module.exports = { router, UPLOAD_DIR };
