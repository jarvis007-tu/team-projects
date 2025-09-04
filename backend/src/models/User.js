const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Full name is required'
      },
      len: {
        args: [2, 100],
        msg: 'Full name must be between 2 and 100 characters'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Email already exists'
    },
    validate: {
      isEmail: {
        msg: 'Invalid email format'
      },
      notEmpty: {
        msg: 'Email is required'
      }
    },
    set(value) {
      this.setDataValue('email', value?.toLowerCase().trim());
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: {
      msg: 'Phone number already exists'
    },
    validate: {
      is: {
        args: /^[6-9]\d{9}$/,
        msg: 'Invalid Indian phone number'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'subscriber'),
    defaultValue: 'subscriber',
    allowNull: false
  },
  device_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  profile_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
    allowNull: false
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  phone_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fcm_token: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      notifications: true,
      email_notifications: true,
      sms_notifications: false,
      meal_reminders: true
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['phone']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    },
    {
      fields: ['device_id']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    logger.error('Password validation error:', error);
    return false;
  }
};

User.prototype.isLocked = function() {
  return this.locked_until && this.locked_until > new Date();
};

User.prototype.incrementLoginAttempts = async function() {
  const maxAttempts = 5;
  const lockTime = 30 * 60 * 1000; // 30 minutes

  if (this.locked_until && this.locked_until < new Date()) {
    this.login_attempts = 0;
    this.locked_until = null;
  }

  this.login_attempts += 1;

  if (this.login_attempts >= maxAttempts) {
    this.locked_until = new Date(Date.now() + lockTime);
  }

  await this.save();
};

User.prototype.resetLoginAttempts = async function() {
  this.login_attempts = 0;
  this.locked_until = null;
  this.last_login = new Date();
  await this.save();
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.deletedAt;
  return values;
};

module.exports = User;