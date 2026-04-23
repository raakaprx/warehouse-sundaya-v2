const { MaterialRequest, MaterialRequestItem, Material, Site, User, AuditLog, Inventory, StockMovement, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const StockService = require('../services/stockService');
const { getIO } = require('../utils/socket');
const { sendEmail } = require('../utils/emailService');
const { runThresholdCheck } = require('../utils/cron');

const ADMIN_EMAIL = 'faerlyroot@gmail.com';

exports.createRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, materialId, quantity, unit, serialNumbers, siteId, project, description, urgency, deadline, documentNo, destination } = req.body;
    const normalizedUrgency = urgency === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    const selectedSite = await Site.findByPk(siteId, { transaction: t });
    if (!selectedSite) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Site tidak valid' });
    }
    if (req.user.role === 'OM' && /pusat/i.test(selectedSite.name || '')) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Request OM hanya boleh untuk site Papua atau Maluku' });
    }
//     return res.json({
//   debug: {
//     siteId,
//     project,
//     documentNo,
//     destination,
//     description,
//     urgency: normalizedUrgency,
//     requesterId: req.user?.id,
//     deadline
//   }
// });;//debugingg
    const request = await MaterialRequest.create({
      siteId,
      project,
      documentNo,
      destination,
      description,
      urgency: normalizedUrgency,
      requesterId: req.user.id,
      deadline: deadline || null,
      status: 'PENDING'
    }, { transaction: t });

    const finalItems = items && items.length > 0
      ? items
      : (materialId && quantity ? [{ materialId, quantity, unit, serialNumbers }] : []);

    if (finalItems.length > 0) {
      const requestItems = finalItems.map(item => ({
        requestId: request.id,
        materialId: item.materialId,
        quantity: item.quantity,
        unit: item.unit || null,
        serialNumbers: item.serialNumbers || null
      }));
      await MaterialRequestItem.bulkCreate(requestItems, { transaction: t });
    }

    await t.commit();

    // Real-time Notification
    const io = getIO();
    io.emit('new_material_request', {
      id: request.id,
      project: request.project,
      siteId: request.siteId,
      message: `New material request (${normalizedUrgency}) for project ${project}`
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_REQUEST',
      module: 'REQUEST',
      details: `Created new material request ID ${request.id} (${finalItems.length} items) for project ${project}`
    });

    // Fetch complete data to return
    const completeRequest = await MaterialRequest.findByPk(request.id, {
      include: [{ model: MaterialRequestItem, as: 'items', include: [Material] }]
    });

    res.status(201).json({ success: true, data: completeRequest });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const requests = await MaterialRequest.findAll({
      where,
      include: [
        { 
          model: MaterialRequestItem, 
          as: 'items',
          include: [{ model: Material, attributes: ['id', 'name', 'sku', 'category', 'itemCode', 'unit'] }]
        },
        { model: Site, attributes: ['id', 'name', 'location'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reviewNOC = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    const request = await MaterialRequest.findByPk(id);

    if (!request || request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }

    if (!approved && !reason) {
      return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi' });
    }

    request.status = approved ? 'REVIEWED_BY_NOC' : 'REJECTED';
    request.nocDecisionNote = reason || null;
    await request.save();

    // Real-time Notification
    const io = getIO();
    if (approved) {
      io.emit('request_reviewed', {
        id: request.id,
        project: request.project,
        message: `Request ID ${id} reviewed by NOC, waiting for GM approval.`
      });
    } else {
      io.emit('request_rejected', {
        id: request.id,
        project: request.project,
        message: `Request ID ${id} rejected by NOC.`
      });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'NOC_REVIEW',
      module: 'REQUEST',
      details: `${approved ? 'Approved' : 'Rejected'} request ID ${id}${reason ? ` - ${reason}` : ''}`
    });

    await Notification.create({
      userId: request.requesterId,
      type: approved ? 'REQUEST_REVIEWED' : 'REQUEST_REJECTED',
      message: approved
        ? `Permintaan ${request.project} telah direview NOC.`
        : `Permintaan ${request.project} ditolak NOC. ${reason}`,
      metadata: JSON.stringify({ requestId: request.id })
    });

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveGM = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    const request = await MaterialRequest.findByPk(id);

    if (!request || request.status !== 'REVIEWED_BY_NOC') {
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }

    if (!approved && !reason) {
      return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi' });
    }

    request.status = approved ? 'APPROVED_BY_GM' : 'REJECTED';
    request.gmDecisionNote = reason || null;
    await request.save();

    // Real-time Notification
    const io = getIO();
    if (approved) {
      io.emit('request_approved', {
        id: request.id,
        project: request.project,
        message: `Request ID ${id} approved by GM. Ready for shipping.`
      });
      // Email Notification
      sendEmail(ADMIN_EMAIL, 'Material Request Approved', `Request ID ${id} for project ${request.project} has been approved by GM. Please proceed with shipping.`);
    } else {
      io.emit('request_rejected', {
        id: request.id,
        project: request.project,
        message: `Request ID ${id} rejected by GM.`
      });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'GM_APPROVE',
      module: 'REQUEST',
      details: `${approved ? 'Approved' : 'Rejected'} request ID ${id}${reason ? ` - ${reason}` : ''}`
    });

    await Notification.create({
      userId: request.requesterId,
      type: approved ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
      message: approved
        ? `Permintaan ${request.project} disetujui GM.`
        : `Permintaan ${request.project} ditolak GM. ${reason}`,
      metadata: JSON.stringify({ requestId: request.id })
    });

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.shipNOC = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { trackingNumber, eta } = req.body;
    const shippingPhoto = req.file ? `/uploads/shipping/${req.file.filename}` : null;
    const request = await MaterialRequest.findByPk(id, {
      include: [
        { model: MaterialRequestItem, as: 'items', include: [Material] },
        { model: Site, attributes: ['id', 'name', 'location'] }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!request || request.status !== 'APPROVED_BY_GM') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }

    if (!request.items || request.items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Item request tidak ditemukan' });
    }
    if (!shippingPhoto) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Foto pengiriman wajib diunggah' });
    }

    const pusatSite = await Site.findOne({ where: { name: 'Pusat' }, transaction: t });
    if (!pusatSite) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Site pusat tidak ditemukan' });
    }

    for (const item of request.items) {
      const sourceInventory = await Inventory.findOne({
        where: { siteId: pusatSite.id, materialId: item.materialId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!sourceInventory || sourceInventory.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Stok pusat tidak mencukupi' });
      }

      sourceInventory.stock -= item.quantity;
      await sourceInventory.save({ transaction: t });

      const [destInventory] = await Inventory.findOrCreate({
        where: { siteId: request.siteId, materialId: item.materialId },
        defaults: { stock: 0, minThreshold: 10 },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      destInventory.stock += item.quantity;
      await destInventory.save({ transaction: t });

      await StockMovement.create({
        materialId: item.materialId,
        siteId: pusatSite.id,
        userId: req.user.id,
        type: 'SHIP',
        quantity: item.quantity,
        referenceType: 'REQUEST',
        referenceId: request.id,
        notes: `Kirim ke site ${request.siteId}`
      }, { transaction: t });

      await StockMovement.create({
        materialId: item.materialId,
        siteId: request.siteId,
        userId: req.user.id,
        type: 'TRANSFER_IN',
        quantity: item.quantity,
        referenceType: 'REQUEST',
        referenceId: request.id
      }, { transaction: t });
    }

    request.status = 'ON_DELIVERY';
    request.trackingNumber = trackingNumber;
    request.shippingPhoto = shippingPhoto;
    request.eta = eta || null;
    await request.save({ transaction: t });

    // Real-time Notification for OM
    const io = getIO();
    io.emit('request_shipped', {
      id: request.id,
      trackingNumber,
      message: `Order for project ${request.project} is being shipped. Tracking No: ${trackingNumber}`
    });

    // Email Notification
    sendEmail(ADMIN_EMAIL, 'Material Request Shipped', `Material for request ID ${id} (${request.project}) is being shipped. Tracking No: ${trackingNumber}`);

    await AuditLog.create({
      userId: req.user.id,
      action: 'SHIP_MATERIAL',
      module: 'SHIPPING',
      details: `Ship request #${id} | Date: ${new Date().toISOString()} | Tracking: ${trackingNumber || '-'} | ETA: ${eta || '-'} | Site: ${request.Site?.name || request.siteId} | Shipping Photo: ${shippingPhoto || '-'} | Items: ${(request.items || []).map((it) => `${it.Material?.name || it.materialId} x${it.quantity}`).join(', ')}`
    }, { transaction: t });

    await Notification.create({
      userId: request.requesterId,
      type: 'REQUEST_SHIPPED',
      message: `Permintaan ${request.project} sedang dikirim. Resi: ${trackingNumber}`,
      metadata: JSON.stringify({ requestId: request.id })
    }, { transaction: t });

    await t.commit();
    io.emit('inventory_updated', {
      requestId: request.id,
      siteId: request.siteId,
      type: 'SHIP'
    });
    runThresholdCheck().catch(() => {});
    res.json({ success: true, data: request });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.receiveOM = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const receiptPhoto = req.file ? `/uploads/receipts/${req.file.filename}` : null;
    const request = await MaterialRequest.findByPk(id, { 
      include: [
        { model: MaterialRequestItem, as: 'items', include: [Material] },
        { model: Site }
      ],
      transaction: t 
    });

    if (!request || request.status !== 'ON_DELIVERY') {
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }
    if (!receiptPhoto) {
      return res.status(400).json({ success: false, message: 'Receipt photo is required' });
    }

    request.status = 'FULFILLED';
    request.receiptPhoto = receiptPhoto;
    await request.save({ transaction: t });

    // ACID Transaction: Update stock at destination site
    if (request.siteId && request.items && request.items.length > 0) {
      for (const item of request.items) {
        const [inventory] = await Inventory.findOrCreate({
          where: { siteId: request.siteId, materialId: item.materialId },
          defaults: { stock: 0, minThreshold: 10 },
          transaction: t
        });
        
        inventory.stock += item.quantity;
        await inventory.save({ transaction: t });

        await StockMovement.create({
          materialId: item.materialId,
          siteId: request.siteId,
          userId: req.user.id,
          type: 'RECEIVE',
          quantity: item.quantity,
          referenceType: 'REQUEST',
          referenceId: request.id,
          notes: 'Barang diterima di site'
        }, { transaction: t });
      }
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'RECEIVE_MATERIAL',
      module: 'SHIPPING',
      details: `Receive request #${id} | Date: ${new Date().toISOString()} | Site: ${request.Site?.name || request.siteId} | Tracking: ${request.trackingNumber || '-'} | Receipt Photo: ${receiptPhoto || '-'} | Items: ${(request.items || []).map((it) => `${it.Material?.name || it.materialId} x${it.quantity}`).join(', ')}`
    }, { transaction: t });

    await Notification.create({
      userId: request.requesterId,
      type: 'REQUEST_FULFILLED',
      message: `Permintaan ${request.project} sudah diterima.`,
      metadata: JSON.stringify({ requestId: request.id })
    }, { transaction: t });

    await t.commit();
    const io = getIO();
    io.emit('inventory_updated', {
      requestId: request.id,
      siteId: request.siteId,
      type: 'RECEIVE'
    });
    runThresholdCheck().catch(() => {});
    res.json({ success: true, data: request });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await MaterialRequest.findByPk(id);

    if (!request || request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Permintaan tidak bisa dibatalkan' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Alasan pembatalan wajib diisi' });
    }

    request.status = 'CANCELLED';
    request.canceledAt = new Date();
    request.canceledReason = reason;
    await request.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'CANCEL_REQUEST',
      module: 'REQUEST',
      details: `Membatalkan request ID ${id} - ${reason}`
    });

    await Notification.create({
      userId: request.requesterId,
      type: 'REQUEST_CANCELLED',
      message: `Permintaan ${request.project} dibatalkan. ${reason}`,
      metadata: JSON.stringify({ requestId: request.id })
    });

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
