const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaterialRequestItem = sequelize.define('MaterialRequestItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  requestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'MaterialRequests',
      key: 'id'
    }
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Materials',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  serialNumbers: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = MaterialRequestItem;
