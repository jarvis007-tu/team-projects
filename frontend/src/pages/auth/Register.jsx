import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiMapPin } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import authService from '../../services/authService';
import apiClient from '../../services/api';
import { motion } from 'framer-motion';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMesses, setLoadingMesses] = useState(true);
  const [messes, setMesses] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    mess_id: ''
  });
  const [errors, setErrors] = useState({});

  // Validation helper functions
  const validateEmail = (email) => {
    // Check for proper email format with domain
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Indian phone number: 10 digits, starts with 6-9
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = (password) => {
    // Min 8 chars, at least one number, at least one special character
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password);
    return { hasMinLength, hasNumber, hasSpecialChar, isValid: hasMinLength && hasNumber && hasSpecialChar };
  };

  // Fetch active messes on component mount
  useEffect(() => {
    fetchActiveMesses();
  }, []);

  const fetchActiveMesses = async () => {
    try {
      const response = await apiClient.get('/messes/active');
      if (response.success) {
        setMesses(response.data);
      }
    } catch (error) {
      console.error('Error fetching messes:', error);
      // toast.error('Failed to load messes');
    } finally {
      setLoadingMesses(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }

    // Real-time validation feedback
    if (name === 'email' && value) {
      if (!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g., user@example.com)' }));
      }
    }

    if (name === 'phone' && value) {
      if (!validatePhone(value)) {
        setErrors(prev => ({ ...prev, phone: 'Phone number must be 10 digits and start with 6-9 (Indian format)' }));
      }
    }

    if (name === 'password' && value) {
      const pwdValidation = validatePassword(value);
      if (!pwdValidation.isValid) {
        let pwdErrors = [];
        if (!pwdValidation.hasMinLength) pwdErrors.push('minimum 8 characters');
        if (!pwdValidation.hasNumber) pwdErrors.push('at least one number');
        if (!pwdValidation.hasSpecialChar) pwdErrors.push('at least one special character');
        setErrors(prev => ({ ...prev, password: `Password must have: ${pwdErrors.join(', ')}` }));
      }
    }

    if (name === 'mess_id' && !value) {
      setErrors(prev => ({ ...prev, mess_id: 'Please select the mess' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Full validation before submit
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., user@example.com)';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits and start with 6-9 (Indian format)';
    }

    // Mess selection validation
    if (!formData.mess_id) {
      newErrors.mess_id = 'Please select the mess';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const pwdValidation = validatePassword(formData.password);
      if (!pwdValidation.isValid) {
        let pwdErrors = [];
        if (!pwdValidation.hasMinLength) pwdErrors.push('minimum 8 characters');
        if (!pwdValidation.hasNumber) pwdErrors.push('at least one number');
        if (!pwdValidation.hasSpecialChar) pwdErrors.push('at least one special character');
        newErrors.password = `Password must have: ${pwdErrors.join(', ')}`;
      }
    }

    // Confirm password validation
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Show first error as toast
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirm_password: formData.confirm_password,
        mess_id: formData.mess_id
      });

      if (response.success) {
        toast.success('Registration successful! Please login.');
        navigate('/login');
      }
    } catch (error) {
      // Show actual API error message instead of generic "Registration failed"
      // Handle different error response structures
      let errorMessage = 'Registration failed. Please try again.';

      if (error.response?.data?.message) {
        // Standard API error response
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        // Alternative error structure
        errorMessage = error.response.data.error;
      } else if (error.message && error.message !== 'Request failed with status code 409') {
        // Use error.message only if it's meaningful
        errorMessage = error.message;
      }

      // For 409 conflict (user already exists), show specific message
      if (error.response?.status === 409) {
        errorMessage = error.response?.data?.message || 'User with this email or phone already exists';
      }

      toast.error(errorMessage);
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
        {/* Register Card */}
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
              Create Account
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-gray-600 dark:text-gray-400 text-sm"
            >
              Join Hostel Eats today
            </motion.p>
          </div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="px-8 pb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiMail className={`h-5 w-5 ${errors.email ? 'text-red-500' : 'text-gray-400'} group-focus-within:text-blue-500 transition-colors duration-200`} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.email ? 'ring-2 ring-red-500/50' : ''}`}
                    placeholder="Enter your email (e.g., user@example.com)"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.email}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a valid email with complete domain (e.g., user@example.com)</p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiPhone className={`h-5 w-5 ${errors.phone ? 'text-red-500' : 'text-gray-400'} group-focus-within:text-blue-500 transition-colors duration-200`} />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.phone ? 'ring-2 ring-red-500/50' : ''}`}
                    placeholder="10-digit Indian phone number"
                    required
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.phone}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be 10 digits, starting with 6-9 (Indian format)</p>
              </div>

              {/* Mess Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Select Your Mess *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <FiMapPin className={`h-5 w-5 ${errors.mess_id ? 'text-red-500' : 'text-gray-400'} group-focus-within:text-blue-500 transition-colors duration-200`} />
                  </div>
                  <select
                    name="mess_id"
                    value={formData.mess_id}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${errors.mess_id ? 'ring-2 ring-red-500/50' : ''}`}
                    required
                    disabled={loadingMesses}
                  >
                    <option value="" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                      {loadingMesses ? 'Loading messes...' : 'Choose your mess location'}
                    </option>
                    {messes.map((mess) => (
                      <option
                        key={mess.mess_id}
                        value={mess.mess_id}
                        className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white py-2"
                      >
                        {mess.name} - {mess.city}, {mess.state}
                      </option>
                    ))}
                  </select>
                  {/* Custom dropdown arrow */}
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.mess_id && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.mess_id}</p>
                )}
                {formData.mess_id && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-gray-600 dark:text-gray-400 ml-1"
                  >
                    {messes.find(m => m.mess_id === formData.mess_id)?.address}
                  </motion.p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className={`h-5 w-5 ${errors.password ? 'text-red-500' : 'text-gray-400'} group-focus-within:text-blue-500 transition-colors duration-200`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.password ? 'ring-2 ring-red-500/50' : ''}`}
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FiEyeOff className="h-5 w-5" />
                    ) : (
                      <FiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.password}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be at least 8 characters with numbers and special characters</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className={`h-5 w-5 ${errors.confirm_password ? 'text-red-500' : 'text-gray-400'} group-focus-within:text-blue-500 transition-colors duration-200`} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-slate-700/50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.confirm_password ? 'ring-2 ring-red-500/50' : ''}`}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="h-5 w-5" />
                    ) : (
                      <FiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">{errors.confirm_password}</p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading || loadingMesses}
                className="w-full mt-6 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Sign Up'
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white/95 dark:bg-slate-800/95 text-gray-500 dark:text-gray-400">Or</span>
              </div>
            </div>

            {/* Login Link */}
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6"
        >
          By signing up, you agree to our{' '}
          <a href="#" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
            Privacy Policy
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Register;
