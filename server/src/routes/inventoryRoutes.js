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
  getShipments,
  getSites,
  getMaterials,
  updateThresholds,
  markAlertRead,
  resolveAlert,
  getStockMovements
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

router.post('/update', 
  authMiddleware(['NOC', 'OM', 'PROGRAMMER']), 
  validate([
    body('id').isInt().withMessage('ID Inventory tidak valid'),
    body('adjustment').isInt().withMessage('Adjustment harus angka'),
  ]),
  updateStock
);

router.get('/alerts', authMiddleware(['NOC', 'GM', 'PROGRAMMER']), getAlerts);
router.patch('/alerts/:id/read', authMiddleware(['NOC', 'GM', 'PROGRAMMER']), markAlertRead);
router.patch('/alerts/:id/resolve', authMiddleware(['NOC', 'GM', 'PROGRAMMER']), resolveAlert);
router.get('/audit-logs', authMiddleware(['NOC', 'GM', 'PROGRAMMER']), getLogs);
router.get('/shipments', authMiddleware(['NOC', 'GM', 'OM', 'PROGRAMMER']), getShipments);
router.get('/movements', authMiddleware(['NOC', 'GM', 'OM', 'PROGRAMMER']), getStockMovements);

module.exports = router;
