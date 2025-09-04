import React, { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiInfo, FiAlertCircle, FiCalendar, FiTrash2 } from 'react-icons/fi';
import { MdNotificationsActive, MdNotificationsOff, MdMarkEmailRead } from 'react-icons/md';
import notificationService from '../../services/notificationService';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationTypes = {
    info: { icon: FiInfo, color: 'blue', bg: 'bg-blue-100' },
    success: { icon: FiCheckCircle, color: 'green', bg: 'bg-green-100' },
    warning: { icon: FiAlertCircle, color: 'yellow', bg: 'bg-yellow-100' },
    error: { icon: FiAlertCircle, color: 'red', bg: 'bg-red-100' },
    announcement: { icon: FiBell, color: 'purple', bg: 'bg-purple-100' }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getMyNotifications({
        filter: filter !== 'all' ? filter : undefined
      });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.notification_id === notificationId
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev =>
        prev.filter(notif => notif.notification_id !== notificationId)
      );
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const deleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('No notifications selected');
      return;
    }

    try {
      await Promise.all(
        selectedNotifications.map(id => notificationService.deleteNotification(id))
      );
      setNotifications(prev =>
        prev.filter(notif => !selectedNotifications.includes(notif.notification_id))
      );
      setSelectedNotifications([]);
      toast.success('Selected notifications deleted');
    } catch (error) {
      toast.error('Failed to delete notifications');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedNotifications(notifications.map(n => n.notification_id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const getNotificationIcon = (type) => {
    const config = notificationTypes[type] || notificationTypes.info;
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 text-${config.color}-600`} />;
  };

  const getNotificationBg = (type) => {
    const config = notificationTypes[type] || notificationTypes.info;
    return config.bg;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-dark-bg dark:to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <MdMarkEmailRead className="w-4 h-4 mr-2" />
                Mark All as Read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            {['all', 'unread', 'announcement', 'info', 'warning'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedNotifications.length} selected
            </span>
            <button
              onClick={deleteSelectedNotifications}
              className="flex items-center px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <FiTrash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </button>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <MdNotificationsOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notifications</h3>
            <p className="text-gray-600 dark:text-gray-400">You're all caught up! Check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select All */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                  className="rounded border-gray-300 mr-3"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
              </label>
            </div>

            {/* Notification Items */}
            {notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-all ${
                  !notification.is_read ? 'ring-2 ring-primary-200' : ''
                }`}
              >
                <div className="flex">
                  {/* Checkbox */}
                  <div className="p-4 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.notification_id)}
                      onChange={() => handleSelectNotification(notification.notification_id)}
                      className="rounded border-gray-300"
                    />
                  </div>

                  {/* Icon */}
                  <div className="py-4 pr-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getNotificationBg(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    className="flex-1 py-4 pr-4 cursor-pointer"
                    onClick={() => !notification.is_read && markAsRead(notification.notification_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {notification.title}
                          {!notification.is_read && (
                            <span className="ml-2 inline-block w-2 h-2 bg-primary-500 rounded-full"></span>
                          )}
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{notification.message}</p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <FiCalendar className="w-3 h-3 mr-1" />
                          <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                          {notification.category && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                                {notification.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-4 flex items-center space-x-2">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.notification_id);
                            }}
                            className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Mark as read"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.notification_id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    {notification.action_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = notification.action_url;
                        }}
                        className="mt-3 px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors"
                      >
                        {notification.action_text || 'View Details'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notification Settings */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-start">
            <MdNotificationsActive className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Notification Preferences</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                Manage how you receive notifications about mess services, menu updates, and important announcements.
              </p>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                Manage Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;