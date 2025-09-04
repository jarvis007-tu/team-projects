const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');
const geolib = require('geolib');

const Attendance = sequelize.define('Attendance', {
  attendance_id: {
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
  subscription_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'subscription_id'
    }
  },
  scan_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
    allowNull: false
  },
  scan_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  qr_code: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  geo_location: {
    type: DataTypes.JSON,
    allowNull: true,
    validate: {
      isValidLocation(value) {
        if (value && (!value.latitude || !value.longitude)) {
          throw new Error('Invalid geolocation format');
        }
      }
    }
  },
  distance_from_mess: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  device_info: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  is_valid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  validation_errors: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  scan_method: {
    type: DataTypes.ENUM('qr', 'manual', 'face', 'nfc'),
    defaultValue: 'qr'
  },
  meal_consumed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  feedback: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  special_meal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  }
}, {
  tableName: 'attendance_logs',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['subscription_id']
    },
    {
      fields: ['scan_date']
    },
    {
      fields: ['meal_type']
    },
    {
      fields: ['is_valid']
    },
    {
      unique: true,
      name: 'idx_unique_meal_attendance',
      fields: ['user_id', 'scan_date', 'meal_type']
    },
    {
      name: 'idx_attendance_lookup',
      fields: ['user_id', 'scan_date', 'meal_type', 'is_valid']
    }
  ]
});

// Class methods
Attendance.getMealTimings = function() {
  return {
    breakfast: {
      start: process.env.BREAKFAST_START || '07:00',
      end: process.env.BREAKFAST_END || '10:00'
    },
    lunch: {
      start: process.env.LUNCH_START || '12:00',
      end: process.env.LUNCH_END || '15:00'
    },
    dinner: {
      start: process.env.DINNER_START || '19:00',
      end: process.env.DINNER_END || '22:00'
    }
  };
};

// Instance methods
Attendance.prototype.validateMealTime = function() {
  const now = moment().tz('Asia/Kolkata');
  const timings = Attendance.getMealTimings();
  const mealTiming = timings[this.meal_type];
  
  if (!mealTiming) {
    return { valid: false, error: 'Invalid meal type' };
  }

  const [startHour, startMin] = mealTiming.start.split(':').map(Number);
  const [endHour, endMin] = mealTiming.end.split(':').map(Number);
  
  const startTime = now.clone().hour(startHour).minute(startMin).second(0);
  const endTime = now.clone().hour(endHour).minute(endMin).second(0);
  
  if (now.isBetween(startTime, endTime)) {
    return { valid: true };
  } else {
    return { 
      valid: false, 
      error: `${this.meal_type} is only available from ${mealTiming.start} to ${mealTiming.end}` 
    };
  }
};

Attendance.prototype.validateGeolocation = function() {
  if (!this.geo_location || !this.geo_location.latitude || !this.geo_location.longitude) {
    return { valid: true }; // Allow if geolocation is not provided (optional)
  }

  const messLocation = {
    latitude: parseFloat(process.env.MESS_LATITUDE) || 28.7041,
    longitude: parseFloat(process.env.MESS_LONGITUDE) || 77.1025
  };

  const userLocation = {
    latitude: this.geo_location.latitude,
    longitude: this.geo_location.longitude
  };

  const distance = geolib.getDistance(messLocation, userLocation);
  this.distance_from_mess = distance;

  const maxDistance = parseInt(process.env.GEOFENCE_RADIUS) || 200;

  if (distance <= maxDistance) {
    return { valid: true, distance };
  } else {
    return { 
      valid: false, 
      error: `You are ${distance}m away from the mess. Maximum allowed distance is ${maxDistance}m`,
      distance 
    };
  }
};

Attendance.prototype.validateQRCode = async function(expectedQR) {
  if (this.qr_code !== expectedQR) {
    return { valid: false, error: 'Invalid or expired QR code' };
  }
  return { valid: true };
};

Attendance.prototype.checkDuplicateScan = async function() {
  const existing = await Attendance.findOne({
    where: {
      user_id: this.user_id,
      scan_date: this.scan_date,
      meal_type: this.meal_type,
      attendance_id: { [sequelize.Op.ne]: this.attendance_id }
    }
  });

  if (existing) {
    return { valid: false, error: 'You have already marked attendance for this meal' };
  }
  return { valid: true };
};

Attendance.prototype.performFullValidation = async function(expectedQR) {
  const errors = [];
  let isValid = true;

  // Check meal time
  const timeValidation = this.validateMealTime();
  if (!timeValidation.valid) {
    errors.push(timeValidation.error);
    isValid = false;
  }

  // Check geolocation
  const geoValidation = this.validateGeolocation();
  if (!geoValidation.valid) {
    errors.push(geoValidation.error);
    isValid = false;
  }

  // Check QR code
  const qrValidation = await this.validateQRCode(expectedQR);
  if (!qrValidation.valid) {
    errors.push(qrValidation.error);
    isValid = false;
  }

  // Check duplicate scan
  const duplicateCheck = await this.checkDuplicateScan();
  if (!duplicateCheck.valid) {
    errors.push(duplicateCheck.error);
    isValid = false;
  }

  this.is_valid = isValid;
  this.validation_errors = errors;

  return { isValid, errors };
};

module.exports = Attendance;