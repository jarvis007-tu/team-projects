import React, { useState, useEffect } from 'react';
import { 
  FiDownload, FiCalendar, FiTrendingUp, FiUsers,
  FiDollarSign, FiPieChart, FiBarChart2, FiFilter,
  FiRefreshCw, FiFileText, FiSave
} from 'react-icons/fi';
import { MdAssessment, MdTimeline, MdCompare } from 'react-icons/md';
import reportService from '../../services/reportService';
import { toast } from 'react-hot-toast';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer
} from 'recharts';

const AdminReports = () => {
  const [activeReport, setActiveReport] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({});
  const [customReport, setCustomReport] = useState({
    name: '',
    description: '',
    metrics: [],
    filters: {},
    groupBy: 'day',
    chartType: 'line'
  });
  const [savedTemplates, setSavedTemplates] = useState([]);

  const reportTypes = [
    {
      id: 'dashboard',
      name: 'Dashboard Overview',
      icon: MdAssessment,
      description: 'General statistics and KPIs'
    },
    {
      id: 'revenue',
      name: 'Revenue Analysis',
      icon: FiDollarSign,
      description: 'Revenue trends and financial insights'
    },
    {
      id: 'attendance',
      name: 'Attendance Reports',
      icon: FiUsers,
      description: 'Meal attendance patterns and trends'
    },
    {
      id: 'user-activity',
      name: 'User Activity',
      icon: FiTrendingUp,
      description: 'User engagement and behavior analysis'
    },
    {
      id: 'meal-consumption',
      name: 'Meal Consumption',
      icon: FiPieChart,
      description: 'Food consumption patterns and preferences'
    },
    {
      id: 'comparative',
      name: 'Comparative Analysis',
      icon: MdCompare,
      description: 'Period-over-period comparisons'
    },
    {
      id: 'custom',
      name: 'Custom Reports',
      icon: FiFileText,
      description: 'Build your own custom reports'
    }
  ];

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchReportData();
    fetchSavedTemplates();
  }, [activeReport, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let response;
      const params = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };

      switch (activeReport) {
        case 'dashboard':
          response = await reportService.getDashboardStats();
          break;
        case 'revenue':
          response = await reportService.getRevenueReport(params);
          break;
        case 'attendance':
          response = await reportService.getAttendanceAnalytics(params);
          break;
        case 'user-activity':
          response = await reportService.getUserActivityReport(params);
          break;
        case 'meal-consumption':
          response = await reportService.getMealConsumptionReport(params);
          break;
        case 'comparative':
          response = await reportService.getComparativeAnalysis(params);
          break;
        default:
          response = { data: {} };
      }

      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedTemplates = async () => {
    try {
      const response = await reportService.getReportTemplates();
      setSavedTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch saved templates');
    }
  };

  const handleExportReport = async (format) => {
    try {
      setLoading(true);
      const params = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };

      const response = format === 'csv' 
        ? await reportService.exportToCSV(activeReport, params)
        : await reportService.exportToPDF(activeReport, params);

      const blob = new Blob([response], { 
        type: format === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeReport}-report-${dateRange.endDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomReport = async () => {
    try {
      await reportService.saveCustomReportTemplate(customReport);
      toast.success('Custom report template saved');
      fetchSavedTemplates();
      setCustomReport({
        name: '',
        description: '',
        metrics: [],
        filters: {},
        groupBy: 'day',
        chartType: 'line'
      });
    } catch (error) {
      toast.error('Failed to save custom report');
    }
  };

  const renderChart = (data, type, dataKey, title) => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={dataKey} stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={dataKey} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const renderDashboardStats = () => {
    // Extract data from reportData
    const activeUsers = reportData?.users?.active || reportData?.activeUsers || 0;
    const totalUsers = reportData?.users?.total || reportData?.totalUsers || 0;
    const avgAttendance = reportData?.attendance?.avgAttendancePerUser || reportData?.avgAttendance || 0;
    const avgDailyAttendance = reportData?.attendance?.avgDailyAttendance || 0;
    const totalAttendance = reportData?.attendance?.totalThisMonth || reportData?.mealsServed || 0;
    const monthlyRevenue = reportData?.subscriptions?.monthlyRevenue || reportData?.totalRevenue || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{monthlyRevenue.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">This month</p>
            </div>
            <FiDollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeUsers}</p>
              <p className="text-sm text-gray-500 mt-1">Out of {totalUsers} total</p>
            </div>
            <FiUsers className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Attendance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgAttendance}</p>
              <p className="text-sm text-gray-500 mt-1">Meals per user this month</p>
            </div>
            <FiBarChart2 className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Meals Served</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAttendance.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{avgDailyAttendance}/day average</p>
            </div>
            <FiPieChart className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      );
    }

    switch (activeReport) {
      case 'dashboard':
        return (
          <>
            {renderDashboardStats()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
                {renderChart(reportData.revenueTrend || [], 'line', 'revenue', 'Revenue Trend')}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance Overview</h3>
                {renderChart(reportData.attendanceOverview || [], 'bar', 'attendance', 'Attendance Overview')}
              </div>
            </div>
          </>
        );
      case 'revenue':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Analysis</h3>
              {renderChart(reportData.revenueData || [], 'area', 'amount', 'Revenue Analysis')}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Plan</h3>
                {renderChart(reportData.revenueByPlan || [], 'pie', 'value', 'Revenue by Plan')}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Comparison</h3>
                {renderChart(reportData.monthlyComparison || [], 'bar', 'revenue', 'Monthly Comparison')}
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance Trends</h3>
              {renderChart(reportData.attendanceTrends || [], 'line', 'attendance', 'Attendance Trends')}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meal-wise Distribution</h3>
                {renderChart(reportData.mealwiseAttendance || [], 'pie', 'count', 'Meal-wise Distribution')}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Average</h3>
                {renderChart(reportData.dailyAverage || [], 'bar', 'average', 'Daily Average')}
              </div>
            </div>
          </div>
        );
      case 'custom':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Custom Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Report Name</label>
                  <input
                    type="text"
                    value={customReport.name}
                    onChange={(e) => setCustomReport({...customReport, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    placeholder="Enter report name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Chart Type</label>
                  <select
                    value={customReport.chartType}
                    onChange={(e) => setCustomReport({...customReport, chartType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="pie">Pie Chart</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Group By</label>
                  <select
                    value={customReport.groupBy}
                    onChange={(e) => setCustomReport({...customReport, groupBy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSaveCustomReport}
                    className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Templates */}
            {savedTemplates.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Saved Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedTemplates.map((template) => (
                    <div key={template.template_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{template.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{template.description}</p>
                      <button
                        onClick={async () => {
                          try {
                            await reportService.generateScheduledReport(template.template_id);
                            toast.success('Report generated successfully');
                          } catch (error) {
                            toast.error('Failed to generate report');
                          }
                        }}
                        className="w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        Generate Report
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {reportTypes.find(r => r.id === activeReport)?.name}
            </h3>
            {reportData.chartData && renderChart(reportData.chartData, 'line', 'value', 'Data Trend')}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-gray-600 dark:text-gray-300">Generate insights and export data reports</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchReportData}
              className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white"
              disabled={loading}
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => handleExportReport('csv')}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => handleExportReport('pdf')}
              className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Report Navigation & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Report Type Selection - Dropdown */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Select Report:</label>
              <select
                value={activeReport}
                onChange={(e) => setActiveReport(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:text-white min-w-[250px]"
              >
                {reportTypes.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Report Description */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {reportTypes.find(r => r.id === activeReport)?.description}
            </p>
          </div>
        </div>

        {/* Report Content */}
        {renderReportContent()}
      </div>
    </div>
  );
};

export default AdminReports;