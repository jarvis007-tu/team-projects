import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage on first render
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        return userData;
      }
      return null;
    } catch (error) {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    const authenticated = !!(token && storedUser);
    return authenticated;
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Remove the useEffect that calls checkAuth
  // We don't need it since we're initializing state from localStorage

  const checkAuth = async () => {
    // This function can be called manually if needed
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const login = async (credentials) => {
    try {
      // Use real API authentication
      const response = await authService.login(credentials);
      const { user, tokens } = response.data;
      
      // Store authentication data
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      
      toast.success('Login successful!');
      
      // Navigate based on role
      const targetPath = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
      navigate(targetPath, { replace: true });
      
      return response;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const { user, tokens } = response.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      setIsAuthenticated(true);
      
      toast.success('Registration successful!');
      navigate('/user/dashboard');
      
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout API if available
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      // Clear all auth data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      setUser(response.data);
      toast.success('Profile updated successfully');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await authService.refreshToken(refreshToken);
      const { tokens } = response.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      return tokens.accessToken;
    } catch (error) {
      logout();
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    updateUser: setUser,
    refreshToken,
    checkAuth,
    isAdmin: user?.role === 'admin',
    isSubscriber: user?.role === 'subscriber',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};