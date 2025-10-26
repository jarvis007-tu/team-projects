const mongoose = require('mongoose');
const Mess = require('../src/models/Mess'); // Import Mess model first for populate
const User = require('../src/models/User');
const Subscription = require('../src/models/Subscription');
const moment = require('moment');
require('dotenv').config();

async function checkUserSubscription(userEmail) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_db');
    console.log('Connected to MongoDB\n');

    const user = await User.findOne({ email: userEmail }).populate('mess_id');

    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      process.exit(1);
    }

    console.log(`User: ${user.full_name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Mess: ${user.mess_id?.name} (${user.mess_id?.code})`);
    console.log('');

    const today = moment().format('YYYY-MM-DD');
    console.log(`Today: ${today}\n`);

    const subscription = await Subscription.findOne({
      user_id: user._id,
      mess_id: user.mess_id,
      status: 'active',
      start_date: { $lte: today },
      end_date: { $gte: today }
    });

    if (subscription) {
      console.log('✅ Active subscription found:');
      console.log(`   Plan: ${subscription.plan_type}`);
      console.log(`   Start: ${subscription.start_date}`);
      console.log(`   End: ${subscription.end_date}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Meals per day: ${subscription.meals_per_day}`);
    } else {
      console.log('❌ No active subscription found');
      console.log('');

      // Check all subscriptions for this user
      const allSubs = await Subscription.find({ user_id: user._id });
      if (allSubs.length > 0) {
        console.log('All subscriptions for this user:');
        allSubs.forEach((sub, index) => {
          console.log(`\n${index + 1}. Plan: ${sub.plan_type}`);
          console.log(`   Start: ${sub.start_date}`);
          console.log(`   End: ${sub.end_date}`);
          console.log(`   Status: ${sub.status}`);
        });
      } else {
        console.log('No subscriptions found for this user.');
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const userEmail = process.argv[2] || 'user1@example.com';
checkUserSubscription(userEmail);
