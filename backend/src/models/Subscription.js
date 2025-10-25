const mongoose = require('mongoose');
const moment = require('moment-timezone');

const SubscriptionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  plan_type: {
    type: String,
    enum: {
      values: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      message: '{VALUE} is not a valid plan type'
    },
    required: true,
    default: 'monthly'
  },
  plan_name: {
    type: String,
    trim: true,
    maxlength: [100, 'Plan name must not exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  start_date: {
    type: Date,
    required: [true, 'Start date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.start_date;
      },
      message: 'End date must be after start date'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'paused', 'expired', 'cancelled', 'pending'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending'
  },
  payment_status: {
    type: String,
    enum: {
      values: ['paid', 'pending', 'failed', 'refunded'],
      message: '{VALUE} is not a valid payment status'
    },
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: {
      values: ['cash', 'upi', 'card', 'netbanking', 'wallet', null],
      message: '{VALUE} is not a valid payment method'
    },
    default: null
  },
  payment_reference: {
    type: String,
    maxlength: [100, 'Payment reference must not exceed 100 characters']
  },
  auto_renewal: {
    type: Boolean,
    default: false
  },
  meals_included: {
    type: Object,
    default: {
      breakfast: true,
      lunch: true,
      dinner: true
    }
  },
  special_requirements: {
    type: String
  },
  notes: {
    type: String
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'subscriptions'
});

// Indexes
SubscriptionSchema.index({ user_id: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ start_date: 1 });
SubscriptionSchema.index({ end_date: 1 });
SubscriptionSchema.index({ plan_type: 1 });
SubscriptionSchema.index({ payment_status: 1 });
SubscriptionSchema.index({ user_id: 1, status: 1, start_date: 1, end_date: 1 }); // Composite index

// Pre-save validation
SubscriptionSchema.pre('save', function(next) {
  try {
    this.validateDates();
    this.updateStatus();
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to validate dates
SubscriptionSchema.methods.validateDates = function() {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  if (endDate.isSameOrBefore(startDate)) {
    throw new Error('End date must be after start date');
  }
};

// Instance method to update status
SubscriptionSchema.methods.updateStatus = function() {
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

// Instance method to check if subscription is active
SubscriptionSchema.methods.isActive = function() {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const startDate = moment(this.start_date).tz('Asia/Kolkata').startOf('day');
  const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');

  return this.status === 'active' &&
         this.payment_status === 'paid' &&
         today.isBetween(startDate, endDate, null, '[]');
};

// Instance method to check if user can access meal
SubscriptionSchema.methods.canAccessMeal = function(mealType) {
  if (!this.isActive()) return false;
  return this.meals_included[mealType] === true;
};

// Instance method to get days remaining
SubscriptionSchema.methods.getDaysRemaining = function() {
  const today = moment().tz('Asia/Kolkata').startOf('day');
  const endDate = moment(this.end_date).tz('Asia/Kolkata').startOf('day');
  const days = endDate.diff(today, 'days');
  return days > 0 ? days : 0;
};

// Instance method to extend subscription
SubscriptionSchema.methods.extendSubscription = async function(days) {
  const currentEndDate = moment(this.end_date).tz('Asia/Kolkata');
  this.end_date = currentEndDate.add(days, 'days').toDate();
  await this.save();
};

// Soft delete method
SubscriptionSchema.methods.softDelete = async function() {
  this.deleted_at = new Date();
  await this.save();
};

// Restore method
SubscriptionSchema.methods.restore = async function() {
  this.deleted_at = null;
  await this.save();
};

// Override toJSON to rename _id to subscription_id
SubscriptionSchema.methods.toJSON = function() {
  const subscriptionObject = this.toObject();
  delete subscriptionObject.__v;

  // Rename _id to subscription_id for consistency
  if (subscriptionObject._id) {
    subscriptionObject.subscription_id = subscriptionObject._id;
    delete subscriptionObject._id;
  }

  // Convert user_id ObjectId to string for frontend
  if (subscriptionObject.user_id) {
    subscriptionObject.user_id = subscriptionObject.user_id.toString();
  }

  return subscriptionObject;
};

// Static methods for finding active records
SubscriptionSchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, deleted_at: null });
};

SubscriptionSchema.statics.findOneActive = function(conditions = {}) {
  return this.findOne({ ...conditions, deleted_at: null });
};

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = Subscription;
