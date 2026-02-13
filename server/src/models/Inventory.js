const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  minThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  }
}, {
  indexes: [
    { fields: ['siteId', 'materialId'] },
    { fields: ['siteId'] },
    { fields: ['materialId'] }
  ]
});

module.exports = Inventory;
