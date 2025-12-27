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
   * Works on both iOS Safari and Android Chrome
   */
  isWebAuthnSupported: () => {
    // Check for secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.warn('WebAuthn requires a secure context (HTTPS)');
      return false;
    }
    return !!(
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === 'function'
    );
  },

  /**
   * Check if platform authenticator (built-in fingerprint/Face ID) is available
   * Works on both iOS (Face ID/Touch ID) and Android (Fingerprint)
   */
  isPlatformAuthenticatorAvailable: async () => {
    if (!biometricService.isWebAuthnSupported()) {
      return false;
    }
    try {
      // This method is supported on both iOS Safari and Android Chrome
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('Platform authenticator available:', available, 'Platform:', biometricService.getPlatform());
      return available;
    } catch (error) {
      console.error('Error checking platform authenticator:', error);
      return false;
    }
  },

  /**
   * Get detailed device biometric capabilities
   */
  getBiometricCapabilities: async () => {
    const platform = biometricService.getPlatform();
    const isSupported = biometricService.isWebAuthnSupported();
    const isPlatformAvailable = isSupported ? await biometricService.isPlatformAuthenticatorAvailable() : false;

    return {
      platform,
      isSecureContext: window.isSecureContext,
      webAuthnSupported: isSupported,
      platformAuthenticatorAvailable: isPlatformAvailable,
      biometricType: platform === 'ios' ? 'Face ID / Touch ID' :
                     platform === 'android' ? 'Fingerprint' :
                     'Biometric'
    };
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
   * Works on both iOS (Face ID/Touch ID) and Android (Fingerprint)
   * @returns {Promise<Object>} Enrollment result
   */
  enrollFingerprint: async () => {
    const platform = biometricService.getPlatform();
    console.log('Starting biometric enrollment on platform:', platform);

    // Check secure context
    if (!window.isSecureContext) {
      throw new Error('Biometric enrollment requires HTTPS. Please use a secure connection.');
    }

    // Check support
    if (!biometricService.isWebAuthnSupported()) {
      throw new Error('Biometric authentication is not supported in this browser. Please use Safari on iOS or Chrome on Android.');
    }

    const isPlatformAvailable = await biometricService.isPlatformAuthenticatorAvailable();
    if (!isPlatformAvailable) {
      const biometricType = platform === 'ios' ? 'Face ID/Touch ID' : 'Fingerprint sensor';
      throw new Error(`${biometricType} is not available on this device. Please ensure it is enabled in your device settings.`);
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
    let credential;
    try {
      credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });
    } catch (error) {
      console.error('WebAuthn create credential error:', error);
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric enrollment was cancelled or not allowed. Please try again.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Security error during enrollment. Make sure you are using HTTPS.');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('A biometric is already registered. Please revoke it first.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('This authenticator is not supported. Please try a different device.');
      }
      throw error;
    }

    // Step 3: Extract and encode credential data
    // Note: getPublicKey() and getAuthenticatorData() are not available on iOS Safari
    // Use attestationObject instead which contains all the data
    const attestationObject = credential.response.attestationObject;

    // Extract public key - use getPublicKey if available (Chrome/Android), otherwise use attestationObject
    let publicKey;
    if (typeof credential.response.getPublicKey === 'function') {
      publicKey = biometricService.bufferToBase64url(credential.response.getPublicKey());
    } else {
      // For iOS Safari, send the attestationObject and let backend extract the key
      publicKey = biometricService.bufferToBase64url(attestationObject);
    }

    // Extract authenticator data
    let authenticatorData = { aaguid: null, signCount: 0 };
    if (typeof credential.response.getAuthenticatorData === 'function') {
      const authData = credential.response.getAuthenticatorData();
      authenticatorData = {
        aaguid: biometricService.extractAAGUID(authData),
        signCount: biometricService.extractSignCount(authData)
      };
    }

    // Get transports - fallback for iOS
    let transports = ['internal'];
    if (typeof credential.response.getTransports === 'function') {
      transports = credential.response.getTransports() || ['internal'];
    }

    const credentialData = {
      credential_id: biometricService.bufferToBase64url(credential.rawId),
      public_key: publicKey,
      attestation_object: biometricService.bufferToBase64url(attestationObject),
      authenticator_data: authenticatorData,
      client_data_json: biometricService.bufferToBase64url(credential.response.clientDataJSON),
      device_info: {
        device_id: biometricService.getDeviceId(),
        device_type: 'platform',
        transports: transports,
        platform: biometricService.getPlatform()
      }
    };

    // Step 4: Send credential to server to complete enrollment
    const result = await biometricService.completeEnrollment(credentialData);

    return result.data;
  },

  /**
   * Verify fingerprint and mark attendance
   * Works on both iOS (Face ID/Touch ID) and Android (Fingerprint)
   * @param {string} userId - User ID to verify
   * @param {Object} geoLocation - Optional geolocation { latitude, longitude }
   * @returns {Promise<Object>} Attendance result
   */
  verifyFingerprintAttendance: async (userId, geoLocation = null) => {
    const platform = biometricService.getPlatform();
    console.log('Starting biometric verification on platform:', platform);

    // Check secure context
    if (!window.isSecureContext) {
      throw new Error('Biometric verification requires HTTPS. Please use a secure connection.');
    }

    // Check support
    if (!biometricService.isWebAuthnSupported()) {
      throw new Error('Biometric authentication is not supported in this browser.');
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
    let assertion;
    try {
      assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });
    } catch (error) {
      console.error('WebAuthn get credential error:', error);
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric verification was cancelled or not allowed. Please try again.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Security error during verification. Make sure you are using HTTPS.');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('No registered biometric found. Please enroll your biometric first.');
      }
      throw error;
    }

    // Step 3: Extract and encode assertion data
    // authenticatorData is available on both iOS and Android
    let signCount = 0;
    try {
      signCount = biometricService.extractSignCount(assertion.response.authenticatorData);
    } catch (e) {
      console.warn('Could not extract sign count:', e);
    }

    const verificationData = {
      credential_id: biometricService.bufferToBase64url(assertion.rawId),
      authenticator_data: {
        signCount: signCount,
        rawAuthenticatorData: biometricService.bufferToBase64url(assertion.response.authenticatorData)
      },
      client_data_json: biometricService.bufferToBase64url(assertion.response.clientDataJSON),
      signature: biometricService.bufferToBase64url(assertion.response.signature),
      challenge: options.challenge,
      geo_location: geoLocation,
      platform: platform
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
