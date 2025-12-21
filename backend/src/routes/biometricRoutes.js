const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Biometric Routes
 *
 * Endpoints for WebAuthn-based biometric enrollment and attendance verification.
 * As per Biometric Doc - biometric is only for attendance, not for user login.
 */

// ==================== User Enrollment Routes ====================

/**
 * GET /biometric/enrollment/options
 * Get WebAuthn registration options for enrollment
 * Requires: Authenticated user
 */
router.get(
  '/enrollment/options',
  authenticate,
  biometricController.getEnrollmentOptions
);

/**
 * POST /biometric/enrollment/complete
 * Complete biometric enrollment with credential
 * Requires: Authenticated user
 * Body: { credential_id, public_key, authenticator_data, client_data_json, device_info }
 */
router.post(
  '/enrollment/complete',
  authenticate,
  biometricController.completeEnrollment
);

/**
 * GET /biometric/enrollment/status
 * Get enrollment status for current user
 * Requires: Authenticated user
 */
router.get(
  '/enrollment/status',
  authenticate,
  biometricController.getEnrollmentStatus
);

/**
 * POST /biometric/enrollment/revoke
 * Revoke own biometric enrollment
 * Requires: Authenticated user
 * Body: { reason? }
 */
router.post(
  '/enrollment/revoke',
  authenticate,
  biometricController.revokeEnrollment
);

// ==================== Attendance Verification Routes ====================

/**
 * POST /biometric/verify/options
 * Get WebAuthn authentication options for verification
 * Public endpoint - used at attendance kiosk
 * Body: { user_id }
 */
router.post(
  '/verify/options',
  biometricController.getVerificationOptions
);

/**
 * POST /biometric/verify/attendance
 * Verify biometric and mark attendance
 * Public endpoint - used at attendance kiosk
 * Body: { credential_id, authenticator_data, client_data_json, signature, challenge, geo_location? }
 */
router.post(
  '/verify/attendance',
  biometricController.verifyAndMarkAttendance
);

// ==================== Admin Routes ====================

/**
 * GET /biometric/admin/enrollments
 * Get all biometric enrollments (for admin)
 * Requires: Admin authentication
 * Query: { mess_id?, page?, limit?, status? }
 */
router.get(
  '/admin/enrollments',
  authenticate,
  authorize('super_admin', 'mess_admin'),
  biometricController.getAllEnrollments
);

/**
 * POST /biometric/admin/revoke/:userId
 * Revoke biometric for a specific user (admin action)
 * Requires: Admin authentication
 * Body: { reason? }
 */
router.post(
  '/admin/revoke/:userId',
  authenticate,
  authorize('super_admin', 'mess_admin'),
  biometricController.adminRevokeEnrollment
);

/**
 * GET /biometric/admin/stats
 * Get biometric usage statistics
 * Requires: Admin authentication
 * Query: { mess_id?, start_date?, end_date? }
 */
router.get(
  '/admin/stats',
  authenticate,
  authorize('super_admin', 'mess_admin'),
  biometricController.getUsageStats
);

module.exports = router;
