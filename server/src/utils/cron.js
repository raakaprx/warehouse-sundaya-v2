const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Inventory, Material, Site, sequelize, Alert, User, Notification } = require('../models');
const { getIO } = require('../utils/socket');
const { sendEmail } = require('../utils/emailService');

const runThresholdCheck = async () => {
  console.log(`[${new Date().toISOString()}] Running automated threshold check...`);
  try {
      const lowStockItems = await Inventory.findAll({
      where: sequelize.where(
        sequelize.col('stock'),
        '<=',
        sequelize.col('minThreshold')
      ),
      include: [Material, Site]
    });

    if (lowStockItems.length > 0) {
      const io = getIO();
        const recipients = await User.findAll({ where: { role: ['NOC', 'GM'] } });
      lowStockItems.forEach(item => {
          const shortage = Math.max(0, (item.minThreshold || 0) - (item.stock || 0));
        const payload = {
          type: 'CRITICAL_STOCK',
            message: `Stok ${item.Material.name} di ${item.Site.name} rendah (${item.stock}/${item.minThreshold})`,
          site: item.Site.name,
          timestamp: new Date()
        };

        // Emit to WebSocket
        io.emit('new_alert', payload);

          Alert.findOne({
            where: {
              materialId: item.Material.id,
              siteId: item.Site.id,
              status: 'NEW'
            }
          }).then((existing) => {
            if (existing) {
              return existing.update({
                stock: item.stock,
                minThreshold: item.minThreshold,
                shortage,
                message: payload.message,
                priority: 'CRITICAL'
              });
            }
            return Alert.create({
              materialId: item.Material.id,
              siteId: item.Site.id,
              stock: item.stock,
              minThreshold: item.minThreshold,
              shortage,
              type: 'CRITICAL_STOCK',
              priority: 'CRITICAL',
              status: 'NEW',
              message: payload.message
            });
          });

          recipients.forEach((user) => {
            Notification.create({
              userId: user.id,
              type: 'ALERT',
              message: payload.message,
              metadata: JSON.stringify({ materialId: item.Material.id, siteId: item.Site.id })
            });
          });

        // Send Email (Preventive measure)
        // In real app, we might want to aggregate these
        sendEmail('faerlyroot@gmail.com', 'CRITICAL STOCK ALERT', payload.message);
      });
    }
  } catch (error) {
    console.error('Error in threshold check job:', error);
  }
};

const runBackup = async () => {
  try {
    const source = path.join(__dirname, '../../database.sqlite');
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(backupDir, `database-${timestamp}.sqlite`);
    fs.copyFileSync(source, target);
    console.log(`[${new Date().toISOString()}] Backup database berhasil: ${target}`);
  } catch (error) {
    console.error('Error backup database:', error);
  }
};

// Schedule to run every hour
cron.schedule('0 * * * *', runThresholdCheck);
cron.schedule('0 2 * * *', runBackup);

module.exports = { runThresholdCheck, runBackup };
