import api from './api';

const authService = {
  // Authentication
  login: (credentials) => api.post('/auth/login', credentials),
  
  register: (userData) => api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  
  // Password management
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  
  resetPassword: (resetToken, newPassword) => 
    api.post('/auth/reset-password', { resetToken, newPassword }),
  
  changePassword: (currentPassword, newPassword) => 
    api.post('/auth/change-password', { currentPassword, newPassword }),
  
  // Profile
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  
  // Verification
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  
  resendVerificationEmail: () => api.post('/auth/resend-verification'),
};

export default authService;