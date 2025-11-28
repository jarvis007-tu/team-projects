import React, { useState, useEffect } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter,
  FiDownload, FiRefreshCw, FiX, FiCalendar, FiUsers,
  FiCreditCard, FiTrendingUp, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { MdSubscriptions, MdCancel, MdAutorenew } from 'react-icons/md';
import subscriptionService from '../../services/subscriptionService';
import messService from '../../services/messService';
import userService from '../../services/userService';
import { toast } from 'react-hot-toast';

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterMess, setFilterMess] = useState('all');
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [messes, setMesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [newSubscription, setNewSubscription] = useState({
    user_id: '',
    mess_id: '',
    plan_type: 'monthly',
    sub_type: 'both',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    amount: 3000,
    status: 'active',
    payment_status: 'paid',
    payment_method: 'cash'
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchSubscriptionPlans();
    fetchAnalytics();
    fetchMesses();
  }, [currentPage, searchTerm, filterStatus, filterPlan, filterMess, filterExpiringSoon]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await subscriptionService.getAllSubscriptions({
        page: currentPage,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        plan_type: filterPlan !== 'all' ? filterPlan : undefined,
        mess_id: filterMess !== 'all' ? filterMess : undefined,
        expiring_soon: filterExpiringSoon ? 'true' : undefined
      });
      console.log('Subscriptions response:', response); // Debug log
      // Handle response - axios interceptor unwraps response.data, so response is { success, data: {...} }
      const subscriptionsData = response?.data?.subscriptions || response?.subscriptions || [];
      const paginationData = response?.data?.pagination || response?.pagination || { pages: 1 };
      setSubscriptions(subscriptionsData);
      setTotalPages(paginationData.pages || 1);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await subscriptionService.getSubscriptionPlans();
      setSubscriptionPlans(response.data);
    } catch (error) {
      toast.error('Failed to fetch subscription plans');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await subscriptionService.getSubscriptionAnalytics();
      console.log('Analytics response:', response); // Debug log
      // Handle the response - check if data exists
      if (response && response.data) {
        setAnalytics(response.data);
      } else if (response) {
        // If response is already the data object (no nested data)
        setAnalytics(response);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchMesses = async () => {
    try {
      const response = await messService.getAllMesses();
      // Handle different response structures
      const messesData = response.data?.messes || response.data || response.messes || response || [];
      const messesArray = Array.isArray(messesData) ? messesData : [];
      console.log('Fetched messes:', messesArray); // Debug log
      setMesses(messesArray);
    } catch (error) {
      console.error('Failed to fetch messes:', error);
      toast.error('Failed to load messes');
      setMesses([]); // Set empty array on error
    }
  };


  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSubscriptions(subscriptions.map(s => s.subscription_id));
    } else {
      setSelectedSubscriptions([]);
    }
  };

  const handleSelectSubscription = (subscriptionId) => {
    setSelectedSubscriptions(prev => 
      prev.includes(subscriptionId) 
        ? prev.filter(id => id !== subscriptionId)
        : [...prev, subscriptionId]
    );
  };

  const handleMessChange = async (messId) => {
    setNewSubscription({
      ...newSubscription,
      mess_id: messId,
      user_id: '' // Reset user selection when mess changes
    });
    setUsers([]); // Clear previous users

    if (messId) {
      setLoadingUsers(true);
      try {
        const response = await userService.getAllUsers({ mess_id: messId, role: 'subscriber', status: 'active' });
        const usersData = response.data?.users || response.data || [];
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Failed to fetch users for mess:', error);
        toast.error('Failed to load users for selected mess');
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!newSubscription.user_id) {
      toast.error('Please select a user');
      return;
    }
    if (!newSubscription.mess_id) {
      toast.error('Please select a mess');
      return;
    }
    if (!newSubscription.end_date) {
      toast.error('Please select an end date');
      return;
    }

    try {
      await subscriptionService.createSubscription(newSubscription);
      toast.success('Subscription created successfully');
      setShowCreateModal(false);
      setNewSubscription({
        user_id: '',
        mess_id: '',
        plan_type: 'monthly',
        sub_type: 'both',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        amount: 3000,
        status: 'active',
        payment_status: 'paid',
        payment_method: 'cash'
      });
      setUsers([]); // Clear users list
      fetchSubscriptions();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create subscription';
      toast.error(message);
    }
  };

  const handleEditSubscription = (subscription) => {
    setCurrentSubscription(subscription);
    setShowEditModal(true);
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    try {
      await subscriptionService.updateSubscription(currentSubscription.subscription_id, currentSubscription);
      toast.success('Subscription updated successfully');
      setShowEditModal(false);
      setCurrentSubscription(null);
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const handleRenewSubscription = async (subscriptionId) => {
    try {
      const renewalData = {
        duration: 30, // days
        auto_renew: false
      };
      await subscriptionService.renewSubscription(subscriptionId, renewalData);
      toast.success('Subscription renewed successfully');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to renew subscription');
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to cancel this subscription?')) {
      try {
        await subscriptionService.cancelSubscription(subscriptionId, 'Admin cancelled');
        toast.success('Subscription cancelled successfully');
        fetchSubscriptions();
      } catch (error) {
        toast.error('Failed to cancel subscription');
      }
    }
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await subscriptionService.deleteSubscription(subscriptionId);
        toast.success('Subscription deleted successfully');
        fetchSubscriptions();
      } catch (error) {
        toast.error('Failed to delete subscription');
      }
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedSubscriptions.length === 0) {
      toast.error('Please select subscriptions first');
      return;
    }

    try {
      await subscriptionService.bulkUpdateSubscriptions(selectedSubscriptions, { action });
      toast.success(`Bulk ${action} completed successfully`);
      setSelectedSubscriptions([]);
      fetchSubscriptions();
    } catch (error) {
      toast.error(`Failed to perform bulk ${action}`);
    }
  };

  const handleExport = async () => {
    try {
      const response = await subscriptionService.exportSubscriptions({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        plan: filterPlan !== 'all' ? filterPlan : undefined
      });
      
      // Create blob and download
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscriptions-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Subscriptions exported successfully');
    } catch (error) {
      toast.error('Failed to export subscriptions');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'suspended': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const statsCards = [
    {
      title: 'Total Subscriptions',
      value: analytics.total || 0,
      change: analytics.totalChange || '+0%',
      icon: MdSubscriptions,
      color: 'primary'
    },
    {
      title: 'Active Subscriptions',
      value: analytics.active || 0,
      change: analytics.activeChange || '+0%',
      icon: FiCheckCircle,
      color: 'success'
    },
    {
      title: 'Expiring Soon',
      value: analytics.expiringSoon || 0,
      change: analytics.expiringSoonChange || '+0%',
      icon: FiCalendar,
      color: 'warning'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${(analytics.monthlyRevenue || 0).toLocaleString()}`,
      change: analytics.revenueChange || '+0%',
      icon: FiTrendingUp,
      color: 'info'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage user subscriptions and plans</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Create Subscription
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {statsCards.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <span className="text-sm font-medium text-green-600">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          {/* Search and Bulk Actions Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {/* Bulk Actions */}
            {selectedSubscriptions.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {selectedSubscriptions.length} selected
                </span>
                <button
                  onClick={() => handleBulkAction('renew')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <MdAutorenew className="w-4 h-4" />
                  Bulk Renew
                </button>
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <MdCancel className="w-4 h-4" />
                  Bulk Cancel
                </button>
              </div>
            )}
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Plan Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Plan Type
              </label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Plans</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Mess Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mess Outlet
              </label>
              <select
                value={filterMess}
                onChange={(e) => setFilterMess(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Mess Outlets</option>
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

            {/* Expiring Soon Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Quick Filter
              </label>
              <button
                onClick={() => setFilterExpiringSoon(!filterExpiringSoon)}
                className={`w-full px-4 py-2 border rounded-lg transition-colors font-medium text-sm ${
                  filterExpiringSoon
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FiCalendar className="w-4 h-4" />
                  <span className="whitespace-nowrap">Expiring Soon</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedSubscriptions.length === subscriptions.length && subscriptions.length > 0}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center dark:bg-gray-800">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 dark:bg-gray-800">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((subscription) => (
                    <tr key={subscription.subscription_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedSubscriptions.includes(subscription.subscription_id)}
                          onChange={() => handleSelectSubscription(subscription.subscription_id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <FiUsers className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{subscription.user_id?.full_name || subscription.user?.full_name || 'N/A'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{subscription.user_id?.email || subscription.user?.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white capitalize">{subscription.plan_type || subscription.plan?.plan_name || 'N/A'}</p>
                          <p className="text-gray-500 dark:text-gray-400 capitalize">{subscription.sub_type || ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white">
                            {new Date(subscription.start_date).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            to {new Date(subscription.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        ₹{subscription.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditSubscription(subscription)}
                            className="p-1 text-gray-600 hover:text-primary-600 transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          {subscription.status === 'active' && (
                            <button
                              onClick={() => handleRenewSubscription(subscription.subscription_id)}
                              className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                              title="Renew"
                            >
                              <MdAutorenew className="w-4 h-4" />
                            </button>
                          )}
                          {subscription.status === 'active' && (
                            <button
                              onClick={() => handleCancelSubscription(subscription.subscription_id)}
                              className="p-1 text-gray-600 hover:text-orange-600 transition-colors"
                              title="Cancel"
                            >
                              <MdCancel className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSubscription(subscription.subscription_id)}
                            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t dark:border-gray-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white dark:bg-gray-800"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white dark:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-lg mx-4 my-8">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">Create New Subscription</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setUsers([]);
                  setNewSubscription({
                    user_id: '',
                    mess_id: '',
                    plan_type: 'monthly',
                    sub_type: 'both',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: '',
                    amount: 3000,
                    status: 'active',
                    payment_status: 'paid',
                    payment_method: 'cash'
                  });
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubscription} className="p-6">
              <div className="space-y-4">
                {/* Step 1: Select Mess */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Select Mess <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newSubscription.mess_id}
                    onChange={(e) => handleMessChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">-- Select Mess --</option>
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

                {/* Step 2: Select User (only shown after mess is selected) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Select User <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newSubscription.user_id}
                    onChange={(e) => setNewSubscription({...newSubscription, user_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
                    required
                    disabled={!newSubscription.mess_id || loadingUsers}
                  >
                    <option value="">
                      {!newSubscription.mess_id
                        ? '-- Select mess first --'
                        : loadingUsers
                          ? 'Loading users...'
                          : users.length === 0
                            ? '-- No users found --'
                            : '-- Select User --'}
                    </option>
                    {users.map(user => {
                      const userId = user._id || user.id || user.user_id;
                      return (
                        <option key={userId} value={userId}>
                          {user.full_name} ({user.email})
                        </option>
                      );
                    })}
                  </select>
                  {newSubscription.mess_id && !loadingUsers && users.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      No subscribers found in this mess. Create a user first.
                    </p>
                  )}
                </div>

                {/* Plan Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Plan Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newSubscription.plan_type}
                    onChange={(e) => {
                      const planType = e.target.value;
                      let amount = 3000;
                      let endDate = newSubscription.start_date;
                      const startDate = new Date(newSubscription.start_date);

                      switch(planType) {
                        case 'daily':
                          amount = 100;
                          endDate = new Date(startDate.setDate(startDate.getDate() + 1)).toISOString().split('T')[0];
                          break;
                        case 'weekly':
                          amount = 700;
                          endDate = new Date(startDate.setDate(startDate.getDate() + 7)).toISOString().split('T')[0];
                          break;
                        case 'monthly':
                          amount = 3000;
                          endDate = new Date(startDate.setMonth(startDate.getMonth() + 1)).toISOString().split('T')[0];
                          break;
                        case 'quarterly':
                          amount = 8500;
                          endDate = new Date(startDate.setMonth(startDate.getMonth() + 3)).toISOString().split('T')[0];
                          break;
                        case 'yearly':
                          amount = 30000;
                          endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1)).toISOString().split('T')[0];
                          break;
                        default:
                          amount = 3000;
                      }
                      setNewSubscription({...newSubscription, plan_type: planType, amount, end_date: endDate});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="daily">Daily - ₹100</option>
                    <option value="weekly">Weekly - ₹700</option>
                    <option value="monthly">Monthly - ₹3,000</option>
                    <option value="quarterly">Quarterly - ₹8,500</option>
                    <option value="yearly">Yearly - ₹30,000</option>
                  </select>
                </div>

                {/* Food Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Food Preference
                  </label>
                  <select
                    value={newSubscription.sub_type}
                    onChange={(e) => setNewSubscription({...newSubscription, sub_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {/* Date Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newSubscription.start_date}
                      onChange={(e) => setNewSubscription({...newSubscription, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newSubscription.end_date}
                      onChange={(e) => setNewSubscription({...newSubscription, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newSubscription.amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Amount is auto-calculated based on plan type
                  </p>
                </div>

                {/* Payment Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={newSubscription.payment_status}
                      onChange={(e) => setNewSubscription({...newSubscription, payment_status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={newSubscription.payment_method}
                      onChange={(e) => setNewSubscription({...newSubscription, payment_method: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="netbanking">Net Banking</option>
                      <option value="wallet">Wallet</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setUsers([]);
                    setNewSubscription({
                      user_id: '',
                      mess_id: '',
                      plan_type: 'monthly',
                      sub_type: 'both',
                      start_date: new Date().toISOString().split('T')[0],
                      end_date: '',
                      amount: 3000,
                      status: 'active',
                      payment_status: 'paid',
                      payment_method: 'cash'
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSubscription.user_id || !newSubscription.mess_id}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && currentSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">Edit Subscription</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubscription} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={currentSubscription.start_date?.split('T')[0]}
                    onChange={(e) => setCurrentSubscription({...currentSubscription, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={currentSubscription.end_date?.split('T')[0]}
                    onChange={(e) => setCurrentSubscription({...currentSubscription, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Status
                  </label>
                  <select
                    value={currentSubscription.status}
                    onChange={(e) => setCurrentSubscription({...currentSubscription, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;