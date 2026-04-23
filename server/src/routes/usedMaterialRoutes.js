const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { createReport, getReports, updateReportStatus } = require('../controllers/usedMaterialController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { body } = require('express-validator');

const uploadDir = path.join(__dirname, '..', 'uploads', 'used-materials');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.use(authMiddleware());

router.post('/', authMiddleware(['OM', 'NOC', 'PROGRAMMER']), upload.single('photo'), validate([
  body('materialId').notEmpty().withMessage('Material wajib diisi'),
  body('materialId').isInt().withMessage('Material tidak valid'),
  body('quantity').notEmpty().withMessage('Quantity wajib diisi'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity minimal 1'),
  body('condition').notEmpty().withMessage('Kondisi wajib diisi'),
  body('condition').isIn(['GOOD', 'REPAIRABLE', 'BROKEN']).withMessage('Kondisi tidak valid'),
  body('description').optional().isString().withMessage('Deskripsi tidak valid'),
  body('conditionPercentage').optional().isInt({ min: 0, max: 100 }).withMessage('Persentase kondisi harus 0-100'),
  body('siteId').optional().isInt().withMessage('Site tidak valid')
]), createReport);
router.get('/', authMiddleware(['OM', 'NOC', 'GM', 'PROGRAMMER']), getReports);
router.patch('/:id/status', authMiddleware(['NOC', 'GM', 'PROGRAMMER']), validate([
  body('status').notEmpty().withMessage('Status wajib diisi'),
  body('status').isIn(['REPORTED', 'ACKNOWLEDGED', 'RECYCLED', 'DISPOSED']).withMessage('Status tidak valid')
]), updateReportStatus);

module.exports = router;
