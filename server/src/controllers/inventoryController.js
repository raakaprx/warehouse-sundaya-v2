/**
 * ============================================================================
 * INVENTORY CONTROLLER - Stock dan Material Management
 * ============================================================================
 * Fungsi: Mengelola data stok, material, dan threshold alert untuk semua site
 * 
 * Core Functions:
 * 1. updateThresholds() - Ubah warning/critical threshold untuk alert sensitivity
 * 2. getInventory() - Query stok dengan filter site
 * 3. getLogs() - Get audit trail (100 log terakhir)
 * 4. updateStock() - Adjust stok pake StockService (transaction)
 * 5. upsertMaterial() - Create/update material + inventory untuk site (transaction)
 * 6. deleteMaterial() - Hapus material + cascade delete alerts/movements
 * 7. deleteInventory() - Hapus stok spesifik di site
 * 8. getAlerts() - Get semua alerts dengan threshold info
 * 
 * Pattern: Beberapa function memakai StockService (updateStock)
 *          Beberapa direct Inventory update (updateThresholds)
 *          Masing-masing reason: ubah threshold tidak perlu transaction
 *          tapi adjust stok harus transaction untuk atomic
 * 
 * Real-time: Emit socket 'inventory_updated' untuk UI refresh
 * Audit: Setiap action di-log untuk compliance
 * Threshold: Trigger runThresholdCheck() untuk re-evaluate alerts
 * ============================================================================
 */
const { Inventory, Material, Site, AuditLog, Alert, StockMovement, User, MaterialRequest, MaterialRequestItem, UsedMaterialReport, sequelize, AlertTimeline } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../utils/socket');
const StockService = require('../services/stockService');
const { runThresholdCheck } = require('../utils/cron');


/**
 * UPDATE THRESHOLDS - Ubah warning/critical threshold untuk alert sensitivity
 * PATCH /api/inventory/update-thresholds
 * Body: { siteId?, minThreshold?, warningThreshold?, criticalThreshold? }
 * 
 * Fungsi: Kalibrasi kapan warning/critical alert dipicu
 * 
 * Contoh:
 * - minThreshold=20: Untuk display minimum stok (deprecated, gunakan warningThreshold)
 * - warningThreshold=20: Trigger WARNING alert jika stok <= 20
 * - criticalThreshold=10: Trigger CRITICAL alert jika stok <= 10
 * 
 * Logika Threshold:
 * stok=5  + critical=10 + warning=20  → CRITICAL (urgent)
 * stok=15 + critical=10 + warning=20  → WARNING (monitor)
 * stok=25 + critical=10 + warning=20  → NORMAL (ok)
 * 
 * Strategi:
 * - Slow-moving items: threshold tinggi (stock sering naik-turun, false alert)
 * - Fast-moving items: threshold rendah (stok cepat habis, butuh alert cepat)
 * - Site-specific: Papua/Maluku threshold beda dari Pusat (jarak supply chain)
 * 
 * No Transaction: Hanya update threshold, tidak ada inventory change
 * Kenapa? Thresholds hanya trigger cron check, tidak corrupt data
 */
exports.updateThresholds = async (req, res) => {
  try {
    const { siteId, minThreshold, warningThreshold, criticalThreshold } = req.body;
    
    // ⬇️ Build WHERE clause: ALL sites atau specific site
    const where = {};
    if (siteId && siteId !== 'ALL') {
      where.siteId = siteId;
    }
    
    // ⬇️ Build UPDATE data: only fields yang di-send
    const updateData = {};
    if (minThreshold !== undefined) updateData.minThreshold = minThreshold;
    if (warningThreshold !== undefined) updateData.warningThreshold = warningThreshold;
    if (criticalThreshold !== undefined) updateData.criticalThreshold = criticalThreshold;
    
    // ⬇️ Update semua inventory yang match WHERE
    await Inventory.update(updateData, { where });
    
    // ⬇️ Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_THRESHOLD',
      module: 'INVENTORY',
      details: `Mengupdate threshold untuk ${siteId === 'ALL' ? 'Semua Site' : 'Site ID ' + siteId}`
    });
    
    res.json({ success: true, message: 'Threshold berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * GET INVENTORY - Query stok dengan filter site
 * GET /api/inventory?siteId=... atau ?site=...
 * 
 * Support 2 type filter: by siteId (numeric) atau site name (string)
 * Include: Material data + Site data
 * 
 * Why separate query?
 * - Frontend bisa filter by site dropdown (name) atau API (ID)
 * - RBAC: OM hanya lihat stok site mereka
 */
exports.getInventory = async (req, res) => {
  try {
    const { site, siteId } = req.query;
    const where = {};
    
    // ⬇️ Filter: siteId atau site name
    if (siteId && siteId !== 'All') {
      where.siteId = siteId;
    } else if (site && site !== 'All') {
      const siteRecord = await Site.findOne({ where: { name: site } });
      if (siteRecord) where.siteId = siteRecord.id;
    }

    const inventory = await Inventory.findAll({
      where,
      include: [
        { model: Material, required: true },
        Site
      ]
    });

    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET LOGS - Get audit trail (last 100 entries)
 * GET /api/inventory/logs
 * 
 * Used for: Compliance, user activity tracking, debugging
 * Format: Map to client expected structure (action, details, user, module)
 */
exports.getLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({ 
      include: [{ model: User, attributes: [['username', 'name']] }],
      order: [['timestamp', 'DESC']],
      limit: 100 
    });
    
    // ⬇️ Map to expected format
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      createdAt: log.timestamp, // Aliasing for safety
      user: log.User ? log.User.name || log.User.username : 'System',
      action: log.action,
      details: log.details,
      module: log.module || 'SYSTEM'
    }));

    res.json({ success: true, data: formattedLogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * UPDATE STOCK - Adjust stok pake StockService (transaction pattern)
 * PATCH /api/inventory/stock
 * Body: { id, adjustment }  (Inventory ID)
 * 
 * Delegates to: StockService.updateStock() yang handle transaction + audit
 * Adjustment > 0: Add stock (IN)
 * Adjustment < 0: Reduce stock (OUT)
 */
exports.updateStock = async (req, res) => {
  try {
    const { id, adjustment } = req.body; // Inventory ID
    const inventory = await Inventory.findByPk(id);
    if (!inventory) return res.status(404).json({ success: false, message: 'Item not found' });

    // ⬇️ Use StockService untuk transaction + audit
    const updated = await StockService.updateStock(inventory.siteId, inventory.materialId, adjustment, req.user.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * UPSERT MATERIAL - Create/Update material dan inventory untuk site
 * POST /api/inventory/materials
 * Upload: image (optional)
 * Body: { id?, sku, name, category, itemCode, specs?, stock, siteId, minThreshold?, warningThreshold?, criticalThreshold? }
 * 
 * UPSERT = Update if exists, create if not (database pattern)
 * 
 * Alur:
 * 1. Cari material by SKU atau by ID
 * 2. Jika ada, update material data
 * 3. Jika tidak, create material baru
 * 4. Create/update Inventory entry di site tertentu
 * 5. Atomic: jika ada error, rollback semua (transaction)
 * 
 * Kenapa Transaction?
 * - Material + Inventory adalah pair: satu material bisa di multiple sites
 * - Jika Material create berhasil tapi Inventory gagal → orphan data
 * - Transaction memastikan: kedua berhasil atau kedua gagal
 * 
 * Upload Image: Save ke /uploads/materials/ folder
 * 
 * Emit Socket: inventory_updated event untuk refresh dashboard
 * Trigger Cron: runThresholdCheck untuk evaluate new thresholds
 */
exports.upsertMaterial = async (req, res) => {
  const t = await sequelize.transaction(); // ⬇️ START TRANSACTION
  try {
    const { id, sku, itemCode, name, category, specs, stock, siteId, minThreshold, warningThreshold, criticalThreshold } = req.body;
    
    // ⬇️ Handle file upload: jika ada file baru, gunakan, jika tidak gunakan existing image
    let imagePath = req.body.image; // Use existing image if no new file uploaded
    if (req.file) {
      imagePath = `/uploads/materials/${req.file.filename}`;
    }
    
    // ⬇️ 1) FIND OR CREATE Material
    let material;
    const materialData = { sku, itemCode, name, category, specs, image: imagePath };
    
    // ⬇️ Strategy: Try update by ID first, then by SKU, then create new
    if (id) {
      // ⬇️ Update existing by ID
      material = await Material.findByPk(id, { transaction: t });
      if (material) await material.update(materialData, { transaction: t });
    } else {
      // ⬇️ Find by SKU (same material might be in multiple sites)
      material = await Material.findOne({ where: { sku }, transaction: t });
      if (material) {
        // ⬇️ Update existing by SKU
        await material.update(materialData, { transaction: t });
      } else {
        // ⬇️ Create new material
        material = await Material.create(materialData, { transaction: t });
      }
    }

    if (!material) throw new Error('Failed to upsert material');

    // ⬇️ 2) FIND OR CREATE Inventory di site yang diminta
    if (siteId) {
      const [inventory, created] = await Inventory.findOrCreate({
        where: { materialId: material.id, siteId },
        defaults: { 
          stock: stock || 0, 
          minThreshold: minThreshold || 10,
          warningThreshold: warningThreshold || 20,
          criticalThreshold: criticalThreshold || 10
        },
        transaction: t
      });

      if (!created) {
        // ⬇️ Update existing inventory
        const updateData = { 
          stock: stock !== undefined ? stock : inventory.stock
        };
        if (minThreshold !== undefined) updateData.minThreshold = minThreshold;
        if (warningThreshold !== undefined) updateData.warningThreshold = warningThreshold;
        if (criticalThreshold !== undefined) updateData.criticalThreshold = criticalThreshold;
        
        await inventory.update(updateData, { transaction: t });
      }
    }

    // ⬇️ 3) Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: id ? 'UPDATE_MATERIAL' : 'CREATE_MATERIAL',
      module: 'INVENTORY',
      details: `${id ? 'Mengubah' : 'Menambah'} material: ${name} (${sku}) ${siteId ? 'di site ID ' + siteId : ''}`
    }, { transaction: t });

    // ⬇️ 4) COMMIT transaction
    await t.commit();
    
    // ⬇️ Emit socket event untuk UI update
    const io = getIO();
    io.emit('inventory_updated', {
      materialId: material.id,
      siteId: siteId || null,
      type: id ? 'UPDATE_MATERIAL' : 'CREATE_MATERIAL'
    });
    
    // ⬇️ Trigger cron check untuk new thresholds
    runThresholdCheck().catch(() => {});
    
    res.json({ success: true, data: material });
  } catch (error) {
    // ⬇️ ERROR: Rollback semua
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * DELETE MATERIAL - Hapus material + cascade delete related records
 * DELETE /api/inventory/materials/:id
 * 
 * PENTING: Cascade delete karena foreign keys
 * Sebelum delete material, harus delete:
 * - Inventory (stok di semua site)
 * - Alert (alert yang terkait)
 * - StockMovement (history pergerakan stok)
 * - MaterialRequestItem (permintaan yang sedang pending)
 * - UsedMaterialReport (laporan penggunaan)
 * 
 * Why manual cascade?
 * - Dengan ON DELETE CASCADE di FK, tapi lebih aman manual
 * - Ensures all related data cleaned up
 * - Can log what was deleted (audit trail)
 */
exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findByPk(id);
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });

    // ⬇️ Manually delete associated records (cascade)
    await Inventory.destroy({ where: { materialId: id } });
    await Alert.destroy({ where: { materialId: id } });
    await StockMovement.destroy({ where: { materialId: id } });
    await MaterialRequestItem.destroy({ where: { materialId: id } });
    await UsedMaterialReport.destroy({ where: { materialId: id } });
    
    // ⬇️ Delete material itself
    await material.destroy();

    // ⬇️ Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE_MATERIAL',
      module: 'INVENTORY',
      details: `Menghapus material ID ${id}: ${material.name}`
    });

    res.json({ success: true, message: 'Material berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE INVENTORY - Hapus stok spesifik di site
 * DELETE /api/inventory/:id
 * 
 * Hapus inventory entry (not material itself)
 * = Tidak ada lagi stok material X di site Y
 * Material masih ada, hanya di site lain
 * 
 * Usecase: Pindahkan material antara site (delete dari site lama, create di site baru)
 */
exports.deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const inventory = await Inventory.findByPk(id, {
      include: [Material, Site]
    });
    
    if (!inventory) return res.status(404).json({ success: false, message: 'Data stok tidak ditemukan' });

    const materialName = inventory.Material?.name || 'Unknown';
    const siteName = inventory.Site?.name || 'Unknown';

    // ⬇️ Delete inventory entry
    await inventory.destroy();

    // ⬇️ Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE_STOCK',
      module: 'INVENTORY',
      details: `Menghapus stok material ${materialName} di site ${siteName}`
    });

    res.json({ success: true, message: 'Stok berhasil dihapus dari site' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      include: [
        { model: Material, attributes: ['id', 'name', 'sku'] },
        { model: Site, attributes: ['id', 'name', 'location'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Get inventory data for each alert
    const alertsWithInventory = await Promise.all(alerts.map(async (alert) => {
      const alertData = alert.toJSON();
      const inventory = await Inventory.findOne({
        where: { materialId: alert.materialId, siteId: alert.siteId }
      });
      
      if (inventory) {
        alertData.warningThreshold = inventory.warningThreshold || inventory.minThreshold || 20;
        alertData.criticalThreshold = inventory.criticalThreshold || inventory.minThreshold || 10;
      }
      
      return alertData;
    }));
    
    res.json({ success: true, data: alertsWithInventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAlertRead = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert tidak ditemukan' });
    await alert.update({ status: 'READ' });
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert tidak ditemukan' });
    await alert.update({ status: 'RESOLVED' });
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockMovements = async (req, res) => {
  try {
    const { materialId, siteId } = req.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    if (siteId) where.siteId = siteId;
    const movements = await StockMovement.findAll({
      where,
      include: [
        { model: Material, attributes: ['id', 'name', 'sku'] },
        { model: Site, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 200
    });
    res.json({ success: true, data: movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getShipments = async (req, res) => {
  try {
    const shipments = await MaterialRequest.findAll({
      where: { 
        status: { 
          [Op.in]: ['ON_DELIVERY', 'FULFILLED', 'APPROVED_BY_GM']
        } 
      },
      include: [
        {
          model: MaterialRequestItem,
          as: 'items',
          include: [Material]
        },
        Site
      ],
      order: [['updatedAt', 'DESC']]
    });

    const formattedShipments = shipments.map(s => {
      const itemsList = s.items && s.items.length > 0 
        ? s.items.map(item => `${item.Material?.name || 'Unknown'} (${item.quantity} ${item.unit || 'unit'})`).join(', ')
        : 'No items';
      
      return {
        id: s.id,
        resi: s.trackingNumber || `REQ-${s.id.toString().padStart(4, '0')}`,
        project: s.project || 'No Project',
        expedition: s.trackingNumber ? (s.trackingNumber.includes(' ') ? s.trackingNumber.split(' ')[0] : 'Ekspedisi') : 'Internal',
        from: 'Pusat',
        to: s.destination || s.Site?.name || 'Unknown',
        destination: s.destination || s.Site?.name || 'Unknown',
        items: itemsList,
        status: s.status === 'FULFILLED' ? 'DELIVERED' : (s.status === 'ON_DELIVERY' ? 'IN_TRANSIT' : 'PENDING'),
        timestamp: s.updatedAt,
        eta: s.eta || null,
        estimatedArrival: s.eta || null,
        driver: 'Internal',
        shippingPhoto: s.shippingPhoto,
        receiptPhoto: s.receiptPhoto,
        proofResi: s.shippingPhoto,
        proofItems: s.receiptPhoto
      };
    });

    res.json({ success: true, data: formattedShipments });
  } catch (error) {
    console.error('getShipments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMaterials = async (req, res) => {
  try {
    const materials = await Material.findAll();
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSites = async (req, res) => {
  try {
    const sites = await Site.findAll();
    res.json({ success: true, data: sites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id, {
      include: [
        { model: Material, attributes: ['id', 'name', 'sku', 'category'] },
        { model: Site, attributes: ['id', 'name', 'location'] }
      ]
    });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert tidak ditemukan' });
    
    // Get inventory data for thresholds
    const inventory = await Inventory.findOne({
      where: { materialId: alert.materialId, siteId: alert.siteId }
    });
    
    const alertData = alert.toJSON();
    if (inventory) {
      alertData.warningThreshold = inventory.warningThreshold || inventory.minThreshold || 20;
      alertData.criticalThreshold = inventory.criticalThreshold || inventory.minThreshold || 10;
    }
    
    res.json({ success: true, data: alertData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAlertTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const timeline = await AlertTimeline.findAll({
      where: { alertId: id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] }
      ],
      order: [['timestamp', 'DESC']]
    });
    res.json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveAlertWithReason = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const alert = await Alert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert tidak ditemukan' });
    
    await alert.update({
      status: 'RESOLVED',
      resolvedBy: req.user.id,
      resolvedAt: new Date(),
      resolutionReason: reason,
      resolutionNote: notes
    });

    await AlertTimeline.create({
      alertId: alert.id,
      userId: req.user.id,
      action: 'RESOLVED',
      notes: `Reason: ${reason}, Notes: ${notes}`
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'RESOLVE_ALERT',
      module: 'ALERT',
      details: `Menangani alert ${alert.id} dengan alasan ${reason}: ${notes}`
    });

    const io = getIO();
    io.emit('alert_resolved', {
      alertId: alert.id,
      status: 'RESOLVED'
    });

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAlertViewed = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert tidak ditemukan' });

    await alert.update({ status: 'READ', acknowledgedBy: req.user.id, acknowledgedAt: new Date() });

    await AlertTimeline.create({
      alertId: alert.id,
      userId: req.user.id,
      action: 'VIEWED'
    });

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAlertStats = async (req, res) => {
  try {
    const activeAlerts = await Alert.count({ where: { status: { [Op.ne]: 'RESOLVED' } } });
    const criticalAlerts = await Alert.count({ where: { status: { [Op.ne]: 'RESOLVED' }, priority: 'CRITICAL' } });
    const warningAlerts = await Alert.count({ where: { status: { [Op.ne]: 'RESOLVED' }, priority: 'WARNING' } });
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resolvedToday = await Alert.count({ where: { status: 'RESOLVED', updatedAt: { [Op.gte]: startOfDay } } });
    const escalatedAlerts = await Alert.count({ 
      where: { 
        status: { [Op.ne]: 'RESOLVED' },
        [Op.or]: [
          { escalatedToOMAt: { [Op.not]: null } },
          { escalatedToGMAt: { [Op.not]: null } }
        ]
      } 
    });

    res.json({
      success: true,
      data: {
        activeAlerts,
        criticalAlerts,
        warningAlerts,
        resolvedToday,
        escalatedAlerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
