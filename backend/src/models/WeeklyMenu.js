const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WeeklyMenu = sequelize.define('WeeklyMenu', {
  menu_id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  week_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  week_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  day: {
    type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
    allowNull: false
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error('Items must be an array');
        }
      }
    }
  },
  special_items: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  nutritional_info: {
    type: DataTypes.JSON,
    defaultValue: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    }
  },
  is_veg: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allergen_info: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  created_by: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'weekly_menus',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['week_start_date', 'week_end_date']
    },
    {
      fields: ['day']
    },
    {
      fields: ['meal_type']
    },
    {
      fields: ['is_active']
    },
    {
      unique: true,
      name: 'idx_unique_menu',
      fields: ['week_start_date', 'day', 'meal_type']
    }
  ]
});

// Class methods
WeeklyMenu.getCurrentWeekMenu = async function() {
  const moment = require('moment-timezone');
  const startOfWeek = moment().tz('Asia/Kolkata').startOf('week');
  const endOfWeek = moment().tz('Asia/Kolkata').endOf('week');

  return await this.findAll({
    where: {
      week_start_date: {
        [sequelize.Op.gte]: startOfWeek.format('YYYY-MM-DD')
      },
      week_end_date: {
        [sequelize.Op.lte]: endOfWeek.format('YYYY-MM-DD')
      },
      is_active: true
    },
    order: [
      ['day', 'ASC'],
      ['meal_type', 'ASC']
    ]
  });
};

WeeklyMenu.getTodayMenu = async function() {
  const moment = require('moment-timezone');
  const today = moment().tz('Asia/Kolkata').format('dddd').toLowerCase();
  const startOfWeek = moment().tz('Asia/Kolkata').startOf('week');
  
  return await this.findAll({
    where: {
      day: today,
      week_start_date: {
        [sequelize.Op.lte]: moment().format('YYYY-MM-DD')
      },
      week_end_date: {
        [sequelize.Op.gte]: moment().format('YYYY-MM-DD')
      },
      is_active: true
    },
    order: [['meal_type', 'ASC']]
  });
};

module.exports = WeeklyMenu;