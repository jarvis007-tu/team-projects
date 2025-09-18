// models/WeeklyMenu.js
const mongoose = require('mongoose');
const moment = require('moment-timezone');

const { Schema } = mongoose;

const NutritionSchema = new Schema({
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 }
}, { _id: false });

const WeeklyMenuSchema = new Schema({
  week_start_date: { type: Date, required: true },
  week_end_date: { type: Date, required: true },

  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },

  meal_type: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    required: true
  },

  items: {
    type: [Schema.Types.Mixed],
    default: [],
    validate: {
      validator: function (v) {
        return Array.isArray(v);
      },
      message: 'Items must be an array'
    }
  },

  special_items: {
    type: [Schema.Types.Mixed],
    default: []
  },

  nutritional_info: {
    type: NutritionSchema,
    default: () => ({})
  },

  is_veg: { type: Boolean, default: true },

  allergen_info: { type: [String], default: [] },

  price: { type: Schema.Types.Decimal128, default: 0 },

  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  is_active: { type: Boolean, default: true },

  notes: { type: String, default: null },

  // soft-delete mirror of Sequelize paranoid
  deleted_at: { type: Date, default: null }
}, {
  collection: 'weekly_menus',
  timestamps: true
});

/**
 * Indexes
 */
WeeklyMenuSchema.index({ week_start_date: 1, week_end_date: 1 });
WeeklyMenuSchema.index({ day: 1 });
WeeklyMenuSchema.index({ meal_type: 1 });
WeeklyMenuSchema.index({ is_active: 1 });
WeeklyMenuSchema.index(
  { week_start_date: 1, day: 1, meal_type: 1 },
  { unique: true, name: 'idx_unique_menu' }
);

/**
 * Pre-save: normalize week_start_date and week_end_date to date-only (IST)
 */
WeeklyMenuSchema.pre('save', function (next) {
  if (this.week_start_date) {
    this.week_start_date = moment(this.week_start_date).tz('Asia/Kolkata').startOf('day').toDate();
  }
  if (this.week_end_date) {
    this.week_end_date = moment(this.week_end_date).tz('Asia/Kolkata').startOf('day').toDate();
  }
  next();
});

/**
 * Static: getCurrentWeekMenu
 * Returns all active menu entries whose week range overlaps current week
 */
WeeklyMenuSchema.statics.getCurrentWeekMenu = async function () {
  const startOfWeek = moment().tz('Asia/Kolkata').startOf('week').startOf('day').toDate();
  const endOfWeek = moment().tz('Asia/Kolkata').endOf('week').endOf('day').toDate();

  return this.find({
    week_start_date: { $gte: startOfWeek },
    week_end_date: { $lte: endOfWeek },
    is_active: true,
    deleted_at: null
  }).sort({ day: 1, meal_type: 1 }).lean().exec();
};

/**
 * Static: getTodayMenu
 * Returns menu for today's day within any week range that contains today
 */
WeeklyMenuSchema.statics.getTodayMenu = async function () {
  const todayMoment = moment().tz('Asia/Kolkata');
  const todayName = todayMoment.format('dddd').toLowerCase();

  const todayDate = todayMoment.startOf('day').toDate();

  return this.find({
    day: todayName,
    week_start_date: { $lte: todayDate },
    week_end_date: { $gte: todayDate },
    is_active: true,
    deleted_at: null
  }).sort({ meal_type: 1 }).lean().exec();
};

const WeeklyMenu = mongoose.model('WeeklyMenu', WeeklyMenuSchema);
module.exports = WeeklyMenu;



// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const WeeklyMenu = sequelize.define('WeeklyMenu', {
//   menu_id: {
//     type: DataTypes.BIGINT,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   week_start_date: {
//     type: DataTypes.DATEONLY,
//     allowNull: false
//   },
//   week_end_date: {
//     type: DataTypes.DATEONLY,
//     allowNull: false
//   },
//   day: {
//     type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
//     allowNull: false
//   },
//   meal_type: {
//     type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
//     allowNull: false
//   },
//   items: {
//     type: DataTypes.JSON,
//     allowNull: false,
//     defaultValue: [],
//     validate: {
//       isArray(value) {
//         if (!Array.isArray(value)) {
//           throw new Error('Items must be an array');
//         }
//       }
//     }
//   },
//   special_items: {
//     type: DataTypes.JSON,
//     defaultValue: []
//   },
//   nutritional_info: {
//     type: DataTypes.JSON,
//     defaultValue: {
//       calories: 0,
//       protein: 0,
//       carbs: 0,
//       fat: 0,
//       fiber: 0
//     }
//   },
//   is_veg: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: true
//   },
//   allergen_info: {
//     type: DataTypes.JSON,
//     defaultValue: []
//   },
//   price: {
//     type: DataTypes.DECIMAL(10, 2),
//     defaultValue: 0
//   },
//   created_by: {
//     type: DataTypes.BIGINT,
//     allowNull: false,
//     references: {
//       model: 'users',
//       key: 'user_id'
//     }
//   },
//   is_active: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: true
//   },
//   notes: {
//     type: DataTypes.TEXT,
//     allowNull: true
//   }
// }, {
//   tableName: 'weekly_menus',
//   timestamps: true,
//   paranoid: true,
//   indexes: [
//     {
//       fields: ['week_start_date', 'week_end_date']
//     },
//     {
//       fields: ['day']
//     },
//     {
//       fields: ['meal_type']
//     },
//     {
//       fields: ['is_active']
//     },
//     {
//       unique: true,
//       name: 'idx_unique_menu',
//       fields: ['week_start_date', 'day', 'meal_type']
//     }
//   ]
// });

// // Class methods
// WeeklyMenu.getCurrentWeekMenu = async function() {
//   const moment = require('moment-timezone');
//   const startOfWeek = moment().tz('Asia/Kolkata').startOf('week');
//   const endOfWeek = moment().tz('Asia/Kolkata').endOf('week');

//   return await this.findAll({
//     where: {
//       week_start_date: {
//         [sequelize.Op.gte]: startOfWeek.format('YYYY-MM-DD')
//       },
//       week_end_date: {
//         [sequelize.Op.lte]: endOfWeek.format('YYYY-MM-DD')
//       },
//       is_active: true
//     },
//     order: [
//       ['day', 'ASC'],
//       ['meal_type', 'ASC']
//     ]
//   });
// };

// WeeklyMenu.getTodayMenu = async function() {
//   const moment = require('moment-timezone');
//   const today = moment().tz('Asia/Kolkata').format('dddd').toLowerCase();
//   const startOfWeek = moment().tz('Asia/Kolkata').startOf('week');
  
//   return await this.findAll({
//     where: {
//       day: today,
//       week_start_date: {
//         [sequelize.Op.lte]: moment().format('YYYY-MM-DD')
//       },
//       week_end_date: {
//         [sequelize.Op.gte]: moment().format('YYYY-MM-DD')
//       },
//       is_active: true
//     },
//     order: [['meal_type', 'ASC']]
//   });
// };

// module.exports = WeeklyMenu;