'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Only create admin user - no test users for production
    const hashedAdminPassword = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'SecureAdmin@2024', 12);

    // Insert production admin user
    await queryInterface.bulkInsert('users', [
      {
        full_name: 'System Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@yourhostel.com',
        phone: process.env.ADMIN_PHONE || '9876543210',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get admin user ID for references
    const users = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE role = 'admin' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const adminUser = users[0];

    // Insert production weekly menu template
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const meals = ['breakfast', 'lunch', 'dinner'];
    
    // Production-ready menu template (can be customized by admin)
    const menuItems = {
      breakfast: {
        monday: ['Morning Meal (To be updated by admin)'],
        tuesday: ['Morning Meal (To be updated by admin)'],
        wednesday: ['Morning Meal (To be updated by admin)'],
        thursday: ['Morning Meal (To be updated by admin)'],
        friday: ['Morning Meal (To be updated by admin)'],
        saturday: ['Morning Meal (To be updated by admin)'],
        sunday: ['Morning Meal (To be updated by admin)']
      },
      lunch: {
        monday: ['Lunch Menu (To be updated by admin)'],
        tuesday: ['Lunch Menu (To be updated by admin)'],
        wednesday: ['Lunch Menu (To be updated by admin)'],
        thursday: ['Lunch Menu (To be updated by admin)'],
        friday: ['Lunch Menu (To be updated by admin)'],
        saturday: ['Lunch Menu (To be updated by admin)'],
        sunday: ['Lunch Menu (To be updated by admin)']
      },
      dinner: {
        monday: ['Dinner Menu (To be updated by admin)'],
        tuesday: ['Dinner Menu (To be updated by admin)'],
        wednesday: ['Dinner Menu (To be updated by admin)'],
        thursday: ['Dinner Menu (To be updated by admin)'],
        friday: ['Dinner Menu (To be updated by admin)'],
        saturday: ['Dinner Menu (To be updated by admin)'],
        sunday: ['Dinner Menu (To be updated by admin)']
      }
    };

    const menuData = [];
    for (const day of days) {
      for (const meal of meals) {
        menuData.push({
          day: day,
          meal_type: meal,
          items: JSON.stringify(menuItems[meal][day]),
          is_active: false, // Admin needs to activate after updating
          created_by: adminUser.user_id,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    await queryInterface.bulkInsert('weekly_menus', menuData);

    // Insert system welcome notification
    await queryInterface.bulkInsert('notifications', [
      {
        title: 'System Initialized',
        message: 'Hostel Mess Management System is now active. Please update the weekly menu and system settings.',
        type: 'system',
        recipient_id: null, // Broadcast to all
        priority: 'high',
        created_by: adminUser.user_id,
        created_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('notifications', null, {});
    await queryInterface.bulkDelete('weekly_menus', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};