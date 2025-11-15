const mongoose = require('mongoose');

const MenuTemplateSchema = new mongoose.Schema({
  mess_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Mess ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name must not exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description must not exceed 500 characters']
  },
  menu_data: {
    type: Object,
    required: true,
    default: {}
    // Structure:
    // {
    //   monday: {
    //     breakfast: [menuItemId1, menuItemId2, ...],
    //     lunch: [...],
    //     dinner: [...]
    //   },
    //   tuesday: { ... },
    //   ...
    // }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  usage_count: {
    type: Number,
    default: 0
  },
  last_used_at: {
    type: Date,
    default: null
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'menu_templates'
});

// Indexes
MenuTemplateSchema.index({ mess_id: 1, name: 1 });
MenuTemplateSchema.index({ is_active: 1 });
MenuTemplateSchema.index({ deleted_at: 1 });

// Soft delete method
MenuTemplateSchema.methods.softDelete = async function() {
  this.deleted_at = new Date();
  this.is_active = false;
  await this.save();
};

// Restore method
MenuTemplateSchema.methods.restore = async function() {
  this.deleted_at = null;
  this.is_active = true;
  await this.save();
};

// Method to increment usage
MenuTemplateSchema.methods.incrementUsage = async function() {
  this.usage_count += 1;
  this.last_used_at = new Date();
  await this.save();
};

// Override toJSON
MenuTemplateSchema.methods.toJSON = function() {
  const templateObject = this.toObject();
  delete templateObject.__v;

  if (templateObject._id) {
    templateObject.template_id = templateObject._id;
    delete templateObject._id;
  }

  if (templateObject.createdAt) {
    templateObject.created_at = templateObject.createdAt;
    delete templateObject.createdAt;
  }
  if (templateObject.updatedAt) {
    templateObject.updated_at = templateObject.updatedAt;
    delete templateObject.updatedAt;
  }

  return templateObject;
};

// Static methods
MenuTemplateSchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, deleted_at: null, is_active: true });
};

const MenuTemplate = mongoose.model('MenuTemplate', MenuTemplateSchema);

module.exports = MenuTemplate;
