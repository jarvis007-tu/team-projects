import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiMapPin, FiClock, FiUser } from 'react-icons/fi';
import { MdFingerprint, MdRestaurant, MdLocationOn, MdHistory } from 'react-icons/md';
import biometricService from '../../services/biometricService';
import attendanceService from '../../services/attendanceService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const BiometricAttendance = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    checkSupport();
    fetchEnrollmentStatus();
    fetchRecentAttendance();
    getLocation();
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
      console.log('Enrollment status data:', response.data);
      const statusData = response.data?.data || response.data;
      console.log('Setting enrollment status to:', statusData);
      setEnrollmentStatus(statusData);
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const response = await attendanceService.getAttendanceHistory({ limit: 5 });
      setRecentAttendance(response.data.history || []);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };

  const getLocation = () => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        toast.error('Could not get location. Attendance may fail if geofencing is required.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleMarkAttendance = async () => {
    try {
      setVerifying(true);
      setAttendanceResult(null);

      const result = await biometricService.verifyFingerprintAttendance(
        user?._id || user?.user_id,
        location
      );

      setAttendanceResult({
        success: true,
        data: result.data
      });

      toast.success(result.message || 'Attendance marked successfully!');
      fetchRecentAttendance();
    } catch (error) {
      console.error('Attendance error:', error);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to mark attendance';

      // Handle specific errors
      if (error.name === 'NotAllowedError') {
        toast.error('Fingerprint verification was cancelled');
      } else if (error.name === 'InvalidStateError') {
        toast.error('Fingerprint not recognized. Please try again.');
      } else if (errorMessage.toLowerCase().includes('no meal service') || errorMessage.toLowerCase().includes('meal time')) {
        // Show friendly UI for no meal time error
        setAttendanceResult({
          success: false,
          isNoMealTime: true,
          error: errorMessage
        });
      } else {
        toast.error(errorMessage);
        setAttendanceResult({
          success: false,
          error: errorMessage
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast':
        return '🍳';
      case 'lunch':
        return '🍛';
      case 'dinner':
        return '🍽️';
      default:
        return '🍴';
    }
  };

  // Not supported UI
  if (!isSupported || !isPlatformAvailable) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 p-3 sm:p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="text-center py-6 sm:py-8">
              <FiAlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Biometric Not Available
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                Your device or browser does not support biometric authentication.
              </p>
              <a
                href="/user/scan"
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors"
              >
                Use QR Code Instead
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <MdFingerprint className="w-7 h-7 sm:w-10 sm:h-10" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Biometric Attendance</h1>
              <p className="text-green-100 text-sm sm:text-base">
                Mark attendance with fingerprint
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Location Status */}
          <div className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl ${location ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <MdLocationOn className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${location ? 'text-green-600' : 'text-yellow-600'}`} />
              <div className="min-w-0">
                <p className={`text-xs sm:text-sm font-medium truncate ${location ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                  {locationLoading ? 'Getting...' : location ? 'Location OK' : 'No Location'}
                </p>
              </div>
            </div>
          </div>

          {/* Enrollment Status */}
          <div className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl ${enrollmentStatus?.is_enrolled ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <MdFingerprint className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${enrollmentStatus?.is_enrolled ? 'text-green-600' : 'text-red-600'}`} />
              <div className="min-w-0">
                <p className={`text-xs sm:text-sm font-medium truncate ${enrollmentStatus?.is_enrolled ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {loading ? 'Checking...' : enrollmentStatus?.is_enrolled ? 'Enrolled' : 'Not Enrolled'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Action Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !enrollmentStatus?.is_enrolled ? (
            // Not enrolled - show enrollment prompt
            <div className="text-center py-6 sm:py-8">
              <FiAlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Fingerprint Not Enrolled
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 px-2">
                Enroll your fingerprint to use biometric attendance.
              </p>
              <a
                href="/user/biometric-enrollment"
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white text-sm sm:text-base rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors"
              >
                <MdFingerprint className="w-4 h-4 sm:w-5 sm:h-5" />
                Enroll Fingerprint
              </a>
            </div>
          ) : (
            // Enrolled - show attendance button
            <div className="space-y-4 sm:space-y-6">
              {/* Result Display */}
              {attendanceResult && (
                <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl ${attendanceResult.success ? 'bg-green-50 dark:bg-green-900/20' : attendanceResult.isNoMealTime ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  {attendanceResult.success ? (
                    <div className="flex items-center gap-3 sm:gap-4">
                      <FiCheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-green-700 dark:text-green-400">
                          Attendance Marked!
                        </p>
                        <p className="text-xs sm:text-sm text-green-600 dark:text-green-500 truncate">
                          {attendanceResult.data?.meal_type?.charAt(0).toUpperCase() + attendanceResult.data?.meal_type?.slice(1)} at {attendanceResult.data?.mess_name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-green-500 mt-1">
                          {attendanceResult.data?.scan_time && format(new Date(attendanceResult.data.scan_time), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ) : attendanceResult.isNoMealTime ? (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <FiClock className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-orange-700 dark:text-orange-400">
                            No Meal Service Now
                          </p>
                          <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-500">
                            Come back during meal times
                          </p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 sm:mb-2">Meal Timings:</p>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                          <div className="p-1.5 sm:p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                            <p className="text-base sm:text-lg">🍳</p>
                            <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Breakfast</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">7-10 AM</p>
                          </div>
                          <div className="p-1.5 sm:p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                            <p className="text-base sm:text-lg">🍛</p>
                            <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Lunch</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">12-3 PM</p>
                          </div>
                          <div className="p-1.5 sm:p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                            <p className="text-base sm:text-lg">🍽️</p>
                            <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Dinner</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">7-10 PM</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 sm:gap-4">
                      <FiAlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-red-700 dark:text-red-400">
                          Attendance Failed
                        </p>
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-500">
                          {attendanceResult.error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main Button */}
              <button
                onClick={handleMarkAttendance}
                disabled={verifying || locationLoading}
                className="w-full flex flex-col items-center justify-center gap-2 sm:gap-4 p-6 sm:p-8 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl sm:rounded-2xl hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50 shadow-lg"
              >
                {verifying ? (
                  <>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-base sm:text-xl font-semibold text-center">Touch Fingerprint Sensor...</span>
                  </>
                ) : (
                  <>
                    <MdFingerprint className="w-16 h-16 sm:w-20 sm:h-20" />
                    <span className="text-base sm:text-xl font-semibold">Tap to Mark Attendance</span>
                    <span className="text-green-100 text-xs sm:text-sm text-center">Touch your fingerprint sensor when prompted</span>
                  </>
                )}
              </button>

              {/* Alternative Option */}
              <div className="text-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">or</span>
                <a
                  href="/user/scan"
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Use QR Code Scanner
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <MdHistory className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            Recent Attendance
          </h2>

          {recentAttendance.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
              No recent attendance records
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {recentAttendance.map((record, index) => (
                <div
                  key={record._id || index}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">{getMealIcon(record.meal_type)}</span>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white capitalize">
                        {record.meal_type}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {record.scan_date && format(new Date(record.scan_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                      record.scan_method === 'fingerprint'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {record.scan_method === 'fingerprint' ? 'Bio' : 'QR'}
                    </span>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                      {record.scan_time && format(new Date(record.scan_time), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricAttendance;
