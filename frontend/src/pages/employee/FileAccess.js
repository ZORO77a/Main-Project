import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Shield,
  Clock,
  Edit,
  Trash2,
  Check,
  X,
  Loader,
  AlertCircle,
  Eye,
  Download,
  Lock,
  Zap
} from 'lucide-react';
import { employeeAPI, authAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getCurrentLocation } from '../../utils/gps';
import { getWiFiSSID } from '../../utils/wifi';
import { generateDeviceFingerprint } from '../../utils/deviceFingerprint';
import FileViewer from '../../components/FileViewer';

export default function FileAccess() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const [wifiStatus, setWifiStatus] = useState(null);
  const [manualWifiSSID, setManualWifiSSID] = useState('');
  const [viewerFile, setViewerFile] = useState(null);

  // New state for full-screen file viewer
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [officePreviewUrl, setOfficePreviewUrl] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    fetchFiles();
    initializeSecurityChecks();
  }, []);

  // Initialize security checks (GPS, WiFi, Device)
  const initializeSecurityChecks = async () => {
    try {
      // Generate device fingerprint
      const fingerprint = await generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint);

      // Register device if not already registered
      try {
        await authAPI.registerDevice(fingerprint);
      } catch (error) {
        // Device might already be registered, that's fine
        console.log('Device registration:', error.response?.data || 'Already registered');
      }

      // Check location permission
      try {
        const location = await getCurrentLocation();
        setLocationStatus({ available: true, location });
      } catch (error) {
        setLocationStatus({ available: false, error: error.message });
      }

      // Check WiFi - Auto detect from backend
      detectWiFi();

    } catch (error) {
      console.error('Security initialization error:', error);
    }
  };

  const detectWiFi = async () => {
    try {
      setWifiStatus({ checking: true });
      const response = await authAPI.getWiFiSSID();
      const backendSSID = response.data.ssid;

      if (backendSSID) {
        setWifiStatus({ ssid: backendSSID, available: true, source: 'backend' });
        setManualWifiSSID(backendSSID); // Auto-fill manual input
        toast.success(`WiFi Auto-Detected: ${backendSSID}`);
      } else {
        // Fallback to browser detection (rarely works but worth a shot)
        const browserSSID = await getWiFiSSID();
        if (browserSSID) {
          setWifiStatus({ ssid: browserSSID, available: true, source: 'browser' });
          setManualWifiSSID(browserSSID);
        } else {
          setWifiStatus({ available: false, error: "Could not detect WiFi automatically" });
        }
      }
    } catch (error) {
      console.error('WiFi detection error:', error);
      setWifiStatus({ available: false, error: "Detection failed" });
    } finally {
      setWifiStatus(prev => ({ ...prev, checking: false }));
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await employeeAPI.getDashboard();
      setFiles(response.data.files || []);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      await employeeAPI.uploadFile(file);
      toast.success('File uploaded successfully!');
      fetchFiles(); // Refresh file list
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileAccess = async (fileId) => {
    setAccessLoading(fileId);

    try {
      // Step 1: Get current location
      try {
        await getCurrentLocation();
        toast.success('Location verified', { duration: 2000 });
      } catch (error) {
        toast.error(`Location error: ${error.message}`, { duration: 5000 });
        throw new Error(`Location access failed: ${error.message}`);
      }

      // Step 2: Get WiFi SSID (use manual input or detected)
      let wifiSSID = manualWifiSSID.trim();

      if (!wifiSSID) {
        // Try one last detection if empty
        try {
          const res = await authAPI.getWiFiSSID();
          if (res.data.ssid) {
            wifiSSID = res.data.ssid;
            setManualWifiSSID(wifiSSID);
          }
        } catch (e) { /* ignore */ }
      }

      if (!wifiSSID) {
        toast.error('Please enter your WiFi SSID before accessing the file', { duration: 5000 });
        throw new Error('WiFi SSID is required');
      }

      // Step 3: Get device fingerprint
      let fingerprint = deviceFingerprint;
      if (!fingerprint) {
        fingerprint = await generateDeviceFingerprint();
        setDeviceFingerprint(fingerprint);
      }

      // Step 4: Verify device fingerprint
      try {
        await authAPI.verifyDevice(fingerprint);
      } catch (error) {
        toast.error('Device not recognized. Please register your device.', { duration: 5000 });
        // Try to register device
        try {
          await authAPI.registerDevice(fingerprint);
          toast.success('Device registered successfully');
        } catch (regError) {
          throw new Error('Device verification failed. Please contact admin.');
        }
      }

      // Step 6: Prepare access request with all security data
      // Note: FileViewer component will handle the actual API call with security checks
      const file = files.find(f => f.id === fileId);
      setViewerFile({
        id: fileId,
        name: file ? file.filename : 'Unknown File',
        algorithm: file ? file.encryption_alg : null,
      });

      toast.success('Opening secure file viewer...');
    } catch (error) {
      console.error('File access error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to access file';

      // Show detailed error message
      if (errorMessage.includes('Face verification')) {
        toast.error('Face verification required. Please verify your face first.', { duration: 5000 });
      } else if (errorMessage.includes('Location')) {
        toast.error(errorMessage, { duration: 5000 });
      } else if (errorMessage.includes('Time')) {
        toast.error(errorMessage, { duration: 5000 });
      } else if (errorMessage.includes('WiFi')) {
        toast.error(errorMessage, { duration: 5000 });
      } else if (errorMessage.includes('risk')) {
        toast.error(errorMessage, { duration: 5000 });
      } else {
        toast.error(errorMessage, { duration: 5000 });
      }
    } finally {
      setAccessLoading(null);
    }
  };

  const handleRenameFile = async (fileId, newName) => {
    try {
      await employeeAPI.renameFile(fileId, newName);
      toast.success('File renamed successfully!');
      setEditingFile(null);
      setNewFileName('');
      fetchFiles();
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
      fetchFiles();
    } catch (error) {
      toast.error('Failed to delete file');
    } finally {
      setDeleteLoading(null);
    }
  };

  /* ================= VIEW FILE CONTENT ================= */
  const viewFileContent = async (file) => {
    if (!file) return;

    const fileExt = file.filename.toLowerCase().split('.').pop();
    const isOfficeFile = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(fileExt);

    setViewingFile(file);
    setFileLoading(true);
    setFileError(null);
    setFileContent(null);
    setOfficePreviewUrl(null);

    try {
      const response = await adminAPI.viewFileContent(file.id, { responseType: 'blob' });
      const blob = response.data;
      const fileType = getFileType(file.filename);

      if (isOfficeFile) {
        // For Office files, convert blob to base64 data URI
        // This allows Microsoft Office viewer to access the file without CORS issues
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result.split(',')[1]; // Extract base64 part
          const mimeType = response.headers['content-type'] || getMimeType(file.filename);
          const dataUri = `data:${mimeType};base64,${base64Data}`;
          
          // Pass data URI to Microsoft Office Web Viewer
          const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(dataUri)}`;
          setOfficePreviewUrl(officeViewerUrl);
          setFileLoading(false);
          toast.success('File access granted ✓', { duration: 2000 });
        };
        reader.onerror = () => {
          setFileError("Failed to process file");
          setFileLoading(false);
          toast.error("Failed to process file");
        };
        reader.readAsDataURL(blob);
      } else {
        // For non-Office files, create blob URL normally
        const objectUrl = URL.createObjectURL(blob);
        setFileContent({
          url: objectUrl,
          blob: blob,
          type: fileType,
          mimeType: response.headers['content-type'] || 'application/octet-stream',
        });
        setFileLoading(false);
        toast.success('File access granted ✓', { duration: 2000 });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to load file content";
      setFileError(errorMsg);
      toast.error(errorMsg);
      setFileLoading(false);
    }
  };

  const getMimeType = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeMap = {
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'ppt': 'application/vnd.ms-powerpoint',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'pdf': 'application/pdf',
    };
    return mimeMap[ext] || 'application/octet-stream';
  };

  const closeFileViewer = () => {
    if (fileContent?.url) {
      URL.revokeObjectURL(fileContent.url);
    }
    setViewingFile(null);
    setFileContent(null);
    setFileError(null);
  };

  const getFileType = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const textTypes = ['txt', 'json', 'log', 'md', 'csv', 'xml', 'yaml', 'yml', 'py', 'js', 'ts', 'html', 'css'];
    const officeTypes = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'];

    if (ext === 'pdf') return 'pdf';
    if (imageTypes.includes(ext)) return 'image';
    if (textTypes.includes(ext)) return 'text';
    if (officeTypes.includes(ext)) return 'office';
    return 'binary';
  };

  const startEditing = (file) => {
    setEditingFile(file.id);
    setNewFileName(file.filename);
  };

  const cancelEditing = () => {
    setEditingFile(null);
    setNewFileName('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">File Access</h1>
            <p className="text-gray-600 mt-1">Upload and securely access your encrypted files</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">
                {uploadLoading ? 'Uploading...' : 'Upload File'}
              </span>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadLoading}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Security Status Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3 mb-4">
          <Shield className="w-6 h-6 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900">Zero-Trust Security Status</h3>
            <p className="text-sm text-blue-700 mt-1">
              All security checks must pass for file access
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Face Verification Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Face Verified</span>
              {user ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {user ? 'Session active' : 'Verify required'}
            </p>
          </div>

          {/* Device Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Device</span>
              {deviceFingerprint ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Loader className="w-5 h-5 text-yellow-600 animate-spin" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {deviceFingerprint ? 'Fingerprint ready' : 'Initializing...'}
            </p>
          </div>

          {/* Location Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">GPS Location</span>
              {locationStatus?.available ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : locationStatus ? (
                <X className="w-5 h-5 text-red-600" />
              ) : (
                <Loader className="w-5 h-5 text-yellow-600 animate-spin" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {locationStatus?.available
                ? 'Ready for access'
                : locationStatus?.error
                  ? locationStatus.error.substring(0, 25) + '...'
                  : 'Checking...'}
            </p>
          </div>

          {/* WiFi Status - Manual Input */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">WiFi Network</span>
              <div className="flex items-center space-x-2">
                {manualWifiSSID ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualWifiSSID}
                onChange={(e) => setManualWifiSSID(e.target.value)}
                placeholder="Enter WiFi SSID"
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={detectWiFi}
                disabled={wifiStatus?.checking}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs border border-gray-300 transition-colors"
                title="Auto-detect WiFi"
              >
                {wifiStatus?.checking ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  'Detect'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {wifiStatus?.checking ? 'Detecting...' : (manualWifiSSID ? `Using: ${manualWifiSSID}` : 'Required for access')}
            </p>
          </div>
        </div>

        {!user?.work_from_home_allowed && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Office Access Required</p>
                <p className="text-xs text-yellow-700 mt-1">
                  You must be within the designated location, on office WiFi, and during working hours to access files.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Files</h2>
          <p className="text-gray-600 mt-1">Securely stored and encrypted files</p>
        </div>

        <div className="p-6">
          {files.length > 0 ? (
            <div className="space-y-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      {editingFile === file.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-medium text-gray-900">{file.filename}</h3>
                          <p className="text-xs text-gray-500">
                            Uploaded: {new Date(file.created_at).toLocaleDateString()}
                          </p>
                          {file.encryption_alg && (
                            <span className="inline-block ml-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-800">
                              {file.encryption_alg.toUpperCase()}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {file.is_encrypted && (
                      <div className="flex items-center space-x-1">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Encrypted</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditing(file)}
                      disabled={editingFile === file.id}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Rename file"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={deleteLoading === file.id}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete file"
                    >
                      {deleteLoading === file.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => viewFileContent(file)}
                      disabled={fileLoading || accessLoading === file.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {fileLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {fileLoading ? 'Opening...' : 'View'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
              <p className="text-gray-500 mb-4">
                Upload your first file to get started with secure file storage
              </p>
              <label className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Upload File</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadLoading}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Access Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How File Access Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">For Office Access:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Must be within designated office location</li>
              <li>• Connected to office WiFi network</li>
              <li>• Access during allocated working hours</li>
              <li>• Valid biometric authentication</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">For Remote Access:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Requires admin approval for WFH</li>
              <li>• All other security measures remain active</li>
              <li>• Files are still encrypted and secure</li>
              <li>• Access logs are maintained</li>
            </ul>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          {/* Loading state */}
          {fileLoading && (
            <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600" />
                  <Lock className="absolute inset-0 m-auto w-5 h-5 text-blue-600" />
                </div>
                <p className="text-center text-gray-700 font-medium">Decrypting file…</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {fileError && !fileLoading && (
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <X className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Access Denied</h3>
                <p className="text-center text-gray-600 text-sm">{fileError}</p>
                <button
                  onClick={closeFileViewer}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Office Web Viewer */}
          {officePreviewUrl && !fileLoading && !fileError && (
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 flex flex-col z-10" style={{ height: '90vh' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{viewingFile.filename}</h3>
                <button
                  onClick={closeFileViewer}
                  className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={officePreviewUrl}
                  className="w-full h-full border-0"
                  title={viewingFile.filename}
                  allow="fullscreen"
                />
              </div>
            </div>
          )}

          {/* File viewer */}
          {fileContent && !fileLoading && !fileError && (
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 flex flex-col z-10" style={{ height: '90vh' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                  <Eye className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{viewingFile.filename}</h3>
                    <div className="flex items-center space-x-2 mt-1 text-sm">
                      <span className="text-gray-500">{new Date(viewingFile.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold ${
                    viewingFile.encryption_alg?.includes('kyber') 
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                  }`}>
                    {viewingFile.encryption_alg?.includes('kyber') ? (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>KYBER (PQC)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>{viewingFile.encryption_alg?.toUpperCase()}</span>
                      </>
                    )}
                  </span>
                  <button
                    onClick={closeFileViewer}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close viewer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-hidden bg-gray-50">
                {fileContent.type === 'pdf' && (
                  <iframe
                    src={fileContent.url}
                    className="w-full h-full border-0"
                    title={viewingFile.filename}
                  />
                )}

                {fileContent.type === 'image' && (
                  <div className="flex items-center justify-center h-full">
                    <img
                      src={fileContent.url}
                      alt={viewingFile.filename}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}

                {fileContent.type === 'text' && (
                  <EmployeeFileTextViewer url={fileContent.url} isMime={fileContent.mimeType} />
                )}

                {fileContent.type === 'binary' && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                    <Download className="w-16 h-16 text-gray-300" />
                    <p className="text-lg font-medium">Binary file — preview not available</p>
                    <p className="text-sm text-gray-400">This file type cannot be previewed in the browser.</p>
                    <a
                      href={fileContent.url}
                      download={viewingFile.filename}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Text file viewer component for employee
function EmployeeFileTextViewer({ url, isMime }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => blob.text())
      .then((text) => {
        if (isMime === 'application/json') {
          try {
            setContent(JSON.stringify(JSON.parse(text), null, 2));
          } catch {
            setContent(text);
          }
        } else {
          setContent(text);
        }
      })
      .catch((err) => {
        console.error('Error loading text file:', err);
        setContent('[Error loading file content]');
      })
      .finally(() => setLoading(false));
  }, [url, isMime]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words overflow-auto h-full bg-white text-gray-800">
      {content}
    </pre>
  );
}