import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../services/api';

export default function WorkFromHomeRequest() {
  const [formData, setFormData] = useState({
    reason: '',
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.reason.trim()) {
        toast.error('Please provide a reason for work from home');
        return;
      }
      if (!formData.start_date) {
        toast.error('Please select a start date');
        return;
      }
      if (!formData.end_date) {
        toast.error('Please select an end date');
        return;
      }

      // Validate dates
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        toast.error('Start date cannot be in the past');
        return;
      }
      if (endDate < startDate) {
        toast.error('End date must be after start date');
        return;
      }

      const requestData = {
        reason: formData.reason.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date
      };

      console.log('Submitting WFH request:', requestData);
      await employeeAPI.requestWFH(requestData);
      toast.success('Work-from-home request submitted successfully!');
      navigate('/employee');
    } catch (error) {
      console.error('WFH request error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/employee')}
              className="p-2 hover:bg-blue-800 rounded-lg transition-colors bg-white bg-opacity-20"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Work From Home Request</h1>
              <p className="text-blue-100 mt-2">Submit a formal request to work remotely</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-white bg-opacity-20 rounded-lg px-4 py-2">
            <Home className="w-6 h-6" />
            <span className="text-sm font-medium">Remote Work</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Work From Home
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                name="reason"
                required
                rows={4}
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Please explain why you need to work from home (e.g., family emergency, medical reasons, personal matters, etc.)"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Provide a clear and detailed reason. Your request will be reviewed by an administrator.
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Home className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Work From Home Policy</h3>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Requests are subject to administrator approval</li>
                  <li>• You must ensure your home network meets security requirements</li>
                  <li>• Regular check-ins may be required</li>
                  <li>• Access to sensitive files may be restricted</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/employee')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Home className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}