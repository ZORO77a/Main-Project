import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  UserPlus,
  AlertCircle,
  Settings,
  Database,
  User,
  Camera
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Dashboard: Fetching data with token:', !!token);
      const response = await adminAPI.getDashboard();
      console.log('Dashboard: Data fetched successfully', response.data);
      setDashboardData(response.data);
      setLoading(false);
      setHasFetched(true);
    } catch (error) {
      console.error('Dashboard: Error fetching data', error);
      console.error('Dashboard: Error details', error.response?.data);
      setError(error.response?.data?.detail || error.message || 'Failed to load dashboard data');
      setLoading(false);
      setHasFetched(true);
    }
  };

  const handleApproveWFH = async (requestId) => {
    try {
      await adminAPI.approveWFH(requestId);
      toast.success('Work-from-home request approved');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleRejectWFH = async (requestId) => {
    try {
      await adminAPI.rejectWFH(requestId);
      toast.success('Work-from-home request rejected');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  useEffect(() => {
    console.log('Dashboard: Auth state', { user, token, authLoading, hasFetched });
    if (!authLoading && !hasFetched) {
      if (!token || !user) {
        console.log('Dashboard: No auth token, redirecting to login');
        navigate('/', { replace: true });
        return;
      }
      fetchDashboardData();
    }
  }, [authLoading, hasFetched, token, user, fetchDashboardData, navigate]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Failed to load dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              setHasFetched(false);
              fetchDashboardData();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No dashboard data available</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

const stats = [
  {
    title: 'Total Employees',
    value: dashboardData.total_employees,
    icon: Users,
    color: 'bg-blue-500',
    trend: '+ this month'
  },
  {
    title: 'Active Sessions',
    value: dashboardData.recent_logs.filter(l => l.success).length,
    icon: Activity,
    color: 'bg-green-500',
    trend: 'Currently active'
  },
  {
    title: 'Encrypted Files',
    value: dashboardData.encrypted_files,
    icon: FileText,
    color: 'bg-purple-500',
    trend: 'Encrypted'
  },
  {
    title: 'Pending Requests',
    value: dashboardData.pending_requests_count,
    icon: Clock,
    color: 'bg-orange-500',
    trend: 'Requires attention'
  }
];


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-blue-100 text-lg">Comprehensive security management and employee oversight</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Last updated</p>
              <p className="font-semibold">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Activity className="w-6 h-6 mr-3 text-blue-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/admin/add-employee')}
            className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <UserPlus className="w-6 h-6 mr-3 group-hover:animate-pulse" />
            <span className="font-semibold">Add New Employee</span>
          </button>
          <button
            onClick={() => navigate('/admin/employees')}
            className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Users className="w-6 h-6 mr-3 group-hover:animate-pulse" />
            <span className="font-semibold">Manage Employees</span>
          </button>
          <button
            onClick={() => navigate('/admin/files')}
            className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Database className="w-6 h-6 mr-3 group-hover:animate-pulse" />
            <span className="font-semibold">File Management</span>
          </button>
          <button
            onClick={() => navigate('/admin/logs')}
            className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Activity className="w-6 h-6 mr-3 group-hover:animate-pulse" />
            <span className="font-semibold">Access Logs</span>
          </button>
          <button
            onClick={() => navigate('/admin/ai-monitoring')}
            className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <AlertCircle className="w-6 h-6 mr-3 group-hover:animate-pulse" />
            <span className="font-semibold">AI Behavior Analysis</span>
          </button>
          <button
            onClick={() => navigate('/admin/face-registration')}
            className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Camera className="w-6 h-6 mr-3 group-hover:animate-pulse" />
            <span className="font-semibold">Face Registration</span>
          </button>
          <button
            onClick={() => navigate('/admin/settings')}
            className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Settings className="w-6 h-6 mr-3 group-hover:animate-pulse" />
            <span className="font-semibold">System Settings</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <p className="text-xs text-green-600 font-medium">{stat.trend}</p>
                </div>
              </div>
              <div className={`p-4 rounded-xl ${stat.color} shadow-lg`}>
                <stat.icon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Recent Activity
            </h3>
            <p className="text-sm text-gray-600 mt-1">Latest access attempts and system events</p>
          </div>
          <div className="p-6">
            {dashboardData?.recent_logs?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_logs.slice(0, 5).map((log, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`p-3 rounded-full ${log.success ? 'bg-green-100' : 'bg-red-100'} shadow-sm`}>
                      {log.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                        {log.reason && ` • ${log.reason}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Activity logs will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Pending Requests
            </h3>
            <p className="text-sm text-gray-600 mt-1">Work-from-home requests awaiting approval</p>
          </div>
          <div className="p-6">
            {dashboardData?.pending_requests?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.pending_requests.map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{request.employee_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        Period: {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-700 mt-2 bg-white bg-opacity-50 p-2 rounded">{request.reason}</p>
                    </div>
                    <div className="flex space-x-3 ml-4">
                      <button 
                        onClick={() => handleApproveWFH(request.id)}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 shadow-md"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleRejectWFH(request.id)}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 transform hover:scale-105 shadow-md"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No pending requests</p>
                <p className="text-sm text-gray-400 mt-1">Work-from-home requests will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Overview */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-6 h-6 mr-3 text-blue-600" />
            Security Overview
          </h3>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            System Secure
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {dashboardData?.recent_logs?.filter(log => log.success).length || 0}
            </div>
            <p className="text-sm font-medium text-gray-600">Successful Accesses</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="text-4xl font-bold text-red-600 mb-2">
              {dashboardData?.recent_logs?.filter(log => !log.success).length || 0}
            </div>
            <p className="text-sm font-medium text-gray-600">Failed Attempts</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{width: '15%'}}></div>
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {dashboardData?.employees?.filter(emp => emp.is_active).length || 0}
            </div>
            <p className="text-sm font-medium text-gray-600">Active Employees</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{width: '90%'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
