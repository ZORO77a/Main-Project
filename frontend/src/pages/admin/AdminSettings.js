import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Database,
  Users,
  FileText,
  Activity,
  Trash2,
  RefreshCw,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resettingLogs, setResettingLogs] = useState(false);
  const [clearingFiles, setClearingFiles] = useState(false);
  const [clearDays, setClearDays] = useState(30);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const resetLogs = async () => {
    if (!window.confirm('Are you sure you want to reset all access logs? This action cannot be undone.')) {
      return;
    }

    try {
      setResettingLogs(true);
      await adminAPI.resetLogs();
      toast.success('Access logs reset successfully');
      fetchSettings(); // Refresh stats
    } catch (error) {
      toast.error('Failed to reset logs');
    } finally {
      setResettingLogs(false);
    }
  };

  const clearOldFiles = async () => {
    if (!window.confirm(`Are you sure you want to delete files older than ${clearDays} days? This action cannot be undone.`)) {
      return;
    }

    try {
      setClearingFiles(true);
      const response = await adminAPI.clearOldFiles(clearDays);
      toast.success(response.data.message);
      fetchSettings(); // Refresh stats
    } catch (error) {
      toast.error('Failed to clear old files');
    } finally {
      setClearingFiles(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center text-gray-100 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold mb-2">System Settings</h1>
            <p className="text-gray-100 text-lg">Manage system configuration and maintenance</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <Settings className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Shield className="w-6 h-6 mr-3 text-green-600" />
          System Status
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Users</p>
                  <p className="text-3xl font-bold">{settings?.total_users || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Files</p>
                  <p className="text-3xl font-bold">{settings?.total_files || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-green-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Access Logs</p>
                  <p className="text-3xl font-bold">{settings?.total_logs || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Active Today</p>
                  <p className="text-3xl font-bold">{settings?.active_sessions_today || 0}</p>
                </div>
                <Database className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-3 text-yellow-600" />
          Maintenance Actions
        </h3>

        <div className="space-y-6">
          {/* Reset Logs */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Reset Access Logs</h4>
                <p className="text-gray-600 mb-4">
                  Clear all access logs from the system. This will permanently delete all login and activity records.
                </p>
                <div className="flex items-center text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  This action cannot be undone
                </div>
              </div>
              <button
                onClick={resetLogs}
                disabled={resettingLogs}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {resettingLogs ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5 mr-2" />
                )}
                Reset Logs
              </button>
            </div>
          </div>

          {/* Clear Old Files */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Clear Old Files</h4>
                <p className="text-gray-600 mb-4">
                  Delete files older than the specified number of days to free up storage space.
                </p>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Days:</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={clearDays}
                    onChange={(e) => setClearDays(parseInt(e.target.value) || 30)}
                    className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={clearOldFiles}
                disabled={clearingFiles}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {clearingFiles ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5 mr-2" />
                )}
                Clear Files
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Shield className="w-6 h-6 mr-3 text-blue-600" />
          Security Configuration
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Encryption</h4>
              <p className="text-sm text-gray-600 mb-3">
                Files are encrypted using post-quantum cryptography (ECC + AES-GCM)
              </p>
              <div className="flex items-center text-green-600">
                <Shield className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Geofencing</h4>
              <p className="text-sm text-gray-600 mb-3">
                Location-based access control with configurable tolerance
              </p>
              <div className="flex items-center text-green-600">
                <Shield className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">OTP Authentication</h4>
              <p className="text-sm text-gray-600 mb-3">
                Multi-factor authentication with time-based OTP
              </p>
              <div className="flex items-center text-green-600">
                <Shield className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">AI Monitoring</h4>
              <p className="text-sm text-gray-600 mb-3">
                Machine learning-based behavior analysis and anomaly detection
              </p>
              <div className="flex items-center text-green-600">
                <Shield className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}