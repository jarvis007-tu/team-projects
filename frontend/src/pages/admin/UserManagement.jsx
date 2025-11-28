import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import userService from '../../services/userService';
import messService from '../../services/messService';
import { useAuth } from '../../contexts/AuthContext';

const UserManagement = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [messes, setMesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubscriptionStatus, setFilterSubscriptionStatus] = useState('all');
  const [filterMess, setFilterMess] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    mess_id: '',
    role: 'subscriber',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState({});

  // Validation helper functions
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Indian phone number: 10 digits, starts with 6-9
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = (password) => {
    // Min 6 chars for admin panel, at least one number, at least one special character
    const hasMinLength = password.length >= 6;
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password);
    return { hasMinLength, hasNumber, hasSpecialChar, isValid: hasMinLength && hasNumber && hasSpecialChar };
  };

  // Fetch messes only once on mount
  useEffect(() => {
    fetchMesses();
  }, []);

  // Fetch users with debouncing for search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [currentPage, searchTerm, filterRole, filterStatus, filterSubscriptionStatus, filterMess]);

  const fetchMesses = async () => {
    try {
      const response = await messService.getAllMesses();
      console.log('🏢 Messes API Response:', response); // Debug log

      // Handle response - axios interceptor already unwrapped it
      if (response && response.success !== false) {
        const messesList = response.data?.messes || response.messes || [];
        console.log('🏢 Messes loaded:', messesList.length); // Debug log
        setMesses(messesList);
      } else {
        console.error('Failed to fetch messes - response not successful');
        setMesses([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch messes:', error);
      setMesses([]);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10
      };

      if (searchTerm) params.search = searchTerm;
      if (filterRole !== 'all') params.role = filterRole;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterSubscriptionStatus !== 'all') params.subscription_status = filterSubscriptionStatus;
      if (filterMess !== 'all') params.mess_id = filterMess;

      const response = await userService.getAllUsers(params);
      setUsers(response.data?.users || []);
      setTotalPages(response.data?.pagination?.pages || 1);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    setFormErrors(prev => ({ ...prev, [name]: '' }));

    // Real-time validation feedback
    if (name === 'email' && value) {
      if (!validateEmail(value)) {
        setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g., user@example.com)' }));
      }
    }

    if (name === 'phone' && value) {
      if (!validatePhone(value)) {
        setFormErrors(prev => ({ ...prev, phone: 'Phone number must be 10 digits and start with 6-9 (Indian format)' }));
      }
    }

    if (name === 'password' && value) {
      const pwdValidation = validatePassword(value);
      if (!pwdValidation.isValid) {
        let pwdErrors = [];
        if (!pwdValidation.hasMinLength) pwdErrors.push('minimum 6 characters');
        if (!pwdValidation.hasNumber) pwdErrors.push('at least one number');
        if (!pwdValidation.hasSpecialChar) pwdErrors.push('at least one special character');
        setFormErrors(prev => ({ ...prev, password: `Password must have: ${pwdErrors.join(', ')}` }));
      }
    }

    if (name === 'mess_id' && !value) {
      setFormErrors(prev => ({ ...prev, mess_id: 'Please select the mess' }));
    }
  }, []); // Empty deps - function never needs to change

  const handleCreateUser = async (e) => {
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

    // Mess selection validation (Super Admin only)
    if (isSuperAdmin && !formData.mess_id) {
      newErrors.mess_id = 'Please select the mess';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const pwdValidation = validatePassword(formData.password);
      if (!pwdValidation.isValid) {
        let pwdErrors = [];
        if (!pwdValidation.hasMinLength) pwdErrors.push('minimum 6 characters');
        if (!pwdValidation.hasNumber) pwdErrors.push('at least one number');
        if (!pwdValidation.hasSpecialChar) pwdErrors.push('at least one special character');
        newErrors.password = `Password must have: ${pwdErrors.join(', ')}`;
      }
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    try {
      const userData = { ...formData };

      // Handle mess_id properly
      if (!isSuperAdmin) {
        // Mess admin uses their own mess_id
        userData.mess_id = currentUser.mess_id;
      }

      await userService.createUser(userData);
      toast.success('User created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      // Show actual API error message
      let errorMessage = 'Failed to create user';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      // For 409 conflict (user already exists)
      if (error.response?.status === 409) {
        errorMessage = error.response?.data?.message || 'User with this email or phone already exists';
      }

      toast.error(errorMessage);
    }
  };

  const handleUpdateUser = async (e) => {
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

    // Mess selection validation (Super Admin only)
    if (isSuperAdmin && !formData.mess_id) {
      newErrors.mess_id = 'Please select the mess';
    }

    // Password validation (only if provided)
    if (formData.password) {
      const pwdValidation = validatePassword(formData.password);
      if (!pwdValidation.isValid) {
        let pwdErrors = [];
        if (!pwdValidation.hasMinLength) pwdErrors.push('minimum 6 characters');
        if (!pwdValidation.hasNumber) pwdErrors.push('at least one number');
        if (!pwdValidation.hasSpecialChar) pwdErrors.push('at least one special character');
        newErrors.password = `Password must have: ${pwdErrors.join(', ')}`;
      }
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    try {
      const updateData = { ...formData };

      // Remove password if empty
      if (!updateData.password) {
        delete updateData.password;
      }

      await userService.updateUser(selectedUser._id || selectedUser.user_id, updateData);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      // Show actual API error message
      let errorMessage = 'Failed to update user';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      // For 409 conflict (duplicate email/phone)
      if (error.response?.status === 409) {
        errorMessage = error.response?.data?.message || 'User with this email or phone already exists';
      }

      toast.error(errorMessage);
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    // Prevent deleting yourself
    const currentUserId = currentUser?._id || currentUser?.user_id;
    if (userId === currentUserId) {
      toast.error('You cannot delete your own account');
      return;
    }

    // Mess admins cannot delete other mess admins - only super admin can
    if (!isSuperAdmin && (userRole === 'mess_admin' || userRole === 'super_admin')) {
      toast.error('Only Super Admin can delete admin accounts');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await userService.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      mess_id: user.mess_id?._id || user.mess_id || '',
      role: user.role || 'subscriber',
      status: user.status || 'active'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      mess_id: isSuperAdmin ? '' : currentUser.mess_id,
      role: 'subscriber',
      status: 'active'
    });
    setFormErrors({});
    setSelectedUser(null);
  };

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      mess_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      subscriber: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
    return badges[role] || badges.subscriber;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return badges[status] || badges.inactive;
  };

  // Get subscription-based status for subscribers
  const getSubscriptionStatus = (user) => {
    // For admins, show account status
    if (user.role === 'super_admin' || user.role === 'mess_admin') {
      return { status: user.status, label: user.status?.toUpperCase() };
    }
    // For subscribers, show subscription status
    if (user.has_active_subscription) {
      return { status: 'active', label: 'ACTIVE' };
    }
    return { status: 'inactive', label: 'INACTIVE' };
  };

  const UserFormModal = useMemo(() => {
    const isEdit = showEditModal;

    return (
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <UserPlusIcon className="w-7 h-7 text-blue-600" />
                  {isEdit ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={() => {
                    isEdit ? setShowEditModal(false) : setShowAddModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={isEdit ? handleUpdateUser : handleCreateUser} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  {/* Mess Selection - Super Admin Only */}
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Mess Location <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="mess_id"
                        value={formData.mess_id}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all ${formErrors.mess_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        required
                      >
                        <option value="">Please select the mess</option>
                        {messes.map((mess) => (
                          <option key={mess._id || mess.mess_id} value={mess._id || mess.mess_id}>
                            {mess.name} ({mess.code})
                          </option>
                        ))}
                      </select>
                      {formErrors.mess_id && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.mess_id}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please select the mess for this user</p>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        required
                      >
                        <option value="subscriber">Subscriber</option>
                        <option value="mess_admin">Mess Admin</option>
                        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      </select>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="user@example.com"
                        required
                      />
                      {formErrors.email && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a valid email with complete domain</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        maxLength={10}
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all ${formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="10-digit Indian phone number"
                        required
                      />
                      {formErrors.phone && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be 10 digits, starting with 6-9</p>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Password {!isEdit && <span className="text-red-500">*</span>}
                        {isEdit && <span className="text-sm text-gray-500">(leave empty to keep current)</span>}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all ${formErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="Create a strong password"
                        required={!isEdit}
                      />
                      {formErrors.password && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min 6 characters with numbers and special characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive (Limited Access)</option>
                        <option value="suspended">Suspended</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Active: Full access | Inactive: Can log in with limited access | Suspended/Blocked: Cannot log in
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      isEdit ? setShowEditModal(false) : setShowAddModal(false);
                      resetForm();
                    }}
                    className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg shadow-blue-500/30 transition-all duration-200"
                  >
                    {isEdit ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }, [showAddModal, showEditModal, formData, messes, isSuperAdmin, handleInputChange, handleCreateUser, handleUpdateUser, resetForm]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage users and their access</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 transition-all duration-200 font-medium"
        >
          <UserPlusIcon className="w-5 h-5" />
          Add New User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="mess_admin">Mess Admin</option>
            <option value="subscriber">Subscriber</option>
          </select>

          {/* Account Status Filter (User's account status) */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            <option value="all">All Account Status</option>
            <option value="active">Active Account</option>
            <option value="inactive">Inactive Account</option>
            <option value="suspended">Suspended</option>
            <option value="blocked">Blocked</option>
          </select>

          {/* Subscription Status Filter (For subscribers only) */}
          <select
            value={filterSubscriptionStatus}
            onChange={(e) => setFilterSubscriptionStatus(e.target.value)}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            <option value="all">All Subscription Status</option>
            <option value="subscribed">Active Subscription</option>
            <option value="not_subscribed">No Active Subscription</option>
          </select>

          {/* Mess Filter - Super Admin Only */}
          {isSuperAdmin && (
            <select
              value={filterMess}
              onChange={(e) => setFilterMess(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">All Messes</option>
              {messes.map((mess) => (
                <option key={mess._id || mess.mess_id} value={mess._id || mess.mess_id}>
                  {mess.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Users Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first user</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlusIcon className="w-5 h-5" />
              Add First User
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Mess</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subscription</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user._id || user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{user.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <EnvelopeIcon className="w-4 h-4" />
                          {user.email}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4" />
                          {user.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.mess_id?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                        {user.role?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                        {user.status?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const subStatus = getSubscriptionStatus(user);
                        return (
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(subStatus.status)}`}>
                            {subStatus.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        {(() => {
                          const isCurrentUser = (currentUser?._id || currentUser?.user_id) === (user._id || user.user_id);
                          const isAdminAndNotSuperAdmin = !isSuperAdmin && (user.role === 'mess_admin' || user.role === 'super_admin');
                          const isDisabled = isCurrentUser || isAdminAndNotSuperAdmin;
                          const title = isCurrentUser
                            ? "Cannot delete your own account"
                            : isAdminAndNotSuperAdmin
                              ? "Only Super Admin can delete admin accounts"
                              : "Delete User";

                          return (
                            <button
                              onClick={() => handleDeleteUser(user._id || user.user_id, user.role)}
                              className={`p-2.5 rounded-lg transition-colors ${
                                isDisabled
                                  ? 'text-gray-400 cursor-not-allowed opacity-50'
                                  : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              }`}
                              title={title}
                              disabled={isDisabled}
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {UserFormModal}
    </div>
  );
};

export default UserManagement;
