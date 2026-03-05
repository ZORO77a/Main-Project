import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeeAPI } from "../../services/api";
import toast from "react-hot-toast";
import { Save, ArrowLeft, FileText, Clock } from "lucide-react";

export default function FileEditor() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadFile();
  }, [fileId]);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const loadFile = async () => {
    try {
      const res = await employeeAPI.openTextFile(fileId);
      setContent(res.data.content);
      setOriginalContent(res.data.content);
      setFilename(res.data.filename);
    } catch (error) {
      toast.error("Cannot open file: " + (error.response?.data?.detail || "Unknown error"));
      navigate("/employee");
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (saving || !hasChanges) return;

    setSaving(true);
    try {
      await employeeAPI.saveTextFile(fileId, content);
      setOriginalContent(content);
      setHasChanges(false);
      toast.success("File saved securely");
    } catch (error) {
      toast.error("Save failed: " + (error.response?.data?.detail || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading file...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/employee")}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">{filename}</h1>
                {hasChanges && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Unsaved changes
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Auto-save disabled</span>
              </div>
              <button
                onClick={saveFile}
                disabled={saving || !hasChanges}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">File Editor</span>
                <span className="mx-2">•</span>
                <span>{content.split('\n').length} lines</span>
                <span className="mx-2">•</span>
                <span>{content.length} characters</span>
              </div>
              <div className="text-xs text-gray-500">
                Press Ctrl+S to save
              </div>
            </div>
          </div>
          <textarea
            className="w-full h-[70vh] p-6 font-mono text-sm leading-relaxed border-0 resize-none focus:ring-0 focus:outline-none"
            value={content}
            onChange={handleContentChange}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveFile();
              }
            }}
            placeholder="Start typing to edit your file..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
