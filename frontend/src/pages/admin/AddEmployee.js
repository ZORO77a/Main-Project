import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, MapPin, Wifi, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';

export default function AddEmployee() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
    allocated_location: { lat: '', lng: '' },
    allocated_wifi_ssid: '',
    allocated_time_start: '',
    allocated_time_end: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Name is required');
        return;
      }
      if (!formData.email.trim()) {
        toast.error('Email is required');
        return;
      }
      if (!formData.phone.trim()) {
        toast.error('Phone number is required');
        return;
      }
      if (!formData.password.trim()) {
        toast.error('Password is required');
        return;
      }
      if (!formData.allocated_location.lat || !formData.allocated_location.lng) {
        toast.error('Location coordinates are required');
        return;
      }
      if (!formData.allocated_wifi_ssid.trim()) {
        toast.error('WiFi SSID is required');
        return;
      }
      if (!formData.allocated_time_start || !formData.allocated_time_end) {
        toast.error('Time restrictions are required');
        return;
      }

      // Validate location coordinates
      const lat = parseFloat(formData.allocated_location.lat);
      const lng = parseFloat(formData.allocated_location.lng);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        toast.error('Invalid latitude. Must be between -90 and 90');
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        toast.error('Invalid longitude. Must be between -180 and 180');
        return;
      }

      // Convert location strings to numbers
      const submitData = {
        ...formData,
        allocated_location: {
          lat: lat,
          lng: lng
        }
      };

      console.log('Submitting employee data:', submitData);
      await adminAPI.addEmployee(submitData);
      toast.success('Employee added successfully!');
      navigate('/admin/employees');
    } catch (error) {
      console.error('Add employee error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
            <p className="text-gray-600 mt-1">Create a new employee account with access restrictions</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter password"
                />
              </div>
            </div>
          </div>

          {/* Location Restrictions */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-green-600" />
              Location Restrictions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set the geographic coordinates where this employee is allowed to access the system.
              The employee must be within a certain radius of these coordinates to log in.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="allocated_location.lat"
                  required
                  value={formData.allocated_location.lat}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="e.g., 12.9716 (Bangalore)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="allocated_location.lng"
                  required
                  value={formData.allocated_location.lng}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="e.g., 77.5946 (Bangalore)"
                />
              </div>
            </div>
          </div>

          {/* Network Restrictions */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Wifi className="w-5 h-5 mr-2 text-purple-600" />
              Network Restrictions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Specify the WiFi network name (SSID) that this employee must be connected to for access.
              This adds an additional layer of security by restricting access to authorized networks.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WiFi SSID
                </label>
                <input
                  type="text"
                  name="allocated_wifi_ssid"
                  required
                  value={formData.allocated_wifi_ssid}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter WiFi network name"
                />
              </div>
            </div>
          </div>

          {/* Time Restrictions */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Time Restrictions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Define the time window during which this employee can access the system.
              Outside these hours, the employee will be denied login regardless of location or network.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time (HH:MM)
                </label>
                <input
                  type="time"
                  name="allocated_time_start"
                  required
                  value={formData.allocated_time_start}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time (HH:MM)
                </label>
                <input
                  type="time"
                  name="allocated_time_end"
                  required
                  value={formData.allocated_time_end}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/admin')}
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
                <UserPlus className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Adding Employee...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}