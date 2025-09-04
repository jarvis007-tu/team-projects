import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter,
  FiDownload, FiRefreshCw, FiX, FiCalendar, FiUsers,
  FiCreditCard, FiTrendingUp, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { MdSubscriptions, MdCancel, MdAutorenew } from 'react-icons/md';
import subscriptionService from '../../services/subscriptionService';
import { toast } from 'react-hot-toast';

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [analytics, setAnalytics] = useState({});

  const [newSubscription, setNewSubscription] = useState({
    user_id: '',
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active'
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchSubscriptionPlans();
    fetchAnalytics();
  }, [currentPage, searchTerm, filterStatus, filterPlan]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await subscriptionService.getAllSubscriptions({
        page: currentPage,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        plan: filterPlan !== 'all' ? filterPlan : undefined
      });
      setSubscriptions(response.data.subscriptions);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
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
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics');
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

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    try {
      await subscriptionService.createSubscription(newSubscription);
      toast.success('Subscription created successfully');
      setShowCreateModal(false);
      setNewSubscription({
        user_id: '',
        plan_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'active'
      });
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to create subscription');
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="suspended">Suspended</option>
              </select>

              {/* Plan Filter */}
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Plans</option>
                {subscriptionPlans.map(plan => (
                  <option key={plan.plan_id} value={plan.plan_id}>
                    {plan.plan_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedSubscriptions.length > 0 && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {selectedSubscriptions.length} selected
                </span>
                <button
                  onClick={() => handleBulkAction('renew')}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Bulk Renew
                </button>
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  Bulk Cancel
                </button>
              </div>
            )}
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
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{subscription.user?.full_name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{subscription.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white">{subscription.plan?.plan_name}</p>
                          <p className="text-gray-500 dark:text-gray-400">{subscription.plan?.meal_types?.join(', ')}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">Create New Subscription</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubscription} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={newSubscription.user_id}
                    onChange={(e) => setNewSubscription({...newSubscription, user_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Plan
                  </label>
                  <select
                    value={newSubscription.plan_id}
                    onChange={(e) => setNewSubscription({...newSubscription, plan_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="">Select Plan</option>
                    {subscriptionPlans.map(plan => (
                      <option key={plan.plan_id} value={plan.plan_id}>
                        {plan.plan_name} - ₹{plan.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Start Date
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
                    End Date
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
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Create
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