import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BellIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isSuperAdmin, isMessAdmin } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Build navigation based on role
  // - super_admin: sees all menu items including "Messes"
  // - mess_admin: sees all menu items EXCEPT "Messes"
  const allNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon, roles: ['super_admin', 'mess_admin'] },
    { name: 'Messes', href: '/admin/messes', icon: BuildingOfficeIcon, roles: ['super_admin'] }, // SUPER ADMIN ONLY
    { name: 'Users', href: '/admin/users', icon: UsersIcon, roles: ['super_admin', 'mess_admin'] },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon, roles: ['super_admin', 'mess_admin'] },
    { name: 'Attendance', href: '/admin/attendance', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'mess_admin'] },
    { name: 'Menu', href: '/admin/menu', icon: CalendarDaysIcon, roles: ['super_admin', 'mess_admin'] },
    { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon, roles: ['super_admin', 'mess_admin'] },
    { name: 'Notifications', href: '/admin/notifications', icon: BellIcon, roles: ['super_admin', 'mess_admin'] },
    { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon, roles: ['super_admin', 'mess_admin'] },
  ];

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item =>
    item.roles.includes(user?.role)
  );

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
                    Hostel Eats Admin
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <XMarkIcon className="h-6 w-6 dark:text-gray-400" />
                </button>
              </div>
              <SidebarContent navigation={navigation} />
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
              Hostel Eats Admin
            </span>
          </div>
          <SidebarContent navigation={navigation} />
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
                Welcome back, {user?.full_name || 'Admin'}
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

              {/* Notifications */}
              <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 relative">
                <BellIcon className="h-5 w-5 dark:text-gray-400" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>

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

const SidebarContent = ({ navigation }) => {
  return (
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
  );
};

export default AdminLayout;