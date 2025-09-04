import React, { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  StarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const Subscription = () => {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  const planFeatures = {
    basic: [
      'Access to all three meals',
      'Standard menu options',
      'QR-based attendance',
      'Monthly billing',
      'Email support'
    ],
    premium: [
      'All Basic features',
      'Special weekend menu',
      'Priority meal booking',
      'Guest meal allowance (2/month)',
      'Quarterly billing discount',
      'Priority support'
    ],
    vip: [
      'All Premium features',
      'Customized meal options',
      'Unlimited guest meals',
      'Room delivery option',
      'Half-yearly billing discount',
      '24/7 dedicated support'
    ]
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual service
      // const [currentRes, historyRes, plansRes] = await Promise.all([
      //   subscriptionService.getActiveSubscription(),
      //   subscriptionService.getSubscriptionHistory(),
      //   subscriptionService.getAvailablePlans()
      // ]);
      
      // Mock data for development
      const mockCurrentSubscription = {
        subscription_id: 'SUB001',
        plan_type: 'Premium',
        plan_tier: 2,
        start_date: '2024-08-01',
        end_date: '2024-10-31',
        total_amount: 4500,
        status: 'active'
      };

      const mockHistory = [
        {
          subscription_id: 'SUB001',
          plan_type: 'Premium',
          start_date: '2024-08-01',
          end_date: '2024-10-31',
          total_amount: 4500,
          status: 'active'
        },
        {
          subscription_id: 'SUB000',
          plan_type: 'Basic',
          start_date: '2024-05-01',
          end_date: '2024-07-31',
          total_amount: 3000,
          status: 'expired'
        }
      ];

      const mockPlans = [
        {
          plan_id: 'basic',
          name: 'Basic Plan',
          price: 1500,
          duration_months: 1,
          tier: 1,
          upgrade_price: null
        },
        {
          plan_id: 'premium',
          name: 'Premium Plan',
          price: 4200,
          duration_months: 3,
          tier: 2,
          upgrade_price: 1200
        },
        {
          plan_id: 'vip',
          name: 'VIP Plan',
          price: 8000,
          duration_months: 6,
          tier: 3,
          upgrade_price: 2000
        }
      ];

      setCurrentSubscription(mockCurrentSubscription);
      setSubscriptionHistory(mockHistory);
      setAvailablePlans(mockPlans);
    } catch (error) {
      toast.error('Failed to fetch subscription details');
      console.error('Subscription fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!currentSubscription) return 0;
    const endDate = new Date(currentSubscription.end_date);
    const today = new Date();
    const diffTime = endDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getSubscriptionStatus = () => {
    const daysRemaining = getDaysRemaining();
    if (daysRemaining <= 0) return { status: 'expired', color: 'red', bgColor: 'red' };
    if (daysRemaining <= 7) return { status: 'expiring', color: 'yellow', bgColor: 'yellow' };
    return { status: 'active', color: 'green', bgColor: 'green' };
  };

  const handleRenewal = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    setProcessing(true);
    try {
      // Simulated API call - replace with actual service
      // await subscriptionService.renewSubscription(currentSubscription.subscription_id, {
      //   plan_id: selectedPlan.plan_id,
      //   duration_months: selectedPlan.duration_months
      // });
      
      // Mock successful renewal
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      toast.success('Subscription renewed successfully!');
      setShowRenewalModal(false);
      fetchSubscriptionData();
    } catch (error) {
      toast.error('Failed to renew subscription');
      console.error('Renewal error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    setProcessing(true);
    try {
      // Simulated API call - replace with actual service
      // await subscriptionService.upgradeSubscription(currentSubscription.subscription_id, {
      //   new_plan_id: selectedPlan.plan_id
      // });
      
      // Mock successful upgrade
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      toast.success('Subscription upgraded successfully!');
      setShowUpgradeModal(false);
      fetchSubscriptionData();
    } catch (error) {
      toast.error('Failed to upgrade subscription');
      console.error('Upgrade error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (window.confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      try {
        // Simulated API call - replace with actual service
        // await subscriptionService.cancelSubscription(currentSubscription.subscription_id);
        
        // Mock successful cancellation
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        toast.success('Subscription cancelled successfully');
        fetchSubscriptionData();
      } catch (error) {
        toast.error('Failed to cancel subscription');
        console.error('Cancellation error:', error);
      }
    }
  };

  const downloadInvoice = async (subscriptionId) => {
    try {
      // Simulated API call - replace with actual service
      // const response = await subscriptionService.downloadInvoice(subscriptionId);
      
      // Mock successful download
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      // Create a mock download
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Invoice for subscription ${subscriptionId}`));
      element.setAttribute('download', `invoice-${subscriptionId}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
      console.error('Download error:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const subscriptionStatus = getSubscriptionStatus();
  const daysRemaining = getDaysRemaining();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Subscription</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your mess subscription and billing</p>
      </div>

      {/* Current Subscription */}
      {currentSubscription ? (
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border overflow-hidden">
          <div className={`bg-gradient-to-r from-${subscriptionStatus.bgColor}-500 to-${subscriptionStatus.bgColor}-600 p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{currentSubscription.plan_type} Plan</h2>
                <p className="text-white/90">Your current subscription plan</p>
              </div>
              <div className={`px-4 py-2 bg-white/20 rounded-full flex items-center`}>
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-semibold capitalize">{subscriptionStatus.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <p className="text-white/80 text-sm mb-1">Started On</p>
                <p className="text-xl font-semibold">
                  {formatDate(currentSubscription.start_date)}
                </p>
              </div>
              <div>
                <p className="text-white/80 text-sm mb-1">Expires On</p>
                <p className="text-xl font-semibold">
                  {formatDate(currentSubscription.end_date)}
                </p>
              </div>
              <div>
                <p className="text-white/80 text-sm mb-1">Days Remaining</p>
                <p className="text-xl font-semibold">
                  {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              {daysRemaining <= 30 && (
                <button
                  onClick={() => setShowRenewalModal(true)}
                  className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Renew Subscription
                </button>
              )}
              
              {currentSubscription.plan_type !== 'VIP' && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <StarIcon className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </button>
              )}

              <button
                onClick={() => downloadInvoice(currentSubscription.subscription_id)}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Download Invoice
              </button>

              <button
                onClick={handleCancelSubscription}
                className="flex items-center px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors ml-auto"
              >
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">No Active Subscription</h3>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">You don't have an active subscription. Please subscribe to continue using the mess services.</p>
            </div>
          </div>
          <button
            onClick={() => setShowRenewalModal(true)}
            className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Subscribe Now
          </button>
        </div>
      )}

      {/* Plan Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(planFeatures).map(([planType, features]) => (
          <div key={planType} className={`bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-6 ${
            currentSubscription?.plan_type?.toLowerCase() === planType ? 'ring-2 ring-primary-500' : ''
          }`}>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize flex items-center">
                {planType} Plan
                {planType === 'vip' && <StarIcon className="w-5 h-5 text-yellow-500 ml-2" />}
              </h3>
              {currentSubscription?.plan_type?.toLowerCase() === planType && (
                <span className="inline-block px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-semibold rounded-full mt-2">
                  Current Plan
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Subscription History */}
      <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-6">
        <div className="flex items-center mb-4">
          <ClockIcon className="w-6 h-6 text-gray-600 dark:text-gray-400 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription History</h3>
        </div>

        {subscriptionHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-dark-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {subscriptionHistory.map((subscription) => (
                  <tr key={subscription.subscription_id}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{subscription.plan_type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 dark:text-white">₹{subscription.total_amount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        subscription.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : subscription.status === 'expired'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                      }`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => downloadInvoice(subscription.subscription_id)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No subscription history available</p>
        )}
      </div>

      {/* Renewal Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Renew Subscription</h3>
            
            <div className="space-y-3 mb-6">
              {availablePlans.map((plan) => (
                <label
                  key={plan.plan_id}
                  className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPlan?.plan_id === plan.plan_id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.plan_id}
                    onChange={() => setSelectedPlan(plan)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{plan.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{plan.duration_months} months</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">₹{plan.price}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRenewalModal(false);
                  setSelectedPlan(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRenewal}
                disabled={!selectedPlan || processing}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upgrade Plan</h3>
            
            <div className="space-y-3 mb-6">
              {availablePlans
                .filter(plan => plan.tier > currentSubscription?.plan_tier)
                .map((plan) => (
                  <label
                    key={plan.plan_id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedPlan?.plan_id === plan.plan_id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.plan_id}
                      onChange={() => setSelectedPlan(plan)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{plan.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upgrade benefits included</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">₹{plan.upgrade_price}</p>
                    </div>
                  </label>
                ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedPlan(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={!selectedPlan || processing}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;