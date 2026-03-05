import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function OtpVerify() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const pendingEmail = localStorage.getItem('pendingEmail');
    if (!pendingEmail) {
      navigate('/');
      return;
    }
    setEmail(pendingEmail);
  }, [navigate]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setTimeout(() => {
      setResendCooldown(resendCooldown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyOTP({ email, otp });
      console.log('OTP verification response:', response.data);
      toast.success('OTP verified successfully!');

      // OTP verification now returns temp_token and requires face verification
      const { temp_token, user, requires_face_verification } = response.data;

      // Store temp token and user data for face verification
      localStorage.setItem('tempToken', temp_token);
      localStorage.setItem('pendingUser', JSON.stringify(user));

      // Face verification is always required (admins can bypass)
      navigate('/face-verify');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      const password = sessionStorage.getItem('tempPassword');
      if (!password) {
        toast.error('Session expired. Please login again.');
        navigate('/');
        return;
      }
      const response = await authAPI.resendOTP({ email, password });
      console.log('Resend OTP response:', response);
      toast.success('OTP resent to your email!');
      // Set 60 second cooldown
      setResendCooldown(60);
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    localStorage.removeItem('pendingEmail');
    sessionStorage.removeItem('tempPassword');
    navigate('/');
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
              Two-Factor Authentication for Enhanced Security
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold mb-2">Security Steps</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span>✓ Password Verified</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
                <span>○ OTP Verification</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - OTP Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 bg-gray-50">
        <div className="max-w-md w-full mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </button>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
            <p className="text-gray-600">
              We've sent a 6-digit code to <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleOtpVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Enter OTP Code
              </label>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="000000"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOtp}
              disabled={resendLoading || resendCooldown > 0}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resendLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <span>Resend OTP</span>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              For security reasons, OTP codes expire after 5 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
