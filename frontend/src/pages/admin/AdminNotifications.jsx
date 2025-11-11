import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiSend,
  FiDownload, FiUsers, FiClock, FiCheckCircle,
  FiX, FiCalendar, FiFilter, FiBell, FiTarget
} from 'react-icons/fi';
import { MdNotifications, MdSchedule, MdGroup, MdHistory } from 'react-icons/md';
import notificationService from '../../services/notificationService';
import messService from '../../services/messService';
import { toast } from 'react-hot-toast';

const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState('send'); // send, templates, history, scheduled
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [messes, setMesses] = useState([]);

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'announcement', // announcement, subscription, menu, payment, reminder, system, test
    target_audience: 'all', // all, active_subscribers, mess_outlet
    mess_id: '',
    schedule_type: 'immediate', // immediate, scheduled
    scheduled_at: '',
    priority: 'medium' // low, medium, high
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    title: '',
    message: '',
    type: 'announcement',
    variables: []
  });

  const [analytics, setAnalytics] = useState({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0
  });

  useEffect(() => {
    fetchData();
    fetchMesses();
  }, [activeTab, searchTerm, filterStatus]);

  const fetchMesses = async () => {
    try {
      const response = await messService.getAllMesses();
      const messesData = response.data?.messes || response.data || response.messes || response || [];
      const messesArray = Array.isArray(messesData) ? messesData : [];
      setMesses(messesArray);
    } catch (error) {
      console.error('Failed to fetch messes:', error);
      setMesses([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'history') {
        await fetchNotificationHistory();
      } else if (activeTab === 'templates') {
        await fetchTemplates();
      } else if (activeTab === 'scheduled') {
        await fetchScheduledNotifications();
      }
      await fetchAnalytics();
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationHistory = async () => {
    try {
      const response = await notificationService.getNotificationHistory({
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });
      // Handle different response structures
      const notificationsData = response.data?.notifications || response.data || [];
      const notificationsArray = Array.isArray(notificationsData) ? notificationsData : [];
      setNotifications(notificationsArray);
    } catch (error) {
      toast.error('Failed to fetch notification history');
      setNotifications([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await notificationService.getNotificationTemplates();
      const templatesData = response.data?.templates || response.data || [];
      const templatesArray = Array.isArray(templatesData) ? templatesData : [];
      setTemplates(templatesArray);
    } catch (error) {
      toast.error('Failed to fetch templates');
      setTemplates([]);
    }
  };

  const fetchScheduledNotifications = async () => {
    try {
      const response = await notificationService.getScheduledNotifications();
      const scheduledData = response.data?.notifications || response.data || [];
      const scheduledArray = Array.isArray(scheduledData) ? scheduledData : [];
      setScheduledNotifications(scheduledArray);
    } catch (error) {
      toast.error('Failed to fetch scheduled notifications');
      setScheduledNotifications([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await notificationService.getNotificationAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics');
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      if (newNotification.target_audience === 'all') {
        await notificationService.sendBulkNotification(newNotification);
      } else if (newNotification.target_audience === 'mess_outlet') {
        if (!newNotification.mess_id) {
          toast.error('Please select a mess outlet');
          return;
        }
        await notificationService.sendTargetedNotification(newNotification);
      } else {
        await notificationService.sendTargetedNotification(newNotification);
      }

      if (newNotification.schedule_type === 'scheduled') {
        toast.success('Notification scheduled successfully');
      } else {
        toast.success('Notification sent successfully');
      }

      setNewNotification({
        title: '',
        message: '',
        type: 'general',
        target_audience: 'all',
        mess_id: '',
        schedule_type: 'immediate',
        scheduled_at: '',
        priority: 'normal'
      });

      fetchData();
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await notificationService.createNotificationTemplate(newTemplate);
      toast.success('Template created successfully');
      setShowTemplateModal(false);
      setNewTemplate({
        name: '',
        description: '',
        title: '',
        message: '',
        type: 'general',
        variables: []
      });
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    try {
      await notificationService.updateNotificationTemplate(currentTemplate.template_id, currentTemplate);
      toast.success('Template updated successfully');
      setShowTemplateModal(false);
      setCurrentTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await notificationService.deleteNotificationTemplate(templateId);
        toast.success('Template deleted successfully');
        fetchTemplates();
      } catch (error) {
        toast.error('Failed to delete template');
      }
    }
  };

  const handleCancelScheduled = async (notificationId) => {
    if (window.confirm('Are you sure you want to cancel this scheduled notification?')) {
      try {
        await notificationService.cancelScheduledNotification(notificationId);
        toast.success('Scheduled notification cancelled');
        fetchScheduledNotifications();
      } catch (error) {
        toast.error('Failed to cancel notification');
      }
    }
  };

  const handleSendTestNotification = async () => {
    try {
      await notificationService.sendTestNotification({
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working correctly.',
        type: 'general'
      });
      toast.success('Test notification sent');
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'alert': return 'text-red-600 bg-red-100';
      case 'reminder': return 'text-orange-600 bg-orange-100';
      case 'update': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const statsCards = [
    {
      title: 'Total Sent',
      value: analytics.totalSent,
      icon: FiSend,
      color: 'primary'
    },
    {
      title: 'Delivery Rate',
      value: `${analytics.deliveryRate}%`,
      icon: FiCheckCircle,
      color: 'success'
    },
    {
      title: 'Open Rate',
      value: `${analytics.openRate}%`,
      icon: FiBell,
      color: 'info'
    },
    {
      title: 'Click Rate',
      value: `${analytics.clickRate}%`,
      icon: FiTarget,
      color: 'warning'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Send notifications and manage templates</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSendTestNotification}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FiBell className="w-4 h-4 mr-2" />
              Test Notification
            </button>
            {activeTab === 'templates' && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Create Template
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {statsCards.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'send'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FiSend className="w-4 h-4 mr-2" />
              Send Notification
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FiEdit2 className="w-4 h-4 mr-2" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'scheduled'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <MdSchedule className="w-4 h-4 mr-2" />
              Scheduled
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <MdHistory className="w-4 h-4 mr-2" />
              History
            </button>
          </div>

          {/* Filters for History Tab */}
          {activeTab === 'history' && (
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {/* Send Notification Tab */}
            {activeTab === 'send' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Send New Notification</h3>
                <form onSubmit={handleSendNotification}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Notification Title
                      </label>
                      <input
                        type="text"
                        value={newNotification.title}
                        onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Type
                      </label>
                      <select
                        value={newNotification.type}
                        onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="announcement">Announcement</option>
                        <option value="reminder">Reminder</option>
                        <option value="alert">Alert</option>
                        <option value="subscription">Subscription</option>
                        <option value="menu">Menu</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Message
                      </label>
                      <textarea
                        rows="4"
                        value={newNotification.message}
                        onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Target Audience
                      </label>
                      <select
                        value={newNotification.target_audience}
                        onChange={(e) => setNewNotification({...newNotification, target_audience: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="all">All Users</option>
                        <option value="active_subscribers">Active Subscribers</option>
                        <option value="mess_outlet">Specific Mess Outlet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Priority
                      </label>
                      <select
                        value={newNotification.priority}
                        onChange={(e) => setNewNotification({...newNotification, priority: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    {newNotification.target_audience === 'mess_outlet' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          Select Mess Outlet
                        </label>
                        <select
                          value={newNotification.mess_id}
                          onChange={(e) => setNewNotification({...newNotification, mess_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                          required
                        >
                          <option value="">-- Select Mess Outlet --</option>
                          {Array.isArray(messes) && messes.map(mess => {
                            const messId = mess._id || mess.id || mess.mess_id;
                            return (
                              <option key={messId} value={messId}>
                                {mess.name} ({mess.code})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Schedule
                      </label>
                      <select
                        value={newNotification.schedule_type}
                        onChange={(e) => setNewNotification({...newNotification, schedule_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="immediate">Send Immediately</option>
                        <option value="scheduled">Schedule for Later</option>
                      </select>
                    </div>
                    {newNotification.schedule_type === 'scheduled' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          Schedule Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={newNotification.scheduled_at}
                          onChange={(e) => setNewNotification({...newNotification, scheduled_at: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <FiSend className="w-4 h-4 mr-2" />
                      {newNotification.schedule_type === 'scheduled' ? 'Schedule Notification' : 'Send Notification'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div key={template.template_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(template.type)}`}>
                        {template.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{template.description}</p>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{template.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{template.message}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setCurrentTemplate(template);
                          setShowTemplateModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setNewNotification({
                            ...newNotification,
                            title: template.title,
                            message: template.message,
                            type: template.type
                          });
                          setActiveTab('send');
                        }}
                        className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.template_id)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Scheduled Notifications Tab */}
            {activeTab === 'scheduled' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notification
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scheduled At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Target
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scheduledNotifications.map((notification) => (
                        <tr key={notification.notification_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(notification.type)}`}>
                              {notification.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(notification.scheduled_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {notification.target_audience === 'all' ? 'All Users' : 
                             notification.target_audience === 'active_subscribers' ? 'Active Subscribers' : 
                             'Specific Users'}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleCancelScheduled(notification.notification_id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notification
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipients
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {notifications.map((notification) => (
                        <tr key={notification.notification_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(notification.type)}`}>
                              {notification.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(notification.status)}`}>
                              {notification.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(notification.sent_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {notification.recipient_count}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                // View detailed analytics for this notification
                                toast.info('Detailed analytics view not implemented in demo');
                              }}
                              className="text-primary-600 hover:text-primary-900 text-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">
                {currentTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setCurrentTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={currentTemplate ? handleUpdateTemplate : handleCreateTemplate} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={currentTemplate ? currentTemplate.name : newTemplate.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (currentTemplate) {
                          setCurrentTemplate({...currentTemplate, name: value});
                        } else {
                          setNewTemplate({...newTemplate, name: value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Type
                    </label>
                    <select
                      value={currentTemplate ? currentTemplate.type : newTemplate.type}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (currentTemplate) {
                          setCurrentTemplate({...currentTemplate, type: value});
                        } else {
                          setNewTemplate({...newTemplate, type: value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="reminder">Reminder</option>
                      <option value="alert">Alert</option>
                      <option value="subscription">Subscription</option>
                      <option value="menu">Menu</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={currentTemplate ? currentTemplate.description : newTemplate.description}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentTemplate) {
                        setCurrentTemplate({...currentTemplate, description: value});
                      } else {
                        setNewTemplate({...newTemplate, description: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={currentTemplate ? currentTemplate.title : newTemplate.title}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentTemplate) {
                        setCurrentTemplate({...currentTemplate, title: value});
                      } else {
                        setNewTemplate({...newTemplate, title: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Message
                  </label>
                  <textarea
                    rows="4"
                    value={currentTemplate ? currentTemplate.message : newTemplate.message}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (currentTemplate) {
                        setCurrentTemplate({...currentTemplate, message: value});
                      } else {
                        setNewTemplate({...newTemplate, message: value});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setCurrentTemplate(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {currentTemplate ? 'Update' : 'Create'} Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;