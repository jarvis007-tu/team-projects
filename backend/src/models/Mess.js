const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Mess name is required'],
    trim: true,
    minlength: [2, 'Mess name must be at least 2 characters'],
    maxlength: [100, 'Mess name must not exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Mess code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9-]+$/, 'Mess code can only contain uppercase letters, numbers, and hyphens'],
    maxlength: [20, 'Mess code must not exceed 20 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [255, 'Address must not exceed 255 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City must not exceed 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State must not exceed 100 characters']
  },
  pincode: {
    type: String,
    trim: true,
    match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required for geofencing'],
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required for geofencing'],
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180']
  },
  radius_meters: {
    type: Number,
    required: [true, 'Geofence radius is required'],
    min: [10, 'Radius must be at least 10 meters'],
    max: [5000, 'Radius must not exceed 5000 meters'],
    default: 200
  },
  contact_phone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true,
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  contact_email: {
    type: String,
    required: [true, 'Contact email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  capacity: {
    type: Number,
    required: [true, 'Mess capacity is required'],
    min: [10, 'Capacity must be at least 10'],
    max: [10000, 'Capacity must not exceed 10000']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'maintenance'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  settings: {
    breakfast_start: {
      type: String,
      default: '07:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    breakfast_end: {
      type: String,
      default: '10:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    lunch_start: {
      type: String,
      default: '12:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    lunch_end: {
      type: String,
      default: '15:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    dinner_start: {
      type: String,
      default: '19:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    dinner_end: {
      type: String,
      default: '22:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    qr_validity_minutes: {
      type: Number,
      default: 30,
      min: [5, 'QR validity must be at least 5 minutes'],
      max: [240, 'QR validity must not exceed 240 minutes']
    },
    allow_meal_confirmation: {
      type: Boolean,
      default: true
    },
    confirmation_deadline_hours: {
      type: Number,
      default: 2,
      min: [1, 'Deadline must be at least 1 hour'],
      max: [24, 'Deadline must not exceed 24 hours']
    }
  },
  description: {
    type: String,
    maxlength: [500, 'Description must not exceed 500 characters']
  },
  image_url: {
    type: String,
    default: null
  },
  qr_code: {
    type: String,
    default: null
  },
  qr_data: {
    mess_id: String,
    name: String,
    code: String,
    latitude: Number,
    longitude: Number,
    radius_meters: Number,
    generated_at: Date
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'messes'
});

// Indexes for performance
MessSchema.index({ code: 1 });
MessSchema.index({ status: 1 });
MessSchema.index({ city: 1, state: 1 });
MessSchema.index({ deleted_at: 1 });

// Soft delete helper methods
MessSchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  this.status = 'inactive';
  return this.save();
};

MessSchema.methods.restore = function() {
  this.deleted_at = null;
  this.status = 'active';
  return this.save();
};

// Static method to find only non-deleted records
MessSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, deleted_at: null });
};

// Override toJSON to clean up output
MessSchema.methods.toJSON = function() {
  const messObject = this.toObject();
  delete messObject.deleted_at;
  delete messObject.__v;

  // Rename _id to mess_id for consistency
  if (messObject._id) {
    messObject.mess_id = messObject._id;
    delete messObject._id;
  }

  // Rename timestamps from camelCase to snake_case
  if (messObject.createdAt) {
    messObject.created_at = messObject.createdAt;
    delete messObject.createdAt;
  }
  if (messObject.updatedAt) {
    messObject.updated_at = messObject.updatedAt;
    delete messObject.updatedAt;
  }

  return messObject;
};

// Pre-save hook to validate coordinates
MessSchema.pre('save', function(next) {
  // Validate that coordinates are within valid ranges
  if (this.latitude < -90 || this.latitude > 90) {
    next(new Error('Invalid latitude value'));
  }
  if (this.longitude < -180 || this.longitude > 180) {
    next(new Error('Invalid longitude value'));
  }
  next();
});

// Virtual for total active users
MessSchema.virtual('active_users', {
  ref: 'User',
  localField: '_id',
  foreignField: 'mess_id',
  count: true,
  match: { deleted_at: null, status: 'active' }
});

const Mess = mongoose.model('Mess', MessSchema);

module.exports = Mess;
