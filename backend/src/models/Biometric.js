const mongoose = require('mongoose');

/**
 * Biometric Schema
 *
 * Stores minimal biometric mapping data for authentication.
 * NO personal information is stored here - only references to User model.
 *
 * As per Biometric Doc:
 * - Biometric data is NOT user data
 * - MongoDB User _id is the single source of truth
 * - No personal information stored inside biometric system
 * - Biometric system performs matching, backend performs authorization
 */
const BiometricSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  biometric_type: {
    type: String,
    enum: ['fingerprint', 'webauthn'],
    default: 'webauthn'
  },

  // For WebAuthn - stores credential ID (NOT the actual biometric data)
  credential_id: {
    type: String,
    required: true
  },

  // For WebAuthn - stores public key for verification
  public_key: {
    type: String,
    required: true
  },

  // For iOS Safari - stores attestation object (since getPublicKey() not available)
  attestation_object: {
    type: String,
    default: null
  },

  // Counter to prevent replay attacks
  sign_count: {
    type: Number,
    default: 0
  },

  // For hardware fingerprint scanners (if used later)
  template_hash: {
    type: String,
    default: null
    // Encrypted / encoded fingerprint template (NOT image)
  },

  device_id: {
    type: String,
    required: true
    // Unique biometric device identifier / browser or device fingerprint
  },

  // Device/authenticator information
  authenticator_info: {
    aaguid: String,           // Authenticator attestation GUID
    device_type: String,      // 'platform' (built-in) or 'cross-platform' (USB key)
    transports: [String],     // ['internal', 'usb', 'nfc', 'ble']
    user_agent: String,       // Browser/device user agent
    platform: String          // 'android', 'ios', 'windows', etc.
  },

  finger_position: {
    type: String,
    enum: [
      'left_thumb',
      'right_thumb',
      'left_index',
      'right_index',
      'unknown'  // For WebAuthn where finger position is unknown
    ],
    default: 'unknown'
  },

  enrolled_at: {
    type: Date,
    default: Date.now
  },

  last_used_at: {
    type: Date,
    default: null
  },

  // Track usage count for analytics
  usage_count: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ['active', 'revoked', 'suspended'],
    default: 'active'
  },

  // For re-enrollment tracking
  revoked_at: {
    type: Date,
    default: null
  },

  revoked_reason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'biometrics'
});

// Indexes for efficient queries
BiometricSchema.index({ credential_id: 1 }, { unique: true });
BiometricSchema.index({ user_id: 1, status: 1 });
BiometricSchema.index({ device_id: 1 });

// Instance methods
BiometricSchema.methods.markAsUsed = async function() {
  this.last_used_at = new Date();
  this.usage_count += 1;
  return this.save();
};

BiometricSchema.methods.revoke = async function(reason = 'User requested') {
  this.status = 'revoked';
  this.revoked_at = new Date();
  this.revoked_reason = reason;
  return this.save();
};

BiometricSchema.methods.updateSignCount = async function(newCount) {
  if (newCount > this.sign_count) {
    this.sign_count = newCount;
    return this.save();
  }
  // Potential cloned authenticator if sign_count is not greater
  return null;
};

// Static methods
BiometricSchema.statics.findByCredentialId = function(credentialId) {
  return this.findOne({ credential_id: credentialId, status: 'active' });
};

BiometricSchema.statics.findActiveByUserId = function(userId) {
  return this.findOne({ user_id: userId, status: 'active' });
};

BiometricSchema.statics.hasEnrolledBiometric = async function(userId) {
  const count = await this.countDocuments({ user_id: userId, status: 'active' });
  return count > 0;
};

BiometricSchema.statics.revokeAllForUser = async function(userId, reason = 'Admin revoked') {
  return this.updateMany(
    { user_id: userId, status: 'active' },
    {
      status: 'revoked',
      revoked_at: new Date(),
      revoked_reason: reason
    }
  );
};

const Biometric = mongoose.model('Biometric', BiometricSchema);

module.exports = Biometric;
