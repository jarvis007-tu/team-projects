import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/auth/LoginNew'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

// Admin Pages
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const MessManagement = lazy(() => import('./pages/admin/AdminMessManagement'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const SubscriptionManagement = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AttendanceManagement = lazy(() => import('./pages/admin/AdminAttendance'));
const MenuManagement = lazy(() => import('./pages/admin/AdminMenuManagement'));
const Reports = lazy(() => import('./pages/admin/AdminReports'));
const Notifications = lazy(() => import('./pages/admin/AdminNotifications'));
const Settings = lazy(() => import('./pages/Settings'));

// User Pages
const UserLayout = lazy(() => import('./layouts/UserLayout'));
const UserDashboard = lazy(() => import('./pages/user/Dashboard'));
const Profile = lazy(() => import('./pages/user/Profile'));
const Subscription = lazy(() => import('./pages/user/Subscription'));
const QRScanner = lazy(() => import('./pages/user/QRScanner'));
const WeeklyMenu = lazy(() => import('./pages/user/WeeklyMenu'));
const UserNotifications = lazy(() => import('./pages/user/Notifications'));

function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              (user?.role === 'super_admin' || user?.role === 'mess_admin') ?
                <Navigate to="/admin/dashboard" replace /> :
                <Navigate to="/user/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              (user?.role === 'super_admin' || user?.role === 'mess_admin') ?
                <Navigate to="/admin/dashboard" replace /> :
                <Navigate to="/user/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'mess_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="messes" element={<MessManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="subscriptions" element={<SubscriptionManagement />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* User Routes */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={['subscriber', 'user', 'super_admin', 'mess_admin']}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="scan" element={<QRScanner />} />
          <Route path="menu" element={<WeeklyMenu />} />
          <Route path="notifications" element={<UserNotifications />} />
        </Route>
        
        {/* Additional User Routes with simpler path */}
        <Route path="/dashboard" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="/profile" element={<Navigate to="/user/profile" replace />} />

        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// 404 Component
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mt-4">Page not found</p>
        <a
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

export default App;