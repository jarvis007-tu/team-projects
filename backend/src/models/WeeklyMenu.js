const mongoose = require('mongoose');
const moment = require('moment-timezone');

const WeeklyMenuSchema = new mongoose.Schema({
  mess_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Mess ID is required'],
    index: true
  },
  week_start_date: {
    type: Date,
    required: [true, 'Week start date is required']
  },
  week_end_date: {
    type: Date,
    required: [true, 'Week end date is required']
  },
  day: {
    type: String,
    enum: {
      values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      message: '{VALUE} is not a valid day'
    },
    required: [true, 'Day is required']
  },
  meal_type: {
    type: String,
    enum: {
      values: ['breakfast', 'lunch', 'dinner'],
      message: '{VALUE} is not a valid meal type'
    },
    required: [true, 'Meal type is required']
  },
  items: {
    type: [String],
    required: true,
    default: [],
    validate: {
      validator: function(value) {
        return Array.isArray(value);
      },
      message: 'Items must be an array'
    }
  },
  special_items: {
    type: [String],
    default: []
  },
  nutritional_info: {
    type: Object,
    default: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    }
  },
  is_veg: {
    type: Boolean,
    default: true
  },
  allergen_info: {
    type: [String],
    default: []
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  is_active: {
    type: Boolean,
    default: true
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
  collection: 'weekly_menus'
});

// Indexes
WeeklyMenuSchema.index({ week_start_date: 1, week_end_date: 1 });
WeeklyMenuSchema.index({ day: 1 });
WeeklyMenuSchema.index({ meal_type: 1 });
WeeklyMenuSchema.index({ is_active: 1 });
WeeklyMenuSchema.index({ mess_id: 1, week_start_date: 1, day: 1, meal_type: 1 }, { unique: true }); // Unique constraint per mess

// Static method to get current week menu
WeeklyMenuSchema.statics.getCurrentWeekMenu = async function() {
  const startOfWeek = moment().tz('Asia/Kolkata').startOf('week').toDate();
  const endOfWeek = moment().tz('Asia/Kolkata').endOf('week').toDate();

  return await this.find({
    week_start_date: { $gte: startOfWeek },
    week_end_date: { $lte: endOfWeek },
    is_active: true,
    deleted_at: null
  })
  .sort({ day: 1, meal_type: 1 })
  .populate('created_by', 'full_name email');
};

// Static method to get today's menu
WeeklyMenuSchema.statics.getTodayMenu = async function() {
  const today = moment().tz('Asia/Kolkata').format('dddd').toLowerCase();
  const currentDate = moment().tz('Asia/Kolkata').toDate();

  return await this.find({
    day: today,
    week_start_date: { $lte: currentDate },
    week_end_date: { $gte: currentDate },
    is_active: true,
    deleted_at: null
  })
  .sort({ meal_type: 1 })
  .populate('created_by', 'full_name email');
};

// Soft delete method
WeeklyMenuSchema.methods.softDelete = async function() {
  this.deleted_at = new Date();
  await this.save();
};

// Restore method
WeeklyMenuSchema.methods.restore = async function() {
  this.deleted_at = null;
  await this.save();
};

// Override toJSON to rename _id to menu_id
WeeklyMenuSchema.methods.toJSON = function() {
  const menuObject = this.toObject();
  delete menuObject.__v;

  // Rename _id to menu_id for consistency
  if (menuObject._id) {
    menuObject.menu_id = menuObject._id;
    delete menuObject._id;
  }

  // Rename timestamps from camelCase to snake_case for frontend compatibility
  if (menuObject.createdAt) {
    menuObject.created_at = menuObject.createdAt;
    delete menuObject.createdAt;
  }
  if (menuObject.updatedAt) {
    menuObject.updated_at = menuObject.updatedAt;
    delete menuObject.updatedAt;
  }

  // Convert created_by ObjectId to string
  if (menuObject.created_by && typeof menuObject.created_by === 'object' && menuObject.created_by._id) {
    // Already populated, keep as is
  } else if (menuObject.created_by) {
    menuObject.created_by = menuObject.created_by.toString();
  }

  return menuObject;
};

// Static methods for finding active records
WeeklyMenuSchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, deleted_at: null });
};

WeeklyMenuSchema.statics.findOneActive = function(conditions = {}) {
  return this.findOne({ ...conditions, deleted_at: null });
};

const WeeklyMenu = mongoose.model('WeeklyMenu', WeeklyMenuSchema);

module.exports = WeeklyMenu;
