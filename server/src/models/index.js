const sequelize = require('../config/database');
const User = require('./User');
const Site = require('./Site');
const Material = require('./Material');
const Inventory = require('./Inventory');
const MaterialRequest = require('./MaterialRequest');
const MaterialRequestItem = require('./MaterialRequestItem');
const AuditLog = require('./AuditLog');
const UsedMaterialReport = require('./UsedMaterialReport');
const StockMovement = require('./StockMovement');
const Alert = require('./Alert');
const Notification = require('./Notification');

// Associations
Site.hasMany(User, { foreignKey: 'siteId' });
User.belongsTo(Site, { foreignKey: 'siteId' });

Material.hasMany(Inventory, { foreignKey: 'materialId' });
Inventory.belongsTo(Material, { foreignKey: 'materialId' });

Site.hasMany(Inventory, { foreignKey: 'siteId' });
Inventory.belongsTo(Site, { foreignKey: 'siteId' });

// MaterialRequest Associations
Site.hasMany(MaterialRequest, { foreignKey: 'siteId' });
MaterialRequest.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(MaterialRequest, { foreignKey: 'requestedBy' });
MaterialRequest.belongsTo(User, { foreignKey: 'requestedBy' });

// New Multi-Item Associations
MaterialRequest.hasMany(MaterialRequestItem, { foreignKey: 'requestId', as: 'items' });
MaterialRequestItem.belongsTo(MaterialRequest, { foreignKey: 'requestId' });

Material.hasMany(MaterialRequestItem, { foreignKey: 'materialId' });
MaterialRequestItem.belongsTo(Material, { foreignKey: 'materialId' });

User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// UsedMaterialReport Associations
Site.hasMany(UsedMaterialReport, { foreignKey: 'siteId' });
UsedMaterialReport.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(UsedMaterialReport, { foreignKey: 'reporterId' });
UsedMaterialReport.belongsTo(User, { foreignKey: 'reporterId' });

Material.hasMany(UsedMaterialReport, { foreignKey: 'materialId' });
UsedMaterialReport.belongsTo(Material, { foreignKey: 'materialId' });

Material.hasMany(StockMovement, { foreignKey: 'materialId' });
StockMovement.belongsTo(Material, { foreignKey: 'materialId' });

Site.hasMany(StockMovement, { foreignKey: 'siteId' });
StockMovement.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(StockMovement, { foreignKey: 'userId' });
StockMovement.belongsTo(User, { foreignKey: 'userId' });

Material.hasMany(Alert, { foreignKey: 'materialId' });
Alert.belongsTo(Material, { foreignKey: 'materialId' });

Site.hasMany(Alert, { foreignKey: 'siteId' });
Alert.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

const db = {
  sequelize,
  User,
  Site,
  Material,
  Inventory,
  MaterialRequest,
  MaterialRequestItem,
  AuditLog,
  UsedMaterialReport,
  StockMovement,
  Alert,
  Notification
};

module.exports = db;
