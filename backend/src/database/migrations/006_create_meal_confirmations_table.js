'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('meal_confirmations', {
      confirmation_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      meal_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      meal_type: {
        type: Sequelize.ENUM('breakfast', 'lunch', 'dinner'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('confirmed', 'cancelled', 'attended'),
        defaultValue: 'confirmed'
      },
      confirmed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('meal_confirmations', ['user_id']);
    await queryInterface.addIndex('meal_confirmations', ['meal_date', 'meal_type']);
    await queryInterface.addIndex('meal_confirmations', {
      unique: true,
      fields: ['user_id', 'meal_date', 'meal_type'],
      name: 'unique_user_meal_confirmation'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('meal_confirmations');
  }
};