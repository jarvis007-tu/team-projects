import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import subscriptionService from '../../services/subscriptionService';
import messService from '../../services/messService';
import { useAuth } from '../../contexts/AuthContext';

const Subscription = () => {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [messInfo, setMessInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      // Fetch real data from API
      const messId = user?.mess_id?._id || user?.mess_id;
      const [activeRes, historyRes, messRes] = await Promise.all([
        subscriptionService.getActiveSubscription(),
        subscriptionService.getMySubscriptions(),
        messId ? messService.getMessById(messId).catch(() => null) : Promise.resolve(null)
      ]);

      // Set mess info if available
      if (messRes) {
        const mess = messRes.data || messRes;
        setMessInfo(mess);
      }

      // Get active subscription (may be null if no active subscription)
      const activeSubscription = activeRes.data?.subscription || activeRes.data || null;

      // Get subscription history
      const history = historyRes.data?.subscriptions || historyRes.data || [];

      // Transform active subscription data if exists
      // Handle both _id (raw mongoose) and subscription_id (toJSON transformed)
      const subscriptionId = activeSubscription?.subscription_id || activeSubscription?._id;
      if (activeSubscription && subscriptionId) {
        setCurrentSubscription({
          subscription_id: subscriptionId,
          plan_type: activeSubscription.plan_name || activeSubscription.plan_type || 'Standard',
          plan_tier: activeSubscription.plan_type === 'yearly' ? 3 : activeSubscription.plan_type === 'quarterly' ? 2 : 1,
          start_date: activeSubscription.start_date,
          end_date: activeSubscription.end_date,
          total_amount: activeSubscription.amount,
          status: activeSubscription.status,
          sub_type: activeSubscription.sub_type,
          meals_included: activeSubscription.meals_included,
          payment_status: activeSubscription.payment_status
        });
      } else {
        setCurrentSubscription(null);
      }

      // Transform history data - handle both _id and subscription_id
      const transformedHistory = history.map(sub => ({
        subscription_id: sub.subscription_id || sub._id,
        plan_type: sub.plan_name || sub.plan_type || 'Standard',
        start_date: sub.start_date,
        end_date: sub.end_date,
        total_amount: sub.amount,
        status: sub.status
      }));

      setSubscriptionHistory(transformedHistory);
    } catch (error) {
      console.error('Subscription fetch error:', error);
      // Set empty state on error - user has no subscription
      setCurrentSubscription(null);
      setSubscriptionHistory([]);
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
    if (!currentSubscription) return { status: 'none', color: 'gray', bgColor: 'gray' };
    const daysRemaining = getDaysRemaining();
    if (currentSubscription.status === 'expired' || daysRemaining <= 0) return { status: 'expired', color: 'red', bgColor: 'red' };
    if (currentSubscription.status === 'pending') return { status: 'pending', color: 'yellow', bgColor: 'yellow' };
    if (daysRemaining <= 7) return { status: 'expiring', color: 'yellow', bgColor: 'yellow' };
    return { status: 'active', color: 'green', bgColor: 'green' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMealTypeLabel = (subType) => {
    switch (subType) {
      case 'veg': return 'Vegetarian';
      case 'non-veg': return 'Non-Vegetarian';
      case 'both': return 'Veg & Non-Veg';
      default: return subType || 'All';
    }
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center px-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">My Subscription</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">View your mess subscription details</p>
      </div>

      {/* Current Subscription */}
      {currentSubscription ? (
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border overflow-hidden">
          <div className={`bg-gradient-to-r ${
            subscriptionStatus.status === 'active' ? 'from-green-500 to-green-600' :
            subscriptionStatus.status === 'expiring' ? 'from-yellow-500 to-yellow-600' :
            subscriptionStatus.status === 'pending' ? 'from-yellow-500 to-yellow-600' :
            'from-red-500 to-red-600'
          } p-4 sm:p-6 text-white`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1 capitalize">{currentSubscription.plan_type} Plan</h2>
                <p className="text-white/90 text-sm sm:text-base">Your current subscription</p>
              </div>
              <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 rounded-full flex items-center w-fit">
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                <span className="font-semibold capitalize text-sm sm:text-base">{subscriptionStatus.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div>
                <p className="text-white/80 text-xs sm:text-sm mb-0.5 sm:mb-1">Started</p>
                <p className="text-sm sm:text-base lg:text-xl font-semibold">
                  {formatDate(currentSubscription.start_date)}
                </p>
              </div>
              <div>
                <p className="text-white/80 text-xs sm:text-sm mb-0.5 sm:mb-1">Expires</p>
                <p className="text-sm sm:text-base lg:text-xl font-semibold">
                  {formatDate(currentSubscription.end_date)}
                </p>
              </div>
              <div>
                <p className="text-white/80 text-xs sm:text-sm mb-0.5 sm:mb-1">Days Left</p>
                <p className="text-sm sm:text-base lg:text-xl font-semibold">
                  {daysRemaining > 0 ? `${daysRemaining}` : 'Expired'}
                </p>
              </div>
              <div>
                <p className="text-white/80 text-xs sm:text-sm mb-0.5 sm:mb-1">Food Type</p>
                <p className="text-sm sm:text-base lg:text-xl font-semibold">
                  {getMealTypeLabel(currentSubscription.sub_type)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Amount Paid</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">₹{currentSubscription.total_amount}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Payment</p>
                <p className={`text-base sm:text-lg font-semibold capitalize ${
                  currentSubscription.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {currentSubscription.payment_status || 'Paid'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Meals</p>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {currentSubscription.meals_included?.breakfast && (
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs rounded-full">B</span>
                  )}
                  {currentSubscription.meals_included?.lunch && (
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs rounded-full">L</span>
                  )}
                  {currentSubscription.meals_included?.dinner && (
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs rounded-full">D</span>
                  )}
                </div>
              </div>
            </div>

            {/* Info notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                    Contact mess admin to renew or modify your subscription.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 mr-2 sm:mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-yellow-900 dark:text-yellow-100">No Active Subscription</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Contact the mess admin to subscribe.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mess Contact Information */}
      {messInfo && (
        <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
          <div className="flex items-center mb-3 sm:mb-4">
            <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400 mr-2" />
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Mess Contact</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
            Contact admin for subscription inquiries or assistance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center mb-1 sm:mb-2">
                <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 mr-1.5 sm:mr-2" />
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Mess</p>
              </div>
              <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">{messInfo.name || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center mb-1 sm:mb-2">
                <EnvelopeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 mr-1.5 sm:mr-2" />
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
              </div>
              <a
                href={`mailto:${messInfo.contact_email || ''}`}
                className="text-sm sm:text-base lg:text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline break-all"
              >
                {messInfo.contact_email || 'N/A'}
              </a>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
              <div className="flex items-center mb-1 sm:mb-2">
                <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 mr-1.5 sm:mr-2" />
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
              </div>
              <a
                href={`tel:${messInfo.contact_phone || ''}`}
                className="text-sm sm:text-base lg:text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                {messInfo.contact_phone || 'N/A'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Subscription History */}
      <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border p-4 sm:p-6">
        <div className="flex items-center mb-3 sm:mb-4">
          <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400 mr-2" />
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">History</h3>
        </div>

        {subscriptionHistory.length > 0 ? (
          <>
            {/* Mobile view - cards */}
            <div className="sm:hidden space-y-3">
              {subscriptionHistory.map((subscription) => (
                <div key={subscription.subscription_id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white capitalize text-sm">{subscription.plan_type}</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      subscription.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : subscription.status === 'expired'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        : subscription.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">₹{subscription.total_amount}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop view - table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-dark-border">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                  {subscriptionHistory.map((subscription) => (
                    <tr key={subscription.subscription_id}>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className="font-medium text-gray-900 dark:text-white capitalize text-sm">{subscription.plan_type}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">₹{subscription.total_amount}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          subscription.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : subscription.status === 'expired'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            : subscription.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                          {subscription.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6 sm:py-8 text-sm">No subscription history</p>
        )}
      </div>
    </div>
  );
};

export default Subscription;
