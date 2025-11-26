require('dotenv').config();
const mongoose = require('mongoose');
const WeeklyMenu = require('../src/models/WeeklyMenu');
const MenuCategory = require('../src/models/MenuCategory');
const MenuItem = require('../src/models/MenuItem');
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

    // Get or create menu categories for this mess
    let categories = await MenuCategory.find({ mess_id: mess._id, deleted_at: null });

    if (categories.length === 0) {
      console.log('Creating default menu categories...');
      categories = await MenuCategory.create([
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
          is_active: true
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
          is_active: true
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
          is_active: true
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
          is_active: true
        }
      ]);
      console.log('Created menu categories');
    }

    // Create category lookup
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat;
    });

    // Clear existing menu for this mess
    await WeeklyMenu.deleteMany({ mess_id: mess._id });
    console.log('Cleared existing weekly menu');

    // Calculate current week (ISO week starts on Monday)
    const weekStart = moment().startOf('isoWeek').toDate();
    const weekEnd = moment().endOf('isoWeek').toDate();

    const menuData = [
      // Monday
      { day: 'monday', category: 'breakfast', items: ['Idli', 'Sambar', 'Coconut Chutney', 'Tea/Coffee'], notes: 'South Indian special' },
      { day: 'monday', category: 'lunch', items: ['Rice', 'Dal Tadka', 'Mixed Vegetable', 'Chapati', 'Pickle'], notes: '' },
      { day: 'monday', category: 'dinner', items: ['Chapati', 'Paneer Butter Masala', 'Jeera Rice', 'Salad'], notes: 'Paneer special' },

      // Tuesday
      { day: 'tuesday', category: 'breakfast', items: ['Paratha', 'Curd', 'Pickle', 'Tea/Coffee'], notes: '' },
      { day: 'tuesday', category: 'lunch', items: ['Rice', 'Rajma Masala', 'Aloo Gobi', 'Chapati'], notes: 'Rajma day' },
      { day: 'tuesday', category: 'dinner', items: ['Chapati', 'Dal Makhani', 'Vegetable Pulao', 'Raita'], notes: '' },

      // Wednesday
      { day: 'wednesday', category: 'breakfast', items: ['Dosa', 'Sambar', 'Chutney', 'Tea/Coffee'], notes: 'Crispy dosa' },
      { day: 'wednesday', category: 'lunch', items: ['Rice', 'Chole', 'Bhindi Fry', 'Chapati'], notes: '' },
      { day: 'wednesday', category: 'dinner', items: ['Chapati', 'Kadai Paneer', 'Fried Rice', 'Soup'], notes: 'Chinese style' },

      // Thursday
      { day: 'thursday', category: 'breakfast', items: ['Poha', 'Jalebi', 'Tea/Coffee'], notes: 'Traditional breakfast' },
      { day: 'thursday', category: 'lunch', items: ['Rice', 'Dal Fry', 'Aloo Matar', 'Chapati'], notes: '' },
      { day: 'thursday', category: 'dinner', items: ['Chapati', 'Mixed Veg Curry', 'Pulao', 'Salad'], notes: '' },

      // Friday
      { day: 'friday', category: 'breakfast', items: ['Upma', 'Banana', 'Tea/Coffee'], notes: '' },
      { day: 'friday', category: 'lunch', items: ['Rice', 'Sambar', 'Cabbage Poriyal', 'Chapati'], notes: 'South Indian thali' },
      { day: 'friday', category: 'dinner', items: ['Chapati', 'Shahi Paneer', 'Jeera Rice', 'Sweet'], notes: 'Special Friday dinner' },

      // Saturday
      { day: 'saturday', category: 'breakfast', items: ['Aloo Paratha', 'Curd', 'Butter', 'Tea/Coffee'], notes: 'Weekend special' },
      { day: 'saturday', category: 'lunch', items: ['Rice', 'Kadhi', 'Palak Paneer', 'Chapati'], notes: '' },
      { day: 'saturday', category: 'dinner', items: ['Chapati', 'Malai Kofta', 'Veg Biryani', 'Raita'], notes: 'Biryani night' },

      // Sunday
      { day: 'sunday', category: 'breakfast', items: ['Chole Bhature', 'Lassi', 'Pickle'], notes: 'Sunday special' },
      { day: 'sunday', category: 'lunch', items: ['Rice', 'Dal Makhani', 'Mix Veg', 'Chapati', 'Ice Cream'], notes: 'Sweet treat' },
      { day: 'sunday', category: 'dinner', items: ['Chapati', 'Matar Paneer', 'Pulao', 'Salad'], notes: '' },
    ];

    // Insert menu items using the new schema structure
    const menuItems = menuData.map(item => {
      const category = categoryMap[item.category];
      if (!category) {
        console.warn(`Category not found: ${item.category}`);
        return null;
      }

      return {
        mess_id: mess._id,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        day: item.day,
        category_id: category._id,
        menu_items: [], // Will be populated if MenuItem records exist
        items: item.items, // Legacy field for backward compatibility
        special_items: [],
        is_active: true,
        created_by: admin._id,
        price: 0,
        is_veg: true,
        notes: item.notes,
        nutritional_info: {
          calories: item.category === 'breakfast' ? 400 : item.category === 'lunch' ? 600 : 500,
          protein: item.category === 'breakfast' ? 10 : item.category === 'lunch' ? 20 : 15,
          carbs: item.category === 'breakfast' ? 60 : item.category === 'lunch' ? 80 : 70,
          fat: item.category === 'breakfast' ? 10 : item.category === 'lunch' ? 15 : 12,
          fiber: item.category === 'breakfast' ? 5 : item.category === 'lunch' ? 8 : 6
        }
      };
    }).filter(Boolean);

    await WeeklyMenu.insertMany(menuItems);
    console.log(`✅ Seeded ${menuItems.length} menu items for mess: ${mess.name}`);
    console.log(`📅 Week: ${moment(weekStart).format('YYYY-MM-DD')} to ${moment(weekEnd).format('YYYY-MM-DD')}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding menu:', error);
    process.exit(1);
  }
}

seedMenu();
