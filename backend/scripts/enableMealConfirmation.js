const mongoose = require('mongoose');
const Mess = require('../src/models/Mess');
require('dotenv').config();

async function enableMealConfirmation(messCode) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_db');
    console.log('Connected to MongoDB\n');

    const mess = await Mess.findOne({ code: messCode, deleted_at: null });

    if (!mess) {
      console.error(`Mess with code ${messCode} not found`);
      process.exit(1);
    }

    console.log(`Current settings for ${mess.name}:`);
    console.log(JSON.stringify(mess.settings, null, 2));
    console.log('');

    // Update settings to enable meal confirmation
    if (!mess.settings) {
      mess.settings = {};
    }

    mess.settings.allow_meal_confirmation = true;
    mess.settings.confirmation_deadline_hours = 2; // Users must confirm 2 hours before meal
    await mess.save();

    console.log(`✅ Meal confirmation enabled for ${mess.name}`);
    console.log(`⏰ Users must confirm ${mess.settings.confirmation_deadline_hours} hours before meal time.`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Users need to confirm meals in the app before meal time');
    console.log('   2. Then they can scan QR code at the mess');
    console.log('   3. This helps reduce food wastage!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const messCode = process.argv[2] || 'MESS-A';
enableMealConfirmation(messCode);
