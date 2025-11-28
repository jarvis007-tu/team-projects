const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MenuItemSchema = new mongoose.Schema({
  mess_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Mess ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    minlength: [2, 'Item name must be at least 2 characters'],
    maxlength: [100, 'Item name must not exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must not exceed 500 characters']
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuCategory',
    required: [true, 'Category is required'],
    index: true
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  image_url: {
    type: String,
    default: null
  },
  nutritional_info: {
    calories: {
      type: Number,
      default: 0,
      min: 0
    },
    protein: {
      type: Number,
      default: 0,
      min: 0
    },
    carbs: {
      type: Number,
      default: 0,
      min: 0
    },
    fat: {
      type: Number,
      default: 0,
      min: 0
    },
    fiber: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  allergen_info: {
    type: [String],
    default: []
  },
  is_vegetarian: {
    type: Boolean,
    default: false
  },
  is_vegan: {
    type: Boolean,
    default: false
  },
  is_available: {
    type: Boolean,
    default: true
  },
  preparation_time: {
    type: Number, // in minutes
    default: 0
  },
  serving_size: {
    type: String,
    default: '1 serving'
  },
  ingredients: {
    type: [String],
    default: []
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
  collection: 'menu_items'
});

// Indexes for performance
MenuItemSchema.index({ mess_id: 1, name: 1 });
MenuItemSchema.index({ category_id: 1 });
MenuItemSchema.index({ is_available: 1 });
MenuItemSchema.index({ is_vegetarian: 1 });
MenuItemSchema.index({ mess_id: 1, category_id: 1 });
MenuItemSchema.index({ mess_id: 1, is_available: 1 });
MenuItemSchema.index({ deleted_at: 1 });

// Text index for search
MenuItemSchema.index({ name: 'text', description: 'text' });

// Soft delete method
MenuItemSchema.methods.softDelete = async function() {
  this.deleted_at = new Date();
  this.is_available = false;
  await this.save();
};

// Restore method
MenuItemSchema.methods.restore = async function() {
  this.deleted_at = null;
  this.is_available = true;
  await this.save();
};

// Override toJSON to rename _id to item_id
MenuItemSchema.methods.toJSON = function() {
  const itemObject = this.toObject();
  delete itemObject.__v;

  // Rename _id to item_id for consistency
  if (itemObject._id) {
    itemObject.item_id = itemObject._id;
    delete itemObject._id;
  }

  // Rename timestamps from camelCase to snake_case
  if (itemObject.createdAt) {
    itemObject.created_at = itemObject.createdAt;
    delete itemObject.createdAt;
  }
  if (itemObject.updatedAt) {
    itemObject.updated_at = itemObject.updatedAt;
    delete itemObject.updatedAt;
  }

  return itemObject;
};

// Static methods for finding active records
MenuItemSchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, deleted_at: null });
};

MenuItemSchema.statics.findOneActive = function(conditions = {}) {
  return this.findOne({ ...conditions, deleted_at: null });
};

// Static method to search items
MenuItemSchema.statics.searchItems = function(searchTerm, messId = null) {
  const query = {
    $text: { $search: searchTerm },
    deleted_at: null
  };

  if (messId) {
    query.mess_id = messId;
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);

module.exports = MenuItem;
