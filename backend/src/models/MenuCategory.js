const mongoose = require('mongoose');

const MenuCategorySchema = new mongoose.Schema({
  mess_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: [true, 'Mess ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name must not exceed 50 characters']
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  display_name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [200, 'Description must not exceed 200 characters']
  },
  icon: {
    type: String,
    default: 'MdRestaurantMenu'
  },
  color: {
    type: String,
    default: 'blue'
  },
  sort_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_default: {
    type: Boolean,
    default: false // Default categories: breakfast, lunch, dinner, snack
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'menu_categories'
});

// Indexes
MenuCategorySchema.index({ mess_id: 1, slug: 1 }, { unique: true });
MenuCategorySchema.index({ is_active: 1 });
MenuCategorySchema.index({ sort_order: 1 });

// Soft delete method
MenuCategorySchema.methods.softDelete = async function() {
  this.deleted_at = new Date();
  this.is_active = false;
  await this.save();
};

// Restore method
MenuCategorySchema.methods.restore = async function() {
  this.deleted_at = null;
  this.is_active = true;
  await this.save();
};

// Override toJSON
MenuCategorySchema.methods.toJSON = function() {
  const categoryObject = this.toObject();
  delete categoryObject.__v;

  if (categoryObject._id) {
    categoryObject.category_id = categoryObject._id;
    delete categoryObject._id;
  }

  if (categoryObject.createdAt) {
    categoryObject.created_at = categoryObject.createdAt;
    delete categoryObject.createdAt;
  }
  if (categoryObject.updatedAt) {
    categoryObject.updated_at = categoryObject.updatedAt;
    delete categoryObject.updatedAt;
  }

  return categoryObject;
};

// Static methods
MenuCategorySchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, deleted_at: null, is_active: true });
};

// Static method to initialize default categories for a mess
MenuCategorySchema.statics.initializeDefaults = async function(messId, createdBy) {
  const defaultCategories = [
    {
      mess_id: messId,
      name: 'Breakfast',
      slug: 'breakfast',
      display_name: 'Breakfast',
      description: 'Morning meal',
      icon: 'MdFreeBreakfast',
      color: 'orange',
      sort_order: 1,
      is_default: true,
      created_by: createdBy
    },
    {
      mess_id: messId,
      name: 'Lunch',
      slug: 'lunch',
      display_name: 'Lunch',
      description: 'Afternoon meal',
      icon: 'MdLunchDining',
      color: 'blue',
      sort_order: 2,
      is_default: true,
      created_by: createdBy
    },
    {
      mess_id: messId,
      name: 'Snack',
      slug: 'snack',
      display_name: 'Snacks',
      description: 'Evening snacks',
      icon: 'MdFastfood',
      color: 'green',
      sort_order: 3,
      is_default: true,
      created_by: createdBy
    },
    {
      mess_id: messId,
      name: 'Dinner',
      slug: 'dinner',
      display_name: 'Dinner',
      description: 'Evening meal',
      icon: 'MdDinnerDining',
      color: 'purple',
      sort_order: 4,
      is_default: true,
      created_by: createdBy
    }
  ];

  // Check if categories already exist
  const existingCount = await this.countDocuments({ mess_id: messId, deleted_at: null });

  if (existingCount === 0) {
    return await this.insertMany(defaultCategories);
  }

  return [];
};

const MenuCategory = mongoose.model('MenuCategory', MenuCategorySchema);

module.exports = MenuCategory;
