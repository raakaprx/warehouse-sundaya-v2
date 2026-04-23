const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { createUsage, getUsageHistory } = require('../controllers/inventoryUsageController');

const router = express.Router();

router.use(authMiddleware());

router.get('/', authMiddleware(['OM', 'NOC', 'GM', 'PROGRAMMER']), getUsageHistory);

router.post(
  '/',
  authMiddleware(['OM', 'NOC', 'PROGRAMMER']),
  validate([
    body('materialId').isInt({ min: 1 }).withMessage('Material wajib valid'),
    body('siteId').isInt({ min: 1 }).withMessage('Site wajib valid'),
    body('quantity').isInt({ min: 1 }).withMessage('Jumlah (pcs) minimal 1'),
    body('project').notEmpty().withMessage('Project wajib diisi').isString(),
    body('reason').notEmpty().withMessage('Alasan pemakaian wajib diisi').isString()
  ]),
  createUsage
);

module.exports = router;
