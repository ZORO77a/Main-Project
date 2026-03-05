import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import FaceCapture from '../components/FaceCapture';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { generateDeviceFingerprint } from '../utils/deviceFingerprint';

export default function FaceVerification() {
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    // Get email and temp token from localStorage
    const pendingEmail = localStorage.getItem('pendingEmail');
    const storedTempToken = localStorage.getItem('tempToken');
    const userData = localStorage.getItem('pendingUser');

    if (!pendingEmail || !storedTempToken) {
      toast.error('Session expired. Please login again.');
      navigate('/');
      return;
    }

    setEmail(pendingEmail);
    setTempToken(storedTempToken);

    // Set temp token in auth header for API calls
    if (storedTempToken) {
      localStorage.setItem('token', storedTempToken);
    }

    // Register device fingerprint
    registerDeviceFingerprint();
  }, [navigate]);

  const registerDeviceFingerprint = async () => {
    try {
      const fingerprint = await generateDeviceFingerprint();
      const response = await authAPI.registerDevice(fingerprint);
      setDeviceRegistered(true);
      console.log('Device registered:', response.data);
    } catch (error) {
      console.error('Device registration failed:', error);
      // Device registration failure is not critical, continue anyway
    }
  };

  const handleFaceCapture = (imageData) => {
    setCapturedImage(imageData);
  };

  const handleVerifyFace = async () => {
    if (!capturedImage) {
      toast.error('Please capture your face first');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyFace({
        email: email,
        face_image: capturedImage,
      });

      console.log('Face verification response:', response.data);

      // Face verified or bypassed - get token
      const { token, user, requires_face_registration, warning } = response.data;

      // Update auth context
      login(user, token);

      // Clear temporary data
      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('tempToken');
      localStorage.removeItem('pendingUser');

      // Show appropriate message
      if (requires_face_registration || warning) {
        toast.success('Login successful! ' + (warning || 'Please register your face.'), { duration: 5000 });
      } else {
        toast.success('Face verified successfully!');
      }

      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    } catch (error) {
      console.error('Face verification error:', error);
      const errorMessage =
        error.response?.data?.detail ||
        'Face verification failed. Please try again.';
      
      // Check if this is a "face not registered" error
      if (
        errorMessage.includes('not registered') ||
        errorMessage.includes('contact admin')
      ) {
        const userData = JSON.parse(localStorage.getItem('pendingUser') || '{}');
        
        if (userData.role === 'admin') {
          // Admin should be able to bypass - this shouldn't happen if bypass is enabled
          toast.error(
            'Face not registered. Admin bypass may not be enabled. Please check backend configuration or register your face in admin panel.',
            { duration: 7000 }
          );
        } else {
          // Employee needs admin to register their face
          toast.error(
            'Your face is not registered. Please contact your administrator to register your face.',
            { duration: 7000 }
          );
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    localStorage.removeItem('pendingEmail');
    localStorage.removeItem('tempToken');
    localStorage.removeItem('pendingUser');
    navigate('/otp');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 text-center">
          <div className="mb-8">
            <Shield className="w-20 h-20 mx-auto mb-4 text-blue-200" />
            <h1 className="text-5xl font-bold tracking-wide mb-4">GeoCrypt</h1>
            <p className="text-xl opacity-90 text-center max-w-md mx-auto leading-relaxed">
              Biometric Face Verification
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold mb-4">Security Steps</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <span>✓ Password Verified</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <span>✓ OTP Verified</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-blue-400 rounded-full mr-3 animate-pulse flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span>○ Face Verification (Required)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-sm opacity-80">
            <p>Your face is matched against your registered profile</p>
            <p className="mt-2">Secure • Private • Encrypted</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Face Verification */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 bg-gray-50 overflow-y-auto">
        <div className="max-w-md w-full mx-auto py-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to OTP
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Face Verification
            </h2>
            <p className="text-gray-600">
              Please verify your identity with a selfie
            </p>
          </div>

          {/* Device Status */}
          {deviceRegistered && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-sm text-green-800">
                Device registered successfully
              </span>
            </div>
          )}

          {/* Face Capture Component */}
          <div className="mb-6">
            <FaceCapture
              onCapture={handleFaceCapture}
              onError={(error) => {
                toast.error(error);
              }}
            />
          </div>

          {/* Verification Button */}
          {capturedImage && (
            <div className="space-y-4">
              <button
                onClick={handleVerifyFace}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Verify Face
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Your face image is encrypted and only used for identity verification.
              It is not stored permanently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
