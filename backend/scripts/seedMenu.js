require('dotenv').config();
const mongoose = require('mongoose');
const WeeklyMenu = require('../src/models/WeeklyMenu');
const Mess = require('../src/models/Mess');
const User = require('../src/models/User');
const moment = require('moment');

async function seedMenu() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_dev');
    console.log('Connected to MongoDB');

    // Get first mess and admin
    const mess = await Mess.findOne({});
    const admin = await User.findOne({ role: { $in: ['super_admin', 'mess_admin'] } });

    if (!mess || !admin) {
      console.error('No mess or admin found. Please run seed.js first.');
      process.exit(1);
    }

    // Clear existing menu
    await WeeklyMenu.deleteMany({});
    console.log('Cleared existing menu');

    // Calculate current week
    const weekStart = moment().startOf('week').add(1, 'day'); // Monday
    const weekEnd = moment(weekStart).add(6, 'days');

    const menuData = [
      // Monday
      { day: 'monday', meal_type: 'breakfast', items: ['Idli', 'Sambar', 'Coconut Chutney', 'Tea/Coffee'], notes: 'South Indian special' },
      { day: 'monday', meal_type: 'lunch', items: ['Rice', 'Dal Tadka', 'Mixed Vegetable', 'Chapati', 'Pickle'], notes: '' },
      { day: 'monday', meal_type: 'dinner', items: ['Chapati', 'Paneer Butter Masala', 'Jeera Rice', 'Salad'], notes: 'Paneer special' },

      // Tuesday
      { day: 'tuesday', meal_type: 'breakfast', items: ['Paratha', 'Curd', 'Pickle', 'Tea/Coffee'], notes: '' },
      { day: 'tuesday', meal_type: 'lunch', items: ['Rice', 'Rajma Masala', 'Aloo Gobi', 'Chapati'], notes: 'Rajma day' },
      { day: 'tuesday', meal_type: 'dinner', items: ['Chapati', 'Dal Makhani', 'Vegetable Pulao', 'Raita'], notes: '' },

      // Wednesday
      { day: 'wednesday', meal_type: 'breakfast', items: ['Dosa', 'Sambar', 'Chutney', 'Tea/Coffee'], notes: 'Crispy dosa' },
      { day: 'wednesday', meal_type: 'lunch', items: ['Rice', 'Chole', 'Bhindi Fry', 'Chapati'], notes: '' },
      { day: 'wednesday', meal_type: 'dinner', items: ['Chapati', 'Kadai Paneer', 'Fried Rice', 'Soup'], notes: 'Chinese style' },

      // Thursday
      { day: 'thursday', meal_type: 'breakfast', items: ['Poha', 'Jalebi', 'Tea/Coffee'], notes: 'Traditional breakfast' },
      { day: 'thursday', meal_type: 'lunch', items: ['Rice', 'Dal Fry', 'Aloo Matar', 'Chapati'], notes: '' },
      { day: 'thursday', meal_type: 'dinner', items: ['Chapati', 'Mixed Veg Curry', 'Pulao', 'Salad'], notes: '' },

      // Friday
      { day: 'friday', meal_type: 'breakfast', items: ['Upma', 'Banana', 'Tea/Coffee'], notes: '' },
      { day: 'friday', meal_type: 'lunch', items: ['Rice', 'Sambar', 'Cabbage Poriyal', 'Chapati'], notes: 'South Indian thali' },
      { day: 'friday', meal_type: 'dinner', items: ['Chapati', 'Shahi Paneer', 'Jeera Rice', 'Sweet'], notes: 'Special Friday dinner' },

      // Saturday
      { day: 'saturday', meal_type: 'breakfast', items: ['Aloo Paratha', 'Curd', 'Butter', 'Tea/Coffee'], notes: 'Weekend special' },
      { day: 'saturday', meal_type: 'lunch', items: ['Rice', 'Kadhi', 'Palak Paneer', 'Chapati'], notes: '' },
      { day: 'saturday', meal_type: 'dinner', items: ['Chapati', 'Malai Kofta', 'Veg Biryani', 'Raita'], notes: 'Biryani night' },

      // Sunday
      { day: 'sunday', meal_type: 'breakfast', items: ['Chole Bhature', 'Lassi', 'Pickle'], notes: 'Sunday special' },
      { day: 'sunday', meal_type: 'lunch', items: ['Rice', 'Dal Makhani', 'Mix Veg', 'Chapati', 'Ice Cream'], notes: 'Sweet treat' },
      { day: 'sunday', meal_type: 'dinner', items: ['Chapati', 'Matar Paneer', 'Pulao', 'Salad'], notes: '' },
    ];

    // Insert menu items
    const menuItems = menuData.map(item => ({
      ...item,
      mess_id: mess._id,
      week_start_date: weekStart.toDate(),
      week_end_date: weekEnd.toDate(),
      is_active: true,
      created_by: admin._id,
      price: 0,
      is_veg: true,
      nutritional_info: {
        calories: 450,
        protein: 12,
        carbs: 60,
        fat: 8,
        fiber: 5
      }
    }));

    await WeeklyMenu.insertMany(menuItems);
    console.log(`✅ Seeded ${menuItems.length} menu items for mess: ${mess.name}`);
    console.log(`📅 Week: ${weekStart.format('YYYY-MM-DD')} to ${weekEnd.format('YYYY-MM-DD')}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding menu:', error);
    process.exit(1);
  }
}

seedMenu();
