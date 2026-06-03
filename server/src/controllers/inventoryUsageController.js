const { Op } = require('sequelize');
const { sequelize, Inventory, StockMovement, AuditLog, Material, Site, User } = require('../models');
const { getIO } = require('../utils/socket');
const { runThresholdCheck } = require('../utils/cron');

const parseUsageNotes = (notes) => {
  if (!notes) return { project: '-', reason: '-' };
  try {
    const parsed = JSON.parse(notes);
    return {
      project: parsed.project || '-',
      reason: parsed.reason || '-'
    };
  } catch (err) {
    return { project: '-', reason: notes };
  }
};

const getOmAllowedSiteIds = async (transaction) => {
  const sites = await Site.findAll({
    attributes: ['id', 'name'],
    transaction
  });
  return sites
    .filter((site) => {
      const lower = String(site.name || '').toLowerCase();
      return lower.includes('papua') || lower.includes('maluku');
    })
    .map((site) => Number(site.id));
};

exports.createUsage = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { materialId, siteId, quantity, project, reason } = req.body;
    const safeMaterialId = parseInt(materialId, 10);
    const safeSiteId = parseInt(siteId, 10);
    const safeQuantity = parseInt(quantity, 10);

    if (req.user.role === 'OM') {
      const allowedSiteIds = await getOmAllowedSiteIds(t);
      if (!allowedSiteIds.includes(safeSiteId)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'OM hanya bisa input pemakaian untuk site Papua/Maluku' });
      }
    }

    const inventory = await Inventory.findOne({
      where: { materialId: safeMaterialId, siteId: safeSiteId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!inventory) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Inventory material tidak ditemukan pada site ini' });
    }
    if (inventory.stock < safeQuantity) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Stok tidak mencukupi' });
    }

    inventory.stock -= safeQuantity;
    await inventory.save({ transaction: t });

    const notes = JSON.stringify({
      project: project?.trim() || '-',
      reason: reason?.trim() || '-'
    });

    const movement = await StockMovement.create({
      materialId: safeMaterialId,
      siteId: safeSiteId,
      userId: req.user.id,
      type: 'OUT',
      quantity: safeQuantity,
      referenceType: 'USAGE_LOG',
      referenceId: null,
      notes
    }, { transaction: t });

    await AuditLog.create({
      userId: req.user.id,
      action: 'INVENTORY_USAGE',
      module: 'INVENTORY_USAGE',
      details: `Pemakaian barang ${safeQuantity} unit material ID ${safeMaterialId} untuk project ${project} (site ${safeSiteId})`
    }, { transaction: t });

    await t.commit();
    const io = getIO();
    io.emit('inventory_updated', { type: 'USAGE_LOG', materialId: safeMaterialId, siteId: safeSiteId, quantity: safeQuantity });
    io.emit('usage_logged', { id: movement.id, materialId: safeMaterialId, siteId: safeSiteId, quantity: safeQuantity, project });
    runThresholdCheck().catch(() => {});

    return res.status(201).json({ success: true, data: movement });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUsageHistory = async (req, res) => {
  try {
    const where = { referenceType: 'USAGE_LOG' };
    if (req.query.siteId) where.siteId = parseInt(req.query.siteId, 10);
    if (req.user.role === 'OM') {
      const allowedSiteIds = await getOmAllowedSiteIds();
      if (allowedSiteIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Site Papua/Maluku belum tersedia' });
      }

      if (where.siteId && !allowedSiteIds.includes(where.siteId)) {
        return res.status(400).json({ success: false, message: 'Filter site tidak valid untuk OM' });
      }

      where.siteId = where.siteId
        ? where.siteId
        : { [Op.in]: allowedSiteIds };
    }

    const rows = await StockMovement.findAll({
      where,
      include: [
        { model: Material, attributes: ['name', 'sku', 'unit'] },
        { model: Site, attributes: ['name', 'location'] },
        { model: User, attributes: ['username', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const data = rows.map((row) => {
      const parsed = parseUsageNotes(row.notes);
      return {
        ...row.toJSON(),
        project: parsed.project,
        reason: parsed.reason
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
