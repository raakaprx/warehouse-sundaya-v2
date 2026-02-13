const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getGlobalStats, getExecutiveReport, exportReport } = require('../controllers/reportController');

router.get('/stats', authMiddleware(['GM', 'NOC', 'PROGRAMMER']), getGlobalStats);
router.get('/executive', authMiddleware(['GM', 'PROGRAMMER']), getExecutiveReport);
router.get('/export', authMiddleware(['GM', 'NOC', 'PROGRAMMER']), exportReport);

module.exports = router;
