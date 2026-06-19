const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AlertTimeline = sequelize.define('AlertTimeline', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  alertId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  action: {
    type: DataTypes.ENUM('CREATED', 'NOTIFICATION_SENT', 'VIEWED', 'ESCALATED_OM', 'ESCALATED_GM', 'RESOLVED'),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'alert_timelines',
  updatedAt: false,
  indexes: [
    { fields: ['alertId'] },
    { fields: ['timestamp'] }
  ]
});

module.exports = AlertTimeline;
