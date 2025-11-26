require('dotenv').config();
const { connectDB, disconnectDB } = require('../../config/mongodb');
const { Mess, User, Subscription, WeeklyMenu, MenuItem, MenuCategory, MenuTemplate, Notification, Attendance, MealConfirmation } = require('../../models');
const moment = require('moment-timezone');

// Use console.log instead of logger for seeding
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

async function seed() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data
    await Mess.deleteMany({});
    await User.deleteMany({});
    await Subscription.deleteMany({});
    await Attendance.deleteMany({});
    await WeeklyMenu.deleteMany({});
    await MenuItem.deleteMany({});
    await MenuCategory.deleteMany({});
    await MenuTemplate.deleteMany({});
    await Notification.deleteMany({});
    await MealConfirmation.deleteMany({});
    logger.info('Cleared existing data');

    // Create sample messes
    const mess1 = await Mess.create({
      name: 'Hostel A Mess',
      code: 'MESS-A',
      address: 'Block A, University Campus',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302017',
      latitude: 26.9124,
      longitude: 75.7873,
      radius_meters: 200,
      contact_phone: '9876543210',
      contact_email: 'mess-a@university.edu',
      capacity: 500,
      status: 'active',
      settings: {
        breakfast_start: '07:00',
        breakfast_end: '10:00',
        lunch_start: '12:00',
        lunch_end: '15:00',
        dinner_start: '19:00',
        dinner_end: '22:00',
        qr_validity_minutes: 30,
        allow_meal_confirmation: true,
        confirmation_deadline_hours: 2
      },
      description: 'Main mess serving hostel blocks A, B, and C'
    });

    const mess2 = await Mess.create({
      name: 'Hostel B Mess',
      code: 'MESS-B',
      address: 'Block D, University Campus',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302017',
      latitude: 26.9200,
      longitude: 75.7900,
      radius_meters: 150,
      contact_phone: '9876543211',
      contact_email: 'mess-b@university.edu',
      capacity: 300,
      status: 'active',
      settings: {
        breakfast_start: '07:30',
        breakfast_end: '10:30',
        lunch_start: '12:30',
        lunch_end: '15:30',
        dinner_start: '19:30',
        dinner_end: '22:30',
        qr_validity_minutes: 45,
        allow_meal_confirmation: false
      },
      description: 'Secondary mess serving hostel blocks D and E'
    });

    logger.info('Created 2 sample messes');

    // Create menu categories for both messes (BEFORE creating users to have created_by)
    // We'll create a temporary ID first, then update after super admin is created
    const tempCreatorId = new require('mongoose').Types.ObjectId();

    const mess1Categories = await MenuCategory.create([
      {
        mess_id: mess1._id,
        name: 'Breakfast',
        slug: 'breakfast',
        display_name: 'Breakfast',
        description: 'Morning meal',
        icon: 'MdFreeBreakfast',
        color: 'orange',
        sort_order: 1,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      },
      {
        mess_id: mess1._id,
        name: 'Lunch',
        slug: 'lunch',
        display_name: 'Lunch',
        description: 'Afternoon meal',
        icon: 'MdLunchDining',
        color: 'blue',
        sort_order: 2,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      },
      {
        mess_id: mess1._id,
        name: 'Snack',
        slug: 'snack',
        display_name: 'Snacks',
        description: 'Evening snacks',
        icon: 'MdFastfood',
        color: 'green',
        sort_order: 3,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      },
      {
        mess_id: mess1._id,
        name: 'Dinner',
        slug: 'dinner',
        display_name: 'Dinner',
        description: 'Evening meal',
        icon: 'MdDinnerDining',
        color: 'purple',
        sort_order: 4,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      }
    ]);

    const mess2Categories = await MenuCategory.create([
      {
        mess_id: mess2._id,
        name: 'Breakfast',
        slug: 'breakfast',
        display_name: 'Breakfast',
        description: 'Morning meal',
        icon: 'MdFreeBreakfast',
        color: 'orange',
        sort_order: 1,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      },
      {
        mess_id: mess2._id,
        name: 'Lunch',
        slug: 'lunch',
        display_name: 'Lunch',
        description: 'Afternoon meal',
        icon: 'MdLunchDining',
        color: 'blue',
        sort_order: 2,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      },
      {
        mess_id: mess2._id,
        name: 'Snack',
        slug: 'snack',
        display_name: 'Snacks',
        description: 'Evening snacks',
        icon: 'MdFastfood',
        color: 'green',
        sort_order: 3,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      },
      {
        mess_id: mess2._id,
        name: 'Dinner',
        slug: 'dinner',
        display_name: 'Dinner',
        description: 'Evening meal',
        icon: 'MdDinnerDining',
        color: 'purple',
        sort_order: 4,
        is_default: true,
        is_active: true,
        created_by: tempCreatorId
      }
    ]);

    logger.info('Created menu categories for both messes');

    // Create super admin user (can manage all messes)
    // Password: Admin@123 (meets validation: min 8 chars, 1 number, 1 special char)
    const superAdmin = await User.create({
      full_name: 'Super Administrator',
      email: 'superadmin@hosteleats.com',
      phone: '9876543210',
      password: 'Admin@123',
      mess_id: mess1._id, // Assign to first mess by default
      role: 'super_admin',
      status: 'active',
      email_verified: true,
      phone_verified: true
    });
    logger.info('Created super admin user');

    // Create mess admin for Mess A
    const messAdmin1 = await User.create({
      full_name: 'Mess A Admin',
      email: 'admin-a@hosteleats.com',
      phone: '9876543211',
      password: 'Admin@123',
      mess_id: mess1._id,
      role: 'mess_admin',
      status: 'active',
      email_verified: true,
      phone_verified: true
    });

    // Create mess admin for Mess B
    const messAdmin2 = await User.create({
      full_name: 'Mess B Admin',
      email: 'admin-b@hosteleats.com',
      phone: '9876543212',
      password: 'Admin@123',
      mess_id: mess2._id,
      role: 'mess_admin',
      status: 'active',
      email_verified: true,
      phone_verified: true
    });
    logger.info('Created mess admin users');

    // Create test users - distribute between two messes
    const users = [];
    for (let i = 1; i <= 10; i++) {
      // Assign users alternately to mess1 and mess2
      const assignedMess = i % 2 === 0 ? mess2 : mess1;

      // Password: User@123 (meets validation: min 8 chars, 1 number, 1 special char)
      const user = await User.create({
        full_name: `Test User ${i}`,
        email: `user${i}@example.com`,
        phone: `98765432${20 + i}`,
        password: 'User@123',
        mess_id: assignedMess._id,
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
    logger.info(`Created ${users.length} test users (distributed across messes)`);

    // Create subscriptions for users
    const subscriptions = [];
    for (let i = 0; i < users.length; i++) {
      const startDate = moment().subtract(30, 'days').toDate();
      const endDate = moment().add(30, 'days').toDate();

      // Distribute subscription types: veg, non-veg, both
      const subTypes = ['veg', 'non-veg', 'both'];
      const subType = subTypes[i % 3];

      const subscription = await Subscription.create({
        user_id: users[i]._id,
        mess_id: users[i].mess_id, // Use user's assigned mess
        plan_type: ['daily', 'weekly', 'monthly'][i % 3],
        plan_name: `${['Daily', 'Weekly', 'Monthly'][i % 3]} Plan`,
        sub_type: subType,
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
        special_requirements: subType === 'veg' ? 'Vegetarian only' : subType === 'non-veg' ? 'Non-vegetarian preferred' : null,
        notes: `Test subscription for user ${i + 1} (${subType})`
      });
      subscriptions.push(subscription);
    }
    logger.info(`Created ${subscriptions.length} subscriptions`);

    // Create weekly menu for current week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    // Set week to start on Monday (day 1) instead of Sunday (day 0)
    const weekStart = moment().startOf('week').add(1, 'day').toDate(); // Monday
    const weekEnd = moment(weekStart).add(6, 'days').toDate(); // Sunday

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

    // Create menus for both messes with new category structure
    for (const mess of [mess1, mess2]) {
      const messCategories = mess._id.toString() === mess1._id.toString() ? mess1Categories : mess2Categories;
      const messAdmin = mess._id.toString() === mess1._id.toString() ? messAdmin1 : messAdmin2;

      for (const day of days) {
        for (let mIndex = 0; mIndex < mealTypes.length; mIndex++) {
          const mealType = mealTypes[mIndex];
          const dayIndex = days.indexOf(day);

          // Find the matching category
          const category = messCategories.find(cat => cat.slug === mealType);

          if (!category) {
            logger.error(`Category not found for ${mealType}`);
            continue;
          }

          await WeeklyMenu.create({
            mess_id: mess._id,
            week_start_date: weekStart,
            week_end_date: weekEnd,
            day: day,
            category_id: category._id,
            menu_items: [], // Empty for now - will be populated when menu items are created
            items: menuItems[mealType][dayIndex], // Legacy field
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
            created_by: messAdmin._id,
            is_active: true,
            notes: `Weekly menu for ${mess.name} - ${day} ${mealType}`
          });
        }
      }
    }
    logger.info('Created weekly menus for both messes with category structure');

    // Create sample notifications
    for (let i = 0; i < users.length; i++) {
      await Notification.create({
        mess_id: users[i].mess_id,
        user_id: users[i]._id,
        title: 'Welcome to Hostel Mess System!',
        message: 'Thank you for subscribing to our meal plan. Enjoy delicious and nutritious meals every day.',
        type: 'announcement',
        priority: 'medium',
        is_read: false,
        metadata: { user_type: 'new_user' },
        sent_at: new Date(),
        created_by: superAdmin._id,
        status: 'sent'
      });
    }

    // Create a global announcement
    await Notification.create({
      user_id: null, // Broadcast notification
      title: 'System Maintenance',
      message: 'The system will undergo maintenance on Sunday from 2 AM to 4 AM. Please plan accordingly.',
      type: 'alert',
      priority: 'high',
      is_read: false,
      metadata: { maintenance_type: 'scheduled' },
      sent_at: new Date(),
      created_by: superAdmin._id,
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
            mess_id: users[i].mess_id,
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
    logger.info('Super Admin (All Messes):');
    logger.info('  Email: superadmin@hosteleats.com');
    logger.info('  Password: Admin@123');
    logger.info('\nMess A Admin:');
    logger.info('  Email: admin-a@hosteleats.com');
    logger.info('  Password: Admin@123');
    logger.info('\nMess B Admin:');
    logger.info('  Email: admin-b@hosteleats.com');
    logger.info('  Password: Admin@123');
    logger.info('\nTest User:');
    logger.info('  Email: user1@example.com');
    logger.info('  Password: User@123');
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
