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
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['siteId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Alert;
