const mongoose = require('mongoose');
const Mess = require('../models/Mess');
const User = require('../models/User');
const logger = require('../utils/logger');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Helper function to generate mess QR code
async function generateMessQRCode(mess) {
  try {
    const qrData = {
      type: 'MESS_QR',
      mess_id: mess._id.toString(),
      name: mess.name,
      code: mess.code,
      latitude: mess.latitude,
      longitude: mess.longitude,
      radius_meters: mess.radius_meters,
      generated_at: new Date().toISOString()
    };

    // Create signature for integrity
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
      .update(JSON.stringify(qrData))
      .digest('hex');

    qrData.signature = signature;

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 1,
      width: 400
    });

    return {
      qr_code: qrCodeDataURL,
      qr_data: qrData
    };
  } catch (error) {
    logger.error('Error generating mess QR code:', error);
    throw error;
  }
}

class MessController {
  // Create a new mess (super_admin only)
  async createMess(req, res) {
    try {
      const {
        name,
        code,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        radius_meters,
        contact_phone,
        contact_email,
        capacity,
        settings,
        description,
        image_url
      } = req.body;

      // Check if mess code already exists
      const existingMess = await Mess.findOne({ code: code.toUpperCase() });
      if (existingMess) {
        return res.status(400).json({
          success: false,
          message: 'Mess code already exists'
        });
      }

      // Create new mess
      const mess = await Mess.create({
        name,
        code: code.toUpperCase(),
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        radius_meters: radius_meters || 200,
        contact_phone,
        contact_email,
        capacity,
        settings: settings || {},
        description,
        image_url,
        status: 'active'
      });

      // Generate QR code for the mess
      const qrCodeData = await generateMessQRCode(mess);
      mess.qr_code = qrCodeData.qr_code;
      mess.qr_data = qrCodeData.qr_data;
      await mess.save();

      logger.info(`Mess created: ${mess.name} (${mess.code}) by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Mess created successfully',
        data: mess
      });
    } catch (error) {
      logger.error('Error creating mess:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create mess'
      });
    }
  }

  // Get all messes
  async getAllMesses(req, res) {
    try {
      const { page = 1, limit = 10, status, city, state, search } = req.query;
      const offset = (page - 1) * limit;

      // Build filter
      const filter = { deleted_at: null };

      // Mess boundary check for mess_admin and subscriber
      // - super_admin: sees ALL messes
      // - mess_admin & subscriber: see only their assigned mess
      if (req.user.role !== 'super_admin') {
        if (!req.user.mess_id) {
          return res.status(403).json({
            success: false,
            message: 'No mess assigned to your account'
          });
        }
        filter._id = req.user.mess_id;
      }

      if (status) {
        filter.status = status;
      }

      if (city) {
        filter.city = { $regex: city, $options: 'i' };
      }

      if (state) {
        filter.state = { $regex: state, $options: 'i' };
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ];
      }

      // Get total count
      const total = await Mess.countDocuments(filter);

      // Get messes
      const messes = await Mess.find(filter)
        .sort({ created_at: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit));

      logger.debug(`Messes fetched by ${req.user.role}: ${messes.length} results`);

      res.json({
        success: true,
        data: {
          messes,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching messes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messes'
      });
    }
  }

  // Get mess by ID
  async getMessById(req, res) {
    try {
      const { mess_id } = req.params;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Mess boundary check for mess_admin and subscriber
      // - super_admin: can view any mess
      // - mess_admin & subscriber: can only view their assigned mess
      if (req.user.role !== 'super_admin') {
        if (!req.user.mess_id || req.user.mess_id.toString() !== mess_id) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this mess'
          });
        }
      }

      // Get user count
      const userCount = await User.countDocuments({
        mess_id: mess._id,
        deleted_at: null
      });

      const messData = mess.toJSON();
      messData.user_count = userCount;

      res.json({
        success: true,
        data: messData
      });
    } catch (error) {
      logger.error('Error fetching mess:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch mess'
      });
    }
  }

  // Update mess
  async updateMess(req, res) {
    try {
      const { mess_id } = req.params;
      const updateData = req.body;

      // Don't allow code to be updated
      delete updateData.code;
      delete updateData.created_at;
      delete updateData.deleted_at;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Check if user is super_admin or admin of this mess
      if (req.user.role !== 'super_admin') {
        if (req.user.role !== 'mess_admin' || req.user.mess_id.toString() !== mess_id) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to update this mess'
          });
        }
      }

      // Update mess
      Object.assign(mess, updateData);
      await mess.save();

      logger.info(`Mess updated: ${mess.name} (${mess.code}) by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Mess updated successfully',
        data: mess
      });
    } catch (error) {
      logger.error('Error updating mess:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update mess'
      });
    }
  }

  // Delete mess (soft delete)
  async deleteMess(req, res) {
    try {
      const { mess_id } = req.params;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Check if mess has active users
      const activeUsers = await User.countDocuments({
        mess_id: mess._id,
        status: 'active',
        deleted_at: null
      });

      if (activeUsers > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete mess with ${activeUsers} active users. Please deactivate users first.`
        });
      }

      // Soft delete
      await mess.softDelete();

      logger.info(`Mess deleted: ${mess.name} (${mess.code}) by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Mess deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting mess:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete mess'
      });
    }
  }

  // Get mess statistics
  async getMessStats(req, res) {
    try {
      const { mess_id } = req.params;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Get statistics
      const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
        User.countDocuments({ mess_id: mess._id, deleted_at: null }),
        User.countDocuments({ mess_id: mess._id, status: 'active', deleted_at: null }),
        User.countDocuments({ mess_id: mess._id, status: 'inactive', deleted_at: null })
      ]);

      const capacityUtilization = ((activeUsers / mess.capacity) * 100).toFixed(2);

      res.json({
        success: true,
        data: {
          mess: mess.toJSON(),
          statistics: {
            total_users: totalUsers,
            active_users: activeUsers,
            inactive_users: inactiveUsers,
            capacity: mess.capacity,
            capacity_utilization: parseFloat(capacityUtilization),
            available_slots: mess.capacity - activeUsers
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching mess stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch mess statistics'
      });
    }
  }

  // Get all active messes (for dropdown)
  async getActiveMesses(req, res) {
    try {
      const messes = await Mess.find({
        status: 'active',
        deleted_at: null
      }).select('name code address city state latitude longitude')
        .sort({ name: 1 });

      res.json({
        success: true,
        data: messes
      });
    } catch (error) {
      logger.error('Error fetching active messes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active messes'
      });
    }
  }

  // Toggle mess status
  async toggleMessStatus(req, res) {
    try {
      const { mess_id } = req.params;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Toggle status
      mess.status = mess.status === 'active' ? 'inactive' : 'active';
      await mess.save();

      logger.info(`Mess status toggled: ${mess.name} (${mess.code}) to ${mess.status} by user ${req.user.id}`);

      res.json({
        success: true,
        message: `Mess ${mess.status === 'active' ? 'activated' : 'deactivated'} successfully`,
        data: mess
      });
    } catch (error) {
      logger.error('Error toggling mess status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle mess status'
      });
    }
  }

  // Update mess settings
  async updateMessSettings(req, res) {
    try {
      const { mess_id } = req.params;
      const { settings } = req.body;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'super_admin' && req.user.mess_id.toString() !== mess_id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this mess'
        });
      }

      // Update settings
      mess.settings = { ...mess.settings, ...settings };
      await mess.save();

      logger.info(`Mess settings updated: ${mess.name} (${mess.code}) by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Mess settings updated successfully',
        data: mess
      });
    } catch (error) {
      logger.error('Error updating mess settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update mess settings'
      });
    }
  }

  // Regenerate mess QR code
  async regenerateMessQR(req, res) {
    try {
      const { mess_id } = req.params;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'super_admin' && req.user.mess_id.toString() !== mess_id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this mess'
        });
      }

      // Regenerate QR code
      const qrCodeData = await generateMessQRCode(mess);
      mess.qr_code = qrCodeData.qr_code;
      mess.qr_data = qrCodeData.qr_data;
      await mess.save();

      logger.info(`Mess QR code regenerated: ${mess.name} (${mess.code}) by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Mess QR code regenerated successfully',
        data: {
          qr_code: mess.qr_code,
          qr_data: mess.qr_data
        }
      });
    } catch (error) {
      logger.error('Error regenerating mess QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate mess QR code'
      });
    }
  }

  // Get mess QR code
  async getMessQRCode(req, res) {
    try {
      const { mess_id } = req.params;

      const mess = await Mess.findOne({ _id: mess_id, deleted_at: null });

      if (!mess) {
        return res.status(404).json({
          success: false,
          message: 'Mess not found'
        });
      }

      // If QR code doesn't exist, generate it
      if (!mess.qr_code) {
        const qrCodeData = await generateMessQRCode(mess);
        mess.qr_code = qrCodeData.qr_code;
        mess.qr_data = qrCodeData.qr_data;
        await mess.save();
      }

      res.json({
        success: true,
        data: {
          qr_code: mess.qr_code,
          qr_data: mess.qr_data,
          mess_name: mess.name,
          mess_code: mess.code
        }
      });
    } catch (error) {
      logger.error('Error fetching mess QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch mess QR code'
      });
    }
  }
}

module.exports = new MessController();
