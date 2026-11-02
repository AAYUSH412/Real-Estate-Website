import multer from 'multer';
import path from 'node:path';

// Bounded buffers avoid temporary files surviving rejected/failed requests.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4, fields: 40, fieldSize: 64 * 1024, parts: 44 },
  fileFilter(req, file, cb) {
    const allowed = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    const mime = allowed[path.extname(file.originalname).toLowerCase()];
    if (!mime || mime !== file.mimetype) return cb(Object.assign(new Error('Only JPEG, PNG, GIF and WebP images are allowed'), { status: 400 }));
    cb(null, true);
  },
});
export default upload;
