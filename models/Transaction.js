const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const Category = require('./Category');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  recurring_type: {
    type: DataTypes.STRING,
  },
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  first_date: {
    type: DataTypes.INTEGER,
  },
  second_date: {
    type: DataTypes.INTEGER,
  },
  day: {
    type: DataTypes.INTEGER,
  },
});

Transaction.belongsTo(Category, { foreignKey: 'category_id' });

module.exports = Transaction;