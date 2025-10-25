import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { FiCamera, FiX, FiCheckCircle, FiAlertCircle, FiUpload } from 'react-icons/fi';
import { MdQrCodeScanner, MdHistory, MdLocationOn } from 'react-icons/md';
import attendanceService from '../../services/attendanceService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [todayMeal, setTodayMeal] = useState(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const scannerRef = useRef(null);
  const html5QrcodeScanner = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTodayMeal();
    fetchAttendanceHistory();
    getLocation();

    return () => {
      if (html5QrcodeScanner.current) {
        html5QrcodeScanner.current.clear();
      }
    };
  }, []);

  const fetchTodayMeal = async () => {
    try {
      const response = await attendanceService.getTodayMeal();
      // Backend returns: { success: true, data: { date, day, menu: { breakfast: {...}, lunch: {...} } } }
      // Extract items from current meal or all meals
      const menuData = response.data?.data || response.data;
      if (menuData?.menu) {
        // Get current meal type
        const currentMeal = getMealType().toLowerCase();
        const mealData = menuData.menu[currentMeal] || menuData.menu.breakfast || Object.values(menuData.menu)[0];
        setTodayMeal(mealData);
      }
    } catch (error) {
      console.log('Could not fetch today\'s menu:', error);
      // Error is handled silently as meal info is not critical
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await attendanceService.getAttendanceHistory({ limit: 5 });
      setAttendanceHistory(response.data.history);
    } catch (error) {
      // Error is handled silently as history is not critical
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setScanError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        toast.success('Location enabled successfully!');
        setShowManualLocation(false);
      },
      (error) => {
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '📍 Location permission denied. You can enter location manually for testing.';
            setShowManualLocation(true);
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. You can enter location manually for testing.';
            setShowManualLocation(true);
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. You can enter location manually for testing.';
            setShowManualLocation(true);
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location.';
            setShowManualLocation(true);
        }
        toast.error(errorMessage, { duration: 5000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const setManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Invalid coordinates. Lat: -90 to 90, Lng: -180 to 180');
      return;
    }

    setLocation({
      latitude: lat,
      longitude: lng
    });
    toast.success('Manual location set successfully!');
    setShowManualLocation(false);
  };

  const startScanning = () => {
    if (!location) {
      toast.error('Please enable location first');
      return;
    }

    setScanning(true);
    setScanResult(null);
    setScanError(null);

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        console.log('🎥 Initializing QR Scanner...');
        html5QrcodeScanner.current = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: 250,
            disableFlip: false,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: "environment" // Use back camera
            },
            // Enable verbose temporarily for debugging
            verbose: true
          },
          /* verbose= */ true // Enable verbose logging to see what's happening
        );

        console.log('✅ Scanner initialized, rendering...');
        html5QrcodeScanner.current.render(onScanSuccess, onScanFailure);
        console.log('✅ Scanner rendered and ready');
      } catch (error) {
        console.error('❌ Error initializing scanner:', error);
        toast.error('Failed to initialize camera. Please allow camera permissions.');
        setScanning(false);
        setScanError('Failed to initialize camera: ' + error.message);
      }
    }, 300); // Increased delay for better DOM readiness
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log('🔍 QR Code Scanned!');
    console.log('📄 Decoded Text:', decodedText);
    console.log('📦 Decoded Result:', decodedResult);

    if (html5QrcodeScanner.current) {
      html5QrcodeScanner.current.clear();
    }

    setLoading(true);
    try {
      // Show what we're sending to the API
      const requestData = {
        qr_code: decodedText,
        geo_location: location,
        device_id: localStorage.getItem('device_id') || 'web-device'
      };
      console.log('📤 Sending to API:', requestData);

      const response = await attendanceService.scanQR(requestData);
      console.log('✅ API Response:', response);

      setScanResult({
        success: true,
        message: response.data?.message || response.message || 'Attendance marked',
        meal: response.data?.meal_type || response.meal_type,
        time: new Date().toLocaleTimeString()
      });

      toast.success('Attendance marked successfully!');
      fetchAttendanceHistory();
    } catch (error) {
      console.error('❌ Error marking attendance:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      const errorMsg = error.response?.data?.message || error.message || 'Invalid QR code';
      setScanError(errorMsg);
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const onScanFailure = (error) => {
    // Silent fail for scanning attempts - normal QR scanning behavior
    // NotFoundException just means "no QR code in frame yet" - completely normal
    // Only log non-NotFoundException errors
    if (error && typeof error === 'string' &&
        !error.includes('NotFoundException') &&
        !error.includes('No MultiFormat Readers')) {
      console.log('⚠️ Scan error:', error);
    }
  };

  const stopScanning = () => {
    if (html5QrcodeScanner.current) {
      html5QrcodeScanner.current.clear();
    }
    setScanning(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!location) {
      toast.error('Please enable location first');
      return;
    }

    console.log('📁 File selected for QR scanning:', file.name);
    setLoading(true);

    try {
      const html5QrCode = new Html5Qrcode("qr-file-reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      console.log('✅ QR decoded from file:', decodedText);
      await onScanSuccess(decodedText, { decodedText });
    } catch (error) {
      console.error('❌ Error scanning file:', error);
      toast.error('Failed to scan QR code from image. Make sure the image contains a valid QR code.');
      setLoading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getMealType = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 16) return 'Lunch';
    if (hour >= 18 && hour < 22) return 'Dinner';
    return 'No meal service';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-dark-bg dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">QR Scanner</h1>
          <p className="text-gray-600 dark:text-gray-400">Scan your QR code to mark attendance</p>
        </div>

        {/* Current Meal Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Meal Service</h3>
              <p className="text-2xl font-bold text-primary-600 mt-1">{getMealType()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Menu</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {todayMeal?.items ? todayMeal.items.join(', ') : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
          {!scanning ? (
            <div className="p-8">
              {scanResult ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Attendance Marked Successfully!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Meal: {scanResult.meal}</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Time: {scanResult.time}</p>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      startScanning();
                    }}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Scan Again
                  </button>
                </div>
              ) : scanError ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiAlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Scan Failed</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{scanError}</p>
                  <button
                    onClick={() => {
                      setScanError(null);
                      startScanning();
                    }}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MdQrCodeScanner className="w-16 h-16 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ready to Scan</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Position the QR code within the camera frame or upload an image
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={startScanning}
                      className="flex items-center justify-center px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <FiCamera className="w-5 h-5 mr-2" />
                      Scan with Camera
                    </button>
                    <label className="flex items-center justify-center px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
                      <FiUpload className="w-5 h-5 mr-2" />
                      Upload QR Image
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {/* Hidden div for file scanning */}
                  <div id="qr-file-reader" className="hidden"></div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* QR Reader Container - Increased height for better rendering */}
              <div id="qr-reader" className="w-full min-h-[400px]"></div>

              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Verifying QR code...</p>
                  </div>
                </div>
              )}

              {/* Scanner Instructions */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t dark:border-blue-700">
                <div className="mb-3 space-y-2">
                  <p className="text-sm text-blue-800 dark:text-blue-200 text-center font-semibold">
                    📸 Scanning Tips:
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Hold steady and center the QR code in the frame</li>
                    <li>• Ensure good lighting - avoid shadows</li>
                    <li>• Keep QR code within the red box</li>
                    <li>• Try moving closer or farther if not scanning</li>
                  </ul>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={stopScanning}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <FiX className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                  <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm">
                    <FiUpload className="w-4 h-4 mr-2" />
                    Upload Instead
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        stopScanning();
                        handleFileUpload(e);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <MdLocationOn className="w-5 h-5 text-primary-600 mr-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Location Services</span>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              location ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {location ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {!location && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ Location is required for attendance tracking
              </p>

              {!showManualLocation ? (
                <div className="space-y-2">
                  <button
                    onClick={getLocation}
                    className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                  >
                    Enable Location
                  </button>
                  <button
                    onClick={() => setShowManualLocation(true)}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Enter Location Manually (Testing)
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    For testing: Enter coordinates of the mess location
                  </p>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Latitude (e.g., 28.6139)"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Longitude (e.g., 77.2090)"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={setManualLocation}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      Set Location
                    </button>
                    <button
                      onClick={() => setShowManualLocation(false)}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {location && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <MdHistory className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Attendance</h3>
          </div>
          {attendanceHistory && attendanceHistory.length > 0 ? (
            <div className="space-y-3">
              {attendanceHistory.map((record, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b dark:border-gray-600 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{record.meal_type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(record.check_in_time), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-600">
                      {format(new Date(record.check_in_time), 'hh:mm a')}
                    </p>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      Marked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent attendance records</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;