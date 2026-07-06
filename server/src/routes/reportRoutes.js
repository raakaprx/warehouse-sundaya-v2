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
  getSystemMonitoring,
  createExecutiveNote,
  getExecutiveNotes,
  deleteExecutiveNote
} = require('../controllers/reportController');

// ✅ Routes (CORS handled globally in index.js)
router.get('/stats', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getGlobalStats);
router.get('/executive', authMiddleware(['GM', 'NOC', 'PROGRAMMER']), getExecutiveReport);
router.get('/notes', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getExecutiveNotes);
router.post('/notes', authMiddleware(['GM', 'PROGRAMMER']), createExecutiveNote);
router.delete('/notes/:id', authMiddleware(['GM', 'PROGRAMMER']), deleteExecutiveNote);
router.get('/flow', authMiddleware(['PROGRAMMER']), getFlowMetadata);
router.get('/monitoring', authMiddleware(['PROGRAMMER']), getSystemMonitoring);
router.post('/export', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), exportReport);

// ✅ PDF Routes
router.get('/recent-movements-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRecentMovementsPdf);
router.post('/recent-movements-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRecentMovementsPdf);

router.post('/request-status-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRequestStatusPdf);
router.get('/request-status-pdf', authMiddleware(['GM', 'NOC', 'PROGRAMMER', 'OM']), getRequestStatusPdf);

module.exports = router;
