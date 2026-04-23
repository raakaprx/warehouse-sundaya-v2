const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  getGlobalStats, 
  getExecutiveReport, 
  exportReport, 
  getFlowMetadata, 
  getRecentMovementsPdf,
  getRequestStatusPdf,
  getSystemMonitoring
} = require('../controllers/reportController');

// ✅ Routes (CORS handled globally in index.js)
router.get('/stats', authMiddleware(['GM', 'NOC', 'PROGRAMMER']), getGlobalStats);
router.get('/executive', authMiddleware(['GM', 'PROGRAMMER']), getExecutiveReport);
router.get('/flow', authMiddleware(['PROGRAMMER']), getFlowMetadata);
router.get('/monitoring', authMiddleware(['PROGRAMMER']), getSystemMonitoring);
router.post('/export', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), exportReport);

// ✅ PDF Routes
router.get('/recent-movements-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRecentMovementsPdf);
router.post('/recent-movements-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRecentMovementsPdf);

router.post('/request-status-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRequestStatusPdf);
router.get('/request-status-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRequestStatusPdf);

module.exports = router;
