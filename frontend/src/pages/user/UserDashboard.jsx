import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiHome, FiUser, FiCreditCard, FiCalendar, FiBell, 
  FiMenu, FiX, FiLogOut, FiSettings, FiScan
} from 'react-icons/fi';
import { MdQrCodeScanner, MdRestaurantMenu } from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';
import dashboardService from '../../services/dashboardService';
import { toast } from 'react-hot-toast';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    subscription: null,
    todayMenu: null,
    notifications: [],
    recentAttendance: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardService.getUserDashboard();
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: FiHome, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: FiUser, label: 'Profile', path: '/profile' },
    { icon: FiCreditCard, label: 'Subscription', path: '/subscription' },
    { icon: MdQrCodeScanner, label: 'Scan QR', path: '/scan' },
    { icon: MdRestaurantMenu, label: 'Weekly Menu', path: '/menu' },
    { icon: FiBell, label: 'Notifications', path: '/notifications' },
  ];

  const getSubscriptionStatus = () => {
    if (!dashboardData.subscription) return 'No Active Subscription';
    const daysLeft = Math.ceil((new Date(dashboardData.subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    return `${daysLeft} days remaining`;
  };

  const getMealTime = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 16) return 'lunch';
    return 'dinner';
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 w-64 bg-dark-card border-r border-dark-border`}>
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">HE</span>
            </div>
            <span className="ml-3 text-xl font-bold">Hostel Eats</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
              <FiUser className="w-6 h-6 text-primary-500" />
            </div>
            <div className="ml-3">
              <p className="font-semibold">{user?.full_name || 'User'}</p>
              <p className="text-sm text-gray-400">Subscriber</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                item.active 
                  ? 'bg-primary-500/20 text-primary-500' 
                  : 'text-gray-400 hover:bg-dark-lighter hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 w-full p-4 border-t border-dark-border">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-gray-400 hover:bg-dark-lighter hover:text-white rounded-lg transition-colors"
          >
            <FiLogOut className="w-5 h-5 mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-dark-card border-b border-dark-border px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <FiMenu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-white">
                <FiBell className="w-6 h-6" />
                {dashboardData.notifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button className="p-2 text-gray-400 hover:text-white">
                <FiSettings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-gray-400">Here's your meal status for today</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Subscription Status */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <FiCreditCard className="w-6 h-6 text-primary-500" />
                </div>
                <span className="text-sm text-gray-400">Active</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Subscription Status</h3>
              <p className="text-2xl font-bold text-primary-500">{getSubscriptionStatus()}</p>
              <Link to="/subscription" className="text-sm text-gray-400 hover:text-primary-500 mt-2 inline-block">
                View Details →
              </Link>
            </div>

            {/* Today's Meal */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <MdRestaurantMenu className="w-6 h-6 text-orange-500" />
                </div>
                <span className="text-sm text-gray-400">{getMealTime()}</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Next Meal</h3>
              <p className="text-xl font-bold">
                {dashboardData.todayMenu?.[getMealTime()]?.items?.join(', ') || 'No menu available'}
              </p>
              <Link to="/menu" className="text-sm text-gray-400 hover:text-primary-500 mt-2 inline-block">
                View Menu →
              </Link>
            </div>

            {/* Quick Scan */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <MdQrCodeScanner className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-1">Quick Scan</h3>
              <p className="text-sm opacity-90 mb-4">Scan QR for meal attendance</p>
              <Link 
                to="/scan" 
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <FiScan className="w-4 h-4 mr-2" />
                Scan Now
              </Link>
            </div>
          </div>

          {/* Recent Activity & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Attendance */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Attendance</h3>
              {dashboardData.recentAttendance.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentAttendance.map((attendance, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-dark-border last:border-0">
                      <div>
                        <p className="font-medium">{attendance.meal_type}</p>
                        <p className="text-sm text-gray-400">{new Date(attendance.scan_date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm text-primary-500">✓ Marked</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No recent attendance</p>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <Link to="/notifications" className="text-sm text-primary-500 hover:text-primary-400">
                  View All
                </Link>
              </div>
              {dashboardData.notifications.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.notifications.slice(0, 3).map((notification, index) => (
                    <div key={index} className="flex items-start space-x-3 py-2 border-b border-dark-border last:border-0">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No new notifications</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;