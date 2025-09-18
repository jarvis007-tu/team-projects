// models/Subscription.js
const mongoose = require('mongoose');
const moment = require('moment-timezone');

const { Schema } = mongoose;

const SubscriptionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  plan_type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true,
    default: 'monthly'
  },

  plan_name: { type: String, maxlength: 100, default: null },

  amount: {
    type: Schema.Types.Decimal128,
    required: true,
    validate: {
      validator: function (v) {
        // Decimal128 validator: convert to string then number
        const num = parseFloat(v ? v.toString() : 0);
        return !isNaN(num) && num >= 0;
      },
      message: 'Amount must be a non-negative number'
    }
  },

  start_date: { type: Date, required: true },

  end_date: { type: Date, required: true },

  status: {
    type: String,
    enum: ['active', 'paused', 'expired', 'cancelled', 'pending'],
    default: 'pending',
    required: true
  },

  payment_status: {
    type: String,
    enum: ['paid', 'pending', 'failed', 'refunded'],
    default: 'pending'
  },

  payment_method: {
    type: String,
    enum: ['cash', 'upi', 'card', 'netbanking', 'wallet'],
    default: null
  },

  payment_reference: { type: String, maxlength: 100, default: null },

  auto_renewal: { type: Boolean, default: false },

  // meals_included stored as mixed so it behaves like JSON
  meals_included: {
    type: Schema.Types.Mixed,
    default: { breakfast: true, lunch: true, dinner: true }
  },

  special_requirements: { type: String, default: null },
  notes: { type: String, default: null },

  // Optional soft-delete field (since Sequelize paranoid was true)
  deleted_at: { type: Date, default: null }
}, {
  collection: 'subscriptions',
  timestamps: true
});

/**
 * Indexes (match Sequelize indexes)
 */
SubscriptionSchema.index({ user_id: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ start_date: 1 });
SubscriptionSchema.index({ end_date: 1 });
SubscriptionSchema.index({ plan_type: 1 });
SubscriptionSchema.index({ payment_status: 1 });
SubscriptionSchema.index({ user_id: 1, status: 1, start_date: 1, end_date: 1 }, { name: 'idx_active_subscription' });

/**
 * Instance methods
 */

// validateDates: ensures end_date > start_date
SubscriptionSchema.methods.validateDates = function () {
  const start = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const end = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  if (!end.isAfter(start)) {
    throw new Error('End date must be after start date');
  }
};

// updateStatus: set status based on dates & payment_status (unless paused/cancelled)
SubscriptionSchema.methods.updateStatus = function () {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const start = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const end = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  if (this.status === 'cancelled' || this.status === 'paused') {
    return;
  }

  if (today.isAfter(end)) {
    this.status = 'expired';
  } else if (today.isBetween(start, end, null, '[]')) {
    if (this.payment_status === 'paid') {
      this.status = 'active';
    }
  }
};

// isActive: boolean check
SubscriptionSchema.methods.isActive = function () {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const start = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const end = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  return this.status === 'active' &&
    this.payment_status === 'paid' &&
    today.isBetween(start, end, null, '[]');
};

// canAccessMeal: checks meals_included map
SubscriptionSchema.methods.canAccessMeal = function (mealType) {
  if (!this.isActive()) return false;
  if (!this.meals_included) return false;
  // handle meals_included stored as object or Map-like
  return !!(this.meals_included[mealType]);
};

// getDaysRemaining: returns integer days remaining (>=0)
SubscriptionSchema.methods.getDaysRemaining = function () {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const end = moment(this.end_date).tz('Asia/Kolkata').startOf('day');
  const days = end.diff(today, 'days');
  return days > 0 ? days : 0;
};

// extendSubscription: add days to end_date and save
SubscriptionSchema.methods.extendSubscription = async function (days) {
  const end = moment(this.end_date).tz('Asia/Kolkata');
  this.end_date = end.add(days, 'days').startOf('day').toDate();
  await this.save();
  return this;
};

/**
 * Hooks
 */
SubscriptionSchema.pre('save', function (next) {
  // normalize start_date and end_date to date-only (UTC midnight)
  if (this.start_date) {
    const s = moment(this.start_date).tz('Asia/Kolkata').startOf('day').toDate();
    this.start_date = s;
  }
  if (this.end_date) {
    const e = moment(this.end_date).tz('Asia/Kolkata').startOf('day').toDate();
    this.end_date = e;
  }

  try {
    // validate dates & update status before save
    this.validateDates();
    this.updateStatus();
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Soft-delete helper (optional)
 */
SubscriptionSchema.methods.softDelete = async function () {
  this.deleted_at = new Date();
  await this.save();
  return this;
};

const Subscription = mongoose.model('Subscription', SubscriptionSchema);
module.exports = Subscription;



// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');
// const moment = require('moment-timezone');

// const Subscription = sequelize.define('Subscription', {
//   subscription_id: {
//     type: DataTypes.BIGINT,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   user_id: {
//     type: DataTypes.BIGINT,
//     allowNull: false,
//     references: {
//       model: 'users',
//       key: 'user_id'
//     }
//   },
//   plan_type: {
//     type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
//     allowNull: false,
//     defaultValue: 'monthly'
//   },
//   plan_name: {
//     type: DataTypes.STRING(100),
//     allowNull: true
//   },
//   amount: {
//     type: DataTypes.DECIMAL(10, 2),
//     allowNull: false,
//     validate: {
//       min: 0
//     }
//   },
//   start_date: {
//     type: DataTypes.DATEONLY,
//     allowNull: false,
//     validate: {
//       isDate: true
//     }
//   },
//   end_date: {
//     type: DataTypes.DATEONLY,
//     allowNull: false,
//     validate: {
//       isDate: true,
//       isAfterStartDate(value) {
//         if (value <= this.start_date) {
//           throw new Error('End date must be after start date');
//         }
//       }
//     }
//   },
//   status: {
//     type: DataTypes.ENUM('active', 'paused', 'expired', 'cancelled', 'pending'),
//     defaultValue: 'pending',
//     allowNull: false
//   },
//   payment_status: {
//     type: DataTypes.ENUM('paid', 'pending', 'failed', 'refunded'),
//     defaultValue: 'pending'
//   },
//   payment_method: {
//     type: DataTypes.ENUM('cash', 'upi', 'card', 'netbanking', 'wallet'),
//     allowNull: true
//   },
//   payment_reference: {
//     type: DataTypes.STRING(100),
//     allowNull: true
//   },
//   auto_renewal: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false
//   },
//   meals_included: {
//     type: DataTypes.JSON,
//     defaultValue: {
//       breakfast: true,
//       lunch: true,
//       dinner: true
//     }
//   },
//   special_requirements: {
//     type: DataTypes.TEXT,
//     allowNull: true
//   },
//   notes: {
//     type: DataTypes.TEXT,
//     allowNull: true
//   }
// }, {
//   tableName: 'subscriptions',
//   timestamps: true,
//   paranoid: true,
//   indexes: [
//     {
//       fields: ['user_id']
//     },
//     {
//       fields: ['status']
//     },
//     {
//       fields: ['start_date']
//     },
//     {
//       fields: ['end_date']
//     },
//     {
//       fields: ['plan_type']
//     },
//     {
//       fields: ['payment_status']
//     },
//     {
//       name: 'idx_active_subscription',
//       fields: ['user_id', 'status', 'start_date', 'end_date']
//     }
//   ],
//   hooks: {
//     beforeCreate: (subscription) => {
//       subscription.validateDates();
//     },
//     beforeUpdate: (subscription) => {
//       subscription.validateDates();
//       subscription.updateStatus();
//     }
//   }
// });

// // Instance methods
// Subscription.prototype.validateDates = function() {
//   const today = moment().tz('Asia/Kolkata').startOf('day');
//   const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
//   const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

//   if (endDate.isSameOrBefore(startDate)) {
//     throw new Error('End date must be after start date');
//   }
// };

// Subscription.prototype.updateStatus = function() {
//   const today = moment().tz('Asia/Kolkata').startOf('day');
//   const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
//   const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

//   if (this.status !== 'cancelled' && this.status !== 'paused') {
//     if (today.isAfter(endDate)) {
//       this.status = 'expired';
//     } else if (today.isBetween(startDate, endDate, null, '[]')) {
//       if (this.payment_status === 'paid') {
//         this.status = 'active';
//       }
//     }
//   }
// };

// Subscription.prototype.isActive = function() {
//   const today = moment().tz('Asia/Kolkata').startOf('day');
//   const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
//   const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

//   return this.status === 'active' && 
//          this.payment_status === 'paid' &&
//          today.isBetween(startDate, endDate, null, '[]');
// };

// Subscription.prototype.canAccessMeal = function(mealType) {
//   if (!this.isActive()) return false;
//   return this.meals_included[mealType] === true;
// };

// Subscription.prototype.getDaysRemaining = function() {
//   const today = moment().tz('Asia/Kolkata').startOf('day');
//   const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');
//   const days = endDate.diff(today, 'days');
//   return days > 0 ? days : 0;
// };

// Subscription.prototype.extendSubscription = async function(days) {
//   const currentEndDate = moment(this.end_date).tz('Asia/Kolkata');
//   this.end_date = currentEndDate.add(days, 'days').format('YYYY-MM-DD');
//   await this.save();
// };

// module.exports = Subscription;