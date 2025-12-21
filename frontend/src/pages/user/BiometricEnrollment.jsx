import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiTrash2, FiRefreshCw, FiSmartphone, FiShield } from 'react-icons/fi';
import { MdFingerprint, MdSecurity, MdHistory } from 'react-icons/md';
import biometricService from '../../services/biometricService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const BiometricEnrollment = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    checkSupport();
    fetchEnrollmentStatus();
  }, []);

  const checkSupport = async () => {
    const webauthnSupported = biometricService.isWebAuthnSupported();
    setIsSupported(webauthnSupported);

    if (webauthnSupported) {
      const platformAvailable = await biometricService.isPlatformAuthenticatorAvailable();
      setIsPlatformAvailable(platformAvailable);
    }
  };

  const fetchEnrollmentStatus = async () => {
    try {
      setLoading(true);
      const response = await biometricService.getEnrollmentStatus();
      console.log('Enrollment status response:', response);
      const statusData = response.data?.data || response.data;
      setEnrollmentStatus(statusData);
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);

      const result = await biometricService.enrollFingerprint();

      toast.success(result.message || 'Fingerprint enrolled successfully!');
      fetchEnrollmentStatus();
    } catch (error) {
      console.error('Enrollment error:', error);

      // Handle specific WebAuthn errors
      if (error.name === 'NotAllowedError') {
        toast.error('Fingerprint enrollment was cancelled or not allowed');
      } else if (error.name === 'InvalidStateError') {
        toast.error('This device is already registered');
      } else if (error.name === 'NotSupportedError') {
        toast.error('This browser or device does not support fingerprint enrollment');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to enroll fingerprint');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Are you sure you want to remove your fingerprint enrollment? You will need to enroll again to use biometric attendance.')) {
      return;
    }

    try {
      setRevoking(true);

      await biometricService.revokeEnrollment('User requested revocation');

      toast.success('Fingerprint enrollment removed successfully');
      fetchEnrollmentStatus();
    } catch (error) {
      console.error('Revocation error:', error);
      toast.error(error.response?.data?.message || 'Failed to remove fingerprint enrollment');
    } finally {
      setRevoking(false);
    }
  };

  // Check if we're on HTTPS or localhost
  const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  // Not supported UI
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="text-center py-8">
              <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {!isSecureContext ? 'HTTPS Required' : 'Browser Not Supported'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {!isSecureContext
                  ? 'Biometric authentication requires a secure (HTTPS) connection.'
                  : 'Your browser does not support WebAuthn biometric authentication.'
                }
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-500 space-y-2">
                {!isSecureContext ? (
                  <>
                    <p>Current URL: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{window.location.origin}</code></p>
                    <p className="mt-4">To use biometrics on mobile:</p>
                    <ul className="list-disc list-inside text-left max-w-xs mx-auto mt-2">
                      <li>Access via HTTPS tunnel (cloudflared)</li>
                      <li>Or use localhost on desktop</li>
                    </ul>
                  </>
                ) : (
                  <p>Please use a modern browser like Chrome, Safari, Firefox, or Edge.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Platform authenticator not available
  if (!isPlatformAvailable && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="text-center py-8">
              <FiSmartphone className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Fingerprint Sensor Not Available
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your device does not have a fingerprint sensor or it's not enabled.
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-500 space-y-2">
                <p>Please ensure:</p>
                <ul className="list-disc list-inside text-left max-w-xs mx-auto">
                  <li>Your device has a fingerprint sensor</li>
                  <li>Fingerprint is set up in device settings</li>
                  <li>Biometric authentication is enabled</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <MdFingerprint className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Biometric Enrollment</h1>
              <p className="text-blue-100">
                Enroll your fingerprint for quick attendance marking
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiShield className="w-5 h-5 text-blue-600" />
            Enrollment Status
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : enrollmentStatus?.is_enrolled ? (
            <div className="space-y-4">
              {/* Enrolled Status */}
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <FiCheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    Fingerprint Enrolled
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    You can use fingerprint for attendance
                  </p>
                </div>
              </div>

              {/* Enrollment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enrolled On</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {enrollmentStatus.enrollment_details?.enrolled_at
                      ? format(new Date(enrollmentStatus.enrollment_details.enrolled_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Used</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {enrollmentStatus.enrollment_details?.last_used_at
                      ? format(new Date(enrollmentStatus.enrollment_details.last_used_at), 'MMM d, yyyy')
                      : 'Never'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Usage Count</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {enrollmentStatus.enrollment_details?.usage_count || 0} times
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Device Type</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {enrollmentStatus.enrollment_details?.device_type || 'Platform'}
                  </p>
                </div>
              </div>

              {/* Revoke Button */}
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
              >
                {revoking ? (
                  <>
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-5 h-5" />
                    Remove Fingerprint Enrollment
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Not Enrolled Status */}
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <FiAlertCircle className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                    Not Enrolled
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    Enroll your fingerprint to enable biometric attendance
                  </p>
                </div>
              </div>

              {/* Enroll Button */}
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg"
              >
                {enrolling ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enrolling... Touch your fingerprint sensor
                  </>
                ) : (
                  <>
                    <MdFingerprint className="w-6 h-6" />
                    Enroll Fingerprint
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* How it Works */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MdHistory className="w-5 h-5 text-blue-600" />
            How Biometric Attendance Works
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Enroll Once</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Register your fingerprint securely on this device
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Quick Verification</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Touch your fingerprint sensor to verify identity
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Mark Attendance</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Attendance is marked instantly upon successful verification
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
            <MdSecurity className="w-5 h-5" />
            Your Privacy is Protected
          </h3>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
            <li className="flex items-start gap-2">
              <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Your actual fingerprint is never stored on our servers</span>
            </li>
            <li className="flex items-start gap-2">
              <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Only a secure cryptographic key is stored</span>
            </li>
            <li className="flex items-start gap-2">
              <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Fingerprint verification happens on your device</span>
            </li>
            <li className="flex items-start gap-2">
              <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>You can remove your enrollment at any time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BiometricEnrollment;
