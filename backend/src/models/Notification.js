const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  mess_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    default: null, // Null means broadcast to all messes
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [255, 'Title must not exceed 255 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  type: {
    type: String,
    enum: {
      values: ['announcement', 'subscription', 'menu', 'payment', 'reminder', 'system', 'test'],
      message: '{VALUE} is not a valid notification type'
    },
    default: 'announcement'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: '{VALUE} is not a valid priority'
    },
    default: 'medium'
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    default: null
  },
  metadata: {
    type: Object,
    default: null
  },
  sent_at: {
    type: Date,
    default: Date.now
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  scheduled_time: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'sent', 'scheduled', 'failed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'sent'
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Indexes
NotificationSchema.index({ user_id: 1, is_read: 1 });
NotificationSchema.index({ type: 1, sent_at: -1 });
NotificationSchema.index({ priority: 1, is_read: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ created_by: 1 });

// Instance method to mark as read
NotificationSchema.methods.markAsRead = async function() {
  this.is_read = true;
  this.read_at = new Date();
  await this.save();
};

// Override toJSON to rename _id to notification_id and timestamps
NotificationSchema.methods.toJSON = function() {
  const notificationObject = this.toObject();
  delete notificationObject.__v;

  // Rename _id to notification_id for consistency
  if (notificationObject._id) {
    notificationObject.notification_id = notificationObject._id;
    delete notificationObject._id;
  }

  // Rename timestamps from camelCase to snake_case for frontend compatibility
  if (notificationObject.createdAt) {
    notificationObject.created_at = notificationObject.createdAt;
    delete notificationObject.createdAt;
  }
  if (notificationObject.updatedAt) {
    notificationObject.updated_at = notificationObject.updatedAt;
    delete notificationObject.updatedAt;
  }

  // Convert ObjectId references to strings
  if (notificationObject.user_id) {
    notificationObject.user_id = notificationObject.user_id.toString();
  }
  if (notificationObject.created_by) {
    notificationObject.created_by = notificationObject.created_by.toString();
  }

  return notificationObject;
};

// Static method to mark all as read for a user
NotificationSchema.statics.markAllAsReadForUser = async function(userId) {
  return await this.updateMany(
    { user_id: userId, is_read: false },
    { is_read: true, read_at: new Date() }
  );
};

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
