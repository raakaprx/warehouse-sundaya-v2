const { Inventory, Material, Site, AuditLog, Alert, StockMovement, sequelize } = require('../models');
const { getIO } = require('../utils/socket');
const StockService = require('../services/stockService');

exports.updateThresholds = async (req, res) => {
  try {
    const { siteId, minThreshold } = req.body;
    
    const where = {};
    if (siteId && siteId !== 'ALL') {
      where.siteId = siteId;
    }
    
    await Inventory.update(
      { minThreshold: minThreshold },
      { where }
    );
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_THRESHOLD',
      module: 'INVENTORY',
      details: `Mengupdate threshold minimum ke ${minThreshold} untuk ${siteId === 'ALL' ? 'Semua Site' : 'Site ID ' + siteId}`
    });
    
    res.json({ success: true, message: 'Threshold berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const { site, siteId } = req.query;
    const where = {};
    
    if (siteId && siteId !== 'All') {
      where.siteId = siteId;
    } else if (site && site !== 'All') {
      const siteRecord = await Site.findOne({ where: { name: site } });
      if (siteRecord) where.siteId = siteRecord.id;
    }

    const inventory = await Inventory.findAll({
      where,
      include: [{ model: Material, where: { isDeleted: false } }, Site]
    });

    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({ 
      include: [{ model: User, attributes: ['name'] }],
      order: [['timestamp', 'DESC']],
      limit: 100 
    });
    
    // Map to the structure client expects
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

exports.updateStock = async (req, res) => {
  try {
    const { id, adjustment } = req.body; // Inventory ID
    const inventory = await Inventory.findByPk(id);
    if (!inventory) return res.status(404).json({ success: false, message: 'Item not found' });

    const updated = await StockService.updateStock(inventory.siteId, inventory.materialId, adjustment, req.user.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.upsertMaterial = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, sku, itemCode, name, category, specs, image, stock, siteId, minThreshold } = req.body;
    
    // 1. Find or create the Material
    let material;
    const materialData = { sku, itemCode, name, category, specs, image };
    
    // Check if material with SKU already exists
    if (id) {
      material = await Material.findByPk(id, { transaction: t });
      if (material) await material.update(materialData, { transaction: t });
    } else {
      material = await Material.findOne({ where: { sku }, transaction: t });
      if (material) {
        await material.update(materialData, { transaction: t });
      } else {
        material = await Material.create(materialData, { transaction: t });
      }
    }

    if (!material) throw new Error('Failed to upsert material');

    // 2. Upsert the Inventory entry for the specific site
    if (siteId) {
      const [inventory, created] = await Inventory.findOrCreate({
        where: { materialId: material.id, siteId },
        defaults: { stock: stock || 0, minThreshold: minThreshold || 10 },
        transaction: t
      });

      if (!created) {
        await inventory.update({ 
          stock: stock !== undefined ? stock : inventory.stock, 
          minThreshold: minThreshold !== undefined ? minThreshold : inventory.minThreshold 
        }, { transaction: t });
      }
    }

    await AuditLog.create({
      userId: req.user.id,
      action: id ? 'UPDATE_MATERIAL' : 'CREATE_MATERIAL',
      module: 'INVENTORY',
      details: `${id ? 'Mengubah' : 'Menambah'} material: ${name} (${sku}) ${siteId ? 'di site ID ' + siteId : ''}`
    }, { transaction: t });

    await t.commit();
    const io = getIO();
    io.emit('inventory_updated', {
      materialId: material.id,
      siteId: siteId || null,
      type: id ? 'UPDATE_MATERIAL' : 'CREATE_MATERIAL'
    });
    res.json({ success: true, data: material });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findByPk(id);
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });

    await material.update({ isDeleted: true });

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

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      include: [
        { model: Material, attributes: ['id', 'name', 'sku'] },
        { model: Site, attributes: ['id', 'name', 'location'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: alerts });
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
    // In our new schema, shipments are inferred from MaterialRequests with status 'Fulfilled'
    // or we could have a dedicated Shipment model. For now, let's use requests.
    const shipments = await MaterialRequest.findAll({
      where: { status: 'Fulfilled' },
      include: [Material, Site]
    });

    const formattedShipments = shipments.map(s => ({
      id: `SHP-${s.id.toString().padStart(3, '0')}`,
      origin: 'Pusat',
      destination: s.Site.name,
      items: `${s.Material.name} (${s.quantity} unit)`,
      status: 'Fulfilled',
      timestamp: s.updatedAt
    }));

    res.json({ success: true, data: formattedShipments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMaterials = async (req, res) => {
  try {
    const materials = await Material.findAll({ where: { isDeleted: false } });
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
