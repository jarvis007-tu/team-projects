import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ArrowPathIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import messService from '../../services/messService';
import { motion, AnimatePresence } from 'framer-motion';

const MessQRCodeModal = ({ mess, isOpen, onClose }) => {
  const [qrCode, setQrCode] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (isOpen && mess) {
      fetchQRCode();
    }
  }, [isOpen, mess]);

  const fetchQRCode = async () => {
    try {
      setLoading(true);
      const response = await messService.getMessQRCode(mess.mess_id || mess._id);

      console.log('🔍 QR Code API Response:', response);

      // Flexible response parsing - handle both unwrapped and wrapped responses
      if (response && response.success !== false) {
        const data = response.data || response;
        console.log('📦 QR Code Data:', data);

        setQrCode(data.qr_code);
        setQrData(data.qr_data);
      } else {
        console.error('❌ QR Code API returned success: false');
        toast.error('Failed to load QR code');
      }
    } catch (error) {
      console.error('❌ Error fetching QR code:', error);
      toast.error(error.response?.data?.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    if (!window.confirm('Are you sure you want to regenerate the QR code? This will invalidate the old QR code.')) {
      return;
    }

    try {
      setRegenerating(true);
      const response = await messService.regenerateMessQR(mess.mess_id || mess._id);

      console.log('🔄 Regenerate QR Response:', response);

      // Flexible response parsing
      if (response && response.success !== false) {
        const data = response.data || response;
        setQrCode(data.qr_code);
        setQrData(data.qr_data);
        toast.success('QR code regenerated successfully!');
      } else {
        toast.error('Failed to regenerate QR code');
      }
    } catch (error) {
      console.error('❌ Error regenerating QR code:', error);
      toast.error(error.response?.data?.message || 'Failed to regenerate QR code');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;

    // Create a temporary link to download the QR code
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${mess.code}_QR_Code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  const handlePrintQR = () => {
    if (!qrCode) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${mess.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 28px;
              margin-bottom: 10px;
              color: #1f2937;
            }
            .code {
              font-size: 20px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 20px;
            }
            img {
              max-width: 400px;
              border: 2px solid #e5e7eb;
              padding: 20px;
              background: white;
            }
            .location {
              margin-top: 20px;
              font-size: 14px;
              color: #6b7280;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${mess.name}</h1>
            <div class="code">Code: ${mess.code}</div>
            <img src="${qrCode}" alt="QR Code" />
            <div class="location">
              ${mess.address}, ${mess.city}, ${mess.state}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 text-white">
                <QrCodeIcon className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">{mess.name} QR Code</h2>
                  <p className="text-blue-100 text-sm mt-1">Code: {mess.code}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading QR code...</p>
              </div>
            ) : qrCode ? (
              <>
                {/* QR Code Display */}
                <div className="flex justify-center">
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                    <img
                      src={qrCode}
                      alt={`${mess.name} QR Code`}
                      className="w-80 h-80 object-contain"
                    />
                  </div>
                </div>

                {/* QR Code Information */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                    <QrCodeIcon className="w-5 h-5 text-blue-600" />
                    QR Code Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Mess Name:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{qrData?.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Mess Code:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{qrData?.code}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{qrData?.latitude}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{qrData?.longitude}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Radius:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{qrData?.radius_meters}m</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Generated:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {qrData?.generated_at ? new Date(qrData.generated_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Important Notes:
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                    <li>This QR code is specific to {mess.name}</li>
                    <li>Only users assigned to this mess can scan this QR code</li>
                    <li>Users must be within {qrData?.radius_meters}m radius to mark attendance</li>
                    <li>Meal type is automatically determined by current time</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleDownloadQR}
                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download QR Code
                  </button>

                  <button
                    onClick={handlePrintQR}
                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print QR Code
                  </button>

                  <button
                    onClick={handleRegenerateQR}
                    disabled={regenerating}
                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors shadow-lg"
                  >
                    {regenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-5 h-5" />
                        Regenerate QR
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No QR code available</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessQRCodeModal;
