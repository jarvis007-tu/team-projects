require('dotenv').config();
const { connectDB, disconnectDB } = require('../../config/mongodb');
const { Mess, User, MenuCategory } = require('../../models');
const logger = require('../../utils/logger');

async function seedProduction() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB for production seeding');

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
      logger.info('Default mess created successfully!');

      // Initialize default menu categories for the new mess
      await MenuCategory.initializeDefaults(defaultMess._id, defaultMess._id);
      logger.info('Default menu categories created for the mess');
    } else {
      defaultMess = existingMess;
      logger.info('Using existing mess for admin user');

      // Check if categories exist, if not create them
      const categoriesExist = await MenuCategory.countDocuments({ mess_id: defaultMess._id });
      if (categoriesExist === 0) {
        await MenuCategory.initializeDefaults(defaultMess._id, defaultMess._id);
        logger.info('Default menu categories created for existing mess');
      }
    }

    // Check if super admin already exists
    const existingAdmin = await User.findOne({
      email: process.env.ADMIN_EMAIL || 'admin@hosteleats.com',
      role: 'super_admin'
    });

    if (existingAdmin) {
      logger.warn('Super admin user already exists. Skipping creation.');
      await disconnectDB();
      process.exit(0);
    }

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

    logger.info('Production super admin user created successfully!');
    logger.info('\n=== PRODUCTION SETUP COMPLETE ===');
    logger.info(`Mess Name: ${defaultMess.name}`);
    logger.info(`Mess Code: ${defaultMess.code}`);
    logger.info('\n=== ADMIN CREDENTIALS ===');
    logger.info(`Email: ${admin.email}`);
    logger.info(`Phone: ${admin.phone}`);
    logger.info(`Role: super_admin`);
    logger.info('Password: [Set via ADMIN_DEFAULT_PASSWORD env variable]');
    logger.info('\nIMPORTANT: Please change the password after first login!');
    logger.info('IMPORTANT: Update mess coordinates in Admin Panel for accurate geofencing!');
    logger.info('==================================\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Production seeding failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run production seeder
seedProduction();
