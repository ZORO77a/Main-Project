import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, CheckCircle, ArrowLeft, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import FaceCapture from '../../components/FaceCapture';
import { authAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function FaceRegistration() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If admin, set their email as default
    if (user?.role === 'admin' && user?.email) {
      setSelectedEmail(user.email);
    }
    fetchEmployees();
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await adminAPI.getEmployees();
      setEmployees(response.data || []);
    } catch (error) {
      toast.error('Failed to load employees');
    }
  };

  const handleFaceCapture = (imageData) => {
    setCapturedImage(imageData);
  };

  const handleRegisterFace = async () => {
    if (!selectedEmail) {
      toast.error('Please select a user');
      return;
    }

    if (!capturedImage) {
      toast.error('Please capture a face photo first');
      return;
    }

    setRegistering(true);
    try {
      await authAPI.registerFace({
        email: selectedEmail,
        face_image: capturedImage,
      });

      toast.success('Face registered successfully!');

      // Reset form
      setCapturedImage(null);

      // If registering own face, navigate to dashboard
      if (selectedEmail === user?.email) {
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      }
    } catch (error) {
      console.error('Face registration error:', error);
      const errorMessage =
        error.response?.data?.detail ||
        'Failed to register face. Please try again.';
      toast.error(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  const handleRegisterOwnFace = () => {
    if (user?.email) {
      setSelectedEmail(user.email);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Camera className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Face Registration</h1>
            </div>
            <p className="text-gray-600">
              Register face embeddings for users. This is required for face verification during login.
            </p>
          </div>
        </div>

        {/* Quick Register Own Face */}
        {user?.role === 'admin' && user?.email && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Register Your Own Face
                  </p>
                  <p className="text-xs text-blue-700">
                    As an admin you can register your own face too — just keep your email in the field below.
                    Currently selected: <span className="font-semibold">{selectedEmail || '(none)'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleRegisterOwnFace}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${selectedEmail === user.email
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {selectedEmail === user.email ? '✓ My Email Selected' : 'Use My Email'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - User Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-gray-600" />
              Select User
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                placeholder="Enter user email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                list="employee-emails"
              />
              <datalist id="employee-emails">
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.email}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </datalist>
            </div>

            {/* Employee List */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Or select from employees:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmail(emp.email)}
                      className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${selectedEmail === emp.email
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{emp.name || 'No name'}</p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                        {selectedEmail === emp.email && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No employees found
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Face Capture */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2 text-gray-600" />
              Capture Face
            </h2>

            {!selectedEmail && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Please select a user first before capturing their face.
                  </p>
                </div>
              </div>
            )}

            <FaceCapture
              onCapture={handleFaceCapture}
              onError={(error) => {
                toast.error(error);
              }}
            />

            {capturedImage && selectedEmail && (
              <div className="mt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800">
                      Face captured successfully for {selectedEmail}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRegisterFace}
                  disabled={registering || !selectedEmail || !capturedImage}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  {registering ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Register Face
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Instructions
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Select the user's email address from the list or enter it manually
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Position the user's face clearly in the camera frame
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Ensure good lighting and the face is clearly visible
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Click "Capture Photo" to take the picture
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Review the captured image and click "Register Face" to save
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                Once registered, the user can use face verification during login
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
