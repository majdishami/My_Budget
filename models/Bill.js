const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const Category = require('./Category');

const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  day: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_one_time: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  is_yearly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
  },
  yearly_date: {
    type: DataTypes.DATE,
  },
  reminder_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  reminder_days: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
    allowNull: false,
  },
});

Bill.belongsTo(Category, { foreignKey: 'category_id' });

module.exports = Bill;