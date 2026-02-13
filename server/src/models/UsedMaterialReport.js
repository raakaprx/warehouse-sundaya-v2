const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UsedMaterialReport = sequelize.define('UsedMaterialReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  siteId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reporterId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  condition: {
    type: DataTypes.ENUM('GOOD', 'REPAIRABLE', 'BROKEN'),
    allowNull: false,
    defaultValue: 'BROKEN'
  },
  conditionPercentage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('REPORTED', 'ACKNOWLEDGED', 'RECYCLED', 'DISPOSED'),
    defaultValue: 'REPORTED'
  },
  adminResponse: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'used_material_reports',
  timestamps: true
});

module.exports = UsedMaterialReport;
