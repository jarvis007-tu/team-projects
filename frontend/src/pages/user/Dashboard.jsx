import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCardIcon,
  CalendarDaysIcon,
  QrCodeIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import dashboardService from '../../services/dashboardService';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    subscription: null,
    todayMenu: null,
    weeklyAttendance: [],
    recentNotifications: [],
    upcomingMeals: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch real data from backend
      const response = await dashboardService.getUserDashboard();

      // Handle different response structures
      const data = response.data?.data || response.data || {};

      // Calculate days remaining for subscription
      const daysRemaining = data.subscription ?
        Math.ceil((new Date(data.subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

      // Format data to match component structure
      const formattedData = {
        subscription: data.subscription ? {
          ...data.subscription,
          days_remaining: daysRemaining
        } : null,
        todayMenu: data.todayMenu || {},
        weeklyAttendance: [], // Will be calculated from recentAttendance
        recentNotifications: data.notifications || [],
        upcomingMeals: [
          { type: 'Dinner', time: '7:00 PM - 9:00 PM', status: 'upcoming' },
          { type: 'Breakfast', time: '7:00 AM - 9:30 AM', status: 'tomorrow' },
          { type: 'Lunch', time: '12:00 PM - 2:30 PM', status: 'tomorrow' }
        ]
      };

      setDashboardData(formattedData);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', error);
      // Set empty data on error
      setDashboardData({
        subscription: null,
        todayMenu: null,
        weeklyAttendance: [],
        recentNotifications: [],
        upcomingMeals: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMeal = () => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 10) return 'breakfast';
    if (hour >= 12 && hour < 15) return 'lunch';
    if (hour >= 19 && hour < 21) return 'dinner';
    return null;
  };

  const getAttendanceStats = () => {
    const totalMeals = dashboardData.weeklyAttendance.length * 3;
    const attendedMeals = dashboardData.weeklyAttendance.reduce((total, day) => {
      return total + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0);
    }, 0);
    return {
      total: totalMeals,
      attended: attendedMeals,
      percentage: totalMeals > 0 ? Math.round((attendedMeals / totalMeals) * 100) : 0
    };
  };

  const currentMeal = getCurrentMeal();
  const attendanceStats = getAttendanceStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2 truncate">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
            </h1>
            <p className="text-primary-100 text-sm sm:text-base">
              {currentMeal ? `It's ${currentMeal} time! Check today's menu below.` : 'Hope you had a great meal today!'}
            </p>
          </div>
          <div className="hidden sm:block flex-shrink-0 ml-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl sm:text-2xl">🍽️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Subscription Status */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className={`w-8 h-8 sm:w-12 sm:h-12 ${dashboardData.subscription ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'} rounded-lg flex items-center justify-center`}>
              <CreditCardIcon className={`h-4 w-4 sm:h-6 sm:w-6 ${dashboardData.subscription ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            {dashboardData.subscription ? (
              <span className="text-[10px] sm:text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                Active
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                None
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1 truncate">
            {dashboardData.subscription?.plan_type ? `${dashboardData.subscription.plan_type} Plan` : 'No Plan'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {dashboardData.subscription ? `${dashboardData.subscription.days_remaining || 0} days left` : 'Subscribe now'}
          </p>
          <Link
            to="/user/subscription"
            className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-1 sm:mt-2 inline-block"
          >
            {dashboardData.subscription ? 'Manage →' : 'Get Now →'}
          </Link>
        </div>

        {/* Weekly Attendance */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-400">This Week</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">
            {attendanceStats.percentage}%
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {attendanceStats.attended}/{attendanceStats.total} meals
          </p>
          <Link
            to="/user/attendance"
            className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-1 sm:mt-2 inline-block"
          >
            View Details →
          </Link>
        </div>

        {/* Quick Scan */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <QrCodeIcon className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-purple-600 dark:text-purple-400">Ready</span>
          </div>
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1">QR Scanner</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">Mark attendance</p>
          <Link
            to="/user/scan"
            className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] sm:text-xs font-medium rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/30"
          >
            Scan Now
          </Link>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <BellIcon className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-600 dark:text-orange-400">
              {dashboardData.recentNotifications.filter(n => !n.read).length} New
            </span>
          </div>
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1">Notifications</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">Recent updates</p>
          <Link
            to="/user/notifications"
            className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            View All →
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Menu */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Today's Menu</h3>
            <Link
              to="/user/menu"
              className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(dashboardData.todayMenu || {}).map(([mealType, items]) => (
              <div key={mealType} className="border-b dark:border-dark-border last:border-0 pb-3 sm:pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white capitalize">{mealType}</h4>
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                    mealType === currentMeal
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {mealType === currentMeal ? 'Current' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {Array.isArray(items) ? items.join(', ') : 'Menu not available'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Attendance Chart */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Weekly Attendance</h3>
          
          <div className="space-y-3">
            {dashboardData.weeklyAttendance.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white w-10">{day.day}</span>
                <div className="flex space-x-2 flex-1 justify-end">
                  <div className={`w-4 h-4 rounded-full ${
                    day.breakfast ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} title="Breakfast"></div>
                  <div className={`w-4 h-4 rounded-full ${
                    day.lunch ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} title="Lunch"></div>
                  <div className={`w-4 h-4 rounded-full ${
                    day.dinner ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} title="Dinner"></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center space-x-4 mt-4 pt-4 border-t dark:border-dark-border text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-gray-600 dark:text-gray-400">Breakfast</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
              <span className="text-gray-600 dark:text-gray-400">Lunch</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
              <span className="text-gray-600 dark:text-gray-400">Dinner</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming Meals */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Upcoming Meals</h3>

          <div className="space-y-2 sm:space-y-3">
            {dashboardData.upcomingMeals.map((meal, index) => (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                    <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{meal.type}</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{meal.time}</p>
                  </div>
                </div>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  meal.status === 'upcoming'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {meal.status === 'upcoming' ? 'Today' : 'Tomorrow'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Notifications</h3>
            <Link
              to="/user/notifications"
              className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            {dashboardData.recentNotifications.slice(0, 3).map((notification) => (
              <div key={notification.id} className={`p-2 sm:p-3 rounded-lg border ${
                !notification.read
                  ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/10 dark:border-primary-800'
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }`}>
                <div className="flex items-start">
                  <div className={`w-2 h-2 rounded-full mt-1.5 sm:mt-2 mr-2 sm:mr-3 flex-shrink-0 ${
                    !notification.read ? 'bg-primary-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{notification.title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-1 sm:mt-2">{notification.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {dashboardData.recentNotifications.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6 sm:py-8 text-sm">
              No recent notifications
            </p>
          )}
        </div>
      </div>

      {/* QR Scan Button at Bottom - Fixed on mobile */}
      <div className="mt-6 sm:mt-8 flex justify-center pb-4 sm:pb-6">
        <Link
          to="/user/scan"
          className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl sm:rounded-2xl shadow-xl shadow-primary-500/30 transition-all duration-200 transform hover:scale-105 font-semibold"
        >
          <QrCodeIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-sm sm:text-lg">Scan QR for Meal</span>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;