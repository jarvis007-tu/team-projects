require('dotenv').config();
const { connectDB, disconnectDB } = require('../../config/mongodb');
const { User } = require('../../models');
const logger = require('../../utils/logger');

async function seedProduction() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB for production seeding');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@hosteleats.com' });

    if (existingAdmin) {
      logger.warn('Admin user already exists. Skipping creation.');
      await disconnectDB();
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      full_name: 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@hosteleats.com',
      phone: process.env.ADMIN_PHONE || '9876543210',
      password: process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe@2024',
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

    logger.info('Production admin user created successfully!');
    logger.info('\n=== ADMIN CREDENTIALS ===');
    logger.info(`Email: ${admin.email}`);
    logger.info(`Phone: ${admin.phone}`);
    logger.info('Password: [Set via ADMIN_DEFAULT_PASSWORD env variable]');
    logger.info('IMPORTANT: Please change the password after first login!');
    logger.info('=========================\n');

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
