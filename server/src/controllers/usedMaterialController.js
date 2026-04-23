const { UsedMaterialReport, Material, Site, User, AuditLog, sequelize } = require('../models');

exports.createReport = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { materialId, quantity, condition, conditionPercentage, description, siteId, unit, serialNumbers, documentNo, returnSite } = req.body;
    const photo = req.file ? `/uploads/used-materials/${req.file.filename}` : req.body.photo;
    const parsedMaterialId = materialId ? parseInt(materialId) : null;
    const parsedQuantity = quantity ? parseInt(quantity) : null;
    const parsedConditionPercentage = conditionPercentage === '' || conditionPercentage === undefined
      ? null
      : parseInt(conditionPercentage);
    const parsedSiteId = siteId ? parseInt(siteId) : null;
    const safeMaterialId = Number.isNaN(parsedMaterialId) ? null : parsedMaterialId;
    const safeQuantity = Number.isNaN(parsedQuantity) ? null : parsedQuantity;
    const safeConditionPercentage = Number.isNaN(parsedConditionPercentage) ? null : parsedConditionPercentage;
    const safeSiteId = Number.isNaN(parsedSiteId) ? null : parsedSiteId;

    const finalSiteId = safeSiteId || req.user.siteId;
    if (!finalSiteId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Site asal wajib diisi' });
    }
    const report = await UsedMaterialReport.create({
      materialId: safeMaterialId,
      quantity: safeQuantity,
      unit,
      serialNumbers,
      documentNo,
      returnSite,
      condition,
      conditionPercentage: safeConditionPercentage,
      description,
      photo,
      siteId: finalSiteId,
      reporterId: req.user.id,
      status: 'REPORTED'
    }, { transaction: t });

    await AuditLog.create({
      userId: req.user.id,
      action: 'REPORT_USED_MATERIAL',
      module: 'USED_MATERIAL',
      details: `Recycle report: ${quantity} unit (Material ID: ${materialId}) di Site ID: ${report.siteId}`
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const { siteId, status } = req.query;
    const where = {};
    if (siteId) where.siteId = siteId;
    if (status) where.status = status;

    // If OM, restrict to their site unless they are querying specific site
    if (req.user.role === 'OM' && !siteId) {
       // Ideally OM is bound to a site. If req.user.siteId exists.
       if(req.user.siteId) where.siteId = req.user.siteId;
    }

    const reports = await UsedMaterialReport.findAll({
      where,
      include: [
        { model: Material, attributes: ['name', 'sku', 'image', 'itemCode', 'unit'] },
        { model: Site, attributes: ['name', 'location'] },
        { model: User, attributes: ['username'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;
    
    const report = await UsedMaterialReport.findByPk(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status || report.status;
    if (adminResponse) report.adminResponse = adminResponse;
    await report.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_USED_MATERIAL_STATUS',
      module: 'USED_MATERIAL',
      details: `Updated report ID ${id} status to ${report.status}`
    });

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
