const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getNotifications, getUnreadCount, markRead, markAllRead } = require('../controllers/notificationController');

router.use(authMiddleware());

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
