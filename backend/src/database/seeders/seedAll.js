require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../config/mongodb');
const { Mess, User, Subscription, WeeklyMenu, MenuItem, MenuCategory, MenuTemplate, Notification, Attendance, MealConfirmation } = require('../../models');
const moment = require('moment-timezone');

// Use console.log instead of logger for seeding
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  success: (msg) => console.log(`[SUCCESS] ✓ ${msg}`)
};

// Get environment mode from command line argument or NODE_ENV
const mode = process.argv[2] || process.env.NODE_ENV || 'development';
const isProduction = mode === 'production' || mode === 'prod';

// Helper functions
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const generatePhone = (index) => `9${randomBetween(1, 9)}${String(index).padStart(8, '0').slice(-8)}`;

// Indian names for realistic data
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Ananya', 'Aadhya', 'Priya', 'Sneha', 'Riya', 'Kavya', 'Ishita', 'Anika', 'Pooja', 'Neha',
  'Rohan', 'Karan', 'Rahul', 'Amit', 'Vijay', 'Rajesh', 'Suresh', 'Mahesh', 'Dinesh', 'Rakesh',
  'Anjali', 'Sunita', 'Meera', 'Deepika', 'Shruti', 'Nisha', 'Divya', 'Swati', 'Komal', 'Simran',
  'Vikram', 'Ajay', 'Sanjay', 'Pankaj', 'Gaurav', 'Nikhil', 'Tushar', 'Harsh', 'Kunal', 'Varun'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah', 'Joshi', 'Mehta', 'Agarwal',
  'Reddy', 'Nair', 'Menon', 'Iyer', 'Pillai', 'Rao', 'Naidu', 'Choudhary', 'Saxena', 'Mishra',
  'Banerjee', 'Chatterjee', 'Das', 'Sen', 'Roy', 'Mukherjee', 'Ghosh', 'Bose', 'Dutta', 'Sarkar'
];

// Day-wise attendance patterns (percentage likelihood of attending)
const attendancePatterns = {
  monday: { breakfast: 75, lunch: 85, dinner: 80 },
  tuesday: { breakfast: 78, lunch: 88, dinner: 82 },
  wednesday: { breakfast: 80, lunch: 90, dinner: 85 },
  thursday: { breakfast: 77, lunch: 87, dinner: 83 },
  friday: { breakfast: 70, lunch: 80, dinner: 75 },
  saturday: { breakfast: 50, lunch: 60, dinner: 65 },
  sunday: { breakfast: 45, lunch: 55, dinner: 70 }
};

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
    console.error(error.stack);
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
    logger.success('Default mess created successfully!');

    // Initialize default menu categories for the new mess
    await MenuCategory.initializeDefaults(defaultMess._id, defaultMess._id);
    logger.success('Default menu categories created for the mess');
  } else {
    defaultMess = existingMess;
    logger.info('Using existing mess for admin user');

    // Check if categories exist, if not create them
    const categoriesExist = await MenuCategory.countDocuments({ mess_id: defaultMess._id });
    if (categoriesExist === 0) {
      await MenuCategory.initializeDefaults(defaultMess._id, defaultMess._id);
      logger.success('Default menu categories created for existing mess');
    }
  }

  // Check if super admin already exists
  const existingAdmin = await User.findOne({
    email: process.env.ADMIN_EMAIL || 'admin@hosteleats.com',
    role: 'super_admin'
  });

  if (existingAdmin) {
    logger.warn('Super admin user already exists. Skipping creation.');
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

    logger.success('Production super admin user created successfully!');
    logger.info('\n=== ADMIN CREDENTIALS ===');
    logger.info(`Email: ${admin.email}`);
    logger.info(`Phone: ${admin.phone}`);
    logger.info(`Password: ${process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe@2024'}`);
    logger.warn('IMPORTANT: Change the default password immediately!');
    logger.info('========================\n');
  }

  logger.info('\n=== PRODUCTION SETUP COMPLETE ===');
  logger.info(`Mess Name: ${defaultMess.name}`);
  logger.info(`Mess Code: ${defaultMess.code}`);
  logger.info('=================================\n');
}

// ==================== DEVELOPMENT SEEDING ====================
async function seedDevelopment() {
  logger.info('Starting COMPREHENSIVE DEVELOPMENT seeding...');
  logger.warn('This will DELETE all existing data and create 6 months of test data!');

  // Clear existing data
  logger.info('Clearing existing data...');
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

  // Drop old indexes
  try {
    const weeklyMenuCollection = mongoose.connection.collection('weekly_menus');
    await weeklyMenuCollection.dropIndex('mess_id_1_week_start_date_1_day_1_meal_type_1').catch(() => {});
    logger.info('Dropped old indexes');
  } catch (error) {
    // Ignore if collection doesn't exist
  }

  logger.success('Cleared existing data');

  // ========================================
  // CREATE MESSES (4 different messes)
  // ========================================
  const messes = await Mess.create([
    {
      name: 'Central Hostel Mess',
      code: 'MESS-CENTRAL',
      address: 'Central Block, University Campus',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302017',
      latitude: 26.9124,
      longitude: 75.7873,
      radius_meters: 250,
      contact_phone: '9876543210',
      contact_email: 'central-mess@university.edu',
      capacity: 800,
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
      description: 'Main central mess serving all hostel blocks'
    },
    {
      name: 'Boys Hostel A Mess',
      code: 'MESS-BH-A',
      address: 'Boys Hostel A, North Campus',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302017',
      latitude: 26.9150,
      longitude: 75.7890,
      radius_meters: 200,
      contact_phone: '9876543211',
      contact_email: 'bh-a-mess@university.edu',
      capacity: 400,
      status: 'active',
      settings: {
        breakfast_start: '07:30',
        breakfast_end: '10:30',
        lunch_start: '12:30',
        lunch_end: '15:30',
        dinner_start: '19:30',
        dinner_end: '22:30',
        qr_validity_minutes: 45,
        allow_meal_confirmation: true,
        confirmation_deadline_hours: 3
      },
      description: 'Mess for Boys Hostel A residents'
    },
    {
      name: 'Girls Hostel Mess',
      code: 'MESS-GH',
      address: 'Girls Hostel Complex, South Campus',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302018',
      latitude: 26.9080,
      longitude: 75.7850,
      radius_meters: 180,
      contact_phone: '9876543212',
      contact_email: 'gh-mess@university.edu',
      capacity: 350,
      status: 'active',
      settings: {
        breakfast_start: '07:00',
        breakfast_end: '09:30',
        lunch_start: '12:00',
        lunch_end: '14:30',
        dinner_start: '19:00',
        dinner_end: '21:30',
        qr_validity_minutes: 30,
        allow_meal_confirmation: true,
        confirmation_deadline_hours: 2
      },
      description: 'Exclusive mess for Girls Hostel residents'
    },
    {
      name: 'PG Hostel Mess',
      code: 'MESS-PG',
      address: 'PG Block, East Campus',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302019',
      latitude: 26.9100,
      longitude: 75.7920,
      radius_meters: 150,
      contact_phone: '9876543213',
      contact_email: 'pg-mess@university.edu',
      capacity: 200,
      status: 'active',
      settings: {
        breakfast_start: '07:00',
        breakfast_end: '10:00',
        lunch_start: '12:00',
        lunch_end: '15:00',
        dinner_start: '19:00',
        dinner_end: '22:00',
        qr_validity_minutes: 60,
        allow_meal_confirmation: false,
        confirmation_deadline_hours: 1
      },
      description: 'Mess for Post-Graduate hostel students'
    }
  ]);
  logger.success(`Created ${messes.length} messes`);

  const [messCentral, messBHA, messGH, messPG] = messes;

  // ========================================
  // CREATE MENU CATEGORIES FOR ALL MESSES
  // ========================================
  const tempCreatorId = new mongoose.Types.ObjectId();
  const allCategories = {};

  for (const mess of messes) {
    const categories = await MenuCategory.create([
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
        created_by: tempCreatorId
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
        created_by: tempCreatorId
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
        created_by: tempCreatorId
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
        created_by: tempCreatorId
      }
    ]);
    allCategories[mess._id.toString()] = categories;
  }
  logger.success('Created menu categories for all messes');

  // ========================================
  // CREATE USERS
  // ========================================

  // Super Admin
  const superAdmin = await User.create({
    full_name: 'Super Administrator',
    email: 'superadmin@hosteleats.com',
    phone: '9876543200',
    password: 'Admin@123',
    mess_id: messCentral._id,
    role: 'super_admin',
    status: 'active',
    email_verified: true,
    phone_verified: true
  });
  logger.success('Created super admin');

  // Mess Admins (one per mess)
  const messAdmins = [];
  for (let i = 0; i < messes.length; i++) {
    const admin = await User.create({
      full_name: `${messes[i].name} Admin`,
      email: `admin-${messes[i].code.toLowerCase()}@hosteleats.com`,
      phone: generatePhone(100 + i),
      password: 'Admin@123',
      mess_id: messes[i]._id,
      role: 'mess_admin',
      status: 'active',
      email_verified: true,
      phone_verified: true
    });
    messAdmins.push(admin);
  }
  logger.success(`Created ${messAdmins.length} mess admins`);

  // Create regular users (55 users distributed across messes)
  const users = [];
  const usedEmails = new Set();
  const usedPhones = new Set();

  // Distribution: Central (20), BH-A (15), GH (10), PG (10) = 55 users
  const messDistribution = [
    { mess: messCentral, count: 20 },
    { mess: messBHA, count: 15 },
    { mess: messGH, count: 10 },
    { mess: messPG, count: 10 }
  ];

  let userIndex = 0;
  for (const { mess, count } of messDistribution) {
    for (let i = 0; i < count; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const fullName = `${firstName} ${lastName}`;

      // Generate unique email
      let email;
      let emailIndex = 0;
      do {
        email = emailIndex === 0
          ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
          : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailIndex}@example.com`;
        emailIndex++;
      } while (usedEmails.has(email));
      usedEmails.add(email);

      // Generate unique phone
      let phone;
      do {
        phone = generatePhone(userIndex + 1000);
        userIndex++;
      } while (usedPhones.has(phone));
      usedPhones.add(phone);

      const user = await User.create({
        full_name: fullName,
        email: email,
        phone: phone,
        password: 'User@123',
        mess_id: mess._id,
        role: 'subscriber',
        status: randomElement(['active', 'active', 'active', 'active', 'inactive']), // 80% active
        email_verified: Math.random() > 0.1,
        phone_verified: Math.random() > 0.3,
        preferences: {
          notifications: Math.random() > 0.2,
          email_notifications: Math.random() > 0.3,
          sms_notifications: Math.random() > 0.6,
          meal_reminders: Math.random() > 0.4
        }
      });
      users.push(user);
    }
  }
  logger.success(`Created ${users.length} regular users`);

  // ========================================
  // CREATE SUBSCRIPTIONS (6 months history)
  // ========================================
  const subscriptions = [];
  const planTypes = ['daily', 'weekly', 'monthly', 'quarterly'];
  const subTypes = ['veg', 'non-veg', 'both'];
  const planPrices = {
    daily: { veg: 80, 'non-veg': 100, both: 120 },
    weekly: { veg: 500, 'non-veg': 650, both: 750 },
    monthly: { veg: 1800, 'non-veg': 2200, both: 2500 },
    quarterly: { veg: 5000, 'non-veg': 6200, both: 7000 }
  };

  const sixMonthsAgo = moment().subtract(6, 'months').startOf('month');

  for (const user of users) {
    if (user.status !== 'active') continue;

    const preferredPlan = randomElement(planTypes);
    const preferredSubType = randomElement(subTypes);

    // Various meal combinations
    const mealCombinations = [
      { breakfast: true, lunch: true, dinner: true },
      { breakfast: true, lunch: true, dinner: false },
      { breakfast: false, lunch: true, dinner: true },
      { breakfast: true, lunch: false, dinner: true },
      { breakfast: false, lunch: true, dinner: false },
    ];
    const mealsIncluded = randomElement(mealCombinations);

    let currentDate = sixMonthsAgo.clone();
    const subscriptionCount = randomBetween(1, 3);

    for (let s = 0; s < subscriptionCount; s++) {
      let duration;
      switch (preferredPlan) {
        case 'daily': duration = randomBetween(20, 35); break;
        case 'weekly': duration = randomBetween(7, 14); break;
        case 'monthly': duration = randomBetween(28, 35); break;
        case 'quarterly': duration = randomBetween(80, 100); break;
        default: duration = 30;
      }

      const startDate = currentDate.clone().toDate();
      const endDate = currentDate.clone().add(duration, 'days').toDate();

      const now = moment();
      let status;
      if (moment(endDate).isBefore(now)) {
        status = 'expired';
      } else if (moment(startDate).isAfter(now)) {
        status = 'pending';
      } else {
        status = 'active';
      }

      const subscription = await Subscription.create({
        user_id: user._id,
        mess_id: user.mess_id,
        plan_type: preferredPlan,
        plan_name: `${preferredPlan.charAt(0).toUpperCase() + preferredPlan.slice(1)} ${preferredSubType.charAt(0).toUpperCase() + preferredSubType.slice(1)} Plan`,
        sub_type: preferredSubType,
        amount: planPrices[preferredPlan][preferredSubType],
        start_date: startDate,
        end_date: endDate,
        status: status,
        payment_status: status === 'pending' ? 'pending' : 'paid',
        payment_method: randomElement(['cash', 'upi', 'card', 'netbanking']),
        payment_reference: status !== 'pending' ? `PAY${Date.now()}${Math.random().toString(36).substr(2, 9)}` : null,
        auto_renewal: Math.random() > 0.6,
        meals_included: mealsIncluded,
        special_requirements: preferredSubType === 'veg' ? 'Strictly vegetarian' :
                             preferredSubType === 'non-veg' ? 'Non-veg preferred when available' : null,
        notes: `Subscription ${s + 1} for ${user.full_name}`
      });
      subscriptions.push(subscription);

      currentDate = moment(endDate).add(randomBetween(1, 10), 'days');
      if (currentDate.isAfter(moment())) break;
    }
  }
  logger.success(`Created ${subscriptions.length} subscriptions`);

  // ========================================
  // CREATE MENU ITEMS (Actual food items)
  // ========================================
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];

  // Comprehensive menu item definitions for Indian mess
  const menuItemDefinitions = {
    breakfast: [
      { name: 'Idli', description: 'Soft steamed rice cakes', is_vegetarian: true, is_vegan: true, calories: 80, protein: 2, carbs: 17, fat: 0.4, ingredients: ['rice', 'urad dal'], allergen_info: [] },
      { name: 'Sambar', description: 'Lentil vegetable stew with tamarind', is_vegetarian: true, is_vegan: true, calories: 120, protein: 5, carbs: 18, fat: 3, ingredients: ['toor dal', 'vegetables', 'tamarind'], allergen_info: [] },
      { name: 'Coconut Chutney', description: 'Fresh coconut chutney with tempering', is_vegetarian: true, is_vegan: true, calories: 60, protein: 1, carbs: 4, fat: 5, ingredients: ['coconut', 'green chilli'], allergen_info: ['tree nuts'] },
      { name: 'Filter Coffee', description: 'Traditional South Indian filter coffee', is_vegetarian: true, is_vegan: false, calories: 90, protein: 2, carbs: 12, fat: 3, ingredients: ['coffee', 'milk', 'sugar'], allergen_info: ['dairy'] },
      { name: 'Poha', description: 'Flattened rice with onions, peanuts and tempering', is_vegetarian: true, is_vegan: true, calories: 180, protein: 4, carbs: 32, fat: 5, ingredients: ['flattened rice', 'onion', 'peanuts'], allergen_info: ['peanuts'] },
      { name: 'Sev', description: 'Crispy chickpea flour noodles', is_vegetarian: true, is_vegan: true, calories: 50, protein: 2, carbs: 6, fat: 2.5, ingredients: ['chickpea flour'], allergen_info: [] },
      { name: 'Jalebi', description: 'Crispy sweet spirals soaked in sugar syrup', is_vegetarian: true, is_vegan: false, calories: 150, protein: 1, carbs: 28, fat: 5, ingredients: ['maida', 'sugar', 'ghee'], allergen_info: ['gluten', 'dairy'] },
      { name: 'Chai', description: 'Indian spiced tea with milk', is_vegetarian: true, is_vegan: false, calories: 80, protein: 2, carbs: 10, fat: 3, ingredients: ['tea', 'milk', 'sugar', 'spices'], allergen_info: ['dairy'] },
      { name: 'Upma', description: 'Semolina porridge with vegetables', is_vegetarian: true, is_vegan: true, calories: 200, protein: 5, carbs: 35, fat: 5, ingredients: ['semolina', 'vegetables', 'mustard seeds'], allergen_info: ['gluten'] },
      { name: 'Tomato Chutney', description: 'Tangy tomato chutney with garlic', is_vegetarian: true, is_vegan: true, calories: 45, protein: 1, carbs: 8, fat: 1.5, ingredients: ['tomato', 'garlic', 'red chilli'], allergen_info: [] },
      { name: 'Banana', description: 'Fresh ripe banana', is_vegetarian: true, is_vegan: true, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, ingredients: ['banana'], allergen_info: [] },
      { name: 'Aloo Paratha', description: 'Stuffed potato flatbread', is_vegetarian: true, is_vegan: false, calories: 280, protein: 6, carbs: 42, fat: 10, ingredients: ['wheat flour', 'potato', 'butter'], allergen_info: ['gluten', 'dairy'] },
      { name: 'Curd', description: 'Fresh homemade yogurt', is_vegetarian: true, is_vegan: false, calories: 60, protein: 4, carbs: 5, fat: 3, ingredients: ['milk'], allergen_info: ['dairy'] },
      { name: 'Pickle', description: 'Mixed vegetable pickle', is_vegetarian: true, is_vegan: true, calories: 30, protein: 0.5, carbs: 4, fat: 1.5, ingredients: ['vegetables', 'spices', 'oil'], allergen_info: [] },
      { name: 'Butter', description: 'Fresh creamery butter', is_vegetarian: true, is_vegan: false, calories: 100, protein: 0.1, carbs: 0, fat: 11, ingredients: ['cream'], allergen_info: ['dairy'] },
      { name: 'Masala Dosa', description: 'Crispy fermented crepe with spiced potato', is_vegetarian: true, is_vegan: true, calories: 250, protein: 5, carbs: 40, fat: 8, ingredients: ['rice', 'urad dal', 'potato'], allergen_info: [] },
      { name: 'Bread Toast', description: 'Crispy toasted bread slices', is_vegetarian: true, is_vegan: true, calories: 80, protein: 3, carbs: 15, fat: 1, ingredients: ['bread'], allergen_info: ['gluten'] },
      { name: 'Jam', description: 'Mixed fruit jam', is_vegetarian: true, is_vegan: true, calories: 50, protein: 0, carbs: 13, fat: 0, ingredients: ['fruits', 'sugar'], allergen_info: [] },
      { name: 'Omelette', description: 'Fluffy egg omelette with onions', is_vegetarian: false, is_vegan: false, calories: 150, protein: 10, carbs: 2, fat: 12, ingredients: ['eggs', 'onion', 'green chilli'], allergen_info: ['eggs'] },
      { name: 'Milk', description: 'Fresh full cream milk', is_vegetarian: true, is_vegan: false, calories: 120, protein: 6, carbs: 10, fat: 6, ingredients: ['milk'], allergen_info: ['dairy'] },
      { name: 'Puri', description: 'Deep fried whole wheat puffed bread', is_vegetarian: true, is_vegan: true, calories: 150, protein: 3, carbs: 20, fat: 7, ingredients: ['wheat flour', 'oil'], allergen_info: ['gluten'] },
      { name: 'Aloo Sabzi', description: 'Spiced potato curry', is_vegetarian: true, is_vegan: true, calories: 180, protein: 3, carbs: 25, fat: 8, ingredients: ['potato', 'tomato', 'spices'], allergen_info: [] },
      { name: 'Halwa', description: 'Sweet semolina pudding with ghee', is_vegetarian: true, is_vegan: false, calories: 200, protein: 3, carbs: 35, fat: 8, ingredients: ['semolina', 'sugar', 'ghee'], allergen_info: ['gluten', 'dairy'] },
      { name: 'Medu Vada', description: 'Crispy urad dal fritters', is_vegetarian: true, is_vegan: true, calories: 180, protein: 6, carbs: 22, fat: 8, ingredients: ['urad dal', 'curry leaves'], allergen_info: [] },
      { name: 'Uttapam', description: 'Thick rice pancake with toppings', is_vegetarian: true, is_vegan: true, calories: 200, protein: 5, carbs: 35, fat: 5, ingredients: ['rice', 'urad dal', 'onion', 'tomato'], allergen_info: [] }
    ],
    lunch: [
      { name: 'Steamed Rice', description: 'Plain basmati rice', is_vegetarian: true, is_vegan: true, calories: 200, protein: 4, carbs: 45, fat: 0.5, ingredients: ['rice'], allergen_info: [] },
      { name: 'Dal Tadka', description: 'Yellow lentils with cumin tempering', is_vegetarian: true, is_vegan: true, calories: 150, protein: 8, carbs: 22, fat: 4, ingredients: ['toor dal', 'ghee', 'cumin'], allergen_info: [] },
      { name: 'Roti', description: 'Whole wheat flatbread', is_vegetarian: true, is_vegan: true, calories: 80, protein: 3, carbs: 16, fat: 1, ingredients: ['wheat flour'], allergen_info: ['gluten'] },
      { name: 'Mix Veg', description: 'Mixed vegetable curry', is_vegetarian: true, is_vegan: true, calories: 120, protein: 3, carbs: 15, fat: 5, ingredients: ['mixed vegetables', 'spices'], allergen_info: [] },
      { name: 'Salad', description: 'Fresh cucumber, onion and tomato salad', is_vegetarian: true, is_vegan: true, calories: 30, protein: 1, carbs: 6, fat: 0.2, ingredients: ['cucumber', 'onion', 'tomato'], allergen_info: [] },
      { name: 'Papad', description: 'Crispy lentil wafers', is_vegetarian: true, is_vegan: true, calories: 40, protein: 2, carbs: 5, fat: 2, ingredients: ['urad dal'], allergen_info: [] },
      { name: 'Jeera Rice', description: 'Cumin flavored rice', is_vegetarian: true, is_vegan: true, calories: 220, protein: 4, carbs: 46, fat: 2, ingredients: ['rice', 'cumin', 'ghee'], allergen_info: [] },
      { name: 'Rajma', description: 'Kidney beans in thick tomato gravy', is_vegetarian: true, is_vegan: true, calories: 180, protein: 10, carbs: 28, fat: 3, ingredients: ['kidney beans', 'tomato', 'onion'], allergen_info: [] },
      { name: 'Aloo Gobi', description: 'Potato and cauliflower dry curry', is_vegetarian: true, is_vegan: true, calories: 150, protein: 4, carbs: 22, fat: 5, ingredients: ['potato', 'cauliflower', 'spices'], allergen_info: [] },
      { name: 'Raita', description: 'Spiced yogurt with vegetables', is_vegetarian: true, is_vegan: false, calories: 80, protein: 4, carbs: 8, fat: 3, ingredients: ['yogurt', 'cucumber', 'cumin'], allergen_info: ['dairy'] },
      { name: 'Veg Biryani', description: 'Aromatic rice with vegetables and spices', is_vegetarian: true, is_vegan: true, calories: 350, protein: 8, carbs: 55, fat: 10, ingredients: ['rice', 'vegetables', 'biryani masala'], allergen_info: [] },
      { name: 'Mirchi Ka Salan', description: 'Green chillies in peanut-coconut gravy', is_vegetarian: true, is_vegan: true, calories: 180, protein: 5, carbs: 15, fat: 12, ingredients: ['green chilli', 'peanuts', 'coconut'], allergen_info: ['peanuts', 'tree nuts'] },
      { name: 'Rasam', description: 'Tangy tamarind-tomato soup', is_vegetarian: true, is_vegan: true, calories: 50, protein: 2, carbs: 10, fat: 1, ingredients: ['tamarind', 'tomato', 'pepper'], allergen_info: [] },
      { name: 'Poriyal', description: 'South Indian dry vegetable stir fry', is_vegetarian: true, is_vegan: true, calories: 100, protein: 3, carbs: 12, fat: 5, ingredients: ['vegetables', 'coconut'], allergen_info: ['tree nuts'] },
      { name: 'Chole', description: 'Spiced chickpea curry', is_vegetarian: true, is_vegan: true, calories: 200, protein: 10, carbs: 30, fat: 5, ingredients: ['chickpeas', 'tomato', 'onion', 'spices'], allergen_info: [] },
      { name: 'Boondi Raita', description: 'Yogurt with crispy chickpea pearls', is_vegetarian: true, is_vegan: false, calories: 100, protein: 4, carbs: 12, fat: 4, ingredients: ['yogurt', 'boondi', 'cumin'], allergen_info: ['dairy'] },
      { name: 'Pulao', description: 'Mildly spiced vegetable rice', is_vegetarian: true, is_vegan: true, calories: 280, protein: 6, carbs: 48, fat: 6, ingredients: ['rice', 'vegetables', 'whole spices'], allergen_info: [] },
      { name: 'Dal Fry', description: 'Fried lentils with onion-tomato masala', is_vegetarian: true, is_vegan: true, calories: 160, protein: 9, carbs: 24, fat: 4, ingredients: ['toor dal', 'onion', 'tomato'], allergen_info: [] },
      { name: 'Paneer Butter Masala', description: 'Cottage cheese in rich tomato-butter gravy', is_vegetarian: true, is_vegan: false, calories: 350, protein: 15, carbs: 15, fat: 25, ingredients: ['paneer', 'tomato', 'cream', 'butter'], allergen_info: ['dairy'] },
      { name: 'Kadhi', description: 'Yogurt-based curry with gram flour dumplings', is_vegetarian: true, is_vegan: false, calories: 180, protein: 6, carbs: 20, fat: 8, ingredients: ['yogurt', 'gram flour'], allergen_info: ['dairy'] },
      { name: 'Aloo Matar', description: 'Potato and peas curry', is_vegetarian: true, is_vegan: true, calories: 180, protein: 5, carbs: 28, fat: 6, ingredients: ['potato', 'green peas', 'tomato'], allergen_info: [] },
      { name: 'Chicken Biryani', description: 'Aromatic rice layered with spiced chicken', is_vegetarian: false, is_vegan: false, calories: 450, protein: 25, carbs: 50, fat: 18, ingredients: ['rice', 'chicken', 'biryani masala'], allergen_info: [] },
      { name: 'Chicken Curry', description: 'Tender chicken in onion-tomato gravy', is_vegetarian: false, is_vegan: false, calories: 280, protein: 22, carbs: 10, fat: 18, ingredients: ['chicken', 'onion', 'tomato', 'spices'], allergen_info: [] },
      { name: 'Fish Curry', description: 'Fresh fish in tangy coconut curry', is_vegetarian: false, is_vegan: false, calories: 250, protein: 20, carbs: 8, fat: 16, ingredients: ['fish', 'coconut', 'tamarind'], allergen_info: ['fish', 'tree nuts'] },
      { name: 'Egg Curry', description: 'Boiled eggs in spiced onion-tomato gravy', is_vegetarian: false, is_vegan: false, calories: 220, protein: 14, carbs: 12, fat: 14, ingredients: ['eggs', 'onion', 'tomato'], allergen_info: ['eggs'] }
    ],
    dinner: [
      { name: 'Dal Makhani', description: 'Creamy black lentils slow-cooked with butter', is_vegetarian: true, is_vegan: false, calories: 250, protein: 10, carbs: 30, fat: 10, ingredients: ['black lentils', 'kidney beans', 'cream', 'butter'], allergen_info: ['dairy'] },
      { name: 'Fried Rice', description: 'Wok-tossed rice with vegetables', is_vegetarian: true, is_vegan: true, calories: 280, protein: 6, carbs: 48, fat: 8, ingredients: ['rice', 'vegetables', 'soy sauce'], allergen_info: ['soy'] },
      { name: 'Veg Manchurian', description: 'Crispy vegetable balls in Indo-Chinese sauce', is_vegetarian: true, is_vegan: true, calories: 250, protein: 5, carbs: 30, fat: 12, ingredients: ['mixed vegetables', 'corn flour', 'soy sauce'], allergen_info: ['soy', 'gluten'] },
      { name: 'Hot & Sour Soup', description: 'Tangy Indo-Chinese soup with vegetables', is_vegetarian: true, is_vegan: true, calories: 80, protein: 3, carbs: 12, fat: 2, ingredients: ['vegetables', 'vinegar', 'soy sauce'], allergen_info: ['soy'] },
      { name: 'Kootu', description: 'South Indian lentil and vegetable stew', is_vegetarian: true, is_vegan: true, calories: 140, protein: 7, carbs: 20, fat: 4, ingredients: ['chana dal', 'vegetables', 'coconut'], allergen_info: ['tree nuts'] },
      { name: 'Shahi Paneer', description: 'Paneer in rich cashew-cream gravy', is_vegetarian: true, is_vegan: false, calories: 380, protein: 16, carbs: 15, fat: 30, ingredients: ['paneer', 'cashew', 'cream'], allergen_info: ['dairy', 'tree nuts'] },
      { name: 'Palak Paneer', description: 'Cottage cheese in spinach puree', is_vegetarian: true, is_vegan: false, calories: 300, protein: 14, carbs: 12, fat: 22, ingredients: ['paneer', 'spinach', 'cream'], allergen_info: ['dairy'] },
      { name: 'Mixed Veg Pulao', description: 'Fragrant rice with mixed vegetables', is_vegetarian: true, is_vegan: true, calories: 300, protein: 7, carbs: 52, fat: 7, ingredients: ['rice', 'mixed vegetables', 'whole spices'], allergen_info: [] },
      { name: 'Naan', description: 'Soft leavened bread from tandoor', is_vegetarian: true, is_vegan: false, calories: 260, protein: 8, carbs: 45, fat: 5, ingredients: ['maida', 'yogurt', 'yeast'], allergen_info: ['gluten', 'dairy'] },
      { name: 'Butter Naan', description: 'Tandoor bread brushed with butter', is_vegetarian: true, is_vegan: false, calories: 310, protein: 8, carbs: 45, fat: 10, ingredients: ['maida', 'yogurt', 'butter'], allergen_info: ['gluten', 'dairy'] },
      { name: 'Garlic Naan', description: 'Naan topped with garlic and coriander', is_vegetarian: true, is_vegan: false, calories: 290, protein: 8, carbs: 46, fat: 8, ingredients: ['maida', 'yogurt', 'garlic'], allergen_info: ['gluten', 'dairy'] },
      { name: 'Tandoori Roti', description: 'Whole wheat bread from clay oven', is_vegetarian: true, is_vegan: true, calories: 100, protein: 4, carbs: 20, fat: 1, ingredients: ['wheat flour'], allergen_info: ['gluten'] },
      { name: 'Chicken Tikka Masala', description: 'Grilled chicken in creamy tomato sauce', is_vegetarian: false, is_vegan: false, calories: 350, protein: 28, carbs: 12, fat: 22, ingredients: ['chicken', 'tomato', 'cream', 'spices'], allergen_info: ['dairy'] },
      { name: 'Mutton Rogan Josh', description: 'Kashmiri style mutton curry', is_vegetarian: false, is_vegan: false, calories: 380, protein: 30, carbs: 10, fat: 25, ingredients: ['mutton', 'yogurt', 'kashmiri chilli'], allergen_info: ['dairy'] },
      { name: 'Gulab Jamun', description: 'Deep fried milk dumplings in sugar syrup', is_vegetarian: true, is_vegan: false, calories: 180, protein: 3, carbs: 30, fat: 6, ingredients: ['khoya', 'maida', 'sugar'], allergen_info: ['dairy', 'gluten'] },
      { name: 'Kheer', description: 'Rice pudding with nuts and cardamom', is_vegetarian: true, is_vegan: false, calories: 200, protein: 5, carbs: 35, fat: 5, ingredients: ['rice', 'milk', 'sugar', 'nuts'], allergen_info: ['dairy', 'tree nuts'] },
      { name: 'Ice Cream', description: 'Vanilla ice cream scoop', is_vegetarian: true, is_vegan: false, calories: 150, protein: 3, carbs: 20, fat: 7, ingredients: ['milk', 'cream', 'sugar'], allergen_info: ['dairy'] }
    ]
  };

  // Create menu items for each mess
  const allMenuItems = {};
  for (const mess of messes) {
    const messCategories = allCategories[mess._id.toString()];
    const messAdmin = messAdmins.find(a => a.mess_id.toString() === mess._id.toString());
    const creatorId = messAdmin ? messAdmin._id : superAdmin._id;

    allMenuItems[mess._id.toString()] = { breakfast: [], lunch: [], dinner: [] };

    for (const mealType of mealTypes) {
      const category = messCategories.find(cat => cat.slug === mealType);
      if (!category) continue;

      const items = menuItemDefinitions[mealType];
      for (const item of items) {
        const menuItem = await MenuItem.create({
          mess_id: mess._id,
          name: item.name,
          description: item.description,
          category_id: category._id,
          price: mealType === 'breakfast' ? randomBetween(10, 30) : mealType === 'lunch' ? randomBetween(20, 50) : randomBetween(15, 40),
          nutritional_info: {
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: randomBetween(1, 8)
          },
          allergen_info: item.allergen_info,
          is_vegetarian: item.is_vegetarian,
          is_vegan: item.is_vegan,
          is_available: true,
          preparation_time: randomBetween(10, 45),
          serving_size: '1 serving',
          ingredients: item.ingredients,
          created_by: creatorId
        });
        allMenuItems[mess._id.toString()][mealType].push(menuItem);
      }
    }
  }
  logger.success('Created menu items for all messes');

  // ========================================
  // CREATE WEEKLY MENUS (6 months past + 2 weeks future)
  // ========================================
  // Menu combinations for each day (indices into menuItemDefinitions)
  const dailyMenuCombinations = {
    breakfast: [
      [0, 1, 2, 3],      // Monday: Idli, Sambar, Coconut Chutney, Filter Coffee
      [4, 5, 6, 7],      // Tuesday: Poha, Sev, Jalebi, Chai
      [8, 9, 10, 3],     // Wednesday: Upma, Tomato Chutney, Banana, Filter Coffee
      [11, 12, 13, 14, 7], // Thursday: Aloo Paratha, Curd, Pickle, Butter, Chai
      [15, 1, 2, 3],     // Friday: Masala Dosa, Sambar, Chutney, Filter Coffee
      [16, 14, 17, 18, 19], // Saturday: Bread Toast, Butter, Jam, Omelette, Milk
      [20, 21, 22, 7]    // Sunday: Puri, Aloo Sabzi, Halwa, Chai
    ],
    lunch: [
      [0, 1, 2, 3, 4, 5],   // Monday: Steamed Rice, Dal Tadka, Roti, Mix Veg, Salad, Papad
      [6, 7, 2, 8, 9],      // Tuesday: Jeera Rice, Rajma, Roti, Aloo Gobi, Raita
      [10, 11, 9, 4],       // Wednesday: Veg Biryani, Mirchi Ka Salan, Raita, Salad
      [0, 1, 12, 13, 12, 5], // Thursday: Rice, Sambar, Rasam, Poriyal, Curd, Papad
      [14, 0, 2, 15, 4],    // Friday: Chole, Rice, Roti, Boondi Raita, Salad
      [16, 17, 18, 2, 4],   // Saturday: Pulao, Dal Fry, Paneer Butter Masala, Roti, Salad
      [0, 19, 2, 20, 13]    // Sunday: Rice, Kadhi, Roti, Aloo Matar, Pickle
    ],
    dinner: [
      [2, 0, 3, 0, 4],     // Monday: Roti, Dal Makhani, Mix Veg, Rice, Salad
      [1, 2, 3],           // Tuesday: Fried Rice, Veg Manchurian, Hot & Sour Soup
      [0, 1, 12, 4, 5],    // Wednesday: Rice, Sambar, Rasam, Kootu, Papad
      [2, 5, 1, 6],        // Thursday: Roti, Shahi Paneer, Dal, Jeera Rice
      [0, 24, 2, 4],       // Friday: Rice, Egg Curry, Roti, Salad (non-veg day)
      [2, 6, 1, 0],        // Saturday: Roti, Palak Paneer, Dal Tadka, Rice
      [7, 9, 5, 13]        // Sunday: Mixed Veg Pulao, Raita, Papad, Pickle
    ]
  };

  let menuCount = 0;
  const startWeek = moment().subtract(6, 'months').startOf('week').add(1, 'day');
  const endWeek = moment().add(2, 'weeks').startOf('week').add(1, 'day');

  let currentWeek = startWeek.clone();
  while (currentWeek.isBefore(endWeek)) {
    const weekStart = currentWeek.clone().toDate();
    const weekEnd = currentWeek.clone().add(6, 'days').toDate();

    for (const mess of messes) {
      const messCategories = allCategories[mess._id.toString()];
      const messAdmin = messAdmins.find(a => a.mess_id.toString() === mess._id.toString());
      const messMenuItems = allMenuItems[mess._id.toString()];

      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];

        for (const mealType of mealTypes) {
          const category = messCategories.find(cat => cat.slug === mealType);
          if (!category) continue;

          // Get menu item IDs for this day's menu
          const combinationIndex = dayIndex % dailyMenuCombinations[mealType].length;
          const itemIndices = dailyMenuCombinations[mealType][combinationIndex];
          const menuItemIds = itemIndices
            .filter(idx => idx < messMenuItems[mealType].length)
            .map(idx => messMenuItems[mealType][idx]._id);

          // Get item names for legacy field
          const itemNames = itemIndices
            .filter(idx => idx < menuItemDefinitions[mealType].length)
            .map(idx => menuItemDefinitions[mealType][idx].name);

          await WeeklyMenu.create({
            mess_id: mess._id,
            week_start_date: weekStart,
            week_end_date: weekEnd,
            day: day,
            category_id: category._id,
            menu_items: menuItemIds,
            items: itemNames,
            special_items: dayIndex === 6 ? ['Special Dessert'] : (dayIndex === 3 ? ['Papad', 'Pickle'] : []),
            nutritional_info: {
              calories: mealType === 'breakfast' ? randomBetween(350, 500) :
                       mealType === 'lunch' ? randomBetween(550, 750) : randomBetween(450, 650),
              protein: randomBetween(10, 25),
              carbs: randomBetween(50, 100),
              fat: randomBetween(8, 20),
              fiber: randomBetween(4, 12)
            },
            is_veg: !(dayIndex === 4 || dayIndex === 5),
            allergen_info: dayIndex % 3 === 0 ? ['dairy'] : (dayIndex % 4 === 0 ? ['nuts'] : []),
            price: mealType === 'breakfast' ? 25 : mealType === 'lunch' ? 50 : 40,
            created_by: messAdmin ? messAdmin._id : superAdmin._id,
            is_active: true,
            notes: `Menu for ${mess.name} - ${day} ${mealType}`
          });
          menuCount++;
        }
      }
    }
    currentWeek.add(1, 'week');
  }
  logger.success(`Created ${menuCount} weekly menu entries`);

  // ========================================
  // CREATE ATTENDANCE RECORDS (6 months)
  // ========================================
  logger.info('Creating attendance records (this may take a while)...');

  const attendanceRecords = [];
  const today = moment().tz('Asia/Kolkata');
  const attendanceStartDate = moment().subtract(6, 'months').startOf('day');

  const getActiveSubscription = (userId, date) => {
    return subscriptions.find(sub =>
      sub.user_id.toString() === userId.toString() &&
      moment(date).isBetween(moment(sub.start_date), moment(sub.end_date), 'day', '[]') &&
      (sub.status === 'active' || sub.status === 'expired')
    );
  };

  let attendanceCount = 0;
  let currentDate = attendanceStartDate.clone();

  while (currentDate.isSameOrBefore(today)) {
    const dayName = currentDate.format('dddd').toLowerCase();
    const pattern = attendancePatterns[dayName];

    for (const user of users) {
      if (user.status !== 'active') continue;

      const subscription = getActiveSubscription(user._id, currentDate.toDate());
      if (!subscription) continue;

      const mealsIncluded = subscription.meals_included;

      for (const mealType of mealTypes) {
        if (!mealsIncluded[mealType]) continue;

        const attendanceChance = pattern[mealType] + randomBetween(-10, 10);
        const willAttend = Math.random() * 100 < attendanceChance;

        if (willAttend) {
          const mealHour = mealType === 'breakfast' ? randomBetween(7, 9) :
                          mealType === 'lunch' ? randomBetween(12, 14) : randomBetween(19, 21);
          const mealMinute = randomBetween(0, 59);

          const scanTime = currentDate.clone()
            .hour(mealHour)
            .minute(mealMinute)
            .second(randomBetween(0, 59));

          const mess = messes.find(m => m._id.toString() === user.mess_id.toString());

          attendanceRecords.push({
            user_id: user._id,
            mess_id: user.mess_id,
            subscription_id: subscription._id,
            scan_date: currentDate.toDate(),
            meal_type: mealType,
            scan_time: scanTime.toDate(),
            qr_code: `QR_${currentDate.format('YYYYMMDD')}_${user._id}_${mealType}`,
            geo_location: {
              latitude: (mess?.latitude || 26.9124) + (Math.random() - 0.5) * 0.002,
              longitude: (mess?.longitude || 75.7873) + (Math.random() - 0.5) * 0.002
            },
            distance_from_mess: randomBetween(5, mess?.radius_meters || 200),
            device_info: {
              userAgent: randomElement([
                'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
                'Mozilla/5.0 (Linux; Android 12)',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
              ]),
              platform: randomElement(['iOS', 'Android', 'Web'])
            },
            is_valid: Math.random() > 0.02,
            validation_errors: [],
            scan_method: randomElement(['qr', 'qr', 'qr', 'manual']),
            meal_consumed: true,
            special_meal: Math.random() > 0.95,
            ip_address: `192.168.${randomBetween(1, 10)}.${randomBetween(1, 254)}`
          });
          attendanceCount++;
        }
      }
    }

    currentDate.add(1, 'day');

    // Batch insert every 1000 records
    if (attendanceRecords.length >= 1000) {
      try {
        await Attendance.insertMany(attendanceRecords, { ordered: false });
      } catch (error) {
        if (error.code !== 11000) {
          logger.error('Attendance insert error:', error.message);
        }
      }
      attendanceRecords.length = 0;
      process.stdout.write(`\r[INFO] Created ${attendanceCount} attendance records...`);
    }
  }

  // Insert remaining records
  if (attendanceRecords.length > 0) {
    try {
      await Attendance.insertMany(attendanceRecords, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) {
        logger.error('Attendance insert error:', error.message);
      }
    }
  }
  console.log('');
  logger.success(`Created ${attendanceCount} attendance records`);

  // ========================================
  // CREATE MEAL CONFIRMATIONS (Last 30 days)
  // ========================================
  const confirmations = [];
  const confirmationStartDate = moment().subtract(30, 'days').startOf('day');
  let confirmationDate = confirmationStartDate.clone();

  while (confirmationDate.isSameOrBefore(today)) {
    for (const user of users.slice(0, 30)) {
      if (user.status !== 'active') continue;

      const subscription = getActiveSubscription(user._id, confirmationDate.toDate());
      if (!subscription) continue;

      for (const mealType of mealTypes) {
        if (!subscription.meals_included[mealType]) continue;

        if (Math.random() > 0.3) {
          confirmations.push({
            user_id: user._id,
            mess_id: user.mess_id,
            subscription_id: subscription._id,
            date: confirmationDate.toDate(),
            meal_type: mealType,
            is_confirmed: Math.random() > 0.15,
            confirmed_at: confirmationDate.clone().subtract(randomBetween(1, 12), 'hours').toDate(),
            confirmation_deadline: confirmationDate.clone().subtract(2, 'hours').toDate(),
            special_request: Math.random() > 0.9 ? 'Extra rice please' : null
          });
        }
      }
    }
    confirmationDate.add(1, 'day');
  }

  if (confirmations.length > 0) {
    try {
      await MealConfirmation.insertMany(confirmations, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) {
        logger.error('Confirmation insert error:', error.message);
      }
    }
  }
  logger.success(`Created ${confirmations.length} meal confirmations`);

  // ========================================
  // CREATE NOTIFICATIONS
  // ========================================
  const notifications = [];

  for (const user of users) {
    notifications.push({
      mess_id: user.mess_id,
      user_id: user._id,
      title: 'Welcome to Hostel Mess System!',
      message: 'Thank you for subscribing to our meal plan. Enjoy delicious and nutritious meals every day.',
      type: 'announcement',
      priority: 'medium',
      is_read: Math.random() > 0.3,
      metadata: { user_type: 'new_user' },
      sent_at: moment().subtract(randomBetween(1, 180), 'days').toDate(),
      created_by: superAdmin._id,
      status: 'sent'
    });
  }

  for (const mess of messes) {
    notifications.push({
      mess_id: mess._id,
      user_id: null,
      title: 'Weekly Menu Updated',
      message: `The menu for this week has been updated. Check out the new dishes!`,
      type: 'menu',
      priority: 'low',
      is_read: false,
      metadata: { mess_name: mess.name },
      sent_at: moment().subtract(randomBetween(1, 7), 'days').toDate(),
      created_by: messAdmins.find(a => a.mess_id.toString() === mess._id.toString())?._id || superAdmin._id,
      status: 'sent'
    });
  }

  notifications.push({
    user_id: null,
    title: 'System Maintenance Scheduled',
    message: 'The system will undergo maintenance on Sunday from 2 AM to 4 AM.',
    type: 'alert',
    priority: 'high',
    is_read: false,
    metadata: { maintenance_type: 'scheduled' },
    sent_at: moment().subtract(2, 'days').toDate(),
    created_by: superAdmin._id,
    status: 'sent'
  });

  await Notification.insertMany(notifications);
  logger.success(`Created ${notifications.length} notifications`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n');
  logger.info('='.repeat(60));
  logger.info('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  logger.info('='.repeat(60));
  console.log('\n');

  // Count menu items
  const totalMenuItems = Object.values(allMenuItems).reduce((total, messItems) => {
    return total + messItems.breakfast.length + messItems.lunch.length + messItems.dinner.length;
  }, 0);

  logger.info('DATA SUMMARY:');
  logger.info(`  - Messes: ${messes.length}`);
  logger.info(`  - Users: ${users.length + messAdmins.length + 1} (${users.length} subscribers, ${messAdmins.length} admins, 1 super admin)`);
  logger.info(`  - Subscriptions: ${subscriptions.length}`);
  logger.info(`  - Menu Items: ${totalMenuItems}`);
  logger.info(`  - Weekly Menus: ${menuCount}`);
  logger.info(`  - Attendance Records: ${attendanceCount}`);
  logger.info(`  - Meal Confirmations: ${confirmations.length}`);
  logger.info(`  - Notifications: ${notifications.length}`);

  console.log('\n');
  logger.info('='.repeat(60));
  logger.info('TEST CREDENTIALS');
  logger.info('='.repeat(60));
  console.log('\n');

  logger.info('SUPER ADMIN (All Messes):');
  logger.info('  Email: superadmin@hosteleats.com');
  logger.info('  Password: Admin@123');
  console.log('');

  logger.info('MESS ADMINS:');
  for (const admin of messAdmins) {
    logger.info(`  ${admin.full_name}:`);
    logger.info(`    Email: ${admin.email}`);
    logger.info(`    Password: Admin@123`);
  }
  console.log('');

  logger.info('SAMPLE TEST USERS:');
  for (let i = 0; i < Math.min(5, users.length); i++) {
    logger.info(`  ${users[i].full_name}:`);
    logger.info(`    Email: ${users[i].email}`);
    logger.info(`    Password: User@123`);
  }

  console.log('\n');
  logger.info('='.repeat(60));
  console.log('\n');
}

// Run seeder
seedDatabase();
