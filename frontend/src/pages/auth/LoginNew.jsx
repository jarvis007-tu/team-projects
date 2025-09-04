import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login({
        email: formData.email,
        password: formData.password
      });

      if (response.success) {
        // Login success is already handled in AuthContext with toast and navigation
        // No need to navigate here as it's done in the login function
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Quick login for demo
  const quickLogin = (email, password) => {
    setFormData({ email, password });
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-full mb-4">
            <span className="text-white text-3xl font-bold">HE</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to Hostel</h1>
          <h1 className="text-3xl font-bold text-primary-500">Eats Admin</h1>
          <p className="text-gray-400 mt-2">Enter your credentials to access admin panel</p>
        </div>

        {/* Form Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 bg-dark-lighter border border-dark-border text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-500"
                  placeholder="admin@hosteleats.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-3 bg-dark-lighter border border-dark-border text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary-500 bg-dark-lighter border-dark-border rounded focus:ring-primary-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-primary-500 hover:text-primary-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-bg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-dark-card text-gray-500">Or</span>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-gray-400">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-medium text-primary-500 hover:text-primary-400 transition-colors"
            >
              Create Account
            </Link>
          </p>

          {/* Demo Credentials */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
              <p className="text-sm text-yellow-400 font-medium mb-2">
                Quick Login (Demo):
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => quickLogin('admin@hosteleats.com', 'admin123')}
                  className="w-full text-left px-3 py-2 bg-dark-lighter hover:bg-dark-border rounded text-sm text-gray-300 transition-colors"
                >
                  Admin: admin@hosteleats.com
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('user@hosteleats.com', 'user123')}
                  className="w-full text-left px-3 py-2 bg-dark-lighter hover:bg-dark-border rounded text-sm text-gray-300 transition-colors"
                >
                  User: user@hosteleats.com
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;