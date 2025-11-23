import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter,
  FiDownload, FiCalendar, FiUsers, FiCheckCircle,
  FiClock, FiAlertCircle, FiBarChart2, FiX
} from 'react-icons/fi';
import { MdQrCodeScanner, MdFastfood, MdTrendingUp } from 'react-icons/md';
import attendanceService from '../../services/attendanceService';
import { toast } from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [selectedUser, setSelectedUser] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showBulkMarkModal, setShowBulkMarkModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [analytics, setAnalytics] = useState({});
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [mealWiseData, setMealWiseData] = useState([]);

  const [manualAttendance, setManualAttendance] = useState({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    meal_type: 'breakfast',
    status: 'present'
  });

  const [bulkAttendance, setBulkAttendance] = useState({
    date: new Date().toISOString().split('T')[0],
    meal_type: 'breakfast',
    user_ids: '',
    status: 'present'
  });

  useEffect(() => {
    fetchAttendanceRecords();
    fetchAnalytics();
    fetchAttendanceTrends();
    fetchMealWiseData();
  }, [selectedDate, selectedMealType, selectedUser, searchTerm, currentPage]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const response = await attendanceService.getAttendanceRecords({
        date: selectedDate,
        meal_type: selectedMealType !== 'all' ? selectedMealType : undefined,
        user_id: selectedUser || undefined,
        search: searchTerm || undefined,
        page: currentPage
      });
      // Handle both response structures
      const data = response.data?.data || response.data;
      setAttendanceRecords(data.records || data.attendance || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      toast.error('Failed to fetch attendance records');
      console.error('Attendance fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await attendanceService.getAttendanceAnalytics({
        date: selectedDate
      });
      const data = response.data?.data || response.data || {};
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics');
    }
  };

  const fetchAttendanceTrends = async () => {
    try {
      const response = await attendanceService.getAttendanceTrends('week');
      const data = response.data?.data || response.data || {};
      // Transform backend data to chart format
      // Backend returns: {trends: [{date, count}]}
      // Chart expects: [{date, present}]
      const trends = (data.trends || []).map(item => ({
        date: item.date,
        present: item.count,
        absent: 0, // Not tracked in current model
        late: 0    // Not tracked in current model
      }));
      setAttendanceTrends(trends);
    } catch (error) {
      console.error('Failed to fetch trends');
    }
  };

  const fetchMealWiseData = async () => {
    try {
      const response = await attendanceService.getMealWiseAttendance({
        date: selectedDate
      });
      const data = response.data?.data || response.data || {};
      // Transform backend data to chart format
      // Backend returns: {mealwise: {date: {breakfast: count, lunch: count, dinner: count}}}
      // Chart expects: [{meal_type, present, absent}]
      const mealwise = data.mealwise || {};
      const todayData = mealwise[selectedDate] || {};
      const chartData = [
        { meal_type: 'Breakfast', present: todayData.breakfast || 0, absent: 0 },
        { meal_type: 'Lunch', present: todayData.lunch || 0, absent: 0 },
        { meal_type: 'Dinner', present: todayData.dinner || 0, absent: 0 }
      ];
      setMealWiseData(chartData);
    } catch (error) {
      console.error('Failed to fetch meal-wise data');
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      await attendanceService.markAttendance(manualAttendance);
      toast.success('Attendance marked successfully');
      setShowMarkModal(false);
      setManualAttendance({
        user_id: '',
        date: new Date().toISOString().split('T')[0],
        meal_type: 'breakfast',
        status: 'present'
      });
      fetchAttendanceRecords();
      fetchAnalytics();
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const handleBulkMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      const userIds = bulkAttendance.user_ids.split(',').map(id => id.trim()).filter(id => id);
      const attendanceList = userIds.map(userId => ({
        user_id: userId,
        date: bulkAttendance.date,
        meal_type: bulkAttendance.meal_type,
        status: bulkAttendance.status
      }));

      await attendanceService.bulkMarkAttendance(attendanceList);
      toast.success('Bulk attendance marked successfully');
      setShowBulkMarkModal(false);
      setBulkAttendance({
        date: new Date().toISOString().split('T')[0],
        meal_type: 'breakfast',
        user_ids: '',
        status: 'present'
      });
      fetchAttendanceRecords();
      fetchAnalytics();
    } catch (error) {
      toast.error('Failed to mark bulk attendance');
    }
  };

  const handleUpdateAttendance = async (id, newStatus) => {
    try {
      await attendanceService.updateAttendance(id, { status: newStatus });
      toast.success('Attendance updated successfully');
      fetchAttendanceRecords();
      fetchAnalytics();
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const handleDeleteAttendance = async (id) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await attendanceService.deleteAttendance(id);
        toast.success('Attendance record deleted successfully');
        fetchAttendanceRecords();
        fetchAnalytics();
      } catch (error) {
        toast.error('Failed to delete attendance record');
      }
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await attendanceService.exportAttendanceReport({
        date: selectedDate,
        meal_type: selectedMealType !== 'all' ? selectedMealType : undefined,
        user_id: selectedUser || undefined
      });
      
      // Create blob and download
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-report-${selectedDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'late': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const statsCards = [
    {
      title: 'Total Present Today',
      value: analytics.totalPresent || 0,
      change: analytics.presentChange || '+0%',
      icon: FiCheckCircle,
      color: 'success'
    },
    {
      title: 'Total Absent Today',
      value: analytics.totalAbsent || 0,
      change: analytics.absentChange || '+0%',
      icon: FiAlertCircle,
      color: 'error'
    },
    {
      title: 'Attendance Rate',
      value: `${analytics.attendanceRate || 0}%`,
      change: analytics.rateChange || '+0%',
      icon: FiBarChart2,
      color: 'info'
    },
    {
      title: 'Late Arrivals',
      value: analytics.lateArrivals || 0,
      change: analytics.lateChange || '+0%',
      icon: FiClock,
      color: 'warning'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Track and manage daily meal attendance</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportReport}
              className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Export Report
            </button>
            <button
              onClick={() => setShowBulkMarkModal(true)}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FiUsers className="w-4 h-4 mr-2" />
              Bulk Mark
            </button>
            <button
              onClick={() => setShowMarkModal(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Mark Attendance
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Attendance Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#22c55e" name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Meal-wise Attendance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Meal-wise Attendance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mealWiseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="meal_type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#22c55e" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Meal Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Meal Type</label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="snack">Snack</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">User ID</label>
              <input
                type="text"
                placeholder="Enter user ID"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setSelectedMealType('all');
                  setSelectedUser('');
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Meal Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center dark:bg-gray-800">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : attendanceRecords?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 dark:bg-gray-800">
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  attendanceRecords?.map((record) => (
                    <tr key={record.attendance_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <FiUsers className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {typeof record.user_id === 'object'
                                ? record.user_id?.full_name || 'N/A'
                                : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {typeof record.user_id === 'object'
                                ? record.user_id?.user_id
                                : record.user_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {new Date(record.scan_date || record.date || record.scan_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <MdFastfood className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-sm text-gray-900 dark:text-white capitalize">{record.meal_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={record.status || 'present'}
                          onChange={(e) => handleUpdateAttendance(record.attendance_id, e.target.value)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusColor(record.status || 'present')}`}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {record.scan_time ? new Date(record.scan_time).toLocaleTimeString() :
                         record.created_at ? new Date(record.created_at).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDeleteAttendance(record.attendance_id)}
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

      {/* Manual Attendance Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">Mark Attendance</h2>
              <button
                onClick={() => setShowMarkModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleMarkAttendance} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={manualAttendance.user_id}
                    onChange={(e) => setManualAttendance({...manualAttendance, user_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={manualAttendance.date}
                    onChange={(e) => setManualAttendance({...manualAttendance, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Meal Type
                  </label>
                  <select
                    value={manualAttendance.meal_type}
                    onChange={(e) => setManualAttendance({...manualAttendance, meal_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="snack">Snack</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Status
                  </label>
                  <select
                    value={manualAttendance.status}
                    onChange={(e) => setManualAttendance({...manualAttendance, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Mark Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Mark Attendance Modal */}
      {showBulkMarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600">
              <h2 className="text-lg font-semibold dark:text-white">Bulk Mark Attendance</h2>
              <button
                onClick={() => setShowBulkMarkModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleBulkMarkAttendance} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    User IDs (comma-separated)
                  </label>
                  <textarea
                    value={bulkAttendance.user_ids}
                    onChange={(e) => setBulkAttendance({...bulkAttendance, user_ids: e.target.value})}
                    placeholder="Enter user IDs separated by commas"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={bulkAttendance.date}
                    onChange={(e) => setBulkAttendance({...bulkAttendance, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Meal Type
                  </label>
                  <select
                    value={bulkAttendance.meal_type}
                    onChange={(e) => setBulkAttendance({...bulkAttendance, meal_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="snack">Snack</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Status
                  </label>
                  <select
                    value={bulkAttendance.status}
                    onChange={(e) => setBulkAttendance({...bulkAttendance, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBulkMarkModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Mark Bulk Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;