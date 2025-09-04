const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const Subscription = sequelize.define('Subscription', {
  subscription_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  plan_type: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  plan_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      isAfterStartDate(value) {
        if (value <= this.start_date) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'expired', 'cancelled', 'pending'),
    defaultValue: 'pending',
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM('paid', 'pending', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'upi', 'card', 'netbanking', 'wallet'),
    allowNull: true
  },
  payment_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  auto_renewal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  meals_included: {
    type: DataTypes.JSON,
    defaultValue: {
      breakfast: true,
      lunch: true,
      dinner: true
    }
  },
  special_requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['start_date']
    },
    {
      fields: ['end_date']
    },
    {
      fields: ['plan_type']
    },
    {
      fields: ['payment_status']
    },
    {
      name: 'idx_active_subscription',
      fields: ['user_id', 'status', 'start_date', 'end_date']
    }
  ],
  hooks: {
    beforeCreate: (subscription) => {
      subscription.validateDates();
    },
    beforeUpdate: (subscription) => {
      subscription.validateDates();
      subscription.updateStatus();
    }
  }
});

// Instance methods
Subscription.prototype.validateDates = function() {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  if (endDate.isSameOrBefore(startDate)) {
    throw new Error('End date must be after start date');
  }
};

Subscription.prototype.updateStatus = function() {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  if (this.status !== 'cancelled' && this.status !== 'paused') {
    if (today.isAfter(endDate)) {
      this.status = 'expired';
    } else if (today.isBetween(startDate, endDate, null, '[]')) {
      if (this.payment_status === 'paid') {
        this.status = 'active';
      }
    }
  }
};

Subscription.prototype.isActive = function() {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  return this.status === 'active' && 
         this.payment_status === 'paid' &&
         today.isBetween(startDate, endDate, null, '[]');
};

Subscription.prototype.canAccessMeal = function(mealType) {
  if (!this.isActive()) return false;
  return this.meals_included[mealType] === true;
};

Subscription.prototype.getDaysRemaining = function() {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');
  const days = endDate.diff(today, 'days');
  return days > 0 ? days : 0;
};

Subscription.prototype.extendSubscription = async function(days) {
  const currentEndDate = moment(this.end_date).tz('Asia/Kolkata');
  this.end_date = currentEndDate.add(days, 'days').format('YYYY-MM-DD');
  await this.save();
};

module.exports = Subscription;