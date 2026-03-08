import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Wifi, Clock, Save, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';

export default function BatchEmployeeRestrictions() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const [restrictions, setRestrictions] = useState({
    allocated_location: { lat: '', lng: '', radius: '' },
    allocated_wifi_ssid: '',
    allocated_time_start: '',
    allocated_time_end: ''
  });

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await adminAPI.getEmployees();
      const employeeList = response.data;
      if (!Array.isArray(employeeList)) {
        throw new Error('Invalid employees format');
      }
      const normalized = employeeList.map(emp => ({
        ...emp,
        id: emp.id || emp._id
      }));
      setEmployees(normalized);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSelectEmployee = (employeeId) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === employees.length && employees.length > 0) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.id)));
    }
  };

  const handleRestrictionChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setRestrictions(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setRestrictions(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedEmployees.size === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setLoading(true);

    try {
      // Validate location coordinates if provided
      if (restrictions.allocated_location.lat || restrictions.allocated_location.lng || restrictions.allocated_location.radius) {
        const lat = parseFloat(restrictions.allocated_location.lat);
        const lng = parseFloat(restrictions.allocated_location.lng);
        const radius = parseFloat(restrictions.allocated_location.radius);
        
        if (!restrictions.allocated_location.lat || !restrictions.allocated_location.lng) {
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
        if (restrictions.allocated_location.radius && (isNaN(radius) || radius <= 0)) {
          toast.error('Radius must be a positive number (in meters)');
          setLoading(false);
          return;
        }
      }

      // Validate time restrictions if provided
      if (restrictions.allocated_time_start || restrictions.allocated_time_end) {
        if (!restrictions.allocated_time_start || !restrictions.allocated_time_end) {
          toast.error('Both start time and end time are required for time restriction');
          setLoading(false);
          return;
        }
      }

      // Build payload
      const submitData = {};

      if (restrictions.allocated_location.lat && restrictions.allocated_location.lng) {
        submitData.allocated_location = {
          lat: parseFloat(restrictions.allocated_location.lat),
          lng: parseFloat(restrictions.allocated_location.lng)
        };
        if (restrictions.allocated_location.radius) {
          submitData.allocated_location.radius = parseFloat(restrictions.allocated_location.radius);
        }
      }

      if (restrictions.allocated_wifi_ssid.trim()) {
        submitData.allocated_wifi_ssid = restrictions.allocated_wifi_ssid;
      }

      if (restrictions.allocated_time_start && restrictions.allocated_time_end) {
        submitData.allocated_time_start = restrictions.allocated_time_start;
        submitData.allocated_time_end = restrictions.allocated_time_end;
      }

      // Apply restrictions to all selected employees
      const failedUpdates = [];
      let successCount = 0;

      for (const employeeId of selectedEmployees) {
        try {
          await adminAPI.editEmployee(employeeId, submitData);
          successCount++;
        } catch (error) {
          const empName = employees.find(e => e.id === employeeId)?.name || employeeId;
          failedUpdates.push(empName);
        }
      }

      if (failedUpdates.length === 0) {
        toast.success(`Restrictions applied to ${successCount} employee(s)!`);
      } else {
        toast.success(
          `Restrictions applied to ${successCount} employee(s). Failed: ${failedUpdates.join(', ')}`
        );
      }

      // Reset form
      setSelectedEmployees(new Set());
      setRestrictions({
        allocated_location: { lat: '', lng: '', radius: '' },
        allocated_wifi_ssid: '',
        allocated_time_start: '',
        allocated_time_end: ''
      });
    } catch (error) {
      console.error('Error applying restrictions:', error);
      toast.error('Failed to apply restrictions');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Batch Employee Restrictions</h1>
            <p className="text-gray-600 mt-1">Apply restrictions to multiple employees at once</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Employees</h2>
              <span className="text-sm font-medium text-blue-600">
                {selectedEmployees.size}/{employees.length}
              </span>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="w-full px-4 py-2 mb-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              {selectedEmployees.size === employees.length && employees.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </button>

            {/* Employee List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp.id)}
                    className="w-full text-left px-3 py-2 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: selectedEmployees.has(emp.id) ? '#3b82f6' : '#e5e7eb',
                      backgroundColor: selectedEmployees.has(emp.id) ? '#eff6ff' : '#ffffff'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {selectedEmployees.has(emp.id) ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{emp.name}</div>
                        <div className="text-xs text-gray-500 truncate">{emp.email}</div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No employees found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Restrictions Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Restrictions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  Location Restrictions
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set the geographic coordinates where selected employees can access the system.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="allocated_location.lat"
                      value={restrictions.allocated_location.lat}
                      onChange={handleRestrictionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., 12.9716"
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
                      value={restrictions.allocated_location.lng}
                      onChange={handleRestrictionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., 77.5946"
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
                      value={restrictions.allocated_location.radius}
                      onChange={handleRestrictionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., 500"
                    />
                  </div>
                </div>
              </div>

              {/* Network Restrictions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Wifi className="w-5 h-5 mr-2 text-purple-600" />
                  Network Restrictions
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Specify the WiFi network name (SSID) that employees must be connected to.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WiFi SSID
                  </label>
                  <input
                    type="text"
                    name="allocated_wifi_ssid"
                    value={restrictions.allocated_wifi_ssid}
                    onChange={handleRestrictionChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter WiFi network name"
                  />
                </div>
              </div>

              {/* Time Restrictions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-600" />
                  Time Restrictions
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Define the time window during which employees can access the system.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      name="allocated_time_start"
                      value={restrictions.allocated_time_start}
                      onChange={handleRestrictionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      name="allocated_time_end"
                      value={restrictions.allocated_time_end}
                      onChange={handleRestrictionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> All fields are optional. Leave blank to skip that restriction. 
                  Selected restrictions will be applied to all {selectedEmployees.size} selected employee(s).
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedEmployees.size === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  {loading ? 'Applying...' : `Apply to ${selectedEmployees.size} Employee(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
