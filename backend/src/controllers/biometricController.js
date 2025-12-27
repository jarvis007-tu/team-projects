const { User, Biometric, Subscription, Attendance, Mess, MealConfirmation } = require('../models');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { getCurrentMealType } = require('../utils/messHelpers');
const crypto = require('crypto');
const moment = require('moment-timezone');
const geolib = require('geolib');

/**
 * Biometric Controller
 *
 * Handles WebAuthn-based biometric enrollment and verification for attendance.
 * As per Biometric Doc:
 * - Biometric data is NOT user data
 * - MongoDB User _id is the single source of truth
 * - No personal information stored in biometric system
 * - Biometric system performs matching, backend performs authorization
 */
class BiometricController {

  /**
   * Generate registration options for WebAuthn enrollment
   * Step 1 of enrollment: Generate challenge for client
   */
  async getEnrollmentOptions(req, res, next) {
    try {
      const userId = String(req.user.user_id || req.user._id);

      const user = await User.findById(userId).select('full_name email mess_id');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user already has active biometric
      const existingBiometric = await Biometric.findActiveByUserId(userId);
      if (existingBiometric) {
        throw new AppError('Biometric already enrolled. Please revoke existing enrollment first.', 409);
      }

      // Generate challenge (random bytes)
      const challenge = crypto.randomBytes(32).toString('base64url');

      // Store challenge temporarily (expires in 5 minutes)
      const challengeData = {
        challenge,
        userId,
        createdAt: Date.now()
      };

      // Store in memory or Redis (using global map for simplicity)
      if (!global.biometricChallenges) {
        global.biometricChallenges = new Map();
      }
      global.biometricChallenges.set(userId, challengeData);

      // Clean up old challenges after 5 minutes
      setTimeout(() => {
        global.biometricChallenges.delete(userId);
      }, 5 * 60 * 1000);

      // Get the origin from the request headers for proper RP ID
      const origin = req.get('origin') || req.get('referer') || '';
      let rpId = 'localhost';

      try {
        if (origin) {
          const url = new URL(origin);
          rpId = url.hostname;
        }
      } catch (e) {
        // Fallback to request hostname
        rpId = req.hostname || 'localhost';
      }

      // WebAuthn registration options - iOS/Safari compatible
      const registrationOptions = {
        challenge,
        rp: {
          name: 'Hostel Mess System',
          id: rpId
        },
        user: {
          id: Buffer.from(userId).toString('base64url'),
          name: user.email,
          displayName: user.full_name
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256 (preferred, works on all platforms)
          { alg: -257, type: 'public-key' }  // RS256 (fallback)
        ],
        timeout: 60000, // 60 seconds
        attestation: 'none', // We don't need attestation for our use case
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Required for iOS - use built-in biometric
          userVerification: 'required',        // Required for iOS biometric
          residentKey: 'discouraged',          // Better iOS compatibility
          requireResidentKey: false            // Explicit for older browsers
        },
        excludeCredentials: [] // No existing credentials to exclude
      };

      logger.info(`Biometric enrollment options generated for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Registration options generated',
        data: registrationOptions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete biometric enrollment
   * Step 2 of enrollment: Verify and store credential
   */
  async completeEnrollment(req, res, next) {
    try {
      const userId = String(req.user.user_id || req.user._id);
      const {
        credential_id,
        public_key,
        attestation_object,
        authenticator_data,
        client_data_json,
        device_info
      } = req.body;

      // Validate required fields
      if (!credential_id || !public_key) {
        throw new AppError('Missing required credential data', 400);
      }

      // Verify challenge
      if (!global.biometricChallenges || !global.biometricChallenges.has(userId)) {
        throw new AppError('Registration session expired. Please try again.', 400);
      }

      const challengeData = global.biometricChallenges.get(userId);

      // Verify challenge hasn't expired (5 minutes)
      if (Date.now() - challengeData.createdAt > 5 * 60 * 1000) {
        global.biometricChallenges.delete(userId);
        throw new AppError('Registration session expired. Please try again.', 400);
      }

      // Verify client data contains the correct challenge
      if (client_data_json) {
        try {
          const clientData = JSON.parse(Buffer.from(client_data_json, 'base64url').toString());
          if (clientData.challenge !== challengeData.challenge) {
            throw new AppError('Challenge mismatch. Please try again.', 400);
          }
        } catch (parseError) {
          logger.warn('Could not verify client data challenge:', parseError.message);
        }
      }

      // Clean up challenge
      global.biometricChallenges.delete(userId);

      // Check if credential ID already exists
      const existingCredential = await Biometric.findOne({ credential_id });
      if (existingCredential) {
        throw new AppError('This authenticator is already registered', 409);
      }

      // Check if user already has active biometric
      const existingBiometric = await Biometric.findActiveByUserId(userId);
      if (existingBiometric) {
        throw new AppError('Biometric already enrolled. Please revoke existing enrollment first.', 409);
      }

      // Create biometric record
      // Store attestation_object for iOS devices that don't provide getPublicKey()
      const biometric = await Biometric.create({
        user_id: userId,
        biometric_type: 'webauthn',
        credential_id,
        public_key,
        attestation_object: attestation_object || null, // Store for iOS compatibility
        device_id: device_info?.device_id || req.headers['x-device-id'] || 'unknown',
        authenticator_info: {
          aaguid: authenticator_data?.aaguid,
          device_type: device_info?.device_type || 'platform',
          transports: device_info?.transports || ['internal'],
          user_agent: req.headers['user-agent'],
          platform: device_info?.platform || 'unknown'
        },
        sign_count: authenticator_data?.signCount || 0,
        enrolled_at: new Date(),
        status: 'active'
      });

      logger.info(`Biometric enrolled successfully for user: ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Fingerprint enrolled successfully',
        data: {
          biometric_id: biometric._id,
          enrolled_at: biometric.enrolled_at,
          device_type: biometric.authenticator_info.device_type
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate authentication options for verification
   * Step 1 of verification: Generate challenge
   */
  async getVerificationOptions(req, res, next) {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        throw new AppError('User ID is required', 400);
      }

      // Find user's active biometric
      const biometric = await Biometric.findActiveByUserId(user_id);
      if (!biometric) {
        throw new AppError('No biometric enrolled for this user', 404);
      }

      // Generate challenge
      const challenge = crypto.randomBytes(32).toString('base64url');

      // Store challenge temporarily
      if (!global.biometricVerificationChallenges) {
        global.biometricVerificationChallenges = new Map();
      }

      const verificationData = {
        challenge,
        biometricId: biometric._id.toString(),
        userId: user_id,
        createdAt: Date.now()
      };

      global.biometricVerificationChallenges.set(challenge, verificationData);

      // Clean up after 2 minutes
      setTimeout(() => {
        global.biometricVerificationChallenges.delete(challenge);
      }, 2 * 60 * 1000);

      // Get the origin from the request headers for proper RP ID
      const origin = req.get('origin') || req.get('referer') || '';
      let rpId = 'localhost';

      try {
        if (origin) {
          const url = new URL(origin);
          rpId = url.hostname;
        }
      } catch (e) {
        rpId = req.hostname || 'localhost';
      }

      // WebAuthn authentication options
      const authenticationOptions = {
        challenge,
        timeout: 60000,
        rpId: rpId,
        userVerification: 'required',
        allowCredentials: [{
          id: biometric.credential_id,
          type: 'public-key',
          transports: biometric.authenticator_info?.transports || ['internal']
        }]
      };

      res.status(200).json({
        success: true,
        message: 'Verification options generated',
        data: authenticationOptions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify biometric and mark attendance
   * Main endpoint for biometric-based attendance
   */
  async verifyAndMarkAttendance(req, res, next) {
    try {
      const {
        credential_id,
        authenticator_data,
        client_data_json,
        signature,
        challenge,
        geo_location
      } = req.body;

      // Validate required fields
      if (!credential_id || !challenge) {
        throw new AppError('Missing required verification data', 400);
      }

      // Verify challenge exists
      if (!global.biometricVerificationChallenges ||
          !global.biometricVerificationChallenges.has(challenge)) {
        throw new AppError('Verification session expired. Please try again.', 400);
      }

      const verificationData = global.biometricVerificationChallenges.get(challenge);

      // Verify challenge hasn't expired (2 minutes)
      if (Date.now() - verificationData.createdAt > 2 * 60 * 1000) {
        global.biometricVerificationChallenges.delete(challenge);
        throw new AppError('Verification session expired. Please try again.', 400);
      }

      // Find biometric by credential ID
      const biometric = await Biometric.findByCredentialId(credential_id);
      if (!biometric) {
        throw new AppError('Biometric not found or revoked', 401);
      }

      // Verify biometric belongs to expected user
      if (biometric._id.toString() !== verificationData.biometricId) {
        throw new AppError('Credential mismatch', 401);
      }

      // Clean up challenge
      global.biometricVerificationChallenges.delete(challenge);

      // Get user details
      const user = await User.findById(biometric.user_id)
        .select('full_name email phone mess_id status')
        .populate('mess_id');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Authorization checks as per Biometric Doc Section 8
      // Check 1: User status
      if (user.status !== 'active') {
        throw new AppError(`User account is ${user.status}. Contact administrator.`, 403);
      }

      const mess = user.mess_id;
      if (!mess) {
        throw new AppError('User not associated with any mess', 400);
      }

      // Determine current meal type based on time
      const mealType = getCurrentMealType(mess);
      if (!mealType) {
        throw new AppError('No meal service active at this time', 400);
      }

      // Check subscription
      const today = moment().startOf('day').toDate();
      const subscription = await Subscription.findOne({
        user_id: user._id,
        mess_id: mess._id,
        status: 'active',
        payment_status: 'paid',
        start_date: { $lte: today },
        end_date: { $gte: today },
        deleted_at: null
      });

      if (!subscription) {
        throw new AppError('No active subscription found', 403);
      }

      // Check if meal is included in subscription
      // meals_included can be an object like { breakfast: true, lunch: true, dinner: false }
      // or an array like ['breakfast', 'lunch']
      const mealsIncluded = subscription.meals_included;
      const isMealIncluded = Array.isArray(mealsIncluded)
        ? mealsIncluded.includes(mealType)
        : mealsIncluded && mealsIncluded[mealType] === true;

      if (!isMealIncluded) {
        throw new AppError(`${mealType} is not included in your subscription`, 403);
      }

      // Validate geolocation if provided and required
      let distanceFromMess = null;
      if (geo_location && geo_location.latitude && geo_location.longitude) {
        if (mess.location?.coordinates) {
          distanceFromMess = geolib.getDistance(
            { latitude: geo_location.latitude, longitude: geo_location.longitude },
            { latitude: mess.location.coordinates[1], longitude: mess.location.coordinates[0] }
          );

          const geofenceRadius = mess.geofence_radius || 200;
          if (distanceFromMess > geofenceRadius) {
            throw new AppError(
              `You are ${distanceFromMess}m away from the mess. Must be within ${geofenceRadius}m.`,
              400
            );
          }
        }
      }

      // Check for duplicate attendance
      const existingAttendance = await Attendance.findOne({
        user_id: user._id,
        scan_date: today,
        meal_type: mealType,
        is_valid: true
      });

      if (existingAttendance) {
        throw new AppError(`You have already marked attendance for ${mealType} today`, 409);
      }

      // Check meal confirmation if required
      if (mess.requires_meal_confirmation) {
        const confirmation = await MealConfirmation.findOne({
          user_id: user._id,
          meal_date: today,
          meal_type: mealType,
          status: 'confirmed'
        });

        if (!confirmation) {
          throw new AppError(
            `You need to confirm ${mealType} in advance to mark attendance`,
            400
          );
        }
      }

      // Update biometric usage
      await biometric.markAsUsed();

      // Update sign count if provided
      if (authenticator_data?.signCount) {
        const updated = await biometric.updateSignCount(authenticator_data.signCount);
        if (!updated && biometric.sign_count > 0) {
          logger.warn(`Potential cloned authenticator for user ${user._id}`);
        }
      }

      // Create attendance record
      const attendance = await Attendance.create({
        user_id: user._id,
        mess_id: mess._id,
        subscription_id: subscription._id,
        scan_date: today,
        meal_type: mealType,
        scan_time: new Date(),
        scan_method: 'fingerprint', // Using 'fingerprint' as the generic biometric method
        geo_location: geo_location || null,
        distance_from_mess: distanceFromMess,
        is_valid: true,
        ip_address: req.ip || req.headers['x-forwarded-for'],
        device_info: {
          biometric_id: biometric._id,
          device_type: biometric.authenticator_info?.device_type,
          user_agent: req.headers['user-agent']
        }
      });

      logger.info(`Biometric attendance marked: User ${user._id}, Meal: ${mealType}`);

      res.status(200).json({
        success: true,
        message: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} attendance marked successfully`,
        data: {
          attendance_id: attendance._id,
          user_name: user.full_name,
          mess_name: mess.name,
          meal_type: mealType,
          scan_time: attendance.scan_time,
          scan_method: 'biometric',
          confidence_score: 100 // WebAuthn is pass/fail, so 100% on success
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get enrollment status for current user
   */
  async getEnrollmentStatus(req, res, next) {
    try {
      const userId = req.user.user_id || req.user._id;

      logger.info(`Checking enrollment status for user: ${userId}`);

      // Use findOne with proper query - Mongoose will handle ObjectId conversion
      const biometric = await Biometric.findOne({
        user_id: userId,
        status: 'active'
      }).select('status enrolled_at last_used_at usage_count authenticator_info.device_type');

      logger.info(`Enrollment status result: ${biometric ? 'Found' : 'Not found'}, user_id type: ${typeof userId}`);

      res.status(200).json({
        success: true,
        data: {
          is_enrolled: !!biometric,
          enrollment_details: biometric ? {
            status: biometric.status,
            enrolled_at: biometric.enrolled_at,
            last_used_at: biometric.last_used_at,
            usage_count: biometric.usage_count,
            device_type: biometric.authenticator_info?.device_type
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke biometric enrollment
   */
  async revokeEnrollment(req, res, next) {
    try {
      const userId = String(req.user.user_id || req.user._id);
      const { reason } = req.body;

      const biometric = await Biometric.findActiveByUserId(userId);
      if (!biometric) {
        throw new AppError('No active biometric enrollment found', 404);
      }

      await biometric.revoke(reason || 'User requested revocation');

      logger.info(`Biometric revoked for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Biometric enrollment revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all biometric enrollments for a mess
   */
  async getAllEnrollments(req, res, next) {
    try {
      const { mess_id } = req.query;
      const { page = 1, limit = 20, status } = req.query;

      // Build user filter
      const userFilter = { deleted_at: null };
      if (mess_id) {
        userFilter.mess_id = mess_id;
      }

      // Get users in mess
      const users = await User.find(userFilter).select('_id');
      const userIds = users.map(u => u._id);

      // Build biometric filter
      const biometricFilter = { user_id: { $in: userIds } };
      if (status) {
        biometricFilter.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [biometrics, total] = await Promise.all([
        Biometric.find(biometricFilter)
          .populate('user_id', 'full_name email phone')
          .sort({ enrolled_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Biometric.countDocuments(biometricFilter)
      ]);

      res.status(200).json({
        success: true,
        data: {
          biometrics,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Revoke biometric for a specific user
   */
  async adminRevokeEnrollment(req, res, next) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = String(req.user.user_id || req.user._id);

      const result = await Biometric.revokeAllForUser(
        userId,
        reason || `Revoked by admin ${adminId}`
      );

      if (result.modifiedCount === 0) {
        throw new AppError('No active biometric found for this user', 404);
      }

      logger.info(`Admin ${adminId} revoked biometric for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Biometric enrollment revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get biometric usage statistics
   */
  async getUsageStats(req, res, next) {
    try {
      const { mess_id, start_date, end_date } = req.query;

      // Build date filter
      const dateFilter = {};
      if (start_date) {
        dateFilter.$gte = new Date(start_date);
      }
      if (end_date) {
        dateFilter.$lte = new Date(end_date);
      }

      // Get users in mess
      const userFilter = { deleted_at: null };
      if (mess_id) {
        userFilter.mess_id = mess_id;
      }
      const users = await User.find(userFilter).select('_id');
      const userIds = users.map(u => u._id);

      // Get stats
      const [totalEnrolled, activeEnrolled, totalUsage] = await Promise.all([
        Biometric.countDocuments({ user_id: { $in: userIds } }),
        Biometric.countDocuments({ user_id: { $in: userIds }, status: 'active' }),
        Biometric.aggregate([
          { $match: { user_id: { $in: userIds }, status: 'active' } },
          { $group: { _id: null, totalUsage: { $sum: '$usage_count' } } }
        ])
      ]);

      // Get attendance count via biometric
      const biometricAttendanceFilter = {
        user_id: { $in: userIds },
        scan_method: 'fingerprint'
      };
      if (Object.keys(dateFilter).length > 0) {
        biometricAttendanceFilter.scan_date = dateFilter;
      }

      const biometricAttendanceCount = await Attendance.countDocuments(biometricAttendanceFilter);

      res.status(200).json({
        success: true,
        data: {
          total_enrolled: totalEnrolled,
          active_enrolled: activeEnrolled,
          revoked: totalEnrolled - activeEnrolled,
          total_usage: totalUsage[0]?.totalUsage || 0,
          biometric_attendance_count: biometricAttendanceCount,
          enrollment_rate: users.length > 0
            ? Math.round((activeEnrolled / users.length) * 100)
            : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new BiometricController();
