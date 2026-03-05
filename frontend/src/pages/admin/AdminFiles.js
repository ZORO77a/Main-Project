import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Trash2,
  Shield,
  Calendar,
  User,
  X
} from "lucide-react";
import { adminAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function AdminFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  /* ================= LOAD FILES ================= */
  useEffect(() => {
    fetchFiles();
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

  /* ================= VIEW FILE ================= */
  const viewFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedFile(null);
    setShowModal(false);
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

      {/* FILE LIST */}
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

      {/* ================= MODAL ================= */}
      {showModal && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold">File Details</h3>
              <button onClick={closeModal}>
                <X />
              </button>
            </div>

            <p><strong>Filename:</strong> {selectedFile.filename}</p>
            <p><strong>Owner:</strong> {selectedFile.owner_name}</p>
            <p><strong>Email:</strong> {selectedFile.owner_email}</p>
            <p>
              <strong>Uploaded:</strong>{" "}
              {new Date(selectedFile.uploaded_at).toLocaleString()}
            </p>
            <p>
              <strong>Encryption:</strong>{" "}
              {selectedFile.is_encrypted ? "Encrypted" : "Not encrypted"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
