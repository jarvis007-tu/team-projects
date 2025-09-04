'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedUserPassword = await bcrypt.hash('user123', 10);

    // Insert initial users
    await queryInterface.bulkInsert('users', [
      {
        full_name: 'Admin User',
        email: 'admin@hosteleats.com',
        phone: '9999999999',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        full_name: 'Test User',
        email: 'user@hosteleats.com',
        phone: '8888888888',
        password: hashedUserPassword,
        role: 'subscriber',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get user IDs for references
    const users = await queryInterface.sequelize.query(
      'SELECT user_id, email FROM users',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const adminUser = users.find(u => u.email === 'admin@hosteleats.com');
    const testUser = users.find(u => u.email === 'user@hosteleats.com');

    // Insert test subscription for test user
    await queryInterface.bulkInsert('subscriptions', [
      {
        user_id: testUser.user_id,
        plan_type: 'monthly',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        amount: 3000.00,
        payment_status: 'paid',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insert weekly menu
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const meals = ['breakfast', 'lunch', 'dinner'];
    
    const menuItems = {
      breakfast: {
        monday: ['Idli', 'Sambar', 'Chutney', 'Tea/Coffee'],
        tuesday: ['Dosa', 'Sambar', 'Chutney', 'Tea/Coffee'],
        wednesday: ['Puri', 'Bhaji', 'Tea/Coffee'],
        thursday: ['Upma', 'Chutney', 'Tea/Coffee'],
        friday: ['Bread', 'Butter', 'Jam', 'Boiled Eggs', 'Tea/Coffee'],
        saturday: ['Paratha', 'Curd', 'Pickle', 'Tea/Coffee'],
        sunday: ['Chole Bhature', 'Tea/Coffee']
      },
      lunch: {
        monday: ['Rice', 'Dal', 'Paneer Curry', 'Roti', 'Salad', 'Curd'],
        tuesday: ['Rice', 'Sambar', 'Vegetable Curry', 'Roti', 'Papad'],
        wednesday: ['Veg Biryani', 'Raita', 'Curry', 'Roti'],
        thursday: ['Rice', 'Dal', 'Mixed Veg', 'Roti', 'Sweet'],
        friday: ['Rice', 'Rajma', 'Dry Vegetable', 'Roti', 'Salad'],
        saturday: ['Fried Rice', 'Manchurian', 'Roti', 'Sweet'],
        sunday: ['Special Thali', 'Rice', 'Dal', 'Paneer', 'Roti', 'Sweet', 'Ice Cream']
      },
      dinner: {
        monday: ['Rice', 'Dal', 'Vegetable', 'Roti', 'Pickle'],
        tuesday: ['Rice', 'Kadhi', 'Dry Vegetable', 'Roti'],
        wednesday: ['Rice', 'Dal', 'Palak Paneer', 'Roti'],
        thursday: ['Rice', 'Dal Makhani', 'Vegetable', 'Roti'],
        friday: ['Rice', 'Dal', 'Aloo Gobi', 'Roti'],
        saturday: ['Rice', 'Dal', 'Mix Veg', 'Roti', 'Sweet'],
        sunday: ['Rice', 'Dal', 'Paneer Butter Masala', 'Roti', 'Gulab Jamun']
      }
    };

    const menuData = [];
    for (const day of days) {
      for (const meal of meals) {
        menuData.push({
          day: day,
          meal_type: meal,
          items: JSON.stringify(menuItems[meal][day]),
          is_active: true,
          created_by: adminUser.user_id,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    await queryInterface.bulkInsert('weekly_menus', menuData);

    // Insert welcome notification
    await queryInterface.bulkInsert('notifications', [
      {
        title: 'Welcome to Hostel Eats',
        message: 'Your digital mess management system is now active. Enjoy hassle-free meal management!',
        type: 'announcement',
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
    await queryInterface.bulkDelete('subscriptions', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};