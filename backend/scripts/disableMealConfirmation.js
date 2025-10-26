const mongoose = require('mongoose');
const Mess = require('../src/models/Mess');
require('dotenv').config();

async function disableMealConfirmation(messCode) {
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

    // Update settings to disable meal confirmation
    if (!mess.settings) {
      mess.settings = {};
    }

    mess.settings.allow_meal_confirmation = false;
    await mess.save();

    console.log(`✅ Meal confirmation disabled for ${mess.name}`);
    console.log('Users can now scan QR codes directly without confirming meals first.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const messCode = process.argv[2] || 'MESS-A';
disableMealConfirmation(messCode);
