const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Inventory, Material, Site, sequelize, Alert, User, Notification, AlertTimeline } = require('../models');
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
  if (!alertColumns.resolutionReason) await qi.addColumn('alerts', 'resolutionReason', { type: DataTypes.ENUM('STOCK_AVAILABLE', 'THRESHOLD_UPDATED', 'FALSE_ALERT', 'OTHER'), allowNull: true });
  if (!alertColumns.escalatedToOMAt) await qi.addColumn('alerts', 'escalatedToOMAt', { type: DataTypes.DATE, allowNull: true });
  if (!alertColumns.escalatedToGMAt) await qi.addColumn('alerts', 'escalatedToGMAt', { type: DataTypes.DATE, allowNull: true });
  const notificationColumns = await qi.describeTable('notifications');
  if (!notificationColumns.alertId) await qi.addColumn('notifications', 'alertId', { type: DataTypes.INTEGER, allowNull: true });
  // Check AlertTimeline table
  try {
    await qi.describeTable('alert_timelines');
  } catch (e) {
    await AlertTimeline.sync({ force: false });
  }
  schemaEnsured = true;
};

const getAlertLevel = (stock, minThreshold) => {
  const current = Number(stock || 0);
  const min = Number(minThreshold || 0);
  
  if (current <= 0) {
    return {
      type: 'OUT_OF_STOCK',
      priority: 'CRITICAL',
      status: 'LOW'
    };
  }
  // Critical: stock is less than or equal to 50% of threshold
  if (current <= min * 0.5) {
    return {
      type: 'CRITICAL_STOCK',
      priority: 'CRITICAL',
      status: 'LOW'
    };
  }
  // Warning: stock is below threshold but above 50%
  if (current < min) {
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

const getAlertRecipients = async (siteId, escalationLevel = null) => {
  let where = {};
  
  if (escalationLevel === 'OM') {
    where = {
      role: 'OM',
      siteId: siteId
    };
  } else if (escalationLevel === 'GM') {
    where = { role: 'GM' };
  } else {
    where = {
      [Op.or]: [
        { role: { [Op.in]: ['NOC', 'GM', 'PROGRAMMER'] } },
        { role: 'OM', siteId }
      ]
    };
  }
  
  return User.findAll({ where });
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
    const now = new Date();

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
            // Check for escalation
            if (activeAlert.priority === 'CRITICAL') {
              const timeSinceCreated = (now - new Date(activeAlert.createdAt)) / (1000 * 60 * 60);
              if (timeSinceCreated >= 24 && !activeAlert.escalatedToGMAt) {
                const gmRecipients = await getAlertRecipients(item.siteId, 'GM');
                await sendAlertNotifications(gmRecipients, 'ESCALATION_GM', `Alert critical untuk ${item.Material.name} di ${item.Site.name} belum ditangani selama 24 jam`, activeAlert.id, { materialId: item.Material.id, siteId: item.Site.id, status: 'ESCALATED' });
                await AlertTimeline.create({
                  alertId: activeAlert.id,
                  action: 'ESCALATED_GM',
                  timestamp: now
                });
                await activeAlert.update({ escalatedToGMAt: now });
              } else if (timeSinceCreated >= 12 && !activeAlert.escalatedToOMAt) {
                const omRecipients = await getAlertRecipients(item.siteId, 'OM');
                await sendAlertNotifications(omRecipients, 'ESCALATION_OM', `Alert critical untuk ${item.Material.name} di ${item.Site.name} belum ditangani selama 12 jam`, activeAlert.id, { materialId: item.Material.id, siteId: item.Site.id, status: 'ESCALATED' });
                await AlertTimeline.create({
                  alertId: activeAlert.id,
                  action: 'ESCALATED_OM',
                  timestamp: now
                });
                await activeAlert.update({ escalatedToOMAt: now });
              }
            }
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
          // Check for escalation
          if (activeAlert.priority === 'CRITICAL') {
            const timeSinceCreated = (now - new Date(activeAlert.createdAt)) / (1000 * 60 * 60);
            if (timeSinceCreated >= 24 && !activeAlert.escalatedToGMAt) {
              const gmRecipients = await getAlertRecipients(item.siteId, 'GM');
              await sendAlertNotifications(gmRecipients, 'ESCALATION_GM', `Alert critical untuk ${item.Material.name} di ${item.Site.name} belum ditangani selama 24 jam`, activeAlert.id, { materialId: item.Material.id, siteId: item.Site.id, status: 'ESCALATED' });
              await AlertTimeline.create({
                alertId: activeAlert.id,
                action: 'ESCALATED_GM',
                timestamp: now
              });
              await activeAlert.update({ escalatedToGMAt: now });
            } else if (timeSinceCreated >= 12 && !activeAlert.escalatedToOMAt) {
              const omRecipients = await getAlertRecipients(item.siteId, 'OM');
              await sendAlertNotifications(omRecipients, 'ESCALATION_OM', `Alert critical untuk ${item.Material.name} di ${item.Site.name} belum ditangani selama 12 jam`, activeAlert.id, { materialId: item.Material.id, siteId: item.Site.id, status: 'ESCALATED' });
              await AlertTimeline.create({
                alertId: activeAlert.id,
                action: 'ESCALATED_OM',
                timestamp: now
              });
              await activeAlert.update({ escalatedToOMAt: now });
            }
          }
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
        await AlertTimeline.create({
          alertId: createdAlert.id,
          action: 'CREATED',
          timestamp: now
        });
        await sendAlertNotifications(
          recipients,
          'ALERT',
          message,
          createdAlert.id,
          { materialId: item.Material.id, siteId: item.Site.id, status: 'NEW', priority: level.priority, type: level.type }
        );
        await AlertTimeline.create({
          alertId: createdAlert.id,
          action: 'NOTIFICATION_SENT',
          timestamp: now
        });
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
        await AlertTimeline.create({
          alertId: activeAlert.id,
          action: 'RESOLVED',
          timestamp: now
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
    const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
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
