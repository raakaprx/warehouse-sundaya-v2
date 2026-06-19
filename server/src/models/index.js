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
const ExecutiveNote = require('./ExecutiveNote');
const AlertTimeline = require('./AlertTimeline');

// Associations
Site.hasMany(User, { foreignKey: 'siteId' });
User.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(ExecutiveNote, { foreignKey: 'senderId' });
ExecutiveNote.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Material.hasMany(Inventory, { foreignKey: 'materialId', onDelete: 'CASCADE' });
Inventory.belongsTo(Material, { foreignKey: 'materialId' });

Site.hasMany(Inventory, { foreignKey: 'siteId', onDelete: 'CASCADE' });
Inventory.belongsTo(Site, { foreignKey: 'siteId' });

// MaterialRequest Associations
Site.hasMany(MaterialRequest, { foreignKey: 'siteId' });
MaterialRequest.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(MaterialRequest, { foreignKey: 'requesterId' });
MaterialRequest.belongsTo(User, { foreignKey: 'requesterId' });

// New Multi-Item Associations
MaterialRequest.hasMany(MaterialRequestItem, { foreignKey: 'requestId', as: 'items' });
MaterialRequestItem.belongsTo(MaterialRequest, { foreignKey: 'requestId' });

Material.hasMany(MaterialRequestItem, { foreignKey: 'materialId', onDelete: 'CASCADE' });
MaterialRequestItem.belongsTo(Material, { foreignKey: 'materialId' });

User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// UsedMaterialReport Associations
Site.hasMany(UsedMaterialReport, { foreignKey: 'siteId' });
UsedMaterialReport.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(UsedMaterialReport, { foreignKey: 'reporterId' });
UsedMaterialReport.belongsTo(User, { foreignKey: 'reporterId' });

Material.hasMany(UsedMaterialReport, { foreignKey: 'materialId', onDelete: 'CASCADE' });
UsedMaterialReport.belongsTo(Material, { foreignKey: 'materialId' });

Material.hasMany(StockMovement, { foreignKey: 'materialId', onDelete: 'CASCADE' });
StockMovement.belongsTo(Material, { foreignKey: 'materialId' });

Site.hasMany(StockMovement, { foreignKey: 'siteId' });
StockMovement.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(StockMovement, { foreignKey: 'userId' });
StockMovement.belongsTo(User, { foreignKey: 'userId' });

Material.hasMany(Alert, { foreignKey: 'materialId', onDelete: 'CASCADE' });
Alert.belongsTo(Material, { foreignKey: 'materialId' });

Site.hasMany(Alert, { foreignKey: 'siteId' });
Alert.belongsTo(Site, { foreignKey: 'siteId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

Alert.hasMany(Notification, { foreignKey: 'alertId' });
Notification.belongsTo(Alert, { foreignKey: 'alertId' });

Alert.hasMany(AlertTimeline, { foreignKey: 'alertId', onDelete: 'CASCADE' });
AlertTimeline.belongsTo(Alert, { foreignKey: 'alertId' });

AlertTimeline.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
  Notification,
  ExecutiveNote,
  AlertTimeline
};

module.exports = db;
