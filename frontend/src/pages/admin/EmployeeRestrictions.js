import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Wifi, Clock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';

export default function EmployeeRestrictions() {
  const { employeeId } = useParams();
  const [formData, setFormData] = useState({
    allocated_location: { lat: '', lng: '', radius: '' },
    allocated_wifi_ssid: '',
    allocated_time_start: '',
    allocated_time_end: ''
  });
  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const navigate = useNavigate();

  const fetchEmployee = useCallback(async () => {
    try {
      const response = await adminAPI.getEmployee(employeeId);
      const employee = response.data;
      setEmployeeName(employee.name);
      setFormData({
        allocated_location: employee.allocated_location || { lat: '', lng: '', radius: '' },
        allocated_wifi_ssid: employee.allocated_wifi_ssid || '',
        allocated_time_start: employee.allocated_time_start || '',
        allocated_time_end: employee.allocated_time_end || ''
      });
    } catch (error) {
      toast.error('Failed to load employee data');
      navigate('/admin/employees');
    } finally {
      setFetchLoading(false);
    }
  }, [employeeId, navigate]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

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
      // Validate location coordinates if provided
      if (formData.allocated_location.lat || formData.allocated_location.lng || formData.allocated_location.radius) {
        const lat = parseFloat(formData.allocated_location.lat);
        const lng = parseFloat(formData.allocated_location.lng);
        const radius = parseFloat(formData.allocated_location.radius);
        
        if (!formData.allocated_location.lat || !formData.allocated_location.lng) {
          toast.error('Both latitude and longitude are required for location restriction');
          setLoading(false);
          return;
        }
        if (isNaN(lat) || lat < -90 || lat > 90) {
          toast.error('Invalid latitude. Must be between -90 and 90');
          setLoading(false);
          return;
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          toast.error('Invalid longitude. Must be between -180 and 180');
          setLoading(false);
          return;
        }
        if (formData.allocated_location.radius && (isNaN(radius) || radius <= 0)) {
          toast.error('Radius must be a positive number (in meters)');
          setLoading(false);
          return;
        }
      }

      // Validate time restrictions if provided
      if (formData.allocated_time_start || formData.allocated_time_end) {
        if (!formData.allocated_time_start || !formData.allocated_time_end) {
          toast.error('Both start time and end time are required for time restriction');
          setLoading(false);
          return;
        }
      }

      // Build payload
      const submitData = {};

      if (formData.allocated_location.lat && formData.allocated_location.lng) {
        submitData.allocated_location = {
          lat: parseFloat(formData.allocated_location.lat),
          lng: parseFloat(formData.allocated_location.lng)
        };
        if (formData.allocated_location.radius) {
          submitData.allocated_location.radius = parseFloat(formData.allocated_location.radius);
        }
      }

      if (formData.allocated_wifi_ssid.trim()) {
        submitData.allocated_wifi_ssid = formData.allocated_wifi_ssid;
      }

      if (formData.allocated_time_start && formData.allocated_time_end) {
        submitData.allocated_time_start = formData.allocated_time_start;
        submitData.allocated_time_end = formData.allocated_time_end;
      }

      console.log('Submitting restrictions:', submitData);
      await adminAPI.editEmployee(employeeId, submitData);

      toast.success('Restrictions updated successfully!');
      navigate('/admin/employees');
    } catch (error) {
      let message = 'Failed to update restrictions';
      
      const detail = error.response?.data?.detail;
      
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((d) => {
            if (typeof d === 'string') return d;
            if (d?.msg) return d.msg;
            return JSON.stringify(d);
          })
          .join(', ');
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || detail.message || 'Failed to update restrictions';
      }
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/employees')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Restrictions</h1>
            <p className="text-gray-600 mt-1">Manage access restrictions for {employeeName}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="allocated_location.lat"
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
                  value={formData.allocated_location.lng}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="e.g., 77.5946 (Bangalore)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  step="any"
                  name="allocated_location.radius"
                  value={formData.allocated_location.radius}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="e.g., 500"
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
                  value={formData.allocated_time_end}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> All fields are optional. Leave blank to remove that restriction.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/admin/employees')}
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
                <Save className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Updating...' : 'Save Restrictions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
