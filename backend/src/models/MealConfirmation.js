const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MealConfirmation = sequelize.define('MealConfirmation', {
  confirmation_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  meal_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'snacks', 'dinner'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('confirmed', 'cancelled', 'no_response'),
    defaultValue: 'no_response'
  },
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'meal_confirmations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'meal_date', 'meal_type']
    },
    {
      fields: ['meal_date', 'status']
    }
  ]
});

module.exports = MealConfirmation;