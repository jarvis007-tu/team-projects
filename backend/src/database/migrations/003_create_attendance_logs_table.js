'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('attendance_logs', {
      attendance_id: {
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
      subscription_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'subscriptions',
          key: 'subscription_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      scan_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      meal_type: {
        type: Sequelize.ENUM('breakfast', 'lunch', 'dinner'),
        allowNull: false
      },
      scan_time: {
        type: Sequelize.DATE,
        allowNull: false
      },
      qr_code: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      geo_location: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON object with latitude, longitude, accuracy'
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      is_valid: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      validation_errors: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('attendance_logs', ['user_id']);
    await queryInterface.addIndex('attendance_logs', ['scan_date', 'meal_type']);
    await queryInterface.addIndex('attendance_logs', ['subscription_id']);
    await queryInterface.addIndex('attendance_logs', {
      unique: true,
      fields: ['user_id', 'scan_date', 'meal_type'],
      name: 'unique_user_meal_per_day'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('attendance_logs');
  }
};