import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

const schema = yup.object({
  emailOrPhone: yup.string().required('Email or Phone is required'),
  password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Determine if input is email or phone
      const isEmail = data.emailOrPhone.includes('@');
      const credentials = {
        [isEmail ? 'email' : 'phone']: data.emailOrPhone,
        password: data.password
      };

      await login(credentials);
      // Navigation handled in AuthContext
    } catch (error) {
      if (error.response?.status === 401) {
        setError('password', { message: 'Invalid credentials' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-teal-600/10 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-teal-900/20"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Login Card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 dark:shadow-black/20 border border-white/20 dark:border-slate-700/50 overflow-hidden">
          {/* Header Section */}
          <div className="relative px-8 pt-12 pb-8 text-center">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-teal-500/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-teal-600/20"></div>
            
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
              className="relative inline-flex items-center justify-center w-20 h-20 mb-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full shadow-lg"></div>
              <div className="absolute inset-0.5 bg-gradient-to-br from-blue-400 to-teal-400 rounded-full"></div>
              <span className="relative text-white text-2xl font-bold tracking-wider">HE</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
            >
              Welcome Back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-gray-600 dark:text-gray-400 text-sm"
            >
              Sign in to your Hostel Eats account
            </motion.p>
          </div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="px-8 pb-8"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email/Phone Input */}
              <div className="space-y-2">
                <label htmlFor="emailOrPhone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Email or Phone
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  </div>
                  <input
                    {...register('emailOrPhone')}
                    type="text"
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.emailOrPhone ? 'ring-2 ring-red-500/50 bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                    placeholder="Enter your email or phone"
                  />
                </div>
                {errors.emailOrPhone && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-1"
                  >
                    {errors.emailOrPhone.message}
                  </motion.p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.password ? 'ring-2 ring-red-500/50 bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-1"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-5 h-5 rounded border-2 transition-all duration-200 ${
                    rememberMe 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
                  }`}>
                    {rememberMe && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 w-3 h-3 text-white m-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </motion.svg>
                    )}
                  </div>
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 select-none">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white text-base shadow-lg transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 hover:shadow-xl hover:shadow-blue-500/25 active:shadow-lg'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </motion.button>

              {/* Register Link */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link 
                    to="/register" 
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Demo Credentials */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-6 p-4 bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-2xl border border-amber-200/50 dark:border-amber-800/50"
          >
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold">
                Demo Credentials
              </p>
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1 pl-4">
              <p className="font-mono">Admin: admin@hosteleats.com / admin123</p>
              <p className="font-mono">User: user@hosteleats.com / user123</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Login;