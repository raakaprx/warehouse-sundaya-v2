const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  siteId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  minThreshold: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  shortage: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('CRITICAL', 'WARNING'),
    defaultValue: 'CRITICAL'
  },
  status: {
    type: DataTypes.ENUM('NEW', 'READ', 'RESOLVED'),
    defaultValue: 'NEW'
  },
  acknowledgedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolutionNote: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolutionReason: {
    type: DataTypes.ENUM('STOCK_AVAILABLE', 'THRESHOLD_UPDATED', 'FALSE_ALERT', 'OTHER'),
    allowNull: true
  },
  lastTriggeredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  snoozeUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  escalatedToOMAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  escalatedToGMAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['siteId'] },
    { fields: ['snoozeUntil'] },
    { fields: ['createdAt'] },
    { fields: ['escalatedToOMAt'] },
    { fields: ['escalatedToGMAt'] }
  ]
});

module.exports = Alert;
