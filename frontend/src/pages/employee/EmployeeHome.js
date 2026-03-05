import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  MapPin,
  Wifi,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Home,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Eye
} from 'lucide-react';
import { employeeAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import FileViewer from '../../components/FileViewer';

export default function EmployeeHome() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingFile, setEditingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewerFileId, setViewerFileId] = useState(null);
  const [viewerFileName, setViewerFileName] = useState('');
  const [viewerFileAlg, setViewerFileAlg] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await employeeAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameFile = async (fileId, newName) => {
    try {
      await employeeAPI.renameFile(fileId, newName);
      toast.success('File renamed successfully!');
      setEditingFile(null);
      setNewFileName('');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to rename file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(fileId);
    try {
      await employeeAPI.deleteFile(fileId);
      toast.success('File deleted successfully!');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete file');
    } finally {
      setDeleteLoading(null);
    }
  };

  const startEditing = (file) => {
    setEditingFile(file.id);
    setNewFileName(file.filename);
  };

  const cancelEditing = () => {
    setEditingFile(null);
    setNewFileName('');
  };

  const handleEditFile = (file) => {
    setViewerFileId(file.id);
    setViewerFileName(file.filename);
    setViewerFileAlg(file.encryption_alg);
    setShowFileViewer(true);
  };

  const handleCloseFileViewer = () => {
    setShowFileViewer(false);
    setViewerFileId(null);
    setViewerFileName('');
    setViewerFileAlg(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const successfulAccesses = dashboardData?.recent_logs?.filter(log => log.success).length || 0;
  const totalAccesses = dashboardData?.recent_logs?.length || 0;
  const successRate = totalAccesses > 0 ? Math.round((successfulAccesses / totalAccesses) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-blue-100 mt-2 text-lg">Access your secure files and manage your workspace</p>
          </div>
          <div className="flex items-center space-x-3 bg-white bg-opacity-20 rounded-lg px-4 py-2">
            <Shield className="w-6 h-6" />
            <span className="text-sm font-medium">Secure Connection</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.files?.length || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Successful Accesses</p>
              <p className="text-3xl font-bold text-green-600">{successfulAccesses}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600">{successRate}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">WFH Status</p>
              <p className={`text-lg font-bold ${user?.work_from_home_allowed ? 'text-green-600' : 'text-orange-600'}`}>
                {user?.work_from_home_allowed ? 'Allowed' : 'Office Only'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${user?.work_from_home_allowed ? 'bg-green-100' : 'bg-orange-100'}`}>
              <Home className={`w-6 h-6 ${user?.work_from_home_allowed ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Access Conditions Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-blue-600" />
          Access Conditions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Authentication</p>
              <p className="text-xs text-green-600">Verified</p>
            </div>
          </div>

          {user?.work_from_home_allowed ? (
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Home className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Work from Home</p>
                <p className="text-xs text-green-600">Allowed</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Location</p>
                  <p className="text-xs text-blue-600">Required</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Wifi className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">WiFi Network</p>
                  <p className="text-xs text-blue-600">Required</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Working Hours</p>
                  <p className="text-xs text-blue-600">Required</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* WFH Requests Status */}
      {dashboardData?.wfh_requests?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-orange-600" />
            Work From Home Requests
          </h2>
          <div className="space-y-3">
            {dashboardData.wfh_requests.slice(0, 3).map((request, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${request.approved ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    {request.approved ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.approved ? 'Approved' : 'Pending Approval'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Reason: {request.reason.length > 50 ? `${request.reason.substring(0, 50)}...` : request.reason}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Requested: {new Date(request.requested_at).toLocaleDateString()}
                  </p>
                  {request.approved && (
                    <p className="text-xs text-green-600 font-medium">
                      Approved: {new Date(request.approved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {dashboardData.wfh_requests.length > 3 && (
            <div className="mt-4 text-center">
              <Link
                to="/employee/wfh-request"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all requests →
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Files */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">My Files</h2>
              <Link
                to="/employee/files"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.files?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.files.slice(0, 3).map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3 flex-1">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        {editingFile === file.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={newFileName}
                              onChange={(e) => setNewFileName(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameFile(file.id, newFileName);
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameFile(file.id, newFileName)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-900">{file.filename}
                            {file.encryption_alg && (
                              <span className="ml-2 px-1 py-0.5 text-xs bg-gray-200 rounded">
                                {file.encryption_alg.toUpperCase()}
                              </span>
                            )}
                          </p>
                            <p className="text-xs text-gray-500">
                              {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.is_encrypted && (
                        <Shield className="w-4 h-4 text-green-600" />
                      )}
                      {editingFile !== file.id && (
                        <>
                          <button
                            onClick={() => startEditing(file)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Rename file"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={deleteLoading === file.id}
                            className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete file"
                          >
                            {deleteLoading === file.id ? (
                              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditFile(file.id, file.filename)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Open File</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No files uploaded yet</p>
                <Link
                  to="/employee/files"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block"
                >
                  Upload your first file →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-purple-600" />
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            {dashboardData?.recent_logs?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recent_logs.map((log, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${log.success ? 'bg-green-100' : 'bg-red-100'}`}>
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">{log.action.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                        {log.reason && ` • ${log.reason}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/employee/files"
            className="flex items-center justify-center space-x-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <Upload className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-blue-800 font-medium">Upload File</span>
          </Link>

          <Link
            to="/employee/files"
            className="flex items-center justify-center space-x-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <Eye className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="text-green-800 font-medium">View Files</span>
          </Link>

          <Link
            to="/employee/wfh-request"
            className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-colors group ${
              user?.work_from_home_allowed
                ? 'bg-green-50 hover:bg-green-100'
                : 'bg-orange-50 hover:bg-orange-100'
            }`}
          >
            <Home className={`w-5 h-5 group-hover:scale-110 transition-transform ${
              user?.work_from_home_allowed ? 'text-green-600' : 'text-orange-600'
            }`} />
            <span className={`font-medium ${
              user?.work_from_home_allowed ? 'text-green-800' : 'text-orange-800'
            }`}>
              {user?.work_from_home_allowed ? 'WFH Active' : 'Request WFH'}
            </span>
          </Link>

          <Link
            to="/employee/files"
            className="flex items-center justify-center space-x-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <Plus className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-purple-800 font-medium">New File</span>
          </Link>
        </div>
      </div>

      {/* File Management Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          File Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-800">Upload Files</p>
            <p className="text-xs text-blue-600 mt-1">Secure encrypted storage</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Eye className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-800">View Files</p>
            <p className="text-xs text-green-600 mt-1">Secure in-browser viewing</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Edit className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-800">Manage Files</p>
            <p className="text-xs text-purple-600 mt-1">Rename, delete, organize</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <Link
            to="/employee/files"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Go to File Manager</span>
          </Link>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-yellow-800">Security Reminder</h3>
            <p className="text-sm text-yellow-700 mt-2">
              All files are encrypted and can only be accessed when security conditions are met.
              {user?.work_from_home_allowed 
                ? ' Your work-from-home access is approved - you can work securely from any location.'
                : ' If you need to work remotely, request work-from-home approval from your administrator.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Inline File Viewer/Editor */}
      {showFileViewer && (
        <FileViewer
          fileId={viewerFileId}
          fileName={viewerFileName}
          algorithm={viewerFileAlg}
          onClose={handleCloseFileViewer}
        />
      )}
    </div>
  );
}
