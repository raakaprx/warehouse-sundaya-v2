const { Notification, Alert } = require('../models');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Alert, attributes: ['id', 'type', 'priority', 'status', 'siteId', 'materialId'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit: 200
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.user.id, readAt: null }
    });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, userId: req.user.id }
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });
    await notification.update({ readAt: new Date() });
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const [updatedCount] = await Notification.update(
      { readAt: new Date() },
      { where: { userId: req.user.id, readAt: null } }
    );
    res.json({ success: true, data: { updated: updatedCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
