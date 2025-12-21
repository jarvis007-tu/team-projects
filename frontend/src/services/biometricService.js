import api from './api.js';

/**
 * Biometric Service
 *
 * Handles WebAuthn-based biometric enrollment and attendance verification.
 * Uses the Web Authentication API (WebAuthn) for fingerprint/biometric authentication.
 */
const biometricService = {
  /**
   * Check if WebAuthn is supported in the browser
   */
  isWebAuthnSupported: () => {
    return !!(
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === 'function'
    );
  },

  /**
   * Check if platform authenticator (built-in fingerprint) is available
   */
  isPlatformAuthenticatorAvailable: async () => {
    if (!biometricService.isWebAuthnSupported()) {
      return false;
    }
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  // ==================== Enrollment APIs ====================

  /**
   * Get enrollment options from server
   */
  getEnrollmentOptions: () => {
    return api.get('/biometric/enrollment/options');
  },

  /**
   * Complete enrollment with credential
   */
  completeEnrollment: (data) => {
    return api.post('/biometric/enrollment/complete', data);
  },

  /**
   * Get enrollment status for current user
   */
  getEnrollmentStatus: () => {
    return api.get('/biometric/enrollment/status');
  },

  /**
   * Revoke own biometric enrollment
   */
  revokeEnrollment: (reason) => {
    return api.post('/biometric/enrollment/revoke', { reason });
  },

  // ==================== Verification APIs ====================

  /**
   * Get verification options for a user
   */
  getVerificationOptions: (userId) => {
    return api.post('/biometric/verify/options', { user_id: userId });
  },

  /**
   * Verify biometric and mark attendance
   */
  verifyAndMarkAttendance: (data) => {
    return api.post('/biometric/verify/attendance', data);
  },

  // ==================== Admin APIs ====================

  /**
   * Get all biometric enrollments (admin)
   */
  getAllEnrollments: (params = {}) => {
    return api.get('/biometric/admin/enrollments', { params });
  },

  /**
   * Revoke biometric for a user (admin)
   */
  adminRevokeEnrollment: (userId, reason) => {
    return api.post(`/biometric/admin/revoke/${userId}`, { reason });
  },

  /**
   * Get biometric usage statistics (admin)
   */
  getUsageStats: (params = {}) => {
    return api.get('/biometric/admin/stats', { params });
  },

  // ==================== WebAuthn Helper Functions ====================

  /**
   * Enroll fingerprint - Complete enrollment flow
   * @returns {Promise<Object>} Enrollment result
   */
  enrollFingerprint: async () => {
    // Check support
    if (!biometricService.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    const isPlatformAvailable = await biometricService.isPlatformAuthenticatorAvailable();
    if (!isPlatformAvailable) {
      throw new Error('Fingerprint sensor not available on this device');
    }

    // Step 1: Get registration options from server
    const optionsResponse = await biometricService.getEnrollmentOptions();
    console.log('Enrollment options response:', optionsResponse);

    // Handle nested response structure
    const options = optionsResponse.data?.data || optionsResponse.data;

    // Validate options
    if (!options || !options.challenge) {
      console.error('Invalid enrollment options response:', optionsResponse);
      throw new Error('Failed to get enrollment options from server');
    }

    if (!options.challenge) {
      console.error('Missing challenge in options:', options);
      throw new Error('Invalid enrollment options: missing challenge');
    }

    if (!options.user?.id) {
      console.error('Missing user.id in options:', options);
      throw new Error('Invalid enrollment options: missing user ID');
    }

    // Convert challenge and user.id from base64url to ArrayBuffer
    const publicKeyOptions = {
      ...options,
      challenge: biometricService.base64urlToBuffer(options.challenge),
      user: {
        ...options.user,
        id: biometricService.base64urlToBuffer(options.user.id)
      },
      excludeCredentials: options.excludeCredentials?.map(cred => ({
        ...cred,
        id: biometricService.base64urlToBuffer(cred.id)
      })) || []
    };

    // Step 2: Create credential using WebAuthn API
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions
    });

    // Step 3: Extract and encode credential data
    const credentialData = {
      credential_id: biometricService.bufferToBase64url(credential.rawId),
      public_key: biometricService.bufferToBase64url(credential.response.getPublicKey()),
      authenticator_data: {
        aaguid: biometricService.extractAAGUID(credential.response.getAuthenticatorData()),
        signCount: biometricService.extractSignCount(credential.response.getAuthenticatorData())
      },
      client_data_json: biometricService.bufferToBase64url(credential.response.clientDataJSON),
      device_info: {
        device_id: biometricService.getDeviceId(),
        device_type: 'platform',
        transports: credential.response.getTransports?.() || ['internal'],
        platform: biometricService.getPlatform()
      }
    };

    // Step 4: Send credential to server to complete enrollment
    const result = await biometricService.completeEnrollment(credentialData);

    return result.data;
  },

  /**
   * Verify fingerprint and mark attendance
   * @param {string} userId - User ID to verify
   * @param {Object} geoLocation - Optional geolocation { latitude, longitude }
   * @returns {Promise<Object>} Attendance result
   */
  verifyFingerprintAttendance: async (userId, geoLocation = null) => {
    // Check support
    if (!biometricService.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    // Step 1: Get verification options from server
    const optionsResponse = await biometricService.getVerificationOptions(userId);
    console.log('Verification options response:', optionsResponse);

    // Handle nested response structure
    const options = optionsResponse.data?.data || optionsResponse.data;

    // Validate options
    if (!options || !options.challenge) {
      console.error('Invalid verification options:', optionsResponse);
      throw new Error('Failed to get verification options from server');
    }

    // Convert challenge and allowCredentials from base64url to ArrayBuffer
    const publicKeyOptions = {
      ...options,
      challenge: biometricService.base64urlToBuffer(options.challenge),
      allowCredentials: options.allowCredentials?.map(cred => ({
        ...cred,
        id: biometricService.base64urlToBuffer(cred.id)
      })) || []
    };

    // Step 2: Get credential using WebAuthn API
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions
    });

    // Step 3: Extract and encode assertion data
    const verificationData = {
      credential_id: biometricService.bufferToBase64url(assertion.rawId),
      authenticator_data: {
        signCount: biometricService.extractSignCount(assertion.response.authenticatorData)
      },
      client_data_json: biometricService.bufferToBase64url(assertion.response.clientDataJSON),
      signature: biometricService.bufferToBase64url(assertion.response.signature),
      challenge: options.challenge,
      geo_location: geoLocation
    };

    // Step 4: Send to server for verification and attendance marking
    const result = await biometricService.verifyAndMarkAttendance(verificationData);

    return result.data;
  },

  // ==================== Utility Functions ====================

  /**
   * Convert ArrayBuffer to base64url string
   */
  bufferToBase64url: (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },

  /**
   * Convert base64url string to ArrayBuffer
   */
  base64urlToBuffer: (base64url) => {
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  /**
   * Extract AAGUID from authenticator data
   */
  extractAAGUID: (authData) => {
    try {
      const dataView = new DataView(authData);
      // AAGUID is at bytes 37-52 (16 bytes)
      const aaguid = new Uint8Array(authData.slice(37, 53));
      return biometricService.bufferToBase64url(aaguid);
    } catch {
      return null;
    }
  },

  /**
   * Extract sign count from authenticator data
   */
  extractSignCount: (authData) => {
    try {
      const dataView = new DataView(authData);
      // Sign count is at bytes 33-36 (4 bytes, big-endian)
      return dataView.getUint32(33, false);
    } catch {
      return 0;
    }
  },

  /**
   * Get or generate device ID
   */
  getDeviceId: () => {
    let deviceId = localStorage.getItem('biometric_device_id');
    if (!deviceId) {
      deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('biometric_device_id', deviceId);
    }
    return deviceId;
  },

  /**
   * Detect platform
   */
  getPlatform: () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
    return 'unknown';
  }
};

export default biometricService;
