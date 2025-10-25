require('dotenv').config();
const { connectDB, disconnectDB } = require('../../config/mongodb');
const { Mess, User, Subscription, WeeklyMenu, Notification, Attendance } = require('../../models');

// Use console.log for verification script
const logger = {
  info: (msg) => console.log(`✓ ${msg}`),
  error: (msg, ...args) => console.error(`✗ ${msg}`, ...args),
  warn: (msg) => console.log(`⚠ ${msg}`),
  success: (msg) => console.log(`\n🎉 ${msg}\n`)
};

async function verifySetup() {
  try {
    console.log('\n=================================');
    console.log('DATABASE SETUP VERIFICATION');
    console.log('=================================\n');

    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB successfully');

    // Check collections exist
    console.log('\n--- Checking Collections ---');
    const collections = await require('mongoose').connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const requiredCollections = ['messes', 'users', 'subscriptions', 'weekly_menus', 'notifications', 'attendance_logs'];
    for (const collection of requiredCollections) {
      if (collectionNames.includes(collection)) {
        logger.info(`Collection '${collection}' exists`);
      } else {
        logger.warn(`Collection '${collection}' not found (will be created on first insert)`);
      }
    }

    // Check messes
    console.log('\n--- Checking Messes ---');
    const messCount = await Mess.countDocuments();
    logger.info(`Found ${messCount} mess(es)`);

    if (messCount > 0) {
      const messes = await Mess.find({}).select('name code status capacity latitude longitude radius_meters');
      messes.forEach(mess => {
        console.log(`  • ${mess.name} (${mess.code})`);
        console.log(`    Status: ${mess.status}`);
        console.log(`    Capacity: ${mess.capacity}`);
        console.log(`    Location: ${mess.latitude}, ${mess.longitude}`);
        console.log(`    Geofence Radius: ${mess.radius_meters}m`);
      });
    } else {
      logger.warn('No messes found. Run "npm run db:seed" to create test data.');
    }

    // Check users by role
    console.log('\n--- Checking Users ---');
    const totalUsers = await User.countDocuments();
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    const messAdminCount = await User.countDocuments({ role: 'mess_admin' });
    const subscriberCount = await User.countDocuments({ role: 'subscriber' });

    logger.info(`Total Users: ${totalUsers}`);
    console.log(`  • Super Admins: ${superAdminCount}`);
    console.log(`  • Mess Admins: ${messAdminCount}`);
    console.log(`  • Subscribers: ${subscriberCount}`);

    if (superAdminCount > 0) {
      const superAdmins = await User.find({ role: 'super_admin' }).select('full_name email');
      console.log('\n  Super Admin Accounts:');
      superAdmins.forEach(admin => {
        console.log(`    - ${admin.full_name} (${admin.email})`);
      });
    } else {
      logger.warn('  No super admin found! Run "npm run db:seed:production" for production.');
    }

    if (messAdminCount > 0) {
      const messAdmins = await User.find({ role: 'mess_admin' }).select('full_name email').populate('mess_id', 'name');
      console.log('\n  Mess Admin Accounts:');
      messAdmins.forEach(admin => {
        console.log(`    - ${admin.full_name} (${admin.email}) - ${admin.mess_id?.name || 'No Mess'}`);
      });
    }

    // Check subscriptions
    console.log('\n--- Checking Subscriptions ---');
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const totalSubscriptions = await Subscription.countDocuments();
    logger.info(`Active Subscriptions: ${activeSubscriptions} / ${totalSubscriptions}`);

    if (totalSubscriptions > 0) {
      const subsByMess = await Subscription.aggregate([
        {
          $lookup: {
            from: 'messes',
            localField: 'mess_id',
            foreignField: '_id',
            as: 'mess'
          }
        },
        { $unwind: '$mess' },
        {
          $group: {
            _id: '$mess.name',
            count: { $sum: 1 }
          }
        }
      ]);

      if (subsByMess.length > 0) {
        console.log('\n  Subscriptions per Mess:');
        subsByMess.forEach(sub => {
          console.log(`    - ${sub._id}: ${sub.count} subscription(s)`);
        });
      }
    }

    // Check menus
    console.log('\n--- Checking Menus ---');
    const menuCount = await WeeklyMenu.countDocuments();
    logger.info(`Total Menu Items: ${menuCount}`);

    if (menuCount > 0) {
      const menusByMess = await WeeklyMenu.aggregate([
        {
          $lookup: {
            from: 'messes',
            localField: 'mess_id',
            foreignField: '_id',
            as: 'mess'
          }
        },
        { $unwind: '$mess' },
        {
          $group: {
            _id: '$mess.name',
            count: { $sum: 1 }
          }
        }
      ]);

      if (menusByMess.length > 0) {
        console.log('\n  Menu Items per Mess:');
        menusByMess.forEach(menu => {
          console.log(`    - ${menu._id}: ${menu.count} item(s)`);
        });
      }
    }

    // Check attendance
    console.log('\n--- Checking Attendance ---');
    const attendanceCount = await Attendance.countDocuments();
    logger.info(`Total Attendance Records: ${attendanceCount}`);

    if (attendanceCount > 0) {
      const recentAttendance = await Attendance.countDocuments({
        scan_date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      logger.info(`Attendance in last 7 days: ${recentAttendance}`);
    }

    // Check notifications
    console.log('\n--- Checking Notifications ---');
    const notificationCount = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ is_read: false });
    logger.info(`Notifications: ${notificationCount} (${unreadNotifications} unread)`);

    // Check indexes
    console.log('\n--- Checking Database Indexes ---');
    const models = [
      { name: 'Mess', model: Mess },
      { name: 'User', model: User },
      { name: 'Subscription', model: Subscription },
      { name: 'WeeklyMenu', model: WeeklyMenu },
      { name: 'Attendance', model: Attendance },
      { name: 'Notification', model: Notification }
    ];

    for (const { name, model } of models) {
      try {
        const indexes = await model.collection.getIndexes();
        logger.info(`${name} has ${Object.keys(indexes).length} index(es)`);
      } catch (error) {
        logger.warn(`Could not check indexes for ${name}`);
      }
    }

    // Configuration check
    console.log('\n--- Environment Configuration ---');
    logger.info(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`MongoDB URI: ${process.env.MONGODB_URI ? '✓ Configured' : '✗ Not set'}`);
    logger.info(`JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Not set'}`);
    logger.info(`Server Port: ${process.env.PORT || 5000}`);

    // Final summary
    console.log('\n=================================');
    console.log('VERIFICATION SUMMARY');
    console.log('=================================');

    const checks = [];

    if (messCount > 0) {
      checks.push('✓ Messes configured');
    } else {
      checks.push('✗ No messes found');
    }

    if (superAdminCount > 0) {
      checks.push('✓ Super admin exists');
    } else {
      checks.push('✗ No super admin');
    }

    if (totalUsers > 0) {
      checks.push(`✓ ${totalUsers} user(s) in system`);
    } else {
      checks.push('✗ No users found');
    }

    if (activeSubscriptions > 0) {
      checks.push(`✓ ${activeSubscriptions} active subscription(s)`);
    }

    if (menuCount > 0) {
      checks.push(`✓ ${menuCount} menu item(s)`);
    }

    checks.forEach(check => console.log(`  ${check}`));

    console.log('\n');

    if (messCount === 0 || totalUsers === 0) {
      console.log('⚠️  RECOMMENDATION: Run "npm run db:seed" to populate test data\n');
    } else {
      logger.success('Database setup is complete and ready!');
    }

    console.log('Test Credentials (if seeded):');
    console.log('  Super Admin: superadmin@hosteleats.com / admin123');
    console.log('  Mess A Admin: admin-a@hosteleats.com / admin123');
    console.log('  Mess B Admin: admin-b@hosteleats.com / admin123');
    console.log('  Test User: user1@example.com / user123\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Verification failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run verification
verifySetup();
