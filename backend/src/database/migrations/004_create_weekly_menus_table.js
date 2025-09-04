'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('weekly_menus', {
      menu_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      day: {
        type: Sequelize.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        allowNull: false
      },
      meal_type: {
        type: Sequelize.ENUM('breakfast', 'lunch', 'dinner'),
        allowNull: false
      },
      items: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'JSON array of menu items'
      },
      special_note: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      week_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('weekly_menus', ['day', 'meal_type']);
    await queryInterface.addIndex('weekly_menus', ['is_active']);
    await queryInterface.addIndex('weekly_menus', ['week_start_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('weekly_menus');
  }
};