const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaterialRequest = sequelize.define('MaterialRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  urgency: {
    type: DataTypes.ENUM('HIGH', 'CRITICAL'),
    defaultValue: 'HIGH',
    allowNull: false
  },
  project: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  documentNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  destination: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(
      'PENDING',
      'REVIEWED_BY_NOC',
      'APPROVED_BY_GM',
      'APPROVED_READY_TO_SHIP',
      'ON_DELIVERY',
      'FULFILLED',
      'REJECTED',
      'CANCELLED'
    ),
    defaultValue: 'PENDING',
  },
  requesterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  siteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // materialId and quantity moved to MaterialRequestItem
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  eta: {
    type: DataTypes.DATE,
    allowNull: true
  },
  shippingPhoto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receiptPhoto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nocDecisionNote: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  gmDecisionNote: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  canceledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  canceledReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['siteId'] },
    { fields: ['requesterId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = MaterialRequest;
