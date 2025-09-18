// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const logger = require('../utils/logger');

const { Schema } = mongoose;

const phoneRegex = /^[6-9]\d{9}$/;

const UserSchema = new Schema({
  full_name: {
    type: String,
    required: [true, 'Full name is required'],
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name must be at most 100 characters'],
    trim: true
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    maxlength: 100,
    trim: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        // simple email regex fallback to built-in validator is optional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },

  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function (v) {
        return phoneRegex.test(v);
      },
      message: 'Invalid Indian phone number'
    }
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    maxlength: [255, 'Password is too long']
  },

  role: {
    type: String,
    enum: ['admin', 'subscriber'],
    default: 'subscriber',
    required: true
  },

  device_id: { type: String, maxlength: 255, default: null },

  profile_image: { type: String, maxlength: 500, default: null },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    required: true
  },

  last_login: { type: Date, default: null },

  login_attempts: { type: Number, default: 0 },

  locked_until: { type: Date, default: null },

  email_verified: { type: Boolean, default: false },

  phone_verified: { type: Boolean, default: false },

  fcm_token: { type: String, maxlength: 500, default: null },

  preferences: {
    type: Schema.Types.Mixed,
    default: {
      notifications: true,
      email_notifications: true,
      sms_notifications: false,
      meal_reminders: true
    }
  },

  // Soft-delete field to mimic Sequelize paranoid
  deleted_at: { type: Date, default: null }
}, {
  collection: 'users',
  timestamps: true // createdAt, updatedAt
});

/**
 * Indexes
 */
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ device_id: 1 });
UserSchema.index({ createdAt: 1 });

/**
 * Pre-save hook: hash password when created or when modified
 */
UserSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
      const salt = await bcrypt.genSalt(rounds);
      this.password = await bcrypt.hash(this.password, salt);
    }
    // ensure email trimmed & lowercased (redundant with schema, but safe)
    if (this.email) this.email = this.email.toLowerCase().trim();
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance methods
 */
UserSchema.methods.validatePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    logger && logger.error('Password validation error:', error);
    return false;
  }
};

UserSchema.methods.isLocked = function () {
  return !!(this.locked_until && this.locked_until > new Date());
};

UserSchema.methods.incrementLoginAttempts = async function () {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
  const lockMinutes = parseInt(process.env.LOGIN_LOCK_MINUTES, 10) || 30;

  // If lock expired, reset counters
  if (this.locked_until && this.locked_until < new Date()) {
    this.login_attempts = 0;
    this.locked_until = null;
  }

  this.login_attempts = (this.login_attempts || 0) + 1;

  if (this.login_attempts >= maxAttempts) {
    this.locked_until = moment().add(lockMinutes, 'minutes').toDate();
  }

  await this.save();
};

UserSchema.methods.resetLoginAttempts = async function () {
  this.login_attempts = 0;
  this.locked_until = null;
  this.last_login = new Date();
  await this.save();
};

/**
 * Soft delete helper
 */
UserSchema.methods.softDelete = async function () {
  this.deleted_at = new Date();
  await this.save();
  return this;
};

/**
 * toJSON / toObject transform: remove sensitive fields
 */
function removeSensitive(doc, ret) {
  if (!ret) return;
  delete ret.password;
  delete ret.deleted_at;
  delete ret.__v;
  return ret;
}
UserSchema.set('toJSON', { transform: removeSensitive });
UserSchema.set('toObject', { transform: removeSensitive });

const User = mongoose.model('User', UserSchema);
module.exports = User;




// const { DataTypes } = require('sequelize');
// const bcrypt = require('bcryptjs');
// const { sequelize } = require('../config/database');
// const logger = require('../utils/logger');

// const User = sequelize.define('User', {
//   user_id: {
//     type: DataTypes.BIGINT,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   full_name: {
//     type: DataTypes.STRING(100),
//     allowNull: false,
//     validate: {
//       notEmpty: {
//         msg: 'Full name is required'
//       },
//       len: {
//         args: [2, 100],
//         msg: 'Full name must be between 2 and 100 characters'
//       }
//     }
//   },
//   email: {
//     type: DataTypes.STRING(100),
//     allowNull: false,
//     unique: {
//       msg: 'Email already exists'
//     },
//     validate: {
//       isEmail: {
//         msg: 'Invalid email format'
//       },
//       notEmpty: {
//         msg: 'Email is required'
//       }
//     },
//     set(value) {
//       this.setDataValue('email', value?.toLowerCase().trim());
//     }
//   },
//   phone: {
//     type: DataTypes.STRING(15),
//     allowNull: false,
//     unique: {
//       msg: 'Phone number already exists'
//     },
//     validate: {
//       is: {
//         args: /^[6-9]\d{9}$/,
//         msg: 'Invalid Indian phone number'
//       }
//     }
//   },
//   password: {
//     type: DataTypes.STRING(255),
//     allowNull: false,
//     validate: {
//       len: {
//         args: [6, 255],
//         msg: 'Password must be at least 6 characters'
//       }
//     }
//   },
//   role: {
//     type: DataTypes.ENUM('admin', 'subscriber'),
//     defaultValue: 'subscriber',
//     allowNull: false
//   },
//   device_id: {
//     type: DataTypes.STRING(255),
//     allowNull: true
//   },
//   profile_image: {
//     type: DataTypes.STRING(500),
//     allowNull: true
//   },
//   status: {
//     type: DataTypes.ENUM('active', 'inactive', 'suspended'),
//     defaultValue: 'active',
//     allowNull: false
//   },
//   last_login: {
//     type: DataTypes.DATE,
//     allowNull: true
//   },
//   login_attempts: {
//     type: DataTypes.INTEGER,
//     defaultValue: 0
//   },
//   locked_until: {
//     type: DataTypes.DATE,
//     allowNull: true
//   },
//   email_verified: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false
//   },
//   phone_verified: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false
//   },
//   fcm_token: {
//     type: DataTypes.STRING(500),
//     allowNull: true
//   },
//   preferences: {
//     type: DataTypes.JSON,
//     defaultValue: {
//       notifications: true,
//       email_notifications: true,
//       sms_notifications: false,
//       meal_reminders: true
//     }
//   }
// }, {
//   tableName: 'users',
//   timestamps: true,
//   paranoid: true,
//   indexes: [
//     {
//       unique: true,
//       fields: ['email']
//     },
//     {
//       unique: true,
//       fields: ['phone']
//     },
//     {
//       fields: ['role']
//     },
//     {
//       fields: ['status']
//     },
//     {
//       fields: ['device_id']
//     },
//     {
//       fields: ['createdAt']
//     }
//   ],
//   hooks: {
//     beforeCreate: async (user) => {
//       if (user.password) {
//         const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
//         user.password = await bcrypt.hash(user.password, salt);
//       }
//     },
//     beforeUpdate: async (user) => {
//       if (user.changed('password')) {
//         const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
//         user.password = await bcrypt.hash(user.password, salt);
//       }
//     }
//   }
// });

// // Instance methods
// User.prototype.validatePassword = async function(password) {
//   try {
//     return await bcrypt.compare(password, this.password);
//   } catch (error) {
//     logger.error('Password validation error:', error);
//     return false;
//   }
// };

// User.prototype.isLocked = function() {
//   return this.locked_until && this.locked_until > new Date();
// };

// User.prototype.incrementLoginAttempts = async function() {
//   const maxAttempts = 5;
//   const lockTime = 30 * 60 * 1000; // 30 minutes

//   if (this.locked_until && this.locked_until < new Date()) {
//     this.login_attempts = 0;
//     this.locked_until = null;
//   }

//   this.login_attempts += 1;

//   if (this.login_attempts >= maxAttempts) {
//     this.locked_until = new Date(Date.now() + lockTime);
//   }

//   await this.save();
// };

// User.prototype.resetLoginAttempts = async function() {
//   this.login_attempts = 0;
//   this.locked_until = null;
//   this.last_login = new Date();
//   await this.save();
// };

// User.prototype.toJSON = function() {
//   const values = Object.assign({}, this.get());
//   delete values.password;
//   delete values.deletedAt;
//   return values;
// };

// module.exports = User;