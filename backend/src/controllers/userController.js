const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const { uploadToS3 } = require('../services/storageService');
const csvParser = require('csv-parse/sync');

class UserController {
  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;
      const offset = (page - 1) * limit;

      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ];
      }

      if (role) whereConditions.role = role;
      if (status) whereConditions.status = status;

      const { count, rows } = await User.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          users: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }

  // Get single user
  async getUser(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Subscription,
          as: 'subscriptions',
          where: { status: 'active' },
          required: false
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }
  }

  // Create new user (Admin only)
  async createUser(req, res) {
    try {
      const { full_name, email, phone, role = 'subscriber', password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { phone }]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or phone already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        full_name,
        email,
        phone,
        role,
        password: hashedPassword,
        status: 'active'
      });

      const userResponse = user.toJSON();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userResponse
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove sensitive fields
      delete updates.password;
      delete updates.user_id;

      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.update(updates);

      const userResponse = user.toJSON();
      delete userResponse.password;

      res.json({
        success: true,
        message: 'User updated successfully',
        data: userResponse
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  // Delete user (soft delete)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.destroy(); // Soft delete due to paranoid: true

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }

  // Bulk upload users via CSV
  async bulkUploadUsers(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const csvData = req.file.buffer.toString();
      const records = csvParser.parse(csvData, {
        columns: true,
        skip_empty_lines: true
      });

      const results = {
        success: [],
        failed: []
      };

      for (const record of records) {
        try {
          const { full_name, email, phone, role = 'subscriber' } = record;

          // Check if user exists
          const existingUser = await User.findOne({
            where: {
              [Op.or]: [{ email }, { phone }]
            }
          });

          if (existingUser) {
            results.failed.push({
              email,
              reason: 'User already exists'
            });
            continue;
          }

          // Generate default password
          const defaultPassword = `${phone}@hostel`;
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);

          await User.create({
            full_name,
            email,
            phone,
            role,
            password: hashedPassword,
            status: 'active'
          });

          results.success.push(email);
        } catch (err) {
          results.failed.push({
            email: record.email,
            reason: err.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Bulk upload completed',
        data: results
      });
    } catch (error) {
      logger.error('Error in bulk upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process bulk upload'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { full_name, phone } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if phone is being changed and is unique
      if (phone && phone !== user.phone) {
        const existingPhone = await User.findOne({
          where: { phone, user_id: { [Op.ne]: userId } }
        });

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'Phone number already in use'
          });
        }
      }

      await user.update({ full_name, phone });

      const userResponse = user.toJSON();
      delete userResponse.password;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: userResponse
      });
    } catch (error) {
      logger.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  // Upload profile image
  async uploadProfileImage(req, res) {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image uploaded'
        });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Upload to S3 or local storage
      const imageUrl = await uploadToS3(req.file, 'profile-images');

      await user.update({ profile_image: imageUrl });

      res.json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: { profile_image: imageUrl }
      });
    } catch (error) {
      logger.error('Error uploading profile image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile image'
      });
    }
  }
}

// Import and merge extensions
const userExtensions = require('./userControllerExtensions');
Object.assign(UserController.prototype, userExtensions);

module.exports = new UserController();