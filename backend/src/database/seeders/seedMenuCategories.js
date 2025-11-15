const { mongoose, Mess, MenuCategory, User } = require('../../models');
const { connectDB } = require('../../config/mongodb');
const logger = require('../../utils/logger');

async function seedMenuCategories() {
  try {
    await connectDB();

    logger.info('Starting menu categories seeding...');

    // Get all messes
    const messes = await Mess.find({ deleted_at: null });

    if (messes.length === 0) {
      logger.warn('No messes found. Please seed messes first.');
      process.exit(0);
    }

    // Get a super admin or first user to set as created_by
    const superAdmin = await User.findOne({ role: 'super_admin' });
    const createdBy = superAdmin ? superAdmin._id : (await User.findOne())._id;

    let categoriesCreated = 0;

    // Initialize categories for each mess
    for (const mess of messes) {
      // Check if categories already exist for this mess
      const existingCount = await MenuCategory.countDocuments({
        mess_id: mess._id,
        deleted_at: null
      });

      if (existingCount > 0) {
        logger.info(`Mess "${mess.name}" already has ${existingCount} categories. Skipping...`);
        continue;
      }

      // Create default categories
      const defaultCategories = [
        {
          mess_id: mess._id,
          name: 'Breakfast',
          slug: 'breakfast',
          display_name: 'Breakfast',
          description: 'Morning meal',
          icon: 'MdFreeBreakfast',
          color: 'orange',
          sort_order: 1,
          is_default: true,
          is_active: true,
          created_by: createdBy
        },
        {
          mess_id: mess._id,
          name: 'Lunch',
          slug: 'lunch',
          display_name: 'Lunch',
          description: 'Afternoon meal',
          icon: 'MdLunchDining',
          color: 'blue',
          sort_order: 2,
          is_default: true,
          is_active: true,
          created_by: createdBy
        },
        {
          mess_id: mess._id,
          name: 'Snack',
          slug: 'snack',
          display_name: 'Snacks',
          description: 'Evening snacks',
          icon: 'MdFastfood',
          color: 'green',
          sort_order: 3,
          is_default: true,
          is_active: true,
          created_by: createdBy
        },
        {
          mess_id: mess._id,
          name: 'Dinner',
          slug: 'dinner',
          display_name: 'Dinner',
          description: 'Evening meal',
          icon: 'MdDinnerDining',
          color: 'purple',
          sort_order: 4,
          is_default: true,
          is_active: true,
          created_by: createdBy
        }
      ];

      await MenuCategory.insertMany(defaultCategories);
      categoriesCreated += defaultCategories.length;

      logger.info(`Created ${defaultCategories.length} categories for mess "${mess.name}"`);
    }

    logger.info(`✅ Seeding completed! Created ${categoriesCreated} categories across ${messes.length} messes.`);
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding menu categories:', error);
    process.exit(1);
  }
}

// Run seeder if executed directly
if (require.main === module) {
  seedMenuCategories();
}

module.exports = seedMenuCategories;
