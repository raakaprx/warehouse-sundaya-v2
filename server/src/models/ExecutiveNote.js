const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExecutiveNote = sequelize.define('ExecutiveNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  targetRole: {
    type: DataTypes.ENUM('ALL', 'NOC', 'OM'),
    defaultValue: 'ALL'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('NORMAL', 'URGENT'),
    defaultValue: 'NORMAL'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'executive_notes',
  timestamps: true
});

module.exports = ExecutiveNote;