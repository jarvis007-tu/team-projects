const mongoose = require('mongoose');
const User = require('../src/models/User');
const Mess = require('../src/models/Mess');
const MealConfirmation = require('../src/models/MealConfirmation');
const moment = require('moment');
require('dotenv').config();

async function createMealConfirmation(userEmail, mealType) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_db');
    console.log('Connected to MongoDB\n');

    const user = await User.findOne({ email: userEmail }).populate('mess_id');

    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      process.exit(1);
    }

    const today = moment().format('YYYY-MM-DD');

    // Check if confirmation already exists
    const existing = await MealConfirmation.findOne({
      user_id: user._id,
      mess_id: user.mess_id,
      meal_date: today,
      meal_type: mealType
    });

    if (existing) {
      console.log(`Meal confirmation already exists for ${mealType} on ${today}`);
      console.log(`Status: ${existing.status}`);

      if (existing.status !== 'confirmed') {
        existing.status = 'confirmed';
        await existing.save();
        console.log('✅ Updated status to confirmed');
      }
    } else {
      // Create new confirmation
      const confirmation = await MealConfirmation.create({
        user_id: user._id,
        mess_id: user.mess_id,
        meal_date: today,
        meal_type: mealType,
        status: 'confirmed',
        confirmed_at: new Date()
      });

      console.log(`✅ Meal confirmation created for ${user.full_name}`);
      console.log(`   Mess: ${user.mess_id.name}`);
      console.log(`   Meal: ${mealType}`);
      console.log(`   Date: ${today}`);
      console.log(`   Status: confirmed`);
      console.log('\n✨ User can now scan QR code for this meal!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const userEmail = process.argv[2] || 'user1@example.com';
const mealType = process.argv[3] || 'lunch'; // breakfast, lunch, or dinner

createMealConfirmation(userEmail, mealType);
