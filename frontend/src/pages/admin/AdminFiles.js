import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Trash2,
  Shield,
  Calendar,
  User,
  X,
  Upload,
  Download,
  Lock,
  Zap
} from "lucide-react";
import { adminAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function AdminFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);

  const navigate = useNavigate();

  /* ================= LOAD FILES & EMPLOYEES ================= */
  useEffect(() => {
    fetchFiles();
    fetchEmployees();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getFiles();

      // HARD SAFETY: ensure array only
      if (Array.isArray(res.data)) {
        setFiles(res.data.filter(Boolean));
      } else {
        setFiles([]);
      }
    } catch (err) {
      toast.error("Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await adminAPI.getEmployees();
      if (Array.isArray(res.data)) {
        setEmployees(res.data.filter(emp => emp && emp.is_active));
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
      setEmployees([]);
    }
  };

  /* ================= VIEW FILE ================= */
  const viewFile = async (file) => {
    if (!file) return;
    setViewingFile(file);
    setFileLoading(true);
    setFileError(null);
    setFileContent(null);

    try {
      const response = await adminAPI.viewFileContent(file.id);
      const blob = response.data;
      const objectUrl = URL.createObjectURL(blob);
      
      setFileContent({
        url: objectUrl,
        blob: blob,
        type: getFileType(file.filename),
        mimeType: response.headers['content-type'] || 'application/octet-stream',
      });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to load file content";
      setFileError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setFileLoading(false);
    }
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

    if (ext === 'pdf') return 'pdf';
    if (imageTypes.includes(ext)) return 'image';
    if (textTypes.includes(ext)) return 'text';
    return 'binary';
  };

  /* ================= DELETE FILE ================= */
  const deleteFile = async (fileId, filename) => {
    if (!fileId) return;

    if (!window.confirm(`Delete "${filename}"?`)) return;

    try {
      await adminAPI.deleteFile(fileId);
      toast.success("File deleted");
      fetchFiles();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ================= UPLOAD FILE ================= */
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      await adminAPI.uploadFile(file, selectedEmployeeId || null);
      toast.success("File uploaded successfully!");
      setSelectedEmployeeId('');
      event.target.value = ''; // Reset file input
      fetchFiles();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to upload file";
      toast.error(errorMsg);
    } finally {
      setUploadLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-xl text-white">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold">File Management</h1>
        <p className="text-purple-100">
          Manage encrypted files in the system
        </p>
      </div>

      {/* UPLOAD FILE SECTION */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upload New File</h2>
          <Upload className="w-5 h-5 text-purple-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Employee Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Employee (Optional)
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">System Admin</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              id="file-upload"
              onChange={handleFileUpload}
              disabled={uploadLoading}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Upload Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              &nbsp;
            </label>
            <label className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ opacity: uploadLoading ? 0.5 : 1, cursor: uploadLoading ? 'not-allowed' : 'pointer' }}>
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">
                {uploadLoading ? 'Uploading...' : 'Upload File'}
              </span>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">All Files</h2>

        {loading ? (
          <p>Loading...</p>
        ) : files.length === 0 ? (
          <p className="text-gray-500">No files found</p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => {
              if (!file) return null;

              return (
                <div
                  key={file.id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">
                      {file.filename || "Unnamed file"}
                    </p>

                    <div className="text-sm text-gray-600 flex gap-4 mt-1">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {file.owner_name} ({file.owner_email})
                      </span>

                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(file.uploaded_at).toLocaleString()}
                      </span>

                      {file.is_encrypted && (
                        <span className="flex items-center text-green-600">
                          <Shield className="w-4 h-4 mr-1" />
                          Encrypted
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => viewFile(file)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteFile(file.id, file.filename)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= FILE VIEWER MODAL ================= */}
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
                <h3 className="text-xl font-semibold text-gray-900">Failed to Load File</h3>
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
                      <span className="text-gray-500">{viewingFile.owner_name}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{new Date(viewingFile.uploaded_at).toLocaleDateString()}</span>
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
                  <AdminFileTextViewer url={fileContent.url} isMime={fileContent.mimeType} />
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

// Text file viewer component
function AdminFileTextViewer({ url, isMime }) {
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
