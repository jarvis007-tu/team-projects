const mongoose = require('mongoose');
const { Schema } = mongoose;

const MealConfirmationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // date-only (we normalize to start of day in pre-save hook)
  meal_date: { type: Date, required: true },

  meal_type: {
    type: String,
    enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
    required: true
  },

  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'no_response'],
    default: 'no_response'
  },

  confirmed_at: { type: Date, default: null },

  notes: { type: String, default: null }
}, {
  collection: 'meal_confirmations',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
MealConfirmationSchema.index(
  { user_id: 1, meal_date: 1, meal_type: 1 },
  { unique: true }
);

MealConfirmationSchema.index(
  { meal_date: 1, status: 1 }
);

// Pre-save hook: normalize meal_date to date-only (00:00 IST)
MealConfirmationSchema.pre('save', function (next) {
  if (this.meal_date) {
    const d = new Date(this.meal_date);
    d.setUTCHours(0, 0, 0, 0); // normalize to UTC midnight
    this.meal_date = d;
  }
  next();
});

const MealConfirmation = mongoose.model('MealConfirmation', MealConfirmationSchema);
module.exports = MealConfirmation;




// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const MealConfirmation = sequelize.define('MealConfirmation', {
//   confirmation_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   user_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: {
//       model: 'users',
//       key: 'user_id'
//     }
//   },
//   meal_date: {
//     type: DataTypes.DATEONLY,
//     allowNull: false
//   },
//   meal_type: {
//     type: DataTypes.ENUM('breakfast', 'lunch', 'snacks', 'dinner'),
//     allowNull: false
//   },
//   status: {
//     type: DataTypes.ENUM('confirmed', 'cancelled', 'no_response'),
//     defaultValue: 'no_response'
//   },
//   confirmed_at: {
//     type: DataTypes.DATE,
//     allowNull: true
//   },
//   notes: {
//     type: DataTypes.TEXT,
//     allowNull: true
//   }
// }, {
//   tableName: 'meal_confirmations',
//   timestamps: true,
//   createdAt: 'created_at',
//   updatedAt: 'updated_at',
//   indexes: [
//     {
//       unique: true,
//       fields: ['user_id', 'meal_date', 'meal_type']
//     },
//     {
//       fields: ['meal_date', 'status']
//     }
//   ]
// });

// module.exports = MealConfirmation;