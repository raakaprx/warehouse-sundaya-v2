/**
 * ============================================================================
 * CRON JOBS - Automated Background Stock Monitoring
 * ============================================================================
 * Fungsi: Menjalankan automated background job untuk deteksi stok rendah
 * 
 * Task: runThresholdCheck() dijalankan setiap 1 menit (via node-cron)
 * 
 * Alasan gunakan CRON vs Real-time?
 * ❌ Real-time check: Setiap stok berubah, check threshold → boros CPU
 * ✅ Cron schedule: Check setiap 1 menit, lebih efisien dan predictable
 * 
 * Flow Automated Detection:
 * 1. Query semua Inventory (semua site + material)
 * 2. Bandingkan stock vs warningThreshold vs criticalThreshold
 * 3. Tentukan alert level: NORMAL / WARNING_STOCK / CRITICAL_STOCK / OUT_OF_STOCK
 * 4. Jika ada Alert ACTIVE sebelumnya:
 *    - Jika level berubah → resolve Alert lama, create Alert baru
 *    - Jika >12h di level CRITICAL tanpa resolve → escalate ke OM
 *    - Jika >24h di level CRITICAL tanpa resolve → escalate ke GM
 * 5. Create Notification untuk user yang relevan (OM, NOC, GM)
 * 6. Send Email notification
 * 7. Emit Socket event real-time
 * 
 * Escalation Logic:
 * - Fresh Alert: Send ke NOC + GM (aware)
 * - >12h unresolved: Escalate ke OM (action required)
 * - >24h unresolved: Escalate ke GM (urgent action required)
 * 
 * Why Separate Thresholds?
 * - warningThreshold: Stok mulai menurun, but acceptable (still operational)
 * - criticalThreshold: Stok sangat rendah, harus order segera
 * - Dual threshold memungkinkan gradual alert escalation
 * ============================================================================
 */
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Inventory, Material, Site, sequelize, Alert, User, Notification, AlertTimeline } = require('../models');
const { Op, DataTypes } = require('sequelize');
const { getIO } = require('../utils/socket');
const { sendEmail } = require('../utils/emailService');

let schemaEnsured = false;

/**
 * ENSURE ALERT SCHEMA: Database migration untuk warning/critical threshold
 * Dijalankan: Pertama kali runThresholdCheck dipanggil
 * 
 * Kenapa perlu?
 * - Tambah column warningThreshold, criticalThreshold ke Inventories
 * - Tambah field escalation tracking ke Alerts
 * - Pastikan semua table siap sebelum check threshold
 */

const ensureAlertSchema = async () => {
  if (schemaEnsured) return;
  const qi = sequelize.getQueryInterface();
  
  // Update Inventories table
  const inventoryColumns = await qi.describeTable('Inventories');
  if (!inventoryColumns.warningThreshold) {
    await qi.addColumn('Inventories', 'warningThreshold', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 20
    });
    // Copy minThreshold values to warningThreshold for existing records
    await sequelize.query(`UPDATE Inventories SET warningThreshold = minThreshold WHERE warningThreshold IS NULL`);
  }
  if (!inventoryColumns.criticalThreshold) {
    await qi.addColumn('Inventories', 'criticalThreshold', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10
    });
    // Set criticalThreshold to half of minThreshold (or 1) for existing records
    await sequelize.query(`UPDATE Inventories SET criticalThreshold = CASE WHEN minThreshold > 1 THEN FLOOR(minThreshold / 2) ELSE 1 END WHERE criticalThreshold IS NULL`);
  }

  // Update Alerts table
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

  // Notifications table
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

// ⬇️ HELPER: Determine alert severity level based on stock vs thresholds
/**
 * COMPUTE ALERT LEVEL
 * 
 * Logika:
 * - OUT_OF_STOCK (priority CRITICAL): stok <= 0 → urgent!
 * - CRITICAL_STOCK (priority CRITICAL): stok <= critical threshold → order sekarang!
 * - WARNING_STOCK (priority WARNING): stok <= warning threshold → monitor
 * - NORMAL_STOCK (priority WARNING): stok ok
 * 
 * Contoh:
 * - Material X: stock=5, warning=20, critical=10
 *   → current 5 <= critical 10 → CRITICAL_STOCK
 * - Material Y: stock=15, warning=20, critical=10
 *   → current 15 <= warning 20 but > critical 10 → WARNING_STOCK
 * - Material Z: stock=25, warning=20, critical=10
 *   → current 25 > warning 20 → NORMAL_STOCK
 */
const getAlertLevel = (stock, warningThreshold, criticalThreshold) => {
  const current = Number(stock || 0);
  const warning = Number(warningThreshold || 0);
  const critical = Number(criticalThreshold || 0);
  
  // ⬇️ 1) OUT OF STOCK: emergency
  if (current <= 0) {
    return {
      type: 'OUT_OF_STOCK', // ⬅️ Alert type
      priority: 'CRITICAL',
      status: 'LOW'
    };
  }
  
  // ⬇️ 2) CRITICAL: stok di bawah critical threshold
  if (current <= critical) {
    return {
      type: 'CRITICAL_STOCK',
      priority: 'CRITICAL',
      status: 'LOW'
    };
  }
  
  // ⬇️ 3) WARNING: stok antara critical dan warning
  if (current <= warning) {
    return {
      type: 'WARNING_STOCK',
      priority: 'WARNING',
      status: 'WARNING'
    };
  }
  
  // ⬇️ 4) NORMAL: stok di atas warning threshold (ok)
  return {
    type: 'NORMAL_STOCK',
    priority: 'WARNING',
    status: 'NORMAL'
  };
};


// ⬇️ HELPER: Get alert recipients based on alert type and escalation level
/**
 * DETERMINE ALERT RECIPIENTS
 * 
 * Scenario 1: New Alert (escalationLevel = null)
 * - Send ke: NOC, GM, PROGRAMMER (aware semua), + OM site tsb (action)
 * 
 * Scenario 2: Escalate to OM (escalationLevel = 'OM')
 * - Send ke: OM site tsb (take action, urgent)
 * 
 * Scenario 3: Escalate to GM (escalationLevel = 'GM')
 * - Send ke: GM (urgent, high-level decision)
 */
const getAlertRecipients = async (siteId, escalationLevel = null) => {
  let where = {};
  
  // ⬇️ Escalation level OM: kirim ke OM site tsb
  if (escalationLevel === 'OM') {
    where = {
      role: 'OM',
      siteId: siteId
    };
  } 
  // ⬇️ Escalation level GM: kirim ke semua GM
  else if (escalationLevel === 'GM') {
    where = { role: 'GM' };
  } 
  // ⬇️ New alert: kirim ke NOC, GM, PROGRAMMER + OM site tsb
  else {
    where = {
      [Op.or]: [
        { role: { [Op.in]: ['NOC', 'GM', 'PROGRAMMER'] } },
        { role: 'OM', siteId }
      ]
    };
  }
  
  return User.findAll({ where });
};


// ⬇️ HELPER: Send notification to multiple users (DB + Email + Socket)
/**
 * SEND ALERT NOTIFICATIONS
 * 
 * For each user:
 * 1. Create Notification di DB (agar bisa dilihat di notification panel)
 * 2. Send Email (instant alert)
 * 3. Emit Socket event (real-time UI update)
 */
const sendAlertNotifications = async (users, type, message, alertId, metadata) => {
  for (const user of users) {
    // ⬇️ 1) Save to DB
    await Notification.create({
      userId: user.id,
      alertId,
      type,
      message,
      metadata: JSON.stringify(metadata || {})
    });
    
    // ⬇️ 2) Send Email
    if (user.email) {
      sendEmail(user.email, type.replaceAll('_', ' '), message);
    }
  }
};

/**
 * RUN THRESHOLD CHECK - MAIN FUNCTION
 * 
 * Jadwal: Setiap 1 menit via CronJob (see bottom of file)
 * 
 * Alur Lengkap:
 * 1. Ensure schema (first run only): migrate database if needed
 * 2. Query semua Inventory dari semua site
 * 3. Loop setiap item:
 *    a) Calculate alert level (NORMAL / WARNING / CRITICAL / OUT_OF_STOCK)
 *    b) Check active alert sebelumnya
 *    c) Jika level berbeda: resolve alert lama, create alert baru
 *    d) Jika alert sudah >12h: escalate ke OM
 *    e) Jika alert sudah >24h: escalate ke GM
 *    f) Send notifikasi + email + socket emit
 * 4. Emit socket event untuk refresh dashboard
 * 
 * Contoh Scenario:
 * - T=0min: Stock=5, Critical=10 → Create CRITICAL_STOCK alert
 * - T=15min: Still stock=5 → Alert still active, no action
 * - T=13h: Still stock=5, alert active >12h → Escalate to OM
 * - T=25h: Still stock=5, alert active >24h → Escalate to GM (urgent!)
 * - T=30h: Stock now=50 (restock) → Resolve alert, create NORMAL notification
 */
const runThresholdCheck = async () => {
  console.log(`[${new Date().toISOString()}] Running automated threshold check...`);
  try {
    // ⬇️ 1) Ensure schema ready
    await ensureAlertSchema();
    
    // ⬇️ 2) Query semua inventory
    const allItems = await Inventory.findAll({
      include: [Material, Site]
    });
    
    const io = getIO();
    const now = new Date();

    // ⬇️ 3) Loop: check setiap item
    for (const item of allItems) {
      // ⬇️ Get threshold values
      const warningThresh = item.warningThreshold || item.minThreshold || 20;
      const criticalThresh = item.criticalThreshold || item.minThreshold || 10;
      
      // ⬇️ Calculate current level
      const level = getAlertLevel(item.stock, warningThresh, criticalThresh);
      
      // ⬇️ Get previous active alert
      const activeAlert = await Alert.findOne({
        where: {
          materialId: item.materialId,
          siteId: item.siteId,
          status: { [Op.in]: ['NEW', 'READ'] }
        },
        order: [['updatedAt', 'DESC']]
      });
      
      const recipients = await getAlertRecipients(item.siteId);
      const shortage = Math.max(0, warningThresh - (item.stock || 0));

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

// const runBackup = async () => {
//   try {
//     // 
//     // const source = path.join(__dirname, '../../database.sqlite');
//     const backupDir = path.join(__dirname, '../../backups');
//     if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
//     const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
//     const target = path.join(backupDir, `database-${timestamp}.sqlite`);
//     fs.copyFileSync(source, target);
//     console.log(`[${new Date().toISOString()}] Backup database berhasil: ${target}`);
//   } catch (error) {
//     console.error('Error backup database:', error);
//   }
// };//

const runBackup = async () => {
   console.log("Backup MySQL menggunakan mysqldump");
}

// Schedule as fallback safety check
cron.schedule('*/5 * * * *', runThresholdCheck);
// cron.schedule('0 2 * * *', runBackup);

module.exports = { runThresholdCheck, runBackup, ensureAlertSchema };
