const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: false },

  title: { type: String, required: true, maxlength: 255 },

  message: { type: String, required: true },

  type: {
    type: String,
    enum: ['announcement', 'subscription', 'menu', 'payment', 'reminder', 'system', 'test'],
    default: 'announcement'
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  is_read: { type: Boolean, default: false },

  read_at: { type: Date, default: null },

  metadata: { type: Schema.Types.Mixed, default: null },

  sent_at: { type: Date, default: Date.now },

  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: false },

  scheduled_time: { type: Date, default: null },

  status: {
    type: String,
    enum: ['pending', 'sent', 'scheduled', 'failed'],
    default: 'sent'
  }
}, {
  collection: 'notifications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
NotificationSchema.index({ user_id: 1, is_read: 1 });
NotificationSchema.index({ type: 1, sent_at: 1 });
NotificationSchema.index({ priority: 1, is_read: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;




// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const Notification = sequelize.define('Notification', {
//   notification_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   user_id: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//     references: {
//       model: 'users',
//       key: 'user_id'
//     }
//   },
//   title: {
//     type: DataTypes.STRING(255),
//     allowNull: false
//   },
//   message: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   type: {
//     type: DataTypes.ENUM('announcement', 'subscription', 'menu', 'payment', 'reminder', 'system', 'test'),
//     defaultValue: 'announcement'
//   },
//   priority: {
//     type: DataTypes.ENUM('low', 'medium', 'high'),
//     defaultValue: 'medium'
//   },
//   is_read: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false
//   },
//   read_at: {
//     type: DataTypes.DATE,
//     allowNull: true
//   },
//   metadata: {
//     type: DataTypes.JSON,
//     allowNull: true
//   },
//   sent_at: {
//     type: DataTypes.DATE,
//     defaultValue: DataTypes.NOW
//   },
//   created_by: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//     references: {
//       model: 'users',
//       key: 'user_id'
//     }
//   },
//   scheduled_time: {
//     type: DataTypes.DATE,
//     allowNull: true
//   },
//   status: {
//     type: DataTypes.ENUM('pending', 'sent', 'scheduled', 'failed'),
//     defaultValue: 'sent'
//   }
// }, {
//   tableName: 'notifications',
//   timestamps: true,
//   createdAt: 'created_at',
//   updatedAt: 'updated_at',
//   indexes: [
//     {
//       fields: ['user_id', 'is_read']
//     },
//     {
//       fields: ['type', 'sent_at']
//     },
//     {
//       fields: ['priority', 'is_read']
//     }
//   ]
// });

// module.exports = Notification;