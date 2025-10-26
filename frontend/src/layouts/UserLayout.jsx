import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  UserCircleIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  QrCodeIcon,
  BellIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    { name: 'Dashboard', href: '/user/dashboard', icon: HomeIcon },
    { name: 'Profile', href: '/user/profile', icon: UserCircleIcon },
    { name: 'Subscription', href: '/user/subscription', icon: CreditCardIcon },
    { name: 'Weekly Menu', href: '/user/menu', icon: CalendarDaysIcon },
    { name: 'QR Scanner', href: '/user/scan', icon: QrCodeIcon },
    { name: 'Notifications', href: '/user/notifications', icon: BellIcon },
    { name: 'Settings', href: '/user/settings', icon: Cog6ToothIcon },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-dark-card md:hidden"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b dark:border-dark-border">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-lg">
                    <span className="text-white font-bold text-lg">HE</span>
                  </div>
                  <span className="ml-3 text-xl font-semibold dark:text-white">
                    Hostel Eats
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <XMarkIcon className="h-6 w-6 dark:text-gray-400" />
                </button>
              </div>
              <SidebarContent navigation={navigation} user={user} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-1 bg-white dark:bg-dark-card border-r dark:border-dark-border">
          <div className="flex items-center h-16 px-4 border-b dark:border-dark-border">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-lg">
              <span className="text-white font-bold text-lg">HE</span>
            </div>
            <span className="ml-3 text-xl font-semibold dark:text-white">
              Hostel Eats
            </span>
          </div>
          <SidebarContent navigation={navigation} user={user} />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-dark-card border-b dark:border-dark-border">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            >
              <Bars3Icon className="h-6 w-6 dark:text-gray-400" />
            </button>

            <div className="flex-1 px-4 md:px-0">
              <h2 className="text-lg font-semibold dark:text-white">
                Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5 text-yellow-500" />
                ) : (
                  <MoonIcon className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {/* QR Scanner */}
              <NavLink
                to="/user/scan"
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 relative"
                title="Scan QR Code"
              >
                <QrCodeIcon className="h-5 w-5 dark:text-gray-400" />
              </NavLink>

              {/* Notifications */}
              <NavLink
                to="/user/notifications"
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 relative"
              >
                <BellIcon className="h-5 w-5 dark:text-gray-400" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </NavLink>

              {/* Profile dropdown */}
              <div className="relative group">
                <button className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-lg shadow-lg border dark:border-dark-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b dark:border-dark-border">
                      <p className="text-sm font-medium dark:text-white">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/user/profile"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                    >
                      <UserCircleIcon className="h-4 w-4 mr-2" />
                      View Profile
                    </NavLink>
                    <NavLink
                      to="/user/settings"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-2" />
                      Settings
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({ navigation, user }) => {
  return (
    <>
      {/* User Info Section */}
      <div className="p-4 border-b dark:border-dark-border">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.role === 'user' ? 'Student' : user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`
            }
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t dark:border-dark-border">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-90">Subscription Status</p>
              <p className="text-sm font-semibold">Active</p>
            </div>
            <CreditCardIcon className="h-5 w-5 opacity-80" />
          </div>
        </div>
      </div>
    </>
  );
};

export default UserLayout;