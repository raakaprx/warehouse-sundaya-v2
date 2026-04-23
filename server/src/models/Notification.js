const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  alertId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['alertId'] },
    { fields: ['readAt'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Notification;
