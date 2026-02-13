const { Inventory, Material, Site, MaterialRequest, MaterialRequestItem, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

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
      group: ['Site.id']
    });

    const stats = {
      totalSites,
      totalInventoryValue: 'TBD', // Would need price field in Material
      lowStockAlerts: lowStockCount,
      weeklyMovement: '+12%', // Mocked for now, would need a movement log
      siteData: siteData.map(s => ({
        name: s.name,
        stock: parseInt(s.get('stock')) || 0,
        capacity: 5000 // Mocked capacity
      })),
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
    
    const totalRequests = await MaterialRequest.count();
    const pendingCount = await MaterialRequest.count({ where: { status: 'Pending' } });

    const report = {
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary: {
        totalRequests,
        approvedValue: 'Rp 1.2B', // Mocked
        pendingApproval: pendingCount,
        topRequestedItems: [
          { name: 'Solar Home System 50W', count: 25 },
          { name: 'Battery 12V 100Ah', count: 18 }
        ]
      },
      sitePerformance: [
        { site: 'Papua', efficiency: '92%', leadTime: '4 days' },
        { site: 'Maluku', efficiency: '88%', leadTime: '6 days' }
      ]
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildStockOpnameData = async () => {
  const inventory = await Inventory.findAll({
    include: [Material, Site]
  });
  return inventory.map((i) => ({
    site: i.Site?.name || '-',
    location: i.Site?.location || '-',
    sku: i.Material?.sku || '-',
    name: i.Material?.name || '-',
    category: i.Material?.category || '-',
    stock: i.stock,
    minThreshold: i.minThreshold
  }));
};

const buildStockMutationData = async (startDate, endDate) => {
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
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

const buildRequestReportData = async (startDate, endDate) => {
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
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
    totalQty: (r.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
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
      doc.text(cell, doc.page.margins.left + (i * colWidth), y, { width: colWidth, align: 'left' });
    });
    y += 16;
  });
  doc.moveDown();
};

const sendPdf = (res, title, headers, rows, fileName) => {
  const doc = new PDFDocument({ margin: 36, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}.pdf`);
  doc.pipe(res);
  doc.fontSize(16).text(title);
  doc.moveDown();
  drawTable(doc, headers, rows);
  doc.end();
};

exports.exportReport = async (req, res) => {
  try {
    const { type, report, startDate, endDate } = req.query;
    const normalizedType = (type || 'XLSX').toUpperCase();
    const normalizedReport = (report || 'stock').toLowerCase();
    let data = [];
    let title = 'Report';
    let fileName = `report_${Date.now()}`;

    let pdfHeaders = [];
    let pdfRows = [];

    if (normalizedReport === 'stock') {
      data = await buildStockOpnameData();
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
      data = await buildStockMutationData(startDate, endDate);
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
      data = await buildRequestReportData(startDate, endDate);
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

    if (normalizedType === 'PDF') {
      return sendPdf(res, title, pdfHeaders, pdfRows, fileName);
    }
    return sendXlsx(res, title, data, fileName);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
