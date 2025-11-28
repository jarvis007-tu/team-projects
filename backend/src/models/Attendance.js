const mongoose = require('mongoose');
const moment = require('moment-timezone');
const geolib = require('geolib');

const AttendanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  mess_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Mess ID is required'],
    index: true
  },
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: [true, 'Subscription ID is required']
  },
  scan_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  meal_type: {
    type: String,
    enum: {
      values: ['breakfast', 'lunch', 'dinner'],
      message: '{VALUE} is not a valid meal type'
    },
    required: [true, 'Meal type is required']
  },
  scan_time: {
    type: Date,
    required: true,
    default: Date.now
  },
  qr_code: {
    type: String,
    required: [true, 'QR code is required']
  },
  geo_location: {
    type: Object,
    default: null,
    validate: {
      validator: function(value) {
        if (value && (!value.latitude || !value.longitude)) {
          return false;
        }
        return true;
      },
      message: 'Invalid geolocation format'
    }
  },
  distance_from_mess: {
    type: Number,
    default: null
  },
  device_info: {
    type: Object,
    default: {}
  },
  is_valid: {
    type: Boolean,
    default: true
  },
  validation_errors: {
    type: [String],
    default: []
  },
  scan_method: {
    type: String,
    enum: {
      values: ['qr', 'manual', 'face', 'nfc'],
      message: '{VALUE} is not a valid scan method'
    },
    default: 'qr'
  },
  meal_consumed: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: Object,
    default: null
  },
  special_meal: {
    type: Boolean,
    default: false
  },
  ip_address: {
    type: String,
    maxlength: [45, 'IP address is too long']
  }
}, {
  timestamps: true,
  collection: 'attendance_logs'
});

// Indexes
AttendanceSchema.index({ user_id: 1 });
AttendanceSchema.index({ subscription_id: 1 });
AttendanceSchema.index({ scan_date: 1 });
AttendanceSchema.index({ meal_type: 1 });
AttendanceSchema.index({ is_valid: 1 });
AttendanceSchema.index({ user_id: 1, scan_date: 1, meal_type: 1 }, { unique: true }); // Unique constraint
AttendanceSchema.index({ user_id: 1, scan_date: 1, meal_type: 1, is_valid: 1 }); // Composite index

// Static method to get meal timings
AttendanceSchema.statics.getMealTimings = function() {
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

// Instance method to validate meal time
AttendanceSchema.methods.validateMealTime = function() {
  const now = moment().tz('Asia/Kolkata');
  const timings = this.constructor.getMealTimings();
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

// Instance method to validate geolocation
AttendanceSchema.methods.validateGeolocation = function() {
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

// Instance method to validate QR code
AttendanceSchema.methods.validateQRCode = async function(expectedQR) {
  if (this.qr_code !== expectedQR) {
    return { valid: false, error: 'Invalid or expired QR code' };
  }
  return { valid: true };
};

// Instance method to check duplicate scan
AttendanceSchema.methods.checkDuplicateScan = async function() {
  const existing = await this.constructor.findOne({
    user_id: this.user_id,
    scan_date: this.scan_date,
    meal_type: this.meal_type,
    _id: { $ne: this._id }
  });

  if (existing) {
    return { valid: false, error: 'You have already marked attendance for this meal' };
  }
  return { valid: true };
};

// Instance method to perform full validation
AttendanceSchema.methods.performFullValidation = async function(expectedQR) {
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

// Override toJSON to rename _id to attendance_id
AttendanceSchema.methods.toJSON = function() {
  const attendanceObject = this.toObject();
  delete attendanceObject.__v;

  // Rename _id to attendance_id for consistency
  if (attendanceObject._id) {
    attendanceObject.attendance_id = attendanceObject._id;
    delete attendanceObject._id;
  }

  // Rename timestamps from camelCase to snake_case for frontend compatibility
  if (attendanceObject.createdAt) {
    attendanceObject.created_at = attendanceObject.createdAt;
    delete attendanceObject.createdAt;
  }
  if (attendanceObject.updatedAt) {
    attendanceObject.updated_at = attendanceObject.updatedAt;
    delete attendanceObject.updatedAt;
  }

  // Convert ObjectId references to strings ONLY if they are not populated (not objects)
  if (attendanceObject.user_id) {
    // If user_id is populated (an object with user data), keep it as is
    if (typeof attendanceObject.user_id === 'object' && attendanceObject.user_id._id) {
      // Keep the populated user object but convert its _id to user_id
      if (attendanceObject.user_id._id) {
        attendanceObject.user_id.user_id = attendanceObject.user_id._id;
        delete attendanceObject.user_id._id;
      }
    } else {
      // If not populated, convert ObjectId to string
      attendanceObject.user_id = attendanceObject.user_id.toString();
    }
  }
  if (attendanceObject.subscription_id) {
    attendanceObject.subscription_id = attendanceObject.subscription_id.toString();
  }
  if (attendanceObject.mess_id) {
    attendanceObject.mess_id = attendanceObject.mess_id.toString();
  }

  return attendanceObject;
};

const Attendance = mongoose.model('Attendance', AttendanceSchema);

module.exports = Attendance;
