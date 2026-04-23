const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Inventory, Material, Site, sequelize, Alert, User, Notification } = require('../models');
const { Op, DataTypes } = require('sequelize');
const { getIO } = require('../utils/socket');
const { sendEmail } = require('../utils/emailService');

let schemaEnsured = false;

const ensureAlertSchema = async () => {
  if (schemaEnsured) return;
  const qi = sequelize.getQueryInterface();
  const alertColumns = await qi.describeTable('alerts');
  if (!alertColumns.acknowledgedBy) await qi.addColumn('alerts', 'acknowledgedBy', { type: DataTypes.INTEGER, allowNull: true });
  if (!alertColumns.acknowledgedAt) await qi.addColumn('alerts', 'acknowledgedAt', { type: DataTypes.DATE, allowNull: true });
  if (!alertColumns.resolvedBy) await qi.addColumn('alerts', 'resolvedBy', { type: DataTypes.INTEGER, allowNull: true });
  if (!alertColumns.resolvedAt) await qi.addColumn('alerts', 'resolvedAt', { type: DataTypes.DATE, allowNull: true });
  if (!alertColumns.resolutionNote) await qi.addColumn('alerts', 'resolutionNote', { type: DataTypes.TEXT, allowNull: true });
  if (!alertColumns.lastTriggeredAt) await qi.addColumn('alerts', 'lastTriggeredAt', { type: DataTypes.DATE, allowNull: true });
  if (!alertColumns.snoozeUntil) await qi.addColumn('alerts', 'snoozeUntil', { type: DataTypes.DATE, allowNull: true });
  const notificationColumns = await qi.describeTable('notifications');
  if (!notificationColumns.alertId) await qi.addColumn('notifications', 'alertId', { type: DataTypes.INTEGER, allowNull: true });
  schemaEnsured = true;
};

const getAlertLevel = (stock, minThreshold) => {
  const current = Number(stock || 0);
  const min = Number(minThreshold || 0);
  const warningUpper = min + Math.max(2, Math.ceil(min * 0.2));
  if (current <= 0) {
    return {
      type: 'OUT_OF_STOCK',
      priority: 'CRITICAL',
      status: 'LOW'
    };
  }
  if (current <= min) {
    return {
      type: 'CRITICAL_STOCK',
      priority: 'CRITICAL',
      status: 'LOW'
    };
  }
  if (current <= warningUpper) {
    return {
      type: 'WARNING_STOCK',
      priority: 'WARNING',
      status: 'WARNING'
    };
  }
  return {
    type: 'NORMAL_STOCK',
    priority: 'WARNING',
    status: 'NORMAL'
  };
};

const getAlertRecipients = async (siteId) => {
  return User.findAll({
    where: {
      [Op.or]: [
        { role: { [Op.in]: ['NOC', 'GM', 'PROGRAMMER'] } },
        { role: 'OM', siteId }
      ]
    }
  });
};

const sendAlertNotifications = async (users, type, message, alertId, metadata) => {
  for (const user of users) {
    await Notification.create({
      userId: user.id,
      alertId,
      type,
      message,
      metadata: JSON.stringify(metadata || {})
    });
    if (user.email) {
      sendEmail(user.email, type.replaceAll('_', ' '), message);
    }
  }
};

const runThresholdCheck = async () => {
  console.log(`[${new Date().toISOString()}] Running automated threshold check...`);
  try {
    await ensureAlertSchema();
    const allItems = await Inventory.findAll({
      include: [Material, Site]
    });
    const io = getIO();

    for (const item of allItems) {
      const level = getAlertLevel(item.stock, item.minThreshold);
      const activeAlert = await Alert.findOne({
        where: {
          materialId: item.materialId,
          siteId: item.siteId,
          status: { [Op.in]: ['NEW', 'READ'] }
        },
        order: [['updatedAt', 'DESC']]
      });
      const now = new Date();
      const recipients = await getAlertRecipients(item.siteId);
      const shortage = Math.max(0, (item.minThreshold || 0) - (item.stock || 0));

      if (level.status !== 'NORMAL') {
        const message = level.type === 'OUT_OF_STOCK'
          ? `Stok ${item.Material.name} di ${item.Site.name} habis total (0/${item.minThreshold})`
          : `Stok ${item.Material.name} di ${item.Site.name} ${level.status === 'WARNING' ? 'mendekati batas' : 'hampir habis'} (${item.stock}/${item.minThreshold})`;

        if (activeAlert) {
          if (activeAlert.snoozeUntil && new Date(activeAlert.snoozeUntil) > now) {
            await activeAlert.update({
              stock: item.stock,
              minThreshold: item.minThreshold,
              shortage,
              type: level.type,
              priority: level.priority,
              message,
              lastTriggeredAt: now
            });
            continue;
          }
          const wasRead = activeAlert.status === 'READ';
          await activeAlert.update({
            stock: item.stock,
            minThreshold: item.minThreshold,
            shortage,
            type: level.type,
            priority: level.priority,
            message,
            lastTriggeredAt: now,
            snoozeUntil: null
          });
          io.emit('new_alert', {
            type: level.type,
            priority: level.priority,
            message,
            site: item.Site.name,
            materialId: item.Material.id,
            siteId: item.Site.id,
            status: wasRead ? 'READ' : 'NEW',
            alertId: activeAlert.id,
            timestamp: now
          });
          continue;
        }

        const resolvedAlert = await Alert.findOne({
          where: {
            materialId: item.materialId,
            siteId: item.siteId,
            status: 'RESOLVED'
          },
          order: [['updatedAt', 'DESC']]
        });

        if (resolvedAlert && resolvedAlert.snoozeUntil && new Date(resolvedAlert.snoozeUntil) > now) {
          continue;
        }

        const createdAlert = await Alert.create({
          materialId: item.Material.id,
          siteId: item.Site.id,
          stock: item.stock,
          minThreshold: item.minThreshold,
          shortage,
          type: level.type,
          priority: level.priority,
          status: 'NEW',
          message,
          lastTriggeredAt: now
        });
        await sendAlertNotifications(
          recipients,
          'ALERT',
          message,
          createdAlert.id,
          { materialId: item.Material.id, siteId: item.Site.id, status: 'NEW', priority: level.priority, type: level.type }
        );
        io.emit('new_alert', {
          type: level.type,
          priority: level.priority,
          message,
          site: item.Site.name,
          materialId: item.Material.id,
          siteId: item.Site.id,
          status: 'NEW',
          alertId: createdAlert.id,
          timestamp: now
        });
      } else if (activeAlert) {
        await activeAlert.update({
          status: 'RESOLVED',
          stock: item.stock,
          minThreshold: item.minThreshold,
          shortage: 0,
          resolvedAt: now,
          resolutionNote: activeAlert.resolutionNote || 'Auto-resolve: stok kembali di atas batas alert',
          message: `Stok ${item.Material.name} di ${item.Site.name} kembali aman (${item.stock}/${item.minThreshold})`,
          lastTriggeredAt: now,
          snoozeUntil: null
        });
        const payload = {
          type: activeAlert.type,
          priority: activeAlert.priority,
          site: item.Site.name,
          materialId: item.Material.id,
          siteId: item.Site.id,
          status: 'RESOLVED',
          message: `Alert stok ${item.Material.name} di ${item.Site.name} otomatis ditutup`,
          timestamp: now
        };
        await sendAlertNotifications(
          recipients,
          'ALERT_RESOLVED',
          payload.message,
          activeAlert.id,
          { materialId: item.Material.id, siteId: item.Site.id, status: 'RESOLVED' }
        );
        io.emit('alert_resolved', payload);
      } else {
        const warningAlert = await Alert.findOne({
          where: {
            materialId: item.materialId,
            siteId: item.siteId,
            status: 'RESOLVED',
            type: { [Op.in]: ['CRITICAL_STOCK', 'OUT_OF_STOCK', 'WARNING_STOCK'] }
          },
          order: [['updatedAt', 'DESC']]
        });
        if (warningAlert && warningAlert.snoozeUntil && new Date(warningAlert.snoozeUntil) <= now) {
          await warningAlert.update({ snoozeUntil: null });
        } else {
          const resolvedAlert = await Alert.findOne({
            where: {
              materialId: item.materialId,
              siteId: item.siteId,
              status: 'RESOLVED',
              type: 'WARNING_STOCK'
            },
            order: [['updatedAt', 'DESC']]
          });
          if (resolvedAlert) {
            await resolvedAlert.update({
              stock: item.stock,
              minThreshold: item.minThreshold,
              shortage: 0,
              lastTriggeredAt: now
            });
          }
        }
      }
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

// Schedule as fallback safety check
cron.schedule('*/5 * * * *', runThresholdCheck);
cron.schedule('0 2 * * *', runBackup);

module.exports = { runThresholdCheck, runBackup, ensureAlertSchema };
