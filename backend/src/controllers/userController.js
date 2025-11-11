const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Mess = require('../models/Mess');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const { uploadToS3 } = require('../services/storageService');
const csvParser = require('csv-parse/sync');

class UserController {
  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, role, status, mess_id } = req.query;
      const skip = (page - 1) * limit;

      const queryConditions = { deleted_at: null };

      // Mess filtering based on user role
      if (req.user.role === 'super_admin') {
        // Super admin can view all messes or filter by specific mess
        if (mess_id) {
          queryConditions.mess_id = mess_id;
        }
      } else {
        // Mess admin and subscribers can only see their own mess users
        queryConditions.mess_id = req.user.mess_id;
      }

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
          .populate('mess_id', 'name code city')
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
        .populate('mess_id', 'name code city state address latitude longitude')
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

      // Check if user has permission to view this user
      if (req.user.role !== 'super_admin' &&
          req.user.role !== 'mess_admin' &&
          req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this user'
        });
      }

      // Mess boundary check
      if (req.user.role === 'mess_admin' &&
          user.mess_id._id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view users from other messes'
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
      const { full_name, email, phone, role = 'subscriber', password, mess_id } = req.body;

      // Determine which mess to assign user to
      let targetMessId = mess_id;

      if (req.user.role === 'super_admin') {
        // Super admin must specify mess_id
        if (!mess_id) {
          return res.status(400).json({
            success: false,
            message: 'Mess selection is required'
          });
        }
      } else if (req.user.role === 'mess_admin') {
        // Mess admin can only create users for their own mess
        targetMessId = req.user.mess_id;
        if (mess_id && mess_id !== req.user.mess_id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only create users for your own mess'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create users'
        });
      }

      // Validate mess exists and is active
      const mess = await Mess.findOne({
        _id: targetMessId,
        deleted_at: null
      });

      if (!mess) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mess'
        });
      }

      // Check mess capacity
      const currentUserCount = await User.countDocuments({
        mess_id: mess._id,
        status: 'active',
        deleted_at: null
      });

      if (currentUserCount >= mess.capacity) {
        return res.status(400).json({
          success: false,
          message: `Mess has reached maximum capacity (${mess.capacity} users)`
        });
      }

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

      // Create user (password will be hashed by pre-save hook)
      const user = await User.create({
        full_name,
        email,
        phone,
        role,
        mess_id: targetMessId,
        password: password, // Don't hash here - let the pre-save hook handle it
        status: 'active'
      });

      const userResponse = user.toObject();
      delete userResponse.password;

      logger.info(`User created: ${user._id} for mess ${mess.name} by admin ${req.user.id}`);

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

      // Find user first for permission checks
      const existingUser = await User.findById(id);

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Mess boundary check
      if (req.user.role === 'mess_admin' &&
          existingUser.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update users from your own mess'
        });
      }

      // Remove sensitive fields
      delete updates._id;

      // Only super_admin can change mess_id
      if (updates.mess_id && req.user.role !== 'super_admin') {
        delete updates.mess_id;
      }

      // Handle password update separately (will be hashed by pre-save hook)
      if (updates.password) {
        existingUser.password = updates.password;
        delete updates.password;
      }

      // Update other fields
      Object.assign(existingUser, updates);
      await existingUser.save();

      const user = existingUser.toObject();
      delete user.password;

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

      // Mess boundary check - mess_admin can only delete users from their own mess
      if (req.user.role === 'mess_admin' &&
          user.mess_id.toString() !== req.user.mess_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete users from your own mess'
        });
      }

      await user.softDelete(); // Soft delete using plugin

      logger.info(`User ${user._id} deleted by ${req.user.role}: ${req.user.user_id}`);

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

          // Generate default password (will be hashed by pre-save hook)
          const defaultPassword = `${phone}@hostel`;

          await User.create({
            full_name,
            email,
            phone,
            role,
            password: defaultPassword, // Don't hash here - let the pre-save hook handle it
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

      // Set new password (will be hashed by pre-save hook)
      user.password = newPassword;
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