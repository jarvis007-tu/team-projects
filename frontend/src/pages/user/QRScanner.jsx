import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FiCamera, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
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
  const scannerRef = useRef(null);
  const html5QrcodeScanner = useRef(null);

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
      setTodayMeal(response.data);
    } catch (error) {
      console.error('Failed to fetch today\'s meal:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await attendanceService.getAttendanceHistory({ limit: 5 });
      setAttendanceHistory(response.data.history);
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Please enable location services for attendance tracking');
        }
      );
    }
  };

  const startScanning = () => {
    setScanning(true);
    setScanResult(null);
    setScanError(null);

    html5QrcodeScanner.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    html5QrcodeScanner.current.render(onScanSuccess, onScanFailure);
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    if (html5QrcodeScanner.current) {
      html5QrcodeScanner.current.clear();
    }
    
    setLoading(true);
    try {
      const response = await attendanceService.scanQR({
        qr_code: decodedText,
        geo_location: location,
        device_id: localStorage.getItem('device_id') || 'web-device'
      });

      setScanResult({
        success: true,
        message: response.data.message,
        meal: response.data.meal_type,
        time: new Date().toLocaleTimeString()
      });
      
      toast.success('Attendance marked successfully!');
      fetchAttendanceHistory();
    } catch (error) {
      setScanError(error.response?.data?.message || 'Invalid QR code');
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const onScanFailure = (error) => {
    // Silent fail for scanning attempts
    console.log('Scan attempt failed:', error);
  };

  const stopScanning = () => {
    if (html5QrcodeScanner.current) {
      html5QrcodeScanner.current.clear();
    }
    setScanning(false);
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
                {todayMeal ? todayMeal.items.join(', ') : 'Loading...'}
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
                    Position the QR code within the camera frame
                  </p>
                  <button
                    onClick={startScanning}
                    className="flex items-center mx-auto px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <FiCamera className="w-5 h-5 mr-2" />
                    Start Scanning
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <div id="qr-reader" className="w-full"></div>
              {loading && (
                <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Verifying QR code...</p>
                  </div>
                </div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600">
                <button
                  onClick={stopScanning}
                  className="flex items-center mx-auto px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FiX className="w-5 h-5 mr-2" />
                  Cancel Scanning
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Location Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
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
        </div>

        {/* Recent Attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <MdHistory className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Attendance</h3>
          </div>
          {attendanceHistory.length > 0 ? (
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