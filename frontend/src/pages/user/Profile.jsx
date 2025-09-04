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
  CalendarDaysIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Validation schemas
const profileSchema = yup.object({
  full_name: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().matches(/^[0-9]{10}$/, 'Phone number must be 10 digits').required('Phone is required'),
  room_number: yup.string().required('Room number is required'),
  hostel_block: yup.string().required('Hostel block is required'),
  year_of_study: yup.string().required('Year of study is required'),
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
      // Simulated API call - replace with actual service
      // const response = await userService.getProfile();
      
      // Mock profile data for development
      const mockProfile = {
        ...user,
        phone: user?.phone || '9876543210',
        room_number: user?.room_number || 'A101',
        hostel_block: user?.hostel_block || 'Block A',
        year_of_study: user?.year_of_study || '2',
        dietary_preferences: user?.dietary_preferences || 'Vegetarian',
        profile_image: user?.profile_image || null,
        created_at: user?.created_at || new Date().toISOString(),
        status: user?.status || 'active'
      };
      
      resetProfile(mockProfile);
      setProfileImage(mockProfile.profile_image);
      updateUser(mockProfile);
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
      // Simulated API call - replace with actual service
      // await userService.changePassword(data);
      
      // Mock successful password change
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      resetPassword();
    } catch (error) {
      toast.error('Failed to change password');
      console.error('Password change error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('profile_image', file);

    setUploadingImage(true);
    try {
      // Simulated API call - replace with actual service
      // const response = await userService.uploadProfileImage(formData);
      
      // Mock successful image upload
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      
      const mockImageUrl = URL.createObjectURL(file);
      setProfileImage(mockImageUrl);
      updateUser({ ...user, profile_image: mockImageUrl });
      toast.success('Profile image updated successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account information and preferences</p>
          </div>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setEditMode(false);
                  resetProfile();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitProfile(onSubmitProfile)}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckIcon className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-6">
            <div className="text-center">
              {/* Profile Image */}
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/20">
                      <UserCircleIcon className="w-16 h-16 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}
                </div>
                
                {/* Upload Loading Overlay */}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                
                {/* Camera Button */}
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-600 transition-colors">
                  <CameraIcon className="w-5 h-5 text-white" />
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
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{user?.full_name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Student ID: {user?.user_id}</p>
              
              {user?.status === 'active' && (
                <div className="flex items-center justify-center mt-2 text-green-600 dark:text-green-400">
                  <CheckIcon className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Verified Account</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t dark:border-dark-border">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user?.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Account Type</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {user?.role === 'user' ? 'Student' : user?.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subscription</span>
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Active</span>
                </div>
              </div>
            </div>

            {/* Change Password Button */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full mt-6 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center text-gray-700 dark:text-gray-300"
            >
              <LockClosedIcon className="w-4 h-4 mr-2" />
              Change Password
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-6">
            <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <UserCircleIcon className="inline w-4 h-4 mr-1" />
                    Full Name
                  </label>
                  <input
                    {...registerProfile('full_name')}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.full_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileErrors.full_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <EnvelopeIcon className="inline w-4 h-4 mr-1" />
                    Email
                  </label>
                  <input
                    {...registerProfile('email')}
                    type="email"
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileErrors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <PhoneIcon className="inline w-4 h-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    {...registerProfile('phone')}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.phone && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileErrors.phone.message}</p>
                  )}
                </div>

                {/* Room Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPinIcon className="inline w-4 h-4 mr-1" />
                    Room Number
                  </label>
                  <input
                    {...registerProfile('room_number')}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.room_number && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileErrors.room_number.message}</p>
                  )}
                </div>

                {/* Hostel Block */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPinIcon className="inline w-4 h-4 mr-1" />
                    Hostel Block
                  </label>
                  <input
                    {...registerProfile('hostel_block')}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {profileErrors.hostel_block && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileErrors.hostel_block.message}</p>
                  )}
                </div>

                {/* Year of Study */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <AcademicCapIcon className="inline w-4 h-4 mr-1" />
                    Year of Study
                  </label>
                  <select
                    {...registerProfile('year_of_study')}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="pg">Post Graduate</option>
                  </select>
                  {profileErrors.year_of_study && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileErrors.year_of_study.message}</p>
                  )}
                </div>

                {/* Dietary Preferences */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dietary Preferences
                  </label>
                  <textarea
                    {...registerProfile('dietary_preferences')}
                    disabled={!editMode}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Any allergies or dietary restrictions..."
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    {...registerPassword('current_password')}
                    type="password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {passwordErrors.current_password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.current_password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    {...registerPassword('new_password')}
                    type="password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {passwordErrors.new_password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.new_password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    {...registerPassword('confirm_password')}
                    type="password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  {passwordErrors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.confirm_password.message}</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    resetPassword();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
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