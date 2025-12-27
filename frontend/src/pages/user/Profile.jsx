import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  PencilIcon,
  CheckIcon,
  CameraIcon,
  MapPinIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import authService from '../../services/authService';
import subscriptionService from '../../services/subscriptionService';

// Validation schemas - room_number and year_of_study are optional (can be blank)
const profileSchema = yup.object({
  full_name: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().matches(/^[0-9]{10}$/, 'Phone number must be 10 digits').required('Phone is required'),
  room_number: yup.string(),
  hostel_block: yup.string(),
  year_of_study: yup.string(),
  dietary_preferences: yup.string()
});

const passwordSchema = yup.object({
  current_password: yup.string().required('Current password is required'),
  new_password: yup.string().min(6, 'Password must be at least 6 characters').required('New password is required'),
  confirm_password: yup.string().oneOf([yup.ref('new_password')], 'Passwords must match').required('Confirm password is required')
});

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Profile form
  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors }, reset: resetProfile } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      room_number: user?.room_number || '',
      hostel_block: user?.hostel_block || '',
      year_of_study: user?.year_of_study || '',
      dietary_preferences: user?.dietary_preferences || ''
    }
  });

  // Password form
  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPassword } = useForm({
    resolver: yupResolver(passwordSchema)
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      // Use actual user data - don't set mock default values for room_number and year_of_study
      const profileData = {
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        room_number: user?.room_number || '', // Blank by default
        hostel_block: user?.hostel_block || '',
        year_of_study: user?.year_of_study || '', // Blank by default
        dietary_preferences: user?.dietary_preferences || '',
        profile_image: user?.profile_image || null,
        created_at: user?.createdAt || user?.created_at,
        status: user?.status || 'active'
      };

      resetProfile(profileData);
      setProfileImage(profileData.profile_image);

      // Check if user has active subscription
      try {
        const subResponse = await subscriptionService.getActiveSubscription();
        const subscription = subResponse.data?.subscription || subResponse.data;
        setHasActiveSubscription(!!subscription);
      } catch {
        setHasActiveSubscription(false);
      }
    } catch (error) {
      toast.error('Failed to fetch profile');
      console.error('Profile fetch error:', error);
    }
  };

  const onSubmitProfile = async (data) => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual service
      // const response = await userService.updateProfile(data);
      
      // Mock successful update
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      const updatedUser = { ...user, ...data };
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (data) => {
    setLoading(true);
    try {
      // Call actual API to change password
      await authService.changePassword(data.current_password, data.new_password);

      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      resetPassword();
    } catch (error) {
      // Handle specific error messages from backend
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error?.message ||
                          'Failed to change password';

      // Check for incorrect password error
      if (errorMessage.toLowerCase().includes('incorrect') ||
          errorMessage.toLowerCase().includes('wrong') ||
          errorMessage.toLowerCase().includes('invalid')) {
        toast.error('Current password is incorrect');
      } else {
        toast.error(errorMessage);
      }
      console.error('Password change error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to API
      const response = await authService.uploadProfileImage(base64);
      const imageData = response.data?.profile_image || base64;

      setProfileImage(imageData);
      updateUser({ ...user, profile_image: imageData });
      // Also update localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, profile_image: imageData }));

      toast.success('Profile image updated successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error?.message ||
                          'Failed to upload image';
      toast.error(errorMessage);
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your account info</p>
          </div>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm sm:text-base"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setEditMode(false);
                  resetProfile();
                }}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitProfile(onSubmitProfile)}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckIcon className="w-4 h-4 mr-2" />
                )}
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
            <div className="text-center">
              {/* Profile Image */}
              <div className="relative inline-block mb-3 sm:mb-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/20">
                      <UserCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}
                </div>

                {/* Upload Loading Overlay */}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white"></div>
                  </div>
                )}

                {/* Camera Button */}
                <label className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-primary-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-600 transition-colors">
                  <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {/* User Info */}
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate px-2">{user?.full_name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">ID: {user?.user_id}</p>

              {user?.status === 'active' && (
                <div className="flex items-center justify-center mt-2 text-green-600 dark:text-green-400">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                  <span className="text-xs sm:text-sm font-medium">Verified</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t dark:border-dark-border">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Member Since</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user?.createdAt || user?.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Account Type</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {user?.role === 'user' ? 'Student' : user?.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Subscription</span>
                  {hasActiveSubscription ? (
                    <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Active</span>
                  ) : (
                    <span className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">Inactive</span>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password Button */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full mt-4 sm:mt-6 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm"
            >
              <LockClosedIcon className="w-4 h-4 mr-2" />
              Change Password
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
            <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    <UserCircleIcon className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Full Name
                  </label>
                  <input
                    {...registerProfile('full_name')}
                    disabled={!editMode}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.full_name && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.full_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    <EnvelopeIcon className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Email
                  </label>
                  <input
                    {...registerProfile('email')}
                    type="email"
                    disabled={!editMode}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.email && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    <PhoneIcon className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Phone
                  </label>
                  <input
                    {...registerProfile('phone')}
                    disabled={!editMode}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.phone && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.phone.message}</p>
                  )}
                </div>

                {/* Room Number */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    <MapPinIcon className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Room No.
                  </label>
                  <input
                    {...registerProfile('room_number')}
                    disabled={!editMode}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.room_number && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.room_number.message}</p>
                  )}
                </div>

                {/* Hostel Block */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    <MapPinIcon className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Hostel Block
                  </label>
                  <input
                    {...registerProfile('hostel_block')}
                    disabled={!editMode}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.hostel_block && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.hostel_block.message}</p>
                  )}
                </div>

                {/* Year of Study */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    <AcademicCapIcon className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Year
                  </label>
                  <select
                    {...registerProfile('year_of_study')}
                    disabled={!editMode}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Select</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="pg">PG</option>
                  </select>
                  {profileErrors.year_of_study && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{profileErrors.year_of_study.message}</p>
                  )}
                </div>

                {/* Dietary Preferences */}
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    Dietary Preferences
                  </label>
                  <textarea
                    {...registerProfile('dietary_preferences')}
                    disabled={!editMode}
                    rows="2"
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Any allergies or restrictions..."
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Change Password</h3>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    Current Password
                  </label>
                  <input
                    {...registerPassword('current_password')}
                    type="password"
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {passwordErrors.current_password && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordErrors.current_password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    New Password
                  </label>
                  <input
                    {...registerPassword('new_password')}
                    type="password"
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {passwordErrors.new_password && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordErrors.new_password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    Confirm Password
                  </label>
                  <input
                    {...registerPassword('confirm_password')}
                    type="password"
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {passwordErrors.confirm_password && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordErrors.confirm_password.message}</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-2 sm:space-x-3 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    resetPassword();
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;