import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, FiCreditCard, FiCheckCircle, FiTrendingUp,
  FiMenu, FiX, FiBell, FiSearch, FiFilter
} from 'react-icons/fi';
import { MdDashboard, MdPeople, MdSubscriptions, MdQrCodeScanner, MdRestaurantMenu, MdNotifications, MdSettings, MdLogout, MdAssessment } from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import reportService from '../../services/reportService';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      activeSubscriptions: 0,
      todayAttendance: 0,
      monthlyRevenue: 0
    },
    charts: {
      attendanceTrend: [],
      subscriptionDistribution: [],
      revenueChart: []
    },
    recentActivity: [],
    topUsers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      const response = await reportService.getDashboardStats();
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: MdDashboard, label: 'Dashboard', path: '/admin/dashboard', active: true },
    { icon: MdPeople, label: 'Users', path: '/admin/users', badge: dashboardData.stats.totalUsers },
    { icon: MdSubscriptions, label: 'Subscriptions', path: '/admin/subscriptions' },
    { icon: MdQrCodeScanner, label: 'Attendance', path: '/admin/attendance' },
    { icon: MdRestaurantMenu, label: 'Menu', path: '/admin/menu' },
    { icon: MdAssessment, label: 'Reports', path: '/admin/reports' },
    { icon: MdNotifications, label: 'Notifications', path: '/admin/notifications' },
    { icon: MdSettings, label: 'Settings', path: '/admin/settings' },
  ];

  const statsCards = [
    {
      title: 'Total Users',
      value: dashboardData.stats.totalUsers,
      change: '+12%',
      trend: 'up',
      icon: FiUsers,
      color: 'primary'
    },
    {
      title: 'Active Subscriptions',
      value: dashboardData.stats.activeSubscriptions,
      change: '+8%',
      trend: 'up',
      icon: FiCreditCard,
      color: 'success'
    },
    {
      title: 'Today\'s Attendance',
      value: dashboardData.stats.todayAttendance,
      change: '-2%',
      trend: 'down',
      icon: FiCheckCircle,
      color: 'info'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${dashboardData.stats.monthlyRevenue.toLocaleString()}`,
      change: '+18%',
      trend: 'up',
      icon: FiTrendingUp,
      color: 'warning'
    }
  ];

  const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 w-64 bg-white dark:bg-gray-800 shadow-lg`}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">HE</span>
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">Hostel Eats</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 mb-2 rounded-lg transition-colors ${
                item.active 
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-1 text-xs bg-primary-100 text-primary-600 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 w-full p-4 border-t dark:border-gray-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <MdLogout className="w-5 h-5 mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 mr-4"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <FiBell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-semibold">
                    {user?.full_name?.charAt(0) || 'A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Period Selector */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Overview</h2>
              <p className="text-gray-600 dark:text-gray-300">Monitor your hostel mess performance</p>
            </div>
            <div className="flex space-x-2">
              {['day', 'week', 'month'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                  <span className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{stat.title}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Attendance Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.charts.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="breakfast" stroke="#22c55e" />
                  <Line type="monotone" dataKey="lunch" stroke="#f59e0b" />
                  <Line type="monotone" dataKey="dinner" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Subscription Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription Plans</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.charts.subscriptionDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.charts.subscriptionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity & Top Users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        <FiUsers className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{activity.user_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{activity.action}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Active Users</h3>
              <div className="space-y-4">
                {dashboardData.topUsers.slice(0, 5).map((user, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{user.attendance}% attendance</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-primary-600">{user.meals} meals</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;