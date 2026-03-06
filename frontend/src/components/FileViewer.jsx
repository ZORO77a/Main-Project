import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Shield, Eye, Edit3, Save, Lock, Zap } from 'lucide-react';
import { employeeAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// security helpers used when requesting the file
import { getCurrentLocation } from '../utils/gps';
import { generateDeviceFingerprint } from '../utils/deviceFingerprint';

/**
 * FileViewer — secure in-browser file viewer with 15-minute session timer.
 *
 * Props:
 *   fileId    : string  — MongoDB ObjectId of the file
 *   fileName  : string  — original filename
 *   algorithm : string  — encryption algorithm stored on the file record
 *   wifiSSID  : string  — manually-entered WiFi SSID from parent (FileAccess page)
 *   onClose   : fn      — called when the viewer should be dismissed
 */
const FileViewer = ({ fileId, fileName, algorithm, wifiSSID = null, onClose }) => {
  const [fileContent, setFileContent] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [accessGranted, setAccessGranted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [textContent, setTextContent] = useState(''); // Raw text for text files
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const intervalRef = useRef(null);
  const objectUrlRef = useRef(null);
  const blobRef = useRef(null); // Store blob ref for text file access

  useEffect(() => {
    requestFileAccess();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  useEffect(() => {
    if (accessGranted) {
      startTimer();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessGranted]);

  const cleanup = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleExpiration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleExpiration = () => {
    toast.error('Access session expired');
    cleanup();
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileType = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const textTypes = ['txt', 'json', 'log', 'md', 'csv', 'xml', 'yaml', 'yml', 'py', 'js', 'ts', 'html', 'css'];

    if (ext === 'pdf') return 'pdf';
    if (imageTypes.includes(ext)) return 'image';
    if (textTypes.includes(ext)) return 'text';
    return 'binary';
  };

  const getFileTypeFromMime = (mime, filename) => {
    if (mime.startsWith('application/pdf')) return 'pdf';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('text/') || mime === 'application/json') return 'text';
    return getFileType(filename);
  };

  const requestFileAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // --- Gather security context ---
      let location = null;
      try {
        location = await getCurrentLocation();
      } catch {
        // location permission denied — backend bypass flags handle this
        location = { lat: 0, lng: 0 };
      }

      // Use wifiSSID passed from parent (the manually-entered SSID in FileAccess page)
      // or try the backend detection endpoint as fallback
      let resolvedSSID = wifiSSID || null;
      if (!resolvedSSID) {
        try {
          const res = await authAPI.getWiFiSSID();
          resolvedSSID = res.data?.ssid || null;
        } catch {
          // not available in all environments
        }
      }

      const deviceFingerprint = await generateDeviceFingerprint();

      const accessData = {
        file_id: fileId,
        current_location: location,
        current_wifi_ssid: resolvedSSID,
        device_fingerprint: deviceFingerprint,
      };

      const response = await employeeAPI.accessFileForViewing(accessData, {
        responseType: 'blob',
      });

      const blob = response.data;
      const responseMime = response.headers['content-type'] || 'application/octet-stream';
      
      const detectedType = getFileTypeFromMime(responseMime, fileName);

      // Store blob ref for text file access
      blobRef.current = blob;

      // For text files and binary files, create blob URL
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;

      // For text files, extract text content
      if (detectedType === 'text') {
        try {
          const text = await blob.text();
          setTextContent(text);
          setEditedContent(text);
        } catch (textError) {
          console.warn('Could not extract text from blob:', textError);
          setTextContent('[Error reading file content]');
        }
      }

      setFileContent(objectUrl);
      setFileType(detectedType);
      setMimeType(responseMime);
      setAccessGranted(true);
      setLoading(false);

      toast.success('File access granted ✓');

    } catch (err) {
      console.error('File access error:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to access file';
      setError(msg);
      setLoading(false);
      toast.error('Access denied: ' + msg);
    }
  };

  const toggleEditMode = () => setEditMode((prev) => !prev);

  const saveFile = async () => {
    if (!editMode || saving) return;
    try {
      setSaving(true);
      await employeeAPI.saveTextFile(fileId, editedContent);
      toast.success('File saved successfully ✓');
      setEditMode(false);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const getAlgorithmBadge = () => {
    const alg = algorithm || 'x25519';
    const isKyber = alg.toLowerCase().includes('kyber');
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold ${isKyber
            ? 'bg-purple-100 text-purple-700 border border-purple-300'
            : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}
        title={isKyber ? 'CRYSTALS-Kyber ML-KEM-768 — Post-Quantum Secure' : 'X25519 + AES-256-GCM'}
      >
        {isKyber ? <Zap className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        <span>{isKyber ? 'KYBER (PQC)' : alg.toUpperCase()}</span>
      </span>
    );
  };

  const renderFileContent = () => {
    if (!fileContent || !fileType) return null;

    switch (fileType) {
      case 'pdf':
        return (
          <iframe
            src={fileContent}
            className="w-full h-full border-0"
            title={fileName}
          />
        );

      case 'image':
        return (
          <div
            className="flex items-center justify-center h-full bg-gray-100"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            <img
              src={fileContent}
              alt={fileName}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        );

      case 'text':
        return (
          <div className="h-full flex flex-col">
            {/* Edit / Save toolbar */}
            <div className="flex justify-end mb-2 space-x-2 flex-shrink-0 px-1 pt-1">
              <button
                onClick={toggleEditMode}
                className={`px-3 py-1 text-sm rounded flex items-center space-x-1 transition-colors ${editMode
                    ? 'bg-gray-500 text-white hover:bg-gray-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editMode ? 'Cancel' : 'Edit'}</span>
              </button>
              {editMode && (
                <button
                  onClick={saveFile}
                  disabled={saving}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving…' : 'Save'}</span>
                </button>
              )}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-auto min-h-0">
              {editMode ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-white"
                  placeholder="File content…"
                  // DO NOT set userSelect:none on the textarea — it blocks typing
                  style={{ minHeight: '100%' }}
                />
              ) : (
                <TextFileViewer
                  content={textContent}
                  isJson={mimeType === 'application/json'}
                />
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
            <Eye className="w-16 h-16 text-gray-300" />
            <p className="text-lg font-medium">Binary file — preview not available</p>
            <p className="text-sm text-center text-gray-400">
              This file type cannot be previewed in the browser.<br />
              Only text, image, or PDF files support in-browser viewing.
            </p>
          </div>
        );
    }
  };

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600" />
              <Shield className="absolute inset-0 m-auto w-5 h-5 text-blue-600" />
            </div>
            <p className="text-center text-gray-700 font-medium">Requesting secure file access…</p>
            <p className="text-center text-gray-400 text-sm">Running zero-trust security checks</p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-red-100 rounded-full">
              <Shield className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Access Denied</h3>
            <p className="text-center text-gray-600 text-sm">{error}</p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Viewer
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      {/* Security Watermark */}
      <div
        className="fixed inset-0 pointer-events-none select-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='11' fill='rgba(255,255,255,0.07)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-45)'%3E${encodeURIComponent((user?.name || 'User') + ' · ' + new Date().toLocaleDateString())}%3C/text%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* Main viewer panel */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col z-10"
        style={{ height: '90vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <Eye className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{fileName}</h3>
              <div className="flex items-center space-x-2 mt-0.5">
                {getAlgorithmBadge()}
                <span className="text-xs text-gray-400">Secure Session</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Countdown timer */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-sm font-mono font-medium ${timeLeft < 300
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div
          className="flex-1 min-h-0 overflow-hidden"
          onContextMenu={(e) => fileType !== 'text' && e.preventDefault()}
        >
          {renderFileContent()}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TextFileViewer — renders pre-formatted text directly from content
// ─────────────────────────────────────────────────────────────────────────────
const TextFileViewer = ({ content = '', isJson = false }) => {
  const [displayContent, setDisplayContent] = useState('');

  useEffect(() => {
    if (!content) {
      setDisplayContent('[No content]');
      return;
    }
    
    // Format JSON if needed
    if (isJson) {
      try {
        setDisplayContent(JSON.stringify(JSON.parse(content), null, 2));
      } catch (err) {
        console.warn('Failed to parse JSON, showing raw content:', err);
        setDisplayContent(content);
      }
    } else {
      setDisplayContent(content);
    }
  }, [content, isJson]);

  return (
    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words overflow-auto h-full bg-gray-50 text-gray-800">
      {displayContent}
    </pre>
  );
};

export default FileViewer;