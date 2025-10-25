const mongoose = require('mongoose');

const MealConfirmationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  meal_date: {
    type: Date,
    required: [true, 'Meal date is required']
  },
  meal_type: {
    type: String,
    enum: {
      values: ['breakfast', 'lunch', 'snacks', 'dinner'],
      message: '{VALUE} is not a valid meal type'
    },
    required: [true, 'Meal type is required']
  },
  status: {
    type: String,
    enum: {
      values: ['confirmed', 'cancelled', 'no_response'],
      message: '{VALUE} is not a valid status'
    },
    default: 'no_response'
  },
  confirmed_at: {
    type: Date,
    default: null
  },
  notes: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'meal_confirmations'
});

// Indexes
MealConfirmationSchema.index({ user_id: 1, meal_date: 1, meal_type: 1 }, { unique: true }); // Unique constraint
MealConfirmationSchema.index({ meal_date: 1, status: 1 });
MealConfirmationSchema.index({ user_id: 1 });

// Instance method to confirm meal
MealConfirmationSchema.methods.confirm = async function() {
  this.status = 'confirmed';
  this.confirmed_at = new Date();
  await this.save();
};

// Instance method to cancel meal
MealConfirmationSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  await this.save();
};

// Override toJSON to rename _id to confirmation_id
MealConfirmationSchema.methods.toJSON = function() {
  const confirmationObject = this.toObject();
  delete confirmationObject.__v;

  // Rename _id to confirmation_id for consistency
  if (confirmationObject._id) {
    confirmationObject.confirmation_id = confirmationObject._id;
    delete confirmationObject._id;
  }

  // Convert user_id ObjectId to string
  if (confirmationObject.user_id) {
    confirmationObject.user_id = confirmationObject.user_id.toString();
  }

  return confirmationObject;
};

// Static method to get confirmations by date
MealConfirmationSchema.statics.getByDate = async function(date) {
  return await this.find({
    meal_date: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999))
    }
  }).populate('user_id', 'full_name email phone');
};

const MealConfirmation = mongoose.model('MealConfirmation', MealConfirmationSchema);

module.exports = MealConfirmation;
