/**
 * ============================================================================
 * REQUEST CONTROLLER - Material Request Approval Workflow
 * ============================================================================
 * Fungsi: Mengelola siklus hidup request material dari pembuatan hingga penerimaan.
 * 
 * WORKFLOW STATUS: 
 * PENDING → REVIEWED_BY_NOC → APPROVED_BY_GM → ON_DELIVERY → FULFILLED
 *                ↘ REJECTED_BY_NOC   ↘ REJECTED_BY_GM
 * 
 * Alur Detail:
 * 1. OM Create Request (PENDING status)
 * 2. NOC Review -> approve (REVIEWED_BY_NOC) atau reject (REJECTED_BY_NOC)
 * 3. GM Approve -> approve (APPROVED_BY_GM) atau reject (REJECTED_BY_GM)
 * 4. NOC Ship -> update stok pusat ke tujuan, status ON_DELIVERY
 * 5. OM Receive -> confirm receipt, status FULFILLED
 * 
 * Kenapa Transaction: Agar perubahan stok dan status request atomic dan konsisten.
 * Jika ada error di tengah, semua rollback dan data tidak berantakan.
 * 
 * Socket Events: Emit real-time event ke frontend untuk notification/update UI
 * Notification: Simpan ke DB agar user bisa lihat history
 * AuditLog: Catat setiap action untuk compliance dan audit trail
 * ============================================================================
 */
const { MaterialRequest, MaterialRequestItem, Material, Site, User, AuditLog, Inventory, StockMovement, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const StockService = require('../services/stockService');
const { getIO } = require('../utils/socket');
const { sendEmail } = require('../utils/emailService');
const { runThresholdCheck } = require('../utils/cron');

const ADMIN_EMAIL = 'faerlyroot@gmail.com';
const REJECTED_STATUSES = ['REJECTED_BY_NOC', 'REJECTED_BY_GM'];
const getDecisionActor = (fallbackRole) => (fallbackRole === 'GM' ? 'GM' : 'NOC');

// ⬇️ Helper: Buat include clause agar request include items dan site
const buildRequestInclude = () => ([
  {
    model: MaterialRequestItem,
    as: 'items',
    include: [{ model: Material, attributes: ['id', 'name', 'sku', 'category', 'itemCode', 'unit'] }]
  },
  { model: Site, attributes: ['id', 'name', 'location'] }
]);

// ⬇️ Helper: Query request dengan semua relasi
const getRequestWithRelations = (id) => MaterialRequest.findByPk(id, {
  include: buildRequestInclude()
});

/**
 * CREATE REQUEST (Step 1: OM membuat request material)
 * POST /api/requests
 * Body: { siteId, materialId, quantity, unit, project, description, urgency, deadline }
 * Response: { id, status: PENDING, items: [...] }
 */
exports.createRequest = async (req, res) => {
  // ⬇️ Gunakan transaction agar jika ada error, semua batal (rollback)
  const t = await sequelize.transaction();
  try {
    const { items, materialId, quantity, unit, serialNumbers, siteId, project, description, urgency, deadline, documentNo, destination } = req.body;
    
    // ⬇️ Normalize urgency (hanya HIGH atau CRITICAL)
    const normalizedUrgency = urgency === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    
    // ⬇️ Validasi site: pastikan site yang diminta valid
    const selectedSite = await Site.findByPk(siteId, { transaction: t });
    if (!selectedSite) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Site tidak valid' });
    }
    
    // ⬇️ RBAC: OM hanya bisa request untuk site Papua/Maluku, bukan Pusat
    if (req.user.role === 'OM' && /pusat/i.test(selectedSite.name || '')) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Request OM hanya boleh untuk site Papua atau Maluku' });
    }

    // ⬇️ Create MaterialRequest dengan status PENDING
    const request = await MaterialRequest.create({
      siteId,
      project,
      documentNo,
      destination,
      description,
      urgency: normalizedUrgency,
      requesterId: req.user.id, // ⬅️ Siapa yang membuat request
      deadline: deadline || null,
      status: 'PENDING' // ⬅️ Waiting for NOC review
    }, { transaction: t });

    // ⬇️ Handle items: bisa array items atau single materialId+quantity
    const finalItems = items && items.length > 0
      ? items
      : (materialId && quantity ? [{ materialId, quantity, unit, serialNumbers }] : []);

    // ⬇️ Create MaterialRequestItem (detail item yang di-request)
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

    // ⬇️ Commit transaction jika semua berhasil
    await t.commit();

    // ⬇️ Real-time notification: emit socket event agar dashboard update langsung
    const io = getIO();
    io.emit('new_material_request', {
      id: request.id,
      project: request.project,
      siteId: request.siteId,
      message: `New material request (${normalizedUrgency}) for project ${project}`
    });

    // ⬇️ Audit log: catat siapa yang buat request apa
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_REQUEST',
      module: 'REQUEST',
      details: `Created new material request ID ${request.id} (${finalItems.length} items) for project ${project}`
    });

    // ⬇️ Fetch dan return complete request dengan items dan site
    const completeRequest = await MaterialRequest.findByPk(request.id, {
      include: [{ model: MaterialRequestItem, as: 'items', include: [Material] }]
    });

    res.status(201).json({ success: true, data: completeRequest });
  } catch (error) {
    // ⬇️ Jika error, rollback semua perubahan (transaksi gagal)
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET REQUESTS - Query dan filter request dengan berbagai kriteria
 * GET /api/requests?status=PENDING&startDate=...&endDate=...
 * 
 * Filter: status (PENDING/REVIEWED_BY_NOC/APPROVED_BY_GM/ON_DELIVERY/FULFILLED)
 *         startDate, endDate untuk range query
 * 
 * Return: Array of requests dengan items + site relations
 */
exports.getRequests = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where = {};
    
    // ⬇️ Filter by status
    if (status && status !== 'ALL') {
      where.status = status === 'REJECTED'
        ? { [Op.in]: REJECTED_STATUSES }
        : status;
    }
    
    // ⬇️ Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    // ⬇️ Query dengan include items + site
    const requests = await MaterialRequest.findAll({
      where,
      include: buildRequestInclude(),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * REVIEW NOC (Step 2: NOC melakukan review request pertama)
 * PATCH /api/requests/:id/review-noc
 * Body: { approved: boolean, reason?: string }
 * 
 * PENTING: Ini adalah approval gate pertama dalam workflow.
 * - Jika NOC approve → request masuk ke GM untuk gate kedua
 * - Jika NOC reject → request langsung REJECTED_BY_NOC (workflow selesai)
 * 
 * Status Progression:
 * PENDING → REVIEWED_BY_NOC (if approved)
 * PENDING → REJECTED_BY_NOC (if rejected)
 * 
 * Validasi:
 * - Status harus PENDING (belum pernah direview)
 * - Jika reject, reason wajib diisi
 */
exports.reviewNOC = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    
    // ⬇️ Get decision actor: who makes the final decision if NOC rejected?
    const decisionActor = getDecisionActor(req.user?.role);
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    
    // ⬇️ Get request
    const request = await MaterialRequest.findByPk(id);

    // ⬇️ Validasi: status harus PENDING
    if (!request || request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }

    // ⬇️ Validasi: jika reject, reason wajib
    if (!approved && !trimmedReason) {
      return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi' });
    }

    // ⬇️ UPDATE status
    request.status = approved ? 'REVIEWED_BY_NOC' : `REJECTED_BY_${decisionActor}`;
    request.nocDecisionNote = trimmedReason || null;
    
    // ⬇️ Jika reject, clear GM note (tidak akan ada tahap GM)
    if (!approved) {
      request.gmDecisionNote = null;
    }
    
    await request.save();

    // ⬇️ Emit socket event untuk real-time update
    const io = getIO();
    if (approved) {
      // ⬇️ Approved: emit ke GM agar tahu ada request waiting for approval
      io.emit('request_reviewed', {
        id: request.id,
        project: request.project,
        message: `Request ID ${id} reviewed by NOC, waiting for GM approval.`
      });
    } else {
      // ⬇️ Rejected: emit rejection event
      io.emit('request_rejected', {
        id: request.id,
        project: request.project,
        status: request.status,
        rejectedBy: decisionActor,
        reason: trimmedReason,
        message: `Request ID ${id} rejected by ${decisionActor}.`
      });
    }

    // ⬇️ Audit log: catat action NOC
    await AuditLog.create({
      userId: req.user.id,
      action: 'NOC_REVIEW',
      module: 'REQUEST',
      details: `${approved ? 'Approved by NOC' : `Rejected by ${decisionActor}`} request ID ${id}${trimmedReason ? ` - ${trimmedReason}` : ''}`
    });

    // ⬇️ Notification ke requester (OM)
    await Notification.create({
      userId: request.requesterId,
      type: approved ? 'REQUEST_REVIEWED' : 'REQUEST_REJECTED',
      message: approved
        ? `Permintaan ${request.project} telah direview NOC.`
        : `Permintaan ${request.project} ditolak ${decisionActor}. ${trimmedReason}`,
      metadata: JSON.stringify({ requestId: request.id, status: request.status, rejectedBy: decisionActor, rejectReason: trimmedReason || null })
    });

    // ⬇️ Return updated request
    const updatedRequest = await getRequestWithRelations(request.id);
    res.json({ success: true, data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * APPROVE GM (Step 3: GM melakukan approval kedua sebelum shipping)
 * PATCH /api/requests/:id/approve-gm
 * Body: { approved: boolean, reason?: string }
 * 
 * PENTING: Ini adalah approval gate KEDUA dalam workflow.
 * Workflow sudah lulus NOC review, sekarang butuh approval GM untuk proceed ke shipping.
 * 
 * Status Progression:
 * REVIEWED_BY_NOC → APPROVED_BY_GM (if approved by GM)
 * REVIEWED_BY_NOC → REJECTED_BY_GM (if rejected by GM)
 * 
 * Validasi:
 * - Status harus REVIEWED_BY_NOC (sudah lulus NOC)
 * - Jika reject, reason wajib diisi
 * 
 * Alasan Dual Approval (NOC + GM)?
 * - NOC: Check ketersediaan stok di pusat, validasi request data
 * - GM: Check financial/strategic impact, apakah boleh kirim atau perlu approval lebih tinggi
 * - Double gate = better risk mitigation untuk high-value atau critical materials
 */
exports.approveGM = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    const decisionActor = getDecisionActor(req.user?.role);
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    
    const request = await MaterialRequest.findByPk(id);

    // ⬇️ Validasi: status harus REVIEWED_BY_NOC (sudah lulus gate pertama)
    if (!request || request.status !== 'REVIEWED_BY_NOC') {
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }

    // ⬇️ Validasi: jika reject, reason wajib
    if (!approved && !trimmedReason) {
      return res.status(400).json({ success: false, message: 'Alasan penolakan wajib diisi' });
    }

    // ⬇️ UPDATE status
    request.status = approved ? 'APPROVED_BY_GM' : `REJECTED_BY_${decisionActor}`;
    request.gmDecisionNote = trimmedReason || null;
    await request.save();

    // ⬇️ Emit socket event
    const io = getIO();
    if (approved) {
      // ⬇️ Approved: emit ke NOC agar tahu bisa mulai shipping
      io.emit('request_approved', {
        id: request.id,
        project: request.project,
        message: `Request ID ${id} approved by GM. Ready for shipping.`
      });
      
      // ⬇️ Email notification ke admin
      sendEmail(ADMIN_EMAIL, 'Material Request Approved', 
        `Request ID ${id} for project ${request.project} has been approved by GM. Please proceed with shipping.`);
    } else {
      // ⬇️ Rejected: emit rejection event
      io.emit('request_rejected', {
        id: request.id,
        project: request.project,
        status: request.status,
        rejectedBy: decisionActor,
        reason: trimmedReason,
        message: `Request ID ${id} rejected by ${decisionActor}.`
      });
    }

    // ⬇️ Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: 'GM_APPROVE',
      module: 'REQUEST',
      details: `${approved ? 'Approved by GM' : `Rejected by ${decisionActor}`} request ID ${id}${trimmedReason ? ` - ${trimmedReason}` : ''}`
    });

    // ⬇️ Notification ke requester
    await Notification.create({
      userId: request.requesterId,
      type: approved ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
      message: approved
        ? `Permintaan ${request.project} sudah disetujui GM. Siap dikirim.`
        : `Permintaan ${request.project} ditolak ${decisionActor}. ${trimmedReason}`,
      metadata: JSON.stringify({ requestId: request.id })
    });

    const updatedRequest = await getRequestWithRelations(request.id);
    res.json({ success: true, data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * SHIP NOC (Step 4: NOC mengirim material dari Pusat ke site tujuan)
 * PATCH /api/requests/:id/ship-noc
 * 
 * PENTING: Ini adalah bagian PALING CRITICAL karena mengubah stok di dua lokasi.
 * 
 * Alur:
 * 1. Validate: request status harus APPROVED_BY_GM
 * 2. Lock & Update: kurangi stok Pusat, tambah stok tujuan (ATOMIC)
 * 3. Create StockMovement untuk audit trail
 * 4. Update request status = ON_DELIVERY
 * 5. Emit socket + audit log + notification
 * 
 * Kenapa TRANSACTION?
 * - Jika kurangi stok Pusat berhasil tapi tambah stok tujuan gagal → data corrupt!
 * - Transaction memastikan: semua berhasil ATAU semua batal (rollback)
 * - Jika error di tengah, database kembali ke state awal
 * 
 * Kenapa LOCK.UPDATE?
 * - Prevent race condition: jika 2 request kirim item sama bersamaan
 * - Lock memastikan hanya 1 yang process stok itu pada waktu tertentu
 * 
 * Risk jika tidak transaction:
 * ❌ Stok Pusat -5, tapi Tujuan +0 → Stok hilang! (conflict)
 * ❌ User request 2x kirim → bisa kirim 2x meski stok cuma 1
 */
exports.shipNOC = async (req, res) => {
  const t = await sequelize.transaction(); // ⬇️ START TRANSACTION
  try {
    const { id } = req.params;
    const { trackingNumber, eta } = req.body;
    const shippingPhoto = req.file ? `/uploads/shipping/${req.file.filename}` : null;
    
    // ⬇️ Query request dengan LOCK.UPDATE agar tidak ada perubahan saat process
    const request = await MaterialRequest.findByPk(id, {
      include: [
        { model: MaterialRequestItem, as: 'items', include: [Material] },
        { model: Site, attributes: ['id', 'name', 'location'] }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE // ⬅️ Lock row agar tidak diubah process lain
    });

    // ⬇️ Validasi: hanya bisa ship jika status APPROVED_BY_GM
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

    // ⬇️ Get Pusat site (source inventory)
    const pusatSite = await Site.findOne({ where: { name: 'Pusat' }, transaction: t });
    if (!pusatSite) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Site pusat tidak ditemukan' });
    }

    // ⬇️ LOOP: Untuk setiap item dalam request, transfer stok
    for (const item of request.items) {
      // ⬇️ 1) GET source inventory (Pusat) dengan lock
      const sourceInventory = await Inventory.findOne({
        where: { siteId: pusatSite.id, materialId: item.materialId },
        transaction: t,
        lock: t.LOCK.UPDATE // ⬅️ Lock untuk prevent race condition
      });
      
      // ⬇️ Validasi: pastikan stok Pusat cukup
      if (!sourceInventory || sourceInventory.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Stok pusat tidak mencukupi' });
      }

      // ⬇️ 2) UPDATE: kurangi stok Pusat
      sourceInventory.stock -= item.quantity;
      await sourceInventory.save({ transaction: t });

      // ⬇️ 3) GET OR CREATE destination inventory (tujuan site)
      const [destInventory] = await Inventory.findOrCreate({
        where: { siteId: request.siteId, materialId: item.materialId },
        defaults: { stock: 0, minThreshold: 10 },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      
      // ⬇️ 4) UPDATE: tambah stok tujuan
      destInventory.stock += item.quantity;
      await destInventory.save({ transaction: t });

      // ⬇️ 5) LOG: buat StockMovement record untuk audit trail
      // Type SHIP = keluar dari Pusat
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

      // ⬇️ Type TRANSFER_IN = masuk ke tujuan
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

    // ⬇️ Update request status ke ON_DELIVERY
    request.status = 'ON_DELIVERY';
    request.trackingNumber = trackingNumber;
    request.shippingPhoto = shippingPhoto;
    request.eta = eta || null;
    await request.save({ transaction: t });

    // ⬇️ Real-time notification: emit socket event agar OM tahu barang sedang dikirim
    const io = getIO();
    io.emit('request_shipped', {
      id: request.id,
      trackingNumber,
      message: `Order for project ${request.project} is being shipped. Tracking No: ${trackingNumber}`
    });

    // ⬇️ Email notification ke admin
    sendEmail(ADMIN_EMAIL, 'Material Request Shipped', `Material for request ID ${id} (${request.project}) is being shipped. Tracking No: ${trackingNumber}`);

    // ⬇️ Audit log: catat detail pengiriman
    await AuditLog.create({
      userId: req.user.id,
      action: 'SHIP_MATERIAL',
      module: 'SHIPPING',
      details: `Ship request #${id} | Tracking: ${trackingNumber || '-'} | ETA: ${eta || '-'}`
    }, { transaction: t });

    // ⬇️ Notification: simpan ke DB agar bisa dilihat di UI
    await Notification.create({
      userId: request.requesterId,
      type: 'REQUEST_SHIPPED',
      message: `Permintaan ${request.project} sedang dikirim. Resi: ${trackingNumber}`,
      metadata: JSON.stringify({ requestId: request.id })
    }, { transaction: t });

    // ⬇️ COMMIT transaction: semua berhasil, save ke database
    await t.commit();
    
    // ⬇️ Emit socket event untuk refresh inventory UI
    io.emit('inventory_updated', {
      requestId: request.id,
      siteId: request.siteId,
      type: 'SHIP'
    });
    
    // ⬇️ Trigger cron check: lihat apakah stok Pusat sekarang di bawah threshold
    runThresholdCheck().catch(() => {});
    
    res.json({ success: true, data: request });
  } catch (error) {
    // ⬇️ ERROR: Rollback semua perubahan (ATOMIC)
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * RECEIVE OM (Step 5: OM menerima material dan confirm receipt)
 * PATCH /api/requests/:id/receive-om
 * Upload: receiptPhoto (required)
 * 
 * PENTING: Ini adalah tahap FINAL dalam workflow.
 * - Material sudah ON_DELIVERY (dalam perjalanan), sekarang sudah tiba
 * - OM confirm dengan foto receipt sebagai bukti
 * - Status berubah dari ON_DELIVERY → FULFILLED (selesai)
 * 
 * TRANSACTION: Juga menggunakan transaction seperti shipNOC
 * - Update inventory di site tujuan (tambah stok)
 * - Create StockMovement untuk audit
 * - Update request status
 * - Semua atomic: jika ada error, rollback semua
 * 
 * Validasi:
 * - Status harus ON_DELIVERY (barang sedang dikirim)
 * - Receipt photo wajib diupload (bukti penerimaan)
 * 
 * Kenapa perlu receipt photo?
 * - Compliance: dokumentasi untuk audit trail
 * - Risk: buktiin barang sudah diterima, bukan hilang dalam perjalanan
 */
exports.receiveOM = async (req, res) => {
  const t = await sequelize.transaction(); // ⬇️ START TRANSACTION
  try {
    const { id } = req.params;
    
    // ⬇️ Get receipt photo dari upload
    const receiptPhoto = req.file ? `/uploads/receipts/${req.file.filename}` : null;
    
    // ⬇️ Get request dengan items + site relations
    const request = await MaterialRequest.findByPk(id, { 
      include: [
        { model: MaterialRequestItem, as: 'items', include: [Material] },
        { model: Site }
      ],
      transaction: t 
    });

    // ⬇️ Validasi: status harus ON_DELIVERY
    if (!request || request.status !== 'ON_DELIVERY') {
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }
    
    // ⬇️ Validasi: photo wajib
    if (!receiptPhoto) {
      return res.status(400).json({ success: false, message: 'Receipt photo is required' });
    }

    // ⬇️ Update request status → FULFILLED
    request.status = 'FULFILLED';
    request.receiptPhoto = receiptPhoto;
    await request.save({ transaction: t });

    // ⬇️ TRANSACTION: Update inventory + create audit trail
    // Nota: shipNOC sudah update inventory ketika kirim
    // Sini hanya confirm receipt dan create RECEIVE movement untuk tracking
    if (request.siteId && request.items && request.items.length > 0) {
      for (const item of request.items) {
        // ⬇️ Sudah ada di site tujuan, ini hanya untuk audit trail
        await StockMovement.create({
          materialId: item.materialId,
          siteId: request.siteId,
          userId: req.user.id,
          type: 'RECEIVE', // ⬅️ Penerimaan konfirmasi
          quantity: item.quantity,
          referenceType: 'REQUEST',
          referenceId: request.id,
          notes: 'Barang diterima di site'
        }, { transaction: t });
      }
    }

    // ⬇️ Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: 'RECEIVE_MATERIAL',
      module: 'SHIPPING',
      details: `Receive request #${id} | Site: ${request.Site?.name || request.siteId} | Receipt Photo: ${receiptPhoto || '-'}`
    }, { transaction: t });

    // ⬇️ Notification ke requester
    await Notification.create({
      userId: request.requesterId,
      type: 'REQUEST_FULFILLED',
      message: `Permintaan ${request.project} sudah diterima.`,
      metadata: JSON.stringify({ requestId: request.id })
    }, { transaction: t });

    // ⬇️ COMMIT transaction
    await t.commit();
    
    // ⬇️ Emit socket event
    const io = getIO();
    io.emit('inventory_updated', {
      requestId: request.id,
      siteId: request.siteId,
      type: 'RECEIVE'
    });
    
    // ⬇️ Trigger threshold check
    runThresholdCheck().catch(() => {});
    
    res.json({ success: true, data: request });
  } catch (error) {
    // ⬇️ ERROR: Rollback semua
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * CANCEL REQUEST (OM bisa batalkan request yang masih PENDING)
 * DELETE /api/requests/:id
 * Body: { reason: string }
 * 
 * PENTING: Hanya bisa batalkan jika status = PENDING
 * - PENDING = belum di-review siapa pun
 * - Jika sudah di-review NOC, tidak bisa batalkan (harus konsultasi NOC)
 * 
 * Validasi:
 * - Status harus PENDING
 * - Reason wajib diisi (audit trail)
 * 
 * Kenapa tidak ada transaction?
 * - Status update saja, tidak ada inventory change
 * - No atomic issues (tidak ada multi-step update)
 * - AuditLog + Notification synchronous
 * 
 * Alur:
 * 1. Find request dengan status PENDING
 * 2. Update status = CANCELLED
 * 3. Set canceledAt timestamp
 * 4. Set canceledReason (untuk compliance)
 * 5. Create AuditLog
 * 6. Create Notification
 * 7. Return request
 */
exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const request = await MaterialRequest.findByPk(id);

    // ⬇️ Validasi: hanya bisa batalkan status PENDING
    if (!request || request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Permintaan tidak bisa dibatalkan' });
    }

    // ⬇️ Validasi: reason wajib
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Alasan pembatalan wajib diisi' });
    }

    // ⬇️ Update status
    request.status = 'CANCELLED';
    request.canceledAt = new Date();
    request.canceledReason = reason;
    await request.save();

    // ⬇️ Audit log: catat pembatalan
    await AuditLog.create({
      userId: req.user.id,
      action: 'CANCEL_REQUEST',
      module: 'REQUEST',
      details: `Membatalkan request ID ${id} - ${reason}`
    });

    // ⬇️ Notification ke requester
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
