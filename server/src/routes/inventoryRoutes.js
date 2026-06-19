const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { body, param } = require('express-validator');
const upload = require('../middleware/uploadMiddleware');
const { 
  getInventory, 
  updateStock, 
  getAlerts, 
  getLogs, 
  upsertMaterial, 
  deleteMaterial,
  deleteInventory,
  getShipments,
  getSites,
  getMaterials,
  updateThresholds,
  markAlertRead,
  resolveAlert,
  getStockMovements,
  getAlertById,
  getAlertTimeline,
  resolveAlertWithReason,
  markAlertViewed,
  getAlertStats
} = require('../controllers/inventoryController');

// Inventory Routes (Prefix is /api/inventory)
router.get('/', authMiddleware(), getInventory);
router.get('/sites', authMiddleware(), getSites);
router.get('/materials', authMiddleware(), getMaterials);

router.post('/update-thresholds', authMiddleware(['NOC', 'PROGRAMMER']), updateThresholds);

router.post('/upsert', 
  authMiddleware(['NOC', 'PROGRAMMER']), 
  upload.single('image'),
  validate([
    body('sku').notEmpty().withMessage('SKU wajib diisi'),
    body('name').notEmpty().withMessage('Nama material wajib diisi'),
  ]),
  upsertMaterial
);

router.delete('/:id', 
  authMiddleware(['NOC', 'PROGRAMMER']), 
  validate([
    param('id').isInt().withMessage('ID tidak valid'),
  ]),
  deleteMaterial
);

router.delete('/stock/:id',
  authMiddleware(['NOC', 'PROGRAMMER']),
  validate([
    param('id').isInt().withMessage('ID Inventory tidak valid'),
  ]),
  deleteInventory
);

router.post('/update', 
  authMiddleware(['NOC', 'OM', 'PROGRAMMER']), 
  validate([
    body('id').isInt().withMessage('ID Inventory tidak valid'),
    body('adjustment').isInt().withMessage('Adjustment harus angka'),
  ]),
  updateStock
);

router.get('/alerts', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), getAlerts);
router.get('/alerts/stats', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), getAlertStats);
router.get('/alerts/:id', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), getAlertById);
router.get('/alerts/:id/timeline', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), getAlertTimeline);
router.patch('/alerts/:id/read', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), markAlertRead);
router.patch('/alerts/:id/viewed', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), markAlertViewed);
router.patch('/alerts/:id/resolve', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), resolveAlert);
router.patch('/alerts/:id/resolve-with-reason', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), resolveAlertWithReason);
router.get('/audit-logs', authMiddleware(['NOC', 'GM', 'PROGRAMMER', 'OM']), getLogs);
router.get('/shipments', authMiddleware(['NOC', 'GM', 'OM', 'PROGRAMMER']), getShipments);
router.get('/movements', authMiddleware(['NOC', 'GM', 'OM', 'PROGRAMMER']), getStockMovements);

module.exports = router;
