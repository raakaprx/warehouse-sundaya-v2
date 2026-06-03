const { Inventory, Material, Site, MaterialRequest, MaterialRequestItem, StockMovement, AuditLog, Alert, ExecutiveNote, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../utils/socket');

const REJECTED_REQUEST_STATUSES = ['REJECTED_BY_NOC', 'REJECTED_BY_GM'];
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const os = require('os');
const { exec } = require('child_process');

exports.getSystemMonitoring = async (req, res) => {
  try {
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const ramUsage = (memUsed / memTotal * 100).toFixed(1);
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const requestsLastHour = await AuditLog.count({
      where: {
        timestamp: { [Op.gte]: oneHourAgo }
      }
    });

    const nodeEnv = process.env.NODE_ENV || 'local';
    const nodeVersion = process.version;
    const osType = os.type();
    const osPlatform = os.platform();

    let diskInfo = { total: 0, free: 0, used: 0, percent: 0 };
    
    if (osPlatform === 'win32') {
      try {
        const stdout = await new Promise((resolve, reject) => {
          exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
            if (error) reject(error);
            else resolve(stdout);
          });
        });
        
        const lines = stdout.trim().split('\n').slice(1);
        const cDrive = lines.find(line => line.includes('C:'));
        if (cDrive) {
          const parts = cDrive.trim().split(/\s+/);
          const free = parseInt(parts[1]);
          const total = parseInt(parts[2]);
          const used = total - free;
          diskInfo = {
            total: (total / (1024 ** 3)).toFixed(2),
            free: (free / (1024 ** 3)).toFixed(2),
            used: (used / (1024 ** 3)).toFixed(2),
            percent: (used / total * 100).toFixed(1)
          };
        }
      } catch (err) {
        console.error('Disk info error:', err);
      }
    } else {
      // Mock for Linux/Other if needed, or implement df -h
      diskInfo = { total: 512, free: 256, used: 256, percent: 50 };
    }

    res.json({
      success: true,
      data: {
        os: osType,
        ram: {
          percent: ramUsage,
          used: (memUsed / (1024 ** 2)).toFixed(0),
          total: (memTotal / (1024 ** 2)).toFixed(0)
        },
        disk: diskInfo,
        node: {
          version: nodeVersion,
          env: nodeEnv
        },
        metrics: {
          requests1h: requestsLastHour,
          queueJobs: 0
        },
        updatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGlobalStats = async (req, res) => {
  try {
    const totalSites = await Site.count();
    const lowStockCount = await Inventory.count({
      where: sequelize.where(
        sequelize.col('stock'),
        '<=',
        sequelize.col('minThreshold')
      )
    });

    const siteData = await Site.findAll({
      attributes: ['name', [sequelize.fn('SUM', sequelize.col('Inventories.stock')), 'stock']],
      include: [{ model: Inventory, attributes: [] }],
      group: ['Site.id', 'Site.name']
    });

    // Added for SiteDashboard compatibility
    const targetSites = await Site.findAll({ 
      where: { 
        name: { 
          [Op.or]: [
            { [Op.like]: '%Papua%' },
            { [Op.like]: '%Maluku%' }
          ] 
        } 
      } 
    });
    
    const distributionData = await Promise.all(targetSites.map(async (site) => {
      const totalSent = await MaterialRequest.count({ 
        where: { siteId: site.id, status: { [Op.in]: ['ON_DELIVERY', 'FULFILLED'] } } 
      });
      const onDelivery = await MaterialRequest.count({ 
        where: { siteId: site.id, status: 'ON_DELIVERY' } 
      });
      return {
        site: site.name,
        totalSent,
        onDelivery
      };
    }));

    const alerts = await Alert.findAll({
      where: { status: 'NEW' },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const stats = {
      totalSites,
      totalInventoryValue: 'TBD',
      lowStockAlerts: lowStockCount,
      weeklyMovement: '+12%',
      siteData: siteData.map(s => ({
        name: s.name,
        stock: parseInt(s.get('stock')) || 0,
        capacity: 5000
      })),
      alerts,
      distribution: distributionData,
      flowData: [
        { name: 'Mon', in: 400, out: 240 },
        { name: 'Tue', in: 300, out: 139 },
        { name: 'Wed', in: 200, out: 980 },
        { name: 'Thu', in: 278, out: 390 },
        { name: 'Fri', in: 189, out: 480 },
        { name: 'Sat', in: 239, out: 380 },
        { name: 'Sun', in: 349, out: 430 },
      ]
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExecutiveReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // 1. Material Request Summary
    const totalRequests = await MaterialRequest.count({ where: dateFilter });
    const pendingRequests = await MaterialRequest.count({ 
      where: { ...dateFilter, status: 'PENDING' } 
    });
    const approvedRequests = await MaterialRequest.count({ 
      where: { ...dateFilter, status: { [Op.in]: ['APPROVED_BY_GM', 'ON_DELIVERY', 'FULFILLED'] } } //, 'APPROVED_READY_TO_SHIP'
    });
    const rejectedRequests = await MaterialRequest.count({ 
      where: { ...dateFilter, status: { [Op.in]: REJECTED_REQUEST_STATUSES } } 
    });
    const completedRequests = await MaterialRequest.count({ 
      where: { ...dateFilter, status: 'FULFILLED' } 
    });

    // 3. Permintaan per Site (untuk Pie Chart)
    console.log('Fetching requestsBySite...');
    const requestsBySiteRaw = await MaterialRequest.findAll({
      where: dateFilter,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('MaterialRequest.id')), 'count']
      ],
      include: [{ 
        model: Site, 
        attributes: ['id', 'name'],
        required: true
      }],
      group: ['Site.id', 'Site.name'],
      raw: true,
      nest: true
    });

    const requestsBySite = requestsBySiteRaw.map(r => ({
      name: r.Site?.name || 'Unknown Site',
      count: parseInt(r.count) || 0
    }));
    console.log('requestsBySite success:', requestsBySite.length);

    // 2. Active Alerts
    const stockWarning = await Alert.count({ where: { type: 'STOCK_WARNING', status: 'NEW' } });
    const stockCritical = await Alert.count({ where: { type: 'CRITICAL_STOCK', status: 'NEW' } });
    const stockOut = await Alert.count({ where: { type: 'OUT_OF_STOCK', status: 'NEW' } });
    
    // 3. Operational Bottlenecks (Simplified logic)
    // In a real scenario, you'd calculate time differences between AuditLog entries
    const bottleneckOM = await MaterialRequest.count({ where: { status: 'PENDING' } });
    const bottleneckNOC = await MaterialRequest.count({ where: { status: 'REVIEWED_BY_NOC' } });
    const bottleneckGM = await MaterialRequest.count({ where: { status: 'APPROVED_BY_GM' } });

    // 4. Monitoring Distribusi Material (Papua & Maluku)
    console.log('Fetching distributionData...');
    const targetSites = await Site.findAll({ 
      where: { 
        name: { 
          [Op.or]: [
            { [Op.like]: '%Papua%' },
            { [Op.like]: '%Maluku%' }
          ] 
        } 
      } 
    });
    
    const distributionData = await Promise.all(targetSites.map(async (site) => {
      const totalSent = await MaterialRequest.count({ 
        where: { siteId: site.id, status: { [Op.in]: ['ON_DELIVERY', 'FULFILLED'] } } 
      });
      const onDelivery = await MaterialRequest.count({ 
        where: { siteId: site.id, status: 'ON_DELIVERY' } 
      });
      return {
        site: site.name,
        totalSent,
        onDelivery
      };
    }));
    console.log('distributionData success:', distributionData.length);

    // 5. Performance Monitoring / KPI (Simplified)
    const avgApprovalTime = '2.4 days'; // Mocked for now
    const avgDeliveryTime = '4.1 days'; // Mocked for now
    const slaFulfillment = '94%'; // Mocked for now

    // 6. Visual Summary Data
    const monthlyTrend = [
      { month: 'Jan', requests: 45 },
      { month: 'Feb', requests: 52 },
      { month: 'Mar', requests: 48 },
      { month: 'Apr', requests: 61 },
    ];

    const report = {
      summary: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        completed: completedRequests,
        bySite: requestsBySite
      },
      alerts: {
        warning: stockWarning,
        critical: stockCritical,
        out: stockOut,
        overdue: 0,
        delay: 0
      },
      bottlenecks: {
        om: bottleneckOM,
        noc: bottleneckNOC,
        gm: bottleneckGM,
        delayedShipping: 0,
        stuckRequests: 0
      },
      distribution: distributionData,
      performance: {
        avgApprovalTime,
        avgDeliveryTime,
        slaFulfillment,
        monthlyCompleted: completedRequests,
        delayPercentage: '5%'
      },
      charts: {
        requestsBySite: requestsBySite.map(r => ({ 
          name: r.name, 
          value: r.count 
        })),
        statusDistribution: [
          { name: 'Pending', value: pendingRequests },
          { name: 'Approved', value: approvedRequests },
          { name: 'Rejected', value: rejectedRequests },
          { name: 'Completed', value: completedRequests }
        ],
        monthlyTrend
      }
    };

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('getExecutiveReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Executive Notes
exports.createExecutiveNote = async (req, res) => {
  try {
    const { targetRole, message, priority } = req.body;
    const note = await ExecutiveNote.create({
      senderId: req.user.id,
      targetRole: targetRole || 'ALL',
      message,
      priority: priority || 'NORMAL'
    });

    // Emit real-time notification
    const io = getIO();
    if (io) {
      io.emit('new_executive_note', {
        ...note.toJSON(),
        sender: { name: req.user.username, role: req.user.role }
      });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExecutiveNotes = async (req, res) => {
  try {
    const { role } = req.user;
    const where = { isActive: true };
    
    // GM can see all notes they sent
    if (role === 'GM' || role === 'PROGRAMMER') {
      // Show all active notes
    } else {
      // NOC or OM see notes targeted to them or ALL
      where[Op.or] = [
        { targetRole: 'ALL' },
        { targetRole: role }
      ];
    }

    const notes = await ExecutiveNote.findAll({
      where,
      include: [{ model: User, as: 'sender', attributes: [['username', 'name'], 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExecutiveNote = async (req, res) => {
  try {
    const { id } = req.params;
    await ExecutiveNote.update({ isActive: false }, { where: { id } });
    res.json({ success: true, message: 'Note archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildStatusLabel = (status) => {
  const map = {
    PENDING: 'Menunggu NOC',
    REVIEWED_BY_NOC: 'Menunggu Review GM',
    APPROVED_BY_GM: 'Menunggu NOC Mengirim',
    APPROVED_READY_TO_SHIP: 'Siap Dikirim',
    ON_DELIVERY: 'Dalam Pengiriman',
    FULFILLED: 'Selesai',
    REJECTED_BY_NOC: 'Ditolak oleh NOC',
    REJECTED_BY_GM: 'Ditolak oleh GM',
    CANCELLED: 'Dibatalkan'
  };
  return map[status] || status.replace(/_/g, ' ');
};

const buildActor = (status) => {
  const map = {
    PENDING: 'OM',
    REVIEWED_BY_NOC: 'GM',
    APPROVED_BY_GM: 'NOC',
    APPROVED_READY_TO_SHIP: 'NOC',
    ON_DELIVERY: 'NOC',
    FULFILLED: 'OM',
    REJECTED_BY_NOC: 'NOC',
    REJECTED_BY_GM: 'GM',
    CANCELLED: 'OM'
  };
  return map[status] || 'SYSTEM';
};

exports.getFlowMetadata = async (req, res) => {
  try {
    const statusValues = MaterialRequest?.rawAttributes?.status?.values || [];
    const activitySteps = statusValues.map((status, index) => ({
      id: index + 1,
      status,
      label: buildStatusLabel(status),
      actor: buildActor(status)
    }));

    const participants = Array.from(new Set(activitySteps.map((s) => s.actor)));
    const sequenceMessages = activitySteps.slice(0, -1).map((step, index) => {
      const next = activitySteps[index + 1];
      return {
        id: index + 1,
        from: step.actor,
        to: next.actor,
        action: `${step.label} → ${next.label}`,
        status: next.status
      };
    });

    const modelList = Object.values(sequelize.models || {});
    const classItems = modelList.map((model) => {
      const attributes = Object.keys(model.rawAttributes || {}).map((key) => {
        const attr = model.rawAttributes[key];
        const type = attr?.type?.key || attr?.type?.toString()?.split('(')[0] || 'Unknown';
        return { name: key, type };
      });
      return { name: model.name, attributes };
    });

    const relationSet = new Set();
    const relations = [];
    modelList.forEach((model) => {
      Object.values(model.associations || {}).forEach((assoc) => {
        const targetName = assoc.target?.name || assoc.target?.options?.name?.singular;
        if (!targetName) return;
        const key = `${model.name}-${assoc.associationType}-${targetName}`;
        if (relationSet.has(key)) return;
        relationSet.add(key);
        relations.push({
          from: model.name,
          to: targetName,
          type: assoc.associationType
        });
      });
    });

    res.json({
      success: true,
      data: {
        activity: { steps: activitySteps },
        sequence: { participants, messages: sequenceMessages },
        classes: { items: classItems, relations }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildStockOpnameData = async (user) => {
  const where = {};
  if (user?.role === 'OM' && user?.siteId) {
    where.siteId = user.siteId;
  }
  const inventory = await Inventory.findAll({
    where,
    include: [Material, Site]
  });
  return inventory.map((i) => ({
    site: i.Site?.name || '-',
    location: i.Site?.location || '-',
    sku: i.Material?.sku || '-',
    itemCode: i.Material?.itemCode || '-',
    name: i.Material?.name || '-',
    unit: i.Material?.unit || '-',
    category: i.Material?.category || '-',
    stock: i.stock,
    minThreshold: i.minThreshold
  }));
};

const buildStockMutationData = async (startDate, endDate, user) => {
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }
  if (user?.role === 'OM' && user?.siteId) {
    where.siteId = user.siteId;
  }
  const movements = await StockMovement.findAll({
    where,
    include: [Material, Site],
    order: [['createdAt', 'DESC']]
  });
  return movements.map((m) => ({
    date: m.createdAt,
    site: m.Site?.name || '-',
    sku: m.Material?.sku || '-',
    name: m.Material?.name || '-',
    type: m.type,
    quantity: m.quantity
  }));
};

const buildRequestReportData = async (startDate, endDate, user) => {
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }
  if (user?.role === 'OM' && user?.siteId) {
    where.siteId = user.siteId;
  }
  const requests = await MaterialRequest.findAll({
    where,
    include: [
      { model: MaterialRequestItem, as: 'items', include: [Material] },
      { model: Site }
    ],
    order: [['createdAt', 'DESC']]
  });
  return requests.map((r) => ({
    requestId: r.id,
    site: r.Site?.name || '-',
    project: r.project,
    status: r.status,
    deadline: r.deadline,
    totalItems: r.items?.length || 0,
    totalQty: (r.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  }));
};

const sendXlsx = (res, sheetName, data, fileName) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}.xlsx`);
  res.send(buffer);
};

const drawTable = (doc, headers, rows) => {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / headers.length;
  let y = doc.y;

  doc.fontSize(10).font('Helvetica-Bold');
  headers.forEach((h, i) => {
    doc.text(h, doc.page.margins.left + (i * colWidth), y, { width: colWidth, align: 'left' });
  });
  y += 18;
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
  y += 6;
  doc.fontSize(9).font('Helvetica');

  rows.forEach((row) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    row.forEach((cell, i) => {
      doc.text(String(cell || ''), doc.page.margins.left + (i * colWidth), y, { width: colWidth, align: 'left' });
    });
    y += 16;
  });
  doc.moveDown();
};

  const sendPdf = (res, title, headers, rows, fileName) => {
  try {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // ✅ SET PDF HEADERS (CORS already set by router middleware)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
    
    // ✅ ERROR HANDLERS BEFORE PIPING
    doc.on('error', (err) => {
      console.error('❌ PDFKit Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'PDF Generation Error: ' + err.message });
      } else {
        res.end();
      }
    });

    res.on('error', (err) => {
      console.error('❌ Response Error:', err);
      doc.end();
    });
    
    // ✅ PIPE LANGSUNG KE RESPONSE
    doc.pipe(res);

    // Header Report
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated at: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });
    doc.moveDown(2);

    // Table Logic
    const startX = 30;
    let currentY = doc.y;
    const columnWidth = (doc.page.width - 60) / headers.length;

    // Draw Headers
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, startX + (i * columnWidth), currentY, { 
        width: columnWidth, 
        align: 'left' 
      });
    });

    currentY += 20;
    doc.moveTo(startX, currentY - 5)
       .lineTo(doc.page.width - 30, currentY - 5)
       .stroke();

    // Draw Rows
    doc.font('Helvetica').fontSize(9);
    rows.forEach((row, rowIndex) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 30;
        
        // Redraw headers on new page
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, startX + (i * columnWidth), currentY, { 
            width: columnWidth, 
            align: 'left' 
          });
        });
        currentY += 20;
        doc.moveTo(startX, currentY - 5)
           .lineTo(doc.page.width - 30, currentY - 5)
           .stroke();
        doc.font('Helvetica').fontSize(9);
      }
      
      row.forEach((cell, i) => {
        const text = String(cell || '-');
        doc.text(text, startX + (i * columnWidth), currentY, { 
          width: columnWidth - 5, 
          align: 'left',
          ellipsis: true 
        });
      });
      currentY += 20;
    });

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Page ${i + 1} of ${pages.count}`,
        30,
        doc.page.height - 40,
        { align: 'center' }
      );
    }

    doc.end();
    console.log(`✅ PDF "${fileName}" generated successfully`);
  } catch (err) {
    console.error('❌ PDF Generation Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error generating PDF: ' + err.message 
      });
    }
  }
};

exports.exportReport = async (req, res) => {
  try {
    // Gunakan req.body karena rute akan diubah menjadi POST untuk menghindari intersepsi IDM
    const { report, startDate, endDate } = req.body;
    const normalizedReport = (report || 'stock').toLowerCase();
    
    let data = [];
    let title = 'Report';
    let fileName = `report_${Date.now()}`;
    let pdfHeaders = [];
    let pdfRows = [];

    if (normalizedReport === 'stock') {
      data = await buildStockOpnameData(req.user);
      title = 'Stock Opname Report';
      fileName = `stock_opname_${Date.now()}`;
      pdfHeaders = ['Site', 'Location', 'SKU', 'Name', 'Category', 'Stock', 'Min'];
      pdfRows = data.map((row) => [
        String(row.site),
        String(row.location),
        String(row.sku),
        String(row.name),
        String(row.category),
        String(row.stock),
        String(row.minThreshold)
      ]);
    } else if (normalizedReport === 'mutation') {
      data = await buildStockMutationData(startDate, endDate, req.user);
      title = 'Stock Mutation Report';
      fileName = `stock_mutation_${Date.now()}`;
      pdfHeaders = ['Date', 'Site', 'SKU', 'Name', 'Type', 'Qty'];
      pdfRows = data.map((row) => [
        new Date(row.date).toLocaleDateString('id-ID'),
        String(row.site),
        String(row.sku),
        String(row.name),
        String(row.type),
        String(row.quantity)
      ]);
    } else if (normalizedReport === 'request') {
      data = await buildRequestReportData(startDate, endDate, req.user);
      title = 'Material Request Report';
      fileName = `request_report_${Date.now()}`;
      pdfHeaders = ['ID', 'Site', 'Project', 'Status', 'Deadline', 'Total Items', 'Total Qty'];
      pdfRows = data.map((row) => [
        String(row.requestId),
        String(row.site),
        String(row.project),
        String(row.status),
        row.deadline ? new Date(row.deadline).toLocaleDateString('id-ID') : '-',
        String(row.totalItems),
        String(row.totalQty)
      ]);
    }

    // Paksa hanya PDF
    console.log(`📄 Generating ${normalizedReport} report as PDF...`);
    return sendPdf(res, title, pdfHeaders, pdfRows, fileName);
    
  } catch (error) {
    console.error('❌ Export Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecentMovementsPdf = async (req, res) => {
  try {
    console.log('📄 Generating Recent Movements PDF for user:', req.user?.email || req.user?.id);
    
    const where = {};
    if (req.user?.role === 'OM' && req.user?.siteId) {
      where.siteId = req.user.siteId;
    }

    const requests = await MaterialRequest.findAll({
      where,
      include: [
        { model: MaterialRequestItem, as: 'items', include: [Material] },
        { model: Site }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    if (!requests || requests.length === 0) {
      console.log('⚠️ No material requests found');
      return res.status(404).json({ 
        success: false, 
        message: 'No material requests found' 
      });
    }

    const headers = ['Request ID', 'Material Item', 'Project', 'Quantity', 'Status', 'Date'];
    const rows = requests.map((req) => [
      `#REQ-${req.id.toString().padStart(4, '0')}`,
      req.items?.[0]?.Material?.name || 'N/A',
      req.project || '-',
      `${(req.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} Units`,
      (req.status || 'PENDING').replace(/_/g, ' '),
      req.createdAt ? new Date(req.createdAt).toLocaleDateString('id-ID') : '-',
    ]);

    console.log(`✅ Found ${requests.length} material requests. Generating PDF with ${rows.length} rows...`);

    sendPdf(res, 'Recent Movements Report', headers, rows, `recent_movements_${Date.now()}`);
    
  } catch (error) {
    console.error('❌ Error generating recent movements PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate report: ' + error.message 
      });
    }
  }
};

exports.getRequestStatusPdf = async (req, res) => {
  try {
    // Support both GET and POST methods
    const statusType = req.body?.statusType || req.query?.statusType;
    const siteId = req.body?.siteId || req.query?.siteId;
    
    if (!statusType) {
      return res.status(400).json({ success: false, message: 'statusType parameter required' });
    }

    const where = {};
    
    // For OM users, filter by their site
    if (req.user?.role === 'OM' && req.user?.siteId) {
      where.siteId = req.user.siteId;
    } else if (siteId) {
      where.siteId = siteId;
    }

    if (statusType === 'RECEIVED') {
      where.status = 'FULFILLED';
    } else if (statusType === 'PENDING') {
      // Pending / In progress (Exclude fulfilled, rejected, cancelled)
      where.status = {
        [Op.notIn]: ['FULFILLED', ...REJECTED_REQUEST_STATUSES, 'CANCELLED']
      };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid statusType. Use RECEIVED or PENDING' });
    }

    const requests = await MaterialRequest.findAll({
      where,
      include: [
        { model: MaterialRequestItem, as: 'items', include: [Material] },
        { model: Site }
      ],
      order: [['updatedAt', 'DESC']]
    });

    if (requests.length === 0) {
      console.log('⚠️ No requests found for statusType:', statusType);
      return res.status(404).json({ 
        success: false, 
        message: 'Tidak ada data untuk diunduh' 
      });
    }

    const siteName = requests[0]?.Site?.name || 'All Sites';
    const title = statusType === 'RECEIVED' 
      ? `Laporan Barang Diterima - ${siteName}`
      : `Laporan Barang Belum Diterima - ${siteName}`;

    const headers = ['ID Request', 'Project', 'Item', 'Qty', 'Status', 'Update Terakhir'];
    const rows = requests.map(r => [
      `REQ-${r.id.toString().padStart(4, '0')}`,
      r.project || '-',
      (r.items || []).map(item => item.Material?.name || '-').join(', '),
      `${(r.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} ${r.items?.[0]?.Material?.unit || 'Unit'}`,
      (r.status || 'PENDING').replace(/_/g, ' '),
      new Date(r.updatedAt).toLocaleDateString('id-ID')
    ]);

    console.log(`✅ Generating ${statusType} report with ${rows.length} rows`);
    sendPdf(res, title, headers, rows, `status_report_${statusType.toLowerCase()}_${Date.now()}`);

  } catch (error) {
    console.error('❌ Error generating request status PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
