import React, { useState, useEffect } from 'react';
import { 
  FiUser, FiBell, FiShield, FiKey, FiSave,
  FiUpload, FiEdit2, FiTrash2, FiEye, FiEyeOff,
  FiMoon, FiSun, FiGlobe, FiSmartphone
} from 'react-icons/fi';
import { MdSecurity, MdNotifications, MdPalette, MdLanguage } from 'react-icons/md';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar: null,
    bio: '',
    date_of_birth: '',
    address: ''
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    meal_reminders: true,
    subscription_alerts: true,
    promotional_emails: false,
    weekly_reports: true
  });

  const [preferences, setPreferences] = useState({
    theme: 'light', // light, dark, system
    language: 'en',
    timezone: 'Asia/Kolkata',
    date_format: 'DD/MM/YYYY',
    currency: 'INR'
  });

  const [security, setSecurity] = useState({
    two_factor_enabled: false,
    login_alerts: true,
    session_timeout: 30, // minutes
    password_expiry: 90 // days
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [activityLog, setActivityLog] = useState([]);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: FiUser, desc: 'Manage your personal information' },
    { id: 'notifications', name: 'Notifications', icon: FiBell, desc: 'Control notification preferences' },
    { id: 'preferences', name: 'Preferences', icon: MdPalette, desc: 'Customize your experience' },
    { id: 'security', name: 'Security', icon: FiShield, desc: 'Secure your account' },
    // { id: 'activity', name: 'Activity Log', icon: MdSecurity, desc: 'View your account activity' }
  ];

  useEffect(() => {
    fetchUserData();
    if (activeTab === 'activity') {
      fetchActivityLog();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      if (user) {
        setProfile({
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          bio: user.bio || '',
          date_of_birth: user.date_of_birth || '',
          address: user.address || '',
          avatar: user.avatar_url
        });
      }

      // Fetch user settings
      const settingsResponse = await userService.getUserSettings();
      if (settingsResponse.data) {
        setPreferences(settingsResponse.data.preferences || preferences);
        setSecurity(settingsResponse.data.security || security);
      }

      // Fetch notification preferences
      const notificationResponse = await userService.getNotificationPreferences();
      if (notificationResponse.data) {
        setNotifications(notificationResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    try {
      const response = await userService.getUserActivityLog({ limit: 20 });
      setActivityLog(response.data);
    } catch (error) {
      toast.error('Failed to fetch activity log');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await userService.updateUserProfile(profile);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    try {
      setLoading(true);
      await userService.updateNotificationPreferences(notifications);
      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error('Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      setLoading(true);
      await userService.updateUserSettings({ preferences });
      toast.success('Preferences updated successfully');
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecurity = async () => {
    try {
      setLoading(true);
      await userService.updateUserSettings({ security });
      toast.success('Security settings updated');
    } catch (error) {
      toast.error('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    try {
      setLoading(true);
      await userService.changePassword(passwordData);
      toast.success('Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordFields(false);
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        await userService.uploadProfilePicture(file);
        toast.success('Profile picture updated');
        // Refresh user data
        fetchUserData();
      } catch (error) {
        toast.error('Failed to upload profile picture');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Personal Information</h3>
        <form onSubmit={handleUpdateProfile}>
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-primary-500 text-white p-2 rounded-full cursor-pointer hover:bg-primary-600">
                <FiUpload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{profile.full_name}</h4>
              <p className="text-gray-600 dark:text-gray-400">{profile.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click the upload button to change your profile picture</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Full Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Date of Birth</label>
              <input
                type="date"
                value={profile.date_of_birth}
                onChange={(e) => setProfile({...profile, date_of_birth: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Bio</label>
              <textarea
                rows="3"
                value={profile.bio}
                onChange={(e) => setProfile({...profile, bio: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Address</label>
              <textarea
                rows="2"
                value={profile.address}
                onChange={(e) => setProfile({...profile, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder="Your address..."
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password</h3>
          <button
            onClick={() => setShowPasswordFields(!showPasswordFields)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            {showPasswordFields ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordFields && (
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                  minLength="8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                <FiKey className="w-4 h-4 mr-2" />
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Notification Preferences</h3>
      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Communication Channels</h4>
          <div className="space-y-4">
            {[
              { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive updates via email' },
              { key: 'sms_notifications', label: 'SMS Notifications', desc: 'Get text message alerts' },
              { key: 'push_notifications', label: 'Push Notifications', desc: 'Browser and mobile notifications' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">{item.label}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) => setNotifications({...notifications, [item.key]: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Content Preferences</h4>
          <div className="space-y-4">
            {[
              { key: 'meal_reminders', label: 'Meal Reminders', desc: 'Get reminded about upcoming meals' },
              { key: 'subscription_alerts', label: 'Subscription Alerts', desc: 'Updates about your subscription status' },
              { key: 'promotional_emails', label: 'Promotional Content', desc: 'Special offers and promotions' },
              { key: 'weekly_reports', label: 'Weekly Reports', desc: 'Summary of your meal activity' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">{item.label}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) => setNotifications({...notifications, [item.key]: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={handleUpdateNotifications}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Preferences</h3>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Theme</label>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Language</label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({...preferences, language: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Timezone</label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Date Format</label>
            <select
              value={preferences.date_format}
              onChange={(e) => setPreferences({...preferences, date_format: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={handleUpdatePreferences}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Security Settings</h3>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.two_factor_enabled}
                onChange={(e) => setSecurity({...security, two_factor_enabled: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">Login Alerts</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when someone logs into your account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.login_alerts}
                onChange={(e) => setSecurity({...security, login_alerts: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Session Timeout (minutes)</label>
            <select
              value={security.session_timeout}
              onChange={(e) => setSecurity({...security, session_timeout: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={0}>Never</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Password Expiry (days)</label>
            <select
              value={security.password_expiry}
              onChange={(e) => setSecurity({...security, password_expiry: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={0}>Never</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={handleUpdateSecurity}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
      <div className="space-y-4">
        {activityLog.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity found</p>
        ) : (
          activityLog.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                  <MdSecurity className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{activity.action}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{activity.ip_address}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(activity.timestamp).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(activity.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account preferences and security</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 shadow-sm min-h-[calc(100vh-80px)]">
          <nav className="p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-300 border-r-2 border-primary-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tab.desc}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'activity' && renderActivityTab()}
        </div>
      </div>
    </div>
  );
};

export default Settings;