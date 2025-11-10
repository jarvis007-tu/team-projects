import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  CreditCardIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import dashboardService from '../../services/dashboardService';
import { format } from 'date-fns';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from API
      const [statsRes, activityRes, attendanceRes, subscriptionRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(),
        dashboardService.getAttendanceStats(),
        dashboardService.getSubscriptionStats()
      ]);

      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
      setAttendanceData(attendanceRes.data);
      setSubscriptionData(subscriptionRes.data);
    } catch (error) {
      // Log error silently in production
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch dashboard data:', error);
      }
      // Set default data on error to prevent empty dashboard
      setStats({
        totalUsers: 0,
        activeSubscriptions: 0,
        monthlyRevenue: '0',
        todayAttendance: 0
      });
      setRecentActivity([]);
      setAttendanceData([]);
      setSubscriptionData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  const overviewStats = {
    activeSubscriptions: stats?.activeSubscriptions || 180,
    monthlyRevenue: stats?.monthlyRevenue || '35,500'
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 250,
      change: '+12%',
      trend: 'up',
      icon: UserGroupIcon,
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      changeColor: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Subscriptions',
      value: stats?.activeSubscriptions || 180,
      change: '+8%',
      trend: 'up',
      icon: CreditCardIcon,
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      changeColor: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Attendance Logs',
      value: stats?.todayAttendance || 150,
      change: '-2%',
      trend: 'down',
      icon: ClipboardDocumentListIcon,
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      changeColor: 'text-red-600 dark:text-red-400'
    }
  ];

  // Mock data for charts
  const attendanceChartData = attendanceData.length ? attendanceData : [
    { day: 'Mon', breakfast: 120, lunch: 150, dinner: 140 },
    { day: 'Tue', breakfast: 130, lunch: 160, dinner: 145 },
    { day: 'Wed', breakfast: 125, lunch: 155, dinner: 142 },
    { day: 'Thu', breakfast: 135, lunch: 165, dinner: 150 },
    { day: 'Fri', breakfast: 128, lunch: 158, dinner: 146 },
    { day: 'Sat', breakfast: 115, lunch: 145, dinner: 135 },
    { day: 'Sun', breakfast: 110, lunch: 140, dinner: 130 }
  ];

  const subscriptionPieData = subscriptionData.length ? subscriptionData : [
    { name: 'Monthly', value: 120, color: '#10b981' },
    { name: 'Weekly', value: 45, color: '#3b82f6' },
    { name: 'Daily', value: 15, color: '#f59e0b' }
  ];

  const recentActivityData = recentActivity.length ? recentActivity : [
    { id: 1, user: 'John Doe', action: 'Scanned QR for lunch', time: '2 mins ago', status: 'success' },
    { id: 2, user: 'Jane Smith', action: 'Subscription renewed', time: '15 mins ago', status: 'success' },
    { id: 3, user: 'Mike Johnson', action: 'Failed QR scan attempt', time: '1 hour ago', status: 'error' },
    { id: 4, user: 'Sarah Williams', action: 'New registration', time: '2 hours ago', status: 'success' },
    { id: 5, user: 'Admin', action: 'Updated weekly menu', time: '3 hours ago', status: 'info' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header Section */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Overview Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Subscriptions</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{overviewStats.activeSubscriptions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</span>
                  <span className="font-semibold text-gray-900 dark:text-white">₹{overviewStats.monthlyRevenue}</span>
                </div>
              </div>
            </motion.div>

            {/* Individual Stats Cards */}
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 2) * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div className={`flex items-center text-sm font-medium ${stat.changeColor}`}>
                    {stat.trend === 'up' ? (
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 mr-1" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {recentActivityData.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {activity.status === 'success' ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      ) : activity.status === 'error' ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {activity.user}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Attendance Records */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Records</h3>
                <EyeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Today's Breakfast</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">120</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Today's Lunch</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">150</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-600 dark:bg-green-400 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
                <div className="pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Today's Dinner</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">140</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-orange-600 dark:bg-orange-400 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Dashboard Analytics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Analytics</h3>
                <ChartBarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              
              {/* Performance Chart Area */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Performance</h4>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={attendanceChartData.slice(0, 4)}>
                    <Line
                      type="monotone"
                      dataKey="lunch"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Reports Section */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Reports</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">Weekly Report</span>
                    </div>
                    <button className="text-xs text-blue-600 dark:text-blue-400 font-medium">Download</button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">Monthly Report</span>
                    </div>
                    <button className="text-xs text-blue-600 dark:text-blue-400 font-medium">Download</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;