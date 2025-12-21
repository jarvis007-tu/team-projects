import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch real data from API
      const [statsRes, activityRes, attendanceRes, subscriptionRes, todayAttendanceRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(),
        dashboardService.getAttendanceStats(),
        dashboardService.getSubscriptionStats(),
        dashboardService.getTodayAttendance()
      ]);

      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
      setAttendanceData(attendanceRes.data.chartData || []);
      setSubscriptionData(subscriptionRes.data.planDistribution || []);
      setTodayAttendance(todayAttendanceRes.data.summary);
    } catch (error) {
      // Log error silently in production
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch dashboard data:', error);
      }
      // Set default data on error to prevent empty dashboard
      setStats({
        users: { total: 0, growth: 0 },
        subscriptions: { active: 0, growth: 0 },
        attendance: { today: 0, growth: 0 },
        revenue: { monthly: 0, growth: 0 }
      });
      setRecentActivity([]);
      setAttendanceData([]);
      setSubscriptionData([]);
      setTodayAttendance({ breakfast: 0, lunch: 0, dinner: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  // Helper function to format growth percentage
  const formatGrowth = (growth) => {
    if (!growth || growth === 0) return '0%';
    const sign = growth > 0 ? '+' : '';
    return `${sign}${Number(growth).toFixed(1)}%`;
  };

  const overviewStats = {
    activeSubscriptions: stats?.subscriptions?.active || 0,
    monthlyRevenue: stats?.revenue?.monthly || 0
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users?.total || 0,
      change: formatGrowth(stats?.users?.growth || 0),
      trend: (stats?.users?.growth || 0) >= 0 ? 'up' : 'down',
      icon: UserGroupIcon,
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      changeColor: (stats?.users?.growth || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Subscriptions',
      value: stats?.subscriptions?.active || 0,
      change: formatGrowth(stats?.subscriptions?.growth || 0),
      trend: (stats?.subscriptions?.growth || 0) >= 0 ? 'up' : 'down',
      icon: CreditCardIcon,
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      changeColor: (stats?.subscriptions?.growth || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Attendance Logs',
      value: stats?.attendance?.today || 0,
      change: formatGrowth(stats?.attendance?.growth || 0),
      trend: (stats?.attendance?.growth || 0) >= 0 ? 'up' : 'down',
      icon: ClipboardDocumentListIcon,
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      changeColor: (stats?.attendance?.growth || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    }
  ];

  // Format attendance chart data
  const attendanceChartData = attendanceData.length ? attendanceData.map(item => ({
    day: format(new Date(item.date), 'EEE'),
    breakfast: item.breakfast || 0,
    lunch: item.lunch || 0,
    dinner: item.dinner || 0
  })) : [];

  // Format subscription data for pie chart
  const subscriptionPieData = subscriptionData.length ? subscriptionData.map((sub, index) => {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
    return {
      name: sub._id || 'Unknown',
      value: sub.count,
      color: colors[index % colors.length]
    };
  }) : [];

  // Format recent activity data
  const recentActivityData = recentActivity.length ? recentActivity.map((activity, index) => ({
    id: index + 1,
    user: activity.user,
    action: activity.message,
    time: format(new Date(activity.timestamp), 'PPp'),
    status: activity.type === 'attendance' ? 'success' : activity.type === 'subscription' ? 'info' : 'success'
  })) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header Section */}
      <div className="px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {/* Overview Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-6"
            >
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg">
                  <ArrowTrendingUpIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">Overview</h3>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Subs</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{overviewStats.activeSubscriptions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Revenue</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">₹{overviewStats.monthlyRevenue}</span>
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
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className={`${stat.bgColor} p-2 sm:p-3 rounded-lg`}>
                    <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor}`} />
                  </div>
                  <div className={`flex items-center text-xs sm:text-sm font-medium ${stat.changeColor}`}>
                    {stat.trend === 'up' ? (
                      <ArrowUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                <button
                  onClick={() => navigate('/admin/attendance')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
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
                        {typeof activity.user === 'string' ? activity.user : activity.user?.full_name || activity.user?.email || 'Unknown User'}
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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Attendance Records</h3>
                <button
                  onClick={() => navigate('/admin/attendance')}
                  className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="View all attendance records"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Today's Breakfast</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{todayAttendance?.breakfast || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                      style={{
                        width: `${todayAttendance?.total > 0 ? Math.min((todayAttendance.breakfast / todayAttendance.total) * 100, 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Today's Lunch</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{todayAttendance?.lunch || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 dark:bg-green-400 h-2 rounded-full"
                      style={{
                        width: `${todayAttendance?.total > 0 ? Math.min((todayAttendance.lunch / todayAttendance.total) * 100, 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                <div className="pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Today's Dinner</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{todayAttendance?.dinner || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-orange-600 dark:bg-orange-400 h-2 rounded-full"
                      style={{
                        width: `${todayAttendance?.total > 0 ? Math.min((todayAttendance.dinner / todayAttendance.total) * 100, 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Dashboard Analytics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Analytics</h3>
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
                    <button
                      disabled
                      className="text-xs text-gray-400 dark:text-gray-600 font-medium cursor-not-allowed opacity-50"
                      title="Coming soon"
                    >
                      Download
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">Monthly Report</span>
                    </div>
                    <button
                      disabled
                      className="text-xs text-gray-400 dark:text-gray-600 font-medium cursor-not-allowed opacity-50"
                      title="Coming soon"
                    >
                      Download
                    </button>
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