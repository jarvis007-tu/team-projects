const bcrypt = require('bcryptjs');
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
      const skip = (page - 1) * limit;

      const queryConditions = {};

      if (search) {
        queryConditions.$or = [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      if (role) queryConditions.role = role;
      if (status) queryConditions.status = status;

      const [users, count] = await Promise.all([
        User.find(queryConditions)
          .select('-password')
          .limit(parseInt(limit))
          .skip(skip)
          .sort({ createdAt: -1 }),
        User.countDocuments(queryConditions)
      ]);

      res.json({
        success: true,
        data: {
          users,
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

      const user = await User.findById(id)
        .select('-password')
        .populate({
          path: 'subscriptions',
          match: { status: 'active' }
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
        $or: [{ email }, { phone }]
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

      const userResponse = user.toObject();
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
      delete updates._id;

      const user = await User.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
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

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.softDelete(); // Soft delete using plugin

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
            $or: [{ email }, { phone }]
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

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if phone is being changed and is unique
      if (phone && phone !== user.phone) {
        const existingPhone = await User.findOne({
          phone,
          _id: { $ne: userId }
        });

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'Phone number already in use'
          });
        }
      }

      user.full_name = full_name;
      user.phone = phone;
      await user.save();

      const userResponse = user.toObject();
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

      const user = await User.findById(userId).select('+password');

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
      user.password = hashedPassword;
      await user.save();

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

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Upload to S3 or local storage
      const imageUrl = await uploadToS3(req.file, 'profile-images');

      user.profile_image = imageUrl;
      await user.save();

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