require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../config/mongodb');
const { Mess, User, Subscription, WeeklyMenu, MenuItem, MenuCategory, MenuTemplate, Notification, Attendance, MealConfirmation } = require('../../models');
const moment = require('moment-timezone');

// Use console.log instead of logger for seeding
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

// Get environment mode from command line argument or NODE_ENV
const mode = process.argv[2] || process.env.NODE_ENV || 'development';
const isProduction = mode === 'production' || mode === 'prod';

async function seedDatabase() {
  try {
    await connectDB();
    logger.info(`Connected to MongoDB for seeding in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

    if (isProduction) {
      await seedProduction();
    } else {
      await seedDevelopment();
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// ==================== PRODUCTION SEEDING ====================
async function seedProduction() {
  logger.info('Starting PRODUCTION seeding...');

  // Check if any mess exists
  const existingMess = await Mess.findOne({});
  let defaultMess;

  if (!existingMess) {
    // Create default mess
    defaultMess = await Mess.create({
      name: process.env.DEFAULT_MESS_NAME || 'Main Mess',
      code: process.env.DEFAULT_MESS_CODE || 'MAIN',
      address: process.env.DEFAULT_MESS_ADDRESS || 'Main Campus',
      city: process.env.DEFAULT_MESS_CITY || 'Your City',
      state: process.env.DEFAULT_MESS_STATE || 'Your State',
      pincode: process.env.DEFAULT_MESS_PINCODE || '000000',
      latitude: parseFloat(process.env.DEFAULT_MESS_LATITUDE || '28.7041'),
      longitude: parseFloat(process.env.DEFAULT_MESS_LONGITUDE || '77.1025'),
      radius_meters: parseInt(process.env.DEFAULT_MESS_RADIUS || '200'),
      contact_phone: process.env.ADMIN_PHONE || '9876543210',
      contact_email: process.env.ADMIN_EMAIL || 'admin@hosteleats.com',
      capacity: parseInt(process.env.DEFAULT_MESS_CAPACITY || '1000'),
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
      description: 'Default production mess'
    });
    logger.info('✅ Default mess created successfully!');

    // Initialize default menu categories for the new mess
    await MenuCategory.initializeDefaults(defaultMess._id, defaultMess._id);
    logger.info('✅ Default menu categories created for the mess');
  } else {
    defaultMess = existingMess;
    logger.info('Using existing mess for admin user');

    // Check if categories exist, if not create them
    const categoriesExist = await MenuCategory.countDocuments({ mess_id: defaultMess._id });
    if (categoriesExist === 0) {
      await MenuCategory.initializeDefaults(defaultMess._id, defaultMess._id);
      logger.info('✅ Default menu categories created for existing mess');
    }
  }

  // Check if super admin already exists
  const existingAdmin = await User.findOne({
    email: process.env.ADMIN_EMAIL || 'admin@hosteleats.com',
    role: 'super_admin'
  });

  if (existingAdmin) {
    logger.warn('⚠️  Super admin user already exists. Skipping creation.');
  } else {
    // Create super admin user
    const admin = await User.create({
      full_name: 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@hosteleats.com',
      phone: process.env.ADMIN_PHONE || '9876543210',
      password: process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe@2024',
      mess_id: defaultMess._id,
      role: 'super_admin',
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

    logger.info('✅ Production super admin user created successfully!');
    logger.info('\n=== ADMIN CREDENTIALS ===');
    logger.info(`Email: ${admin.email}`);
    logger.info(`Phone: ${admin.phone}`);
    logger.info(`Password: ${process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe@2024'}`);
    logger.info('⚠️  IMPORTANT: Change the default password immediately!');
    logger.info('========================\n');
  }

  logger.info('\n=== PRODUCTION SETUP COMPLETE ===');
  logger.info(`Mess Name: ${defaultMess.name}`);
  logger.info(`Mess Code: ${defaultMess.code}`);
  logger.info('=================================\n');
}

// ==================== DEVELOPMENT SEEDING ====================
async function seedDevelopment() {
  logger.info('Starting DEVELOPMENT seeding...');
  logger.warn('⚠️  This will DELETE all existing data!');

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

  // Drop old indexes from WeeklyMenu collection
  try {
    const weeklyMenuCollection = mongoose.connection.collection('weekly_menus');
    // Drop the old index that uses meal_type
    await weeklyMenuCollection.dropIndex('mess_id_1_week_start_date_1_day_1_meal_type_1').catch(() => {
      // Index might not exist, ignore error
    });
    logger.info('✅ Dropped old indexes');
  } catch (error) {
    // Ignore if collection doesn't exist or index doesn't exist
    logger.warn('⚠️  Could not drop old indexes (they might not exist)');
  }

  logger.info('✅ Cleared existing data');

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

  logger.info('✅ Created 2 sample messes');

  // Create menu categories for both messes
  const tempCreatorId = new mongoose.Types.ObjectId();

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

  logger.info('✅ Created menu categories for both messes');

  // Create super admin user
  // Password: Admin@123 (meets validation: min 8 chars, 1 number, 1 special char)
  const superAdmin = await User.create({
    full_name: 'Super Administrator',
    email: 'superadmin@hosteleats.com',
    phone: '9876543210',
    password: 'Admin@123',
    mess_id: mess1._id,
    role: 'super_admin',
    status: 'active',
    email_verified: true,
    phone_verified: true
  });

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

  logger.info('✅ Created admin users');

  // Create test users
  // Password: User@123 (meets validation: min 8 chars, 1 number, 1 special char)
  const users = [];
  for (let i = 1; i <= 10; i++) {
    const assignedMess = i % 2 === 0 ? mess2 : mess1;
    const user = await User.create({
      full_name: `Test User ${i}`,
      email: `user${i}@example.com`,
      phone: `98765432${20 + i}`,
      password: 'User@123',
      mess_id: assignedMess._id,
      role: 'subscriber',
      status: 'active',
      email_verified: true,
      phone_verified: false
    });
    users.push(user);
  }
  logger.info(`✅ Created ${users.length} test users`);

  // Create subscriptions
  const subscriptions = [];
  for (let i = 0; i < users.length; i++) {
    const subscription = await Subscription.create({
      user_id: users[i]._id,
      mess_id: users[i].mess_id,
      plan_type: ['daily', 'weekly', 'monthly'][i % 3],
      plan_name: `${['Daily', 'Weekly', 'Monthly'][i % 3]} Plan`,
      sub_type: ['veg', 'non-veg', 'both'][i % 3],
      amount: [50, 300, 1000][i % 3],
      start_date: moment().subtract(30, 'days').toDate(),
      end_date: moment().add(30, 'days').toDate(),
      status: 'active',
      payment_status: 'paid',
      payment_method: ['cash', 'upi', 'card'][i % 3],
      auto_renewal: i % 2 === 0,
      meals_included: {
        breakfast: true,
        lunch: true,
        dinner: i % 2 === 0
      }
    });
    subscriptions.push(subscription);
  }
  logger.info(`✅ Created ${subscriptions.length} subscriptions`);

  // Create Menu Items for each mess
  const menuItemsData = {
    'Hostel A Mess': {
      breakfast: [
        { name: 'Poha', description: 'Flattened rice with spices', price: 30, is_veg: true, allergen_info: ['peanuts'] },
        { name: 'Upma', description: 'Semolina with vegetables', price: 25, is_veg: true, allergen_info: [] },
        { name: 'Aloo Paratha', description: 'Potato stuffed flatbread', price: 35, is_veg: true, allergen_info: ['gluten', 'dairy'] },
        { name: 'Idli Sambar', description: 'Steamed rice cakes with lentil curry', price: 30, is_veg: true, allergen_info: [] },
        { name: 'Bread Omelette', description: 'Bread with egg omelette', price: 40, is_veg: false, allergen_info: ['gluten', 'eggs'] },
        { name: 'Dosa', description: 'Crispy rice crepe', price: 35, is_veg: true, allergen_info: [] },
        { name: 'Puri Bhaji', description: 'Fried bread with potato curry', price: 30, is_veg: true, allergen_info: ['gluten'] }
      ],
      lunch: [
        { name: 'Dal Tadka with Rice', description: 'Lentils with steamed rice', price: 60, is_veg: true, allergen_info: [] },
        { name: 'Rajma Chawal', description: 'Kidney beans curry with rice', price: 65, is_veg: true, allergen_info: [] },
        { name: 'Chole Rice', description: 'Chickpea curry with rice', price: 60, is_veg: true, allergen_info: [] },
        { name: 'Paneer Butter Masala', description: 'Cottage cheese in tomato gravy', price: 80, is_veg: true, allergen_info: ['dairy'] },
        { name: 'Chicken Curry with Rice', description: 'Chicken curry with steamed rice', price: 90, is_veg: false, allergen_info: [] },
        { name: 'Mix Veg with Roti', description: 'Mixed vegetables with flatbread', price: 55, is_veg: true, allergen_info: ['gluten'] },
        { name: 'Egg Curry Rice', description: 'Boiled egg curry with rice', price: 70, is_veg: false, allergen_info: ['eggs'] }
      ],
      dinner: [
        { name: 'Veg Pulao', description: 'Spiced rice with vegetables', price: 55, is_veg: true, allergen_info: [] },
        { name: 'Kadhi Rice', description: 'Yogurt curry with rice', price: 50, is_veg: true, allergen_info: ['dairy'] },
        { name: 'Dal Fry with Roti', description: 'Lentils with flatbread', price: 45, is_veg: true, allergen_info: ['gluten'] },
        { name: 'Palak Paneer', description: 'Spinach with cottage cheese', price: 75, is_veg: true, allergen_info: ['dairy'] },
        { name: 'Fish Curry', description: 'Fish in spicy gravy', price: 100, is_veg: false, allergen_info: ['fish'] },
        { name: 'Aloo Gobi', description: 'Potato and cauliflower curry', price: 50, is_veg: true, allergen_info: [] },
        { name: 'Chicken Biryani', description: 'Spiced rice with chicken', price: 120, is_veg: false, allergen_info: [] }
      ]
    },
    'Hostel B Mess': {
      breakfast: [
        { name: 'Misal Pav', description: 'Spicy sprouts curry with bread', price: 35, is_veg: true, allergen_info: ['gluten'] },
        { name: 'Sabudana Khichdi', description: 'Tapioca pearls with peanuts', price: 30, is_veg: true, allergen_info: ['peanuts'] },
        { name: 'Methi Thepla', description: 'Fenugreek flatbread', price: 30, is_veg: true, allergen_info: ['gluten'] },
        { name: 'Masala Dosa', description: 'Crispy crepe with potato filling', price: 40, is_veg: true, allergen_info: [] },
        { name: 'Egg Bhurji', description: 'Scrambled eggs Indian style', price: 45, is_veg: false, allergen_info: ['eggs'] },
        { name: 'Vada Sambar', description: 'Fried lentil donuts with curry', price: 35, is_veg: true, allergen_info: [] },
        { name: 'Ragi Porridge', description: 'Finger millet porridge', price: 25, is_veg: true, allergen_info: [] }
      ],
      lunch: [
        { name: 'Sambar Rice', description: 'South Indian lentil curry with rice', price: 60, is_veg: true, allergen_info: [] },
        { name: 'Baingan Bharta', description: 'Roasted eggplant curry', price: 65, is_veg: true, allergen_info: [] },
        { name: 'Aloo Matar', description: 'Potato and peas curry', price: 55, is_veg: true, allergen_info: [] },
        { name: 'Shahi Paneer', description: 'Royal cottage cheese curry', price: 85, is_veg: true, allergen_info: ['dairy', 'nuts'] },
        { name: 'Mutton Curry', description: 'Spicy mutton curry', price: 110, is_veg: false, allergen_info: [] },
        { name: 'Bhindi Masala', description: 'Spiced okra curry', price: 50, is_veg: true, allergen_info: [] },
        { name: 'Prawn Curry', description: 'Prawns in coconut curry', price: 120, is_veg: false, allergen_info: ['shellfish'] }
      ],
      dinner: [
        { name: 'Jeera Rice', description: 'Cumin flavored rice', price: 45, is_veg: true, allergen_info: [] },
        { name: 'Mixed Dal', description: 'Five lentils combination', price: 50, is_veg: true, allergen_info: [] },
        { name: 'Matar Paneer', description: 'Peas with cottage cheese', price: 70, is_veg: true, allergen_info: ['dairy'] },
        { name: 'Malai Kofta', description: 'Fried veggie balls in creamy gravy', price: 80, is_veg: true, allergen_info: ['dairy', 'nuts'] },
        { name: 'Chicken Kadhai', description: 'Chicken in spicy wok-tossed gravy', price: 95, is_veg: false, allergen_info: [] },
        { name: 'Chana Masala', description: 'Spiced chickpea curry', price: 55, is_veg: true, allergen_info: [] },
        { name: 'Veg Biryani', description: 'Spiced vegetable rice', price: 75, is_veg: true, allergen_info: [] }
      ]
    }
  };

  const createdMenuItems = {};
  logger.info('Creating menu items...');

  for (const mess of [mess1, mess2]) {
    const messName = mess.name;
    createdMenuItems[messName] = {};

    for (const [mealType, items] of Object.entries(menuItemsData[messName])) {
      createdMenuItems[messName][mealType] = [];

      // Find the category for this meal type
      const categoryName = mealType.charAt(0).toUpperCase() + mealType.slice(1);
      const messCategories = mess._id.toString() === mess1._id.toString() ? mess1Categories : mess2Categories;
      const category = messCategories.find(cat => cat.name === categoryName);

      if (!category) {
        logger.error(`Category ${categoryName} not found for ${messName}`);
        continue;
      }

      for (const itemData of items) {
        const menuItem = await MenuItem.create({
          mess_id: mess._id,
          category_id: category._id,
          name: itemData.name,
          description: itemData.description,
          price: itemData.price,
          is_veg: itemData.is_veg,
          is_available: true,
          allergen_info: itemData.allergen_info || [],
          nutritional_info: {
            calories: Math.floor(Math.random() * 200) + 200,
            protein: Math.floor(Math.random() * 20) + 5,
            carbs: Math.floor(Math.random() * 50) + 20,
            fat: Math.floor(Math.random() * 15) + 5,
            fiber: Math.floor(Math.random() * 10) + 2
          },
          created_by: superAdmin._id
        });

        createdMenuItems[messName][mealType].push(menuItem);
      }
    }

    logger.info(`Created ${Object.values(createdMenuItems[messName]).flat().length} menu items for ${messName}`);
  }

  // Create weekly menu for current week and next week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];

  // Create menus for current week AND next week
  // Use isoWeek to start from Monday
  const weeks = [
    {
      start: moment().startOf('isoWeek').toDate(), // Current week Monday (ISO week starts Monday)
      end: moment().endOf('isoWeek').toDate()       // Current week Sunday
    },
    {
      start: moment().add(1, 'week').startOf('isoWeek').toDate(), // Next week Monday
      end: moment().add(1, 'week').endOf('isoWeek').toDate()      // Next week Sunday
    }
  ];

  for (const week of weeks) {
    const weekStart = week.start;
    const weekEnd = week.end;

    // Create menus for both messes
    for (const mess of [mess1, mess2]) {
    const messName = mess.name;
    const messCategories = mess._id.toString() === mess1._id.toString() ? mess1Categories : mess2Categories;
    const messAdmin = mess._id.toString() === mess1._id.toString() ? messAdmin1 : messAdmin2;

    for (const day of days) {
      for (let mIndex = 0; mIndex < mealTypes.length; mIndex++) {
        const mealType = mealTypes[mIndex];
        const dayIndex = days.indexOf(day);
        const category = messCategories.find(cat => cat.slug === mealType);

        if (!category) continue;

        // Get the menu items for this mess and meal type
        const availableItems = createdMenuItems[messName][mealType] || [];

        // Select 2-3 items for this day
        const numItems = Math.floor(Math.random() * 2) + 2; // 2 or 3 items
        const selectedItems = [];
        const itemsCopy = [...availableItems];

        for (let i = 0; i < Math.min(numItems, itemsCopy.length); i++) {
          const randomIndex = Math.floor(Math.random() * itemsCopy.length);
          selectedItems.push(itemsCopy[randomIndex]);
          itemsCopy.splice(randomIndex, 1);
        }

        await WeeklyMenu.create({
          mess_id: mess._id,
          week_start_date: weekStart,
          week_end_date: weekEnd,
          day: day,
          category_id: category._id,
          menu_items: selectedItems.map(item => item._id),
          items: selectedItems.map(item => item.name), // Keep for backward compatibility
          special_items: dayIndex % 2 === 0 ? ['Dessert'] : [],
          nutritional_info: {
            calories: selectedItems.reduce((sum, item) => sum + (item.nutritional_info?.calories || 0), 0),
            protein: selectedItems.reduce((sum, item) => sum + (item.nutritional_info?.protein || 0), 0),
            carbs: selectedItems.reduce((sum, item) => sum + (item.nutritional_info?.carbs || 0), 0),
            fat: selectedItems.reduce((sum, item) => sum + (item.nutritional_info?.fat || 0), 0),
            fiber: selectedItems.reduce((sum, item) => sum + (item.nutritional_info?.fiber || 0), 0)
          },
          is_veg: selectedItems.every(item => item.is_veg),
          allergen_info: [...new Set(selectedItems.flatMap(item => item.allergen_info || []))],
          price: selectedItems.reduce((sum, item) => sum + (item.price || 0), 0),
          created_by: messAdmin._id,
          is_active: true,
          notes: `Weekly menu for ${mess.name} - ${day} ${mealType}`
        });
      }
    }
    }
  }
  logger.info('Created weekly menus for both messes (current week + next week)');

  // Create notifications
  for (let i = 0; i < users.length; i++) {
    await Notification.create({
      mess_id: users[i].mess_id,
      user_id: users[i]._id,
      title: 'Welcome to Hostel Mess System!',
      message: 'Thank you for subscribing to our meal plan.',
      type: 'announcement',
      priority: 'medium',
      is_read: false,
      sent_at: new Date(),
      created_by: superAdmin._id,
      status: 'sent'
    });
  }
  logger.info('✅ Created notifications');

  // Create sample attendance
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
          geo_location: { latitude: 28.7041, longitude: 77.1025 },
          distance_from_mess: Math.floor(Math.random() * 150),
          is_valid: true,
          scan_method: 'qr',
          meal_consumed: true
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
  }
  logger.info('✅ Created sample attendance records');

  logger.info('\n=== DEVELOPMENT SEEDING COMPLETE ===');
  logger.info('Test Credentials:');
  logger.info('');
  logger.info('Super Admin (All Messes):');
  logger.info('  Email: superadmin@hosteleats.com');
  logger.info('  Password: Admin@123');
  logger.info('');
  logger.info('Mess A Admin:');
  logger.info('  Email: admin-a@hosteleats.com');
  logger.info('  Password: Admin@123');
  logger.info('');
  logger.info('Mess B Admin:');
  logger.info('  Email: admin-b@hosteleats.com');
  logger.info('  Password: Admin@123');
  logger.info('');
  logger.info('Test User:');
  logger.info('  Email: user1@example.com');
  logger.info('  Password: User@123');
  logger.info('====================================\n');
}

// Run seeder
seedDatabase();
