const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Material = sequelize.define('Material', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  itemCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
  specs: {
    type: DataTypes.TEXT,
  },
  image: {
    type: DataTypes.STRING,
  }
}, {
  indexes: [
    { fields: ['sku'] },
    { fields: ['category'] }
  ]
});

module.exports = Material;
