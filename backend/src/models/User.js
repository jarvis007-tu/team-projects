const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const UserSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name must not exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email must not exceed 100 characters'],
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    maxlength: [255, 'Password is too long'],
    select: false // Don't include password in queries by default
  },
  mess_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Mess ID is required'],
    index: true
  },
  role: {
    type: String,
    enum: {
      values: ['super_admin', 'mess_admin', 'subscriber'],
      message: '{VALUE} is not a valid role'
    },
    default: 'subscriber'
  },
  device_id: {
    type: String,
    default: null
  },
  profile_image: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  last_login: {
    type: Date,
    default: null
  },
  login_attempts: {
    type: Number,
    default: 0
  },
  locked_until: {
    type: Date,
    default: null
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  phone_verified: {
    type: Boolean,
    default: false
  },
  fcm_token: {
    type: String,
    default: null
  },
  preferences: {
    type: Object,
    default: {
      notifications: true,
      email_notifications: true,
      sms_notifications: false,
      meal_reminders: true
    }
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'users'
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ device_id: 1 });
UserSchema.index({ mess_id: 1 });
UserSchema.index({ mess_id: 1, role: 1 });
UserSchema.index({ mess_id: 1, status: 1 });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to validate password
UserSchema.methods.validatePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    logger.error('Password validation error:', error);
    return false;
  }
};

// Instance method to check if user is locked
UserSchema.methods.isLocked = function() {
  return this.locked_until && this.locked_until > new Date();
};

// Instance method to increment login attempts
UserSchema.methods.incrementLoginAttempts = async function() {
  const maxAttempts = 5;
  const lockTime = 30 * 60 * 1000; // 30 minutes

  // Reset login attempts if lock has expired
  if (this.locked_until && this.locked_until < new Date()) {
    this.login_attempts = 0;
    this.locked_until = null;
  }

  this.login_attempts += 1;

  // Lock account if max attempts reached
  if (this.login_attempts >= maxAttempts) {
    this.locked_until = new Date(Date.now() + lockTime);
  }

  await this.save();
};

// Instance method to reset login attempts
UserSchema.methods.resetLoginAttempts = async function() {
  this.login_attempts = 0;
  this.locked_until = null;
  this.last_login = new Date();
  await this.save();
};

// Override toJSON to remove sensitive fields
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.deleted_at;
  delete userObject.__v;

  // Rename _id to user_id for consistency with old API
  if (userObject._id) {
    userObject.user_id = userObject._id;
    delete userObject._id;
  }

  // Rename timestamps from camelCase to snake_case for frontend compatibility
  if (userObject.createdAt) {
    userObject.created_at = userObject.createdAt;
    delete userObject.createdAt;
  }
  if (userObject.updatedAt) {
    userObject.updated_at = userObject.updatedAt;
    delete userObject.updatedAt;
  }

  return userObject;
};

// Virtual for soft delete support (paranoid mode)
UserSchema.plugin(function(schema) {
  // Add soft delete method
  schema.methods.softDelete = async function() {
    this.deleted_at = new Date();
    await this.save();
  };

  // Add restore method
  schema.methods.restore = async function() {
    this.deleted_at = null;
    await this.save();
  };
});

// Static method to find without deleted records (paranoid behavior)
UserSchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, deleted_at: null });
};

UserSchema.statics.findOneActive = function(conditions = {}) {
  return this.findOne({ ...conditions, deleted_at: null });
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
