import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

const AccountDeleted = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-orange-600/10 to-amber-600/10 dark:from-red-900/20 dark:via-orange-900/20 dark:to-amber-900/20"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-red-500/10 dark:shadow-black/20 border border-white/20 dark:border-slate-700/50 overflow-hidden">
          {/* Header Section */}
          <div className="relative px-8 pt-12 pb-8 text-center">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-amber-500/10 dark:from-red-600/20 dark:via-orange-600/20 dark:to-amber-600/20"></div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
              className="relative inline-flex items-center justify-center w-20 h-20 mb-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-full shadow-lg"></div>
              <div className="absolute inset-0.5 bg-gradient-to-br from-red-400 to-orange-400 rounded-full"></div>
              <ExclamationTriangleIcon className="relative w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
            >
              Account Deleted
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-gray-600 dark:text-gray-400 text-sm"
            >
              Your account has been removed from our system
            </motion.p>
          </div>

          {/* Content Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="px-8 pb-8"
          >
            {/* Message Box */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-5 mb-6">
              <p className="text-red-800 dark:text-red-200 text-sm leading-relaxed">
                Your account has been deleted by the administrator. As a result:
              </p>
              <ul className="mt-3 text-red-700 dark:text-red-300 text-sm space-y-2">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  You can no longer access your account
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  Your subscription and meal access have been revoked
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  Your attendance history has been archived
                </li>
              </ul>
            </div>

            {/* Contact Support Section */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Need Help?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                If you believe this was done in error, please contact our support team:
              </p>
              <div className="space-y-2">
                <a
                  href="mailto:support@hosteleats.com"
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  support@hosteleats.com
                </a>
                <a
                  href="tel:+911234567890"
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <PhoneIcon className="w-4 h-4 mr-2" />
                  +91 123 456 7890
                </a>
              </div>
            </div>

            {/* Back to Login Button */}
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 rounded-xl font-semibold text-white text-base shadow-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 hover:shadow-xl transition-all duration-200"
              >
                Back to Login
              </motion.button>
            </Link>

            {/* Register Link */}
            <div className="text-center pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Want to create a new account?{' '}
                <Link
                  to="/register"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccountDeleted;
