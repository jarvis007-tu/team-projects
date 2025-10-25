require('dotenv').config();
const { connectDB, disconnectDB } = require('../../config/mongodb');
const { User, Subscription, WeeklyMenu, Notification, Attendance, MealConfirmation } = require('../../models');
const logger = require('../../utils/logger');
const moment = require('moment-timezone');

async function seed() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Subscription.deleteMany({});
    await Attendance.deleteMany({});
    await WeeklyMenu.deleteMany({});
    await Notification.deleteMany({});
    await MealConfirmation.deleteMany({});
    logger.info('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      full_name: 'System Administrator',
      email: 'admin@hosteleats.com',
      phone: '9876543210',
      password: 'admin123', // Will be hashed by the model hook
      role: 'admin',
      status: 'active',
      email_verified: true,
      phone_verified: true,
      preferences: {
        notifications: true,
        email_notifications: true,
        sms_notifications: true,
        meal_reminders: true
      }
    });
    logger.info('Created admin user');

    // Create test users
    const users = [];
    for (let i = 1; i <= 10; i++) {
      const user = await User.create({
        full_name: `Test User ${i}`,
        email: `user${i}@example.com`,
        phone: `98765432${10 + i}`,
        password: 'user123',
        role: 'subscriber',
        status: 'active',
        email_verified: true,
        phone_verified: false,
        preferences: {
          notifications: true,
          email_notifications: true,
          sms_notifications: false,
          meal_reminders: true
        }
      });
      users.push(user);
    }
    logger.info(`Created ${users.length} test users`);

    // Create subscriptions for users
    const subscriptions = [];
    for (let i = 0; i < users.length; i++) {
      const startDate = moment().subtract(30, 'days').toDate();
      const endDate = moment().add(30, 'days').toDate();

      const subscription = await Subscription.create({
        user_id: users[i]._id,
        plan_type: ['daily', 'weekly', 'monthly'][i % 3],
        plan_name: `${['Daily', 'Weekly', 'Monthly'][i % 3]} Plan`,
        amount: [50, 300, 1000][i % 3],
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        payment_status: 'paid',
        payment_method: ['cash', 'upi', 'card'][i % 3],
        payment_reference: `PAY${Date.now()}${i}`,
        auto_renewal: i % 2 === 0,
        meals_included: {
          breakfast: true,
          lunch: true,
          dinner: i % 2 === 0
        },
        special_requirements: i % 3 === 0 ? 'Vegetarian only' : null,
        notes: `Test subscription for user ${i + 1}`
      });
      subscriptions.push(subscription);
    }
    logger.info(`Created ${subscriptions.length} subscriptions`);

    // Create weekly menu for current week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    const weekStart = moment().startOf('week').toDate();
    const weekEnd = moment().endOf('week').toDate();

    const menuItems = {
      breakfast: [
        ['Idli', 'Sambar', 'Chutney', 'Tea'],
        ['Poha', 'Jalebi', 'Tea'],
        ['Upma', 'Chutney', 'Coffee'],
        ['Paratha', 'Curd', 'Pickle', 'Tea'],
        ['Dosa', 'Sambar', 'Chutney', 'Coffee'],
        ['Bread', 'Butter', 'Jam', 'Milk'],
        ['Puri', 'Sabzi', 'Tea']
      ],
      lunch: [
        ['Rice', 'Dal', 'Roti', 'Sabzi', 'Salad'],
        ['Biryani', 'Raita', 'Salad'],
        ['Chole', 'Bhature', 'Onion', 'Pickle'],
        ['Rice', 'Rajma', 'Roti', 'Sabzi'],
        ['Pulao', 'Dal', 'Papad', 'Curd'],
        ['Rice', 'Fish Curry', 'Roti'],
        ['Special Thali', 'Dal', 'Sabzi', 'Rice', 'Roti']
      ],
      dinner: [
        ['Roti', 'Dal', 'Sabzi', 'Rice'],
        ['Fried Rice', 'Manchurian', 'Soup'],
        ['Rice', 'Sambar', 'Sabzi', 'Papad'],
        ['Roti', 'Paneer', 'Dal'],
        ['Rice', 'Chicken Curry', 'Roti'],
        ['Rice', 'Chole', 'Roti', 'Salad'],
        ['Mixed Veg', 'Dal', 'Rice', 'Roti']
      ]
    };

    for (const day of days) {
      for (let mIndex = 0; mIndex < mealTypes.length; mIndex++) {
        const mealType = mealTypes[mIndex];
        const dayIndex = days.indexOf(day);

        await WeeklyMenu.create({
          week_start_date: weekStart,
          week_end_date: weekEnd,
          day: day,
          meal_type: mealType,
          items: menuItems[mealType][dayIndex],
          special_items: dayIndex % 2 === 0 ? ['Dessert'] : [],
          nutritional_info: {
            calories: mealType === 'breakfast' ? 400 : mealType === 'lunch' ? 600 : 500,
            protein: mealType === 'breakfast' ? 10 : mealType === 'lunch' ? 20 : 15,
            carbs: mealType === 'breakfast' ? 60 : mealType === 'lunch' ? 80 : 70,
            fat: mealType === 'breakfast' ? 10 : mealType === 'lunch' ? 15 : 12,
            fiber: mealType === 'breakfast' ? 5 : mealType === 'lunch' ? 8 : 6
          },
          is_veg: dayIndex !== 5, // Friday is non-veg
          allergen_info: dayIndex % 3 === 0 ? ['nuts', 'dairy'] : [],
          price: mealType === 'breakfast' ? 20 : mealType === 'lunch' ? 40 : 30,
          created_by: admin._id,
          is_active: true,
          notes: `Weekly menu for ${day} ${mealType}`
        });
      }
    }
    logger.info('Created weekly menu');

    // Create sample notifications
    for (let i = 0; i < users.length; i++) {
      await Notification.create({
        user_id: users[i]._id,
        title: 'Welcome to Hostel Mess System!',
        message: 'Thank you for subscribing to our meal plan. Enjoy delicious and nutritious meals every day.',
        type: 'announcement',
        priority: 'medium',
        is_read: false,
        metadata: { user_type: 'new_user' },
        sent_at: new Date(),
        created_by: admin._id,
        status: 'sent'
      });
    }

    // Create a global announcement
    await Notification.create({
      user_id: null, // Broadcast notification
      title: 'System Maintenance',
      message: 'The system will undergo maintenance on Sunday from 2 AM to 4 AM. Please plan accordingly.',
      type: 'system',
      priority: 'high',
      is_read: false,
      metadata: { maintenance_type: 'scheduled' },
      sent_at: new Date(),
      created_by: admin._id,
      status: 'sent'
    });
    logger.info('Created notifications');

    // Create sample attendance records for the last 7 days
    const today = moment().tz('Asia/Kolkata');
    for (let dayOffset = 7; dayOffset >= 0; dayOffset--) {
      const attendanceDate = today.clone().subtract(dayOffset, 'days');

      for (let i = 0; i < Math.min(5, users.length); i++) {
        const mealType = ['breakfast', 'lunch', 'dinner'][Math.floor(Math.random() * 3)];

        try {
          await Attendance.create({
            user_id: users[i]._id,
            subscription_id: subscriptions[i]._id,
            scan_date: attendanceDate.toDate(),
            meal_type: mealType,
            scan_time: attendanceDate.clone().add(mealType === 'breakfast' ? 8 : mealType === 'lunch' ? 13 : 20, 'hours').toDate(),
            qr_code: `QR_${Date.now()}_${i}_${dayOffset}`,
            geo_location: {
              latitude: 28.7041 + (Math.random() - 0.5) * 0.01,
              longitude: 77.1025 + (Math.random() - 0.5) * 0.01
            },
            distance_from_mess: Math.floor(Math.random() * 150),
            device_info: {
              userAgent: 'Mozilla/5.0',
              platform: 'Mobile'
            },
            is_valid: true,
            validation_errors: [],
            scan_method: 'qr',
            meal_consumed: true,
            special_meal: false,
            ip_address: `192.168.1.${i + 1}`
          });
        } catch (error) {
          // Skip if duplicate (same user, date, meal_type)
          if (error.code !== 11000) {
            throw error;
          }
        }
      }
    }
    logger.info('Created sample attendance records');

    logger.info('Database seeding completed successfully!');
    logger.info('\n=== TEST CREDENTIALS ===');
    logger.info('Admin:');
    logger.info('  Email: admin@hosteleats.com');
    logger.info('  Password: admin123');
    logger.info('\nTest User:');
    logger.info('  Email: user1@example.com');
    logger.info('  Password: user123');
    logger.info('========================\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run seeder
seed();
