const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('GM', 'NOC', 'OM', 'PROGRAMMER'),
    allowNull: false,
  },
  siteId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null for GM/NOC
  }
});

module.exports = User;
