const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { 
  createRequest, 
  getRequests, 
  reviewNOC, 
  approveGM, 
  shipNOC, 
  receiveOM,
  cancelRequest
} = require('../controllers/requestController');
const authMiddleware = require('../middleware/authMiddleware');
const { body } = require('express-validator');
const validate = require('../middleware/validateMiddleware');

const uploadDir = path.join(__dirname, '..', 'uploads', 'receipts');
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

router.get('/', getRequests);

const normalizeRequestItems = (req, res, next) => {
  if (req.body && typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (error) {
      req.body.items = [];
    }
  }
  if (!req.body.items && req.body.materialId && req.body.quantity) {
    req.body.items = [{ materialId: req.body.materialId, quantity: req.body.quantity }];
  }
  next();
};

router.post('/', normalizeRequestItems, validate([
  body('siteId').notEmpty().withMessage('Site wajib diisi'),
  body().custom((_, { req }) => {
    const hasItems = Array.isArray(req.body.items) && req.body.items.length > 0;
    const hasSingle = req.body.materialId && req.body.quantity;
    if (!hasItems && !hasSingle) {
      throw new Error('Material wajib diisi');
    }
    return true;
  }),
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Material wajib diisi'),
  body('items.*.materialId')
    .optional()
    .notEmpty()
    .withMessage('Material wajib diisi'),
  body('items.*.quantity')
    .optional()
    .notEmpty()
    .withMessage('Quantity wajib diisi'),
  body('materialId')
    .optional()
    .notEmpty()
    .withMessage('Material wajib diisi'),
  body('quantity')
    .optional()
    .notEmpty()
    .withMessage('Quantity wajib diisi'),
  body('deadline').optional().isISO8601().withMessage('Deadline tidak valid')
]), createRequest);

// Endpoints matching client handleAction(req.id, 'action-url')
router.patch('/:id/review-noc', authMiddleware(['NOC', 'PROGRAMMER']), validate([
  body('approved').isBoolean().withMessage('Status approval tidak valid'),
  body('reason').optional().isString()
]), reviewNOC);
router.patch('/:id/approve-gm', authMiddleware(['GM', 'PROGRAMMER']), validate([
  body('approved').isBoolean().withMessage('Status approval tidak valid'),
  body('reason').optional().isString()
]), approveGM);
router.patch('/:id/ship-noc', authMiddleware(['NOC', 'PROGRAMMER']), validate([
  body('trackingNumber').notEmpty().withMessage('Nomor resi wajib diisi'),
  body('shippingPhoto').notEmpty().withMessage('Foto pengiriman wajib diisi'),
  body('eta').optional().isISO8601().withMessage('ETA tidak valid')
]), shipNOC);
router.patch('/:id/receive-om', authMiddleware(['OM', 'PROGRAMMER']), upload.single('receiptPhoto'), receiveOM);
router.patch('/:id/cancel', authMiddleware(['OM', 'PROGRAMMER']), validate([
  body('reason').notEmpty().withMessage('Alasan wajib diisi')
]), cancelRequest);

module.exports = router;
