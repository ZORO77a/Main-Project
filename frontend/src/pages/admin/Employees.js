import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const { token, isAdmin } = useAuth();

  /* =========================
     AUTH CHECK
     ========================= */
  useEffect(() => {
    if (!token) {
      console.log('No token found, redirecting to login');
      toast.error('Please log in first');
      navigate('/');
      return;
    }
    if (!isAdmin) {
      console.log('User is not admin, redirecting');
      toast.error('Admin access required');
      navigate('/');
      return;
    }
  }, [token, isAdmin, navigate]);

  /* =========================
     FETCH EMPLOYEES (FIXED)
     ========================= */
  const fetchEmployees = useCallback(async () => {
    try {
      console.log('🔄 Fetching employees with token:', token?.substring(0, 20) + '...');
      const response = await adminAPI.getEmployees();
      console.log('✅ Dashboard response:', response);

      // Backend returns { employees: [...], recent_logs: [...], pending_requests: [...] }
      // Axios wraps it in response.data
      const employees = response.data;

      console.log('✅ Fetched employees:', employees);

      if (!Array.isArray(employees)) {
        console.error('❌ Invalid employees format, expected array but got:', employees);
        throw new Error('Invalid employees format');
      }

      // If employees don't have an 'id' field, add it from _id
      const normalized = employees.map(emp => ({
        ...emp,
        id: emp.id || emp._id
      }));

      console.log('✅ Normalized employees:', normalized);
      setEmployees(normalized);
      setLoading(false);
    } catch (error) {
      console.error('❌ Employee fetch failed:', error);
      console.error('❌ Error response:', error.response?.data || error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error details:', error.response?.data?.detail);
      console.error('❌ Full error:', error);
      toast.error(error.response?.data?.detail || 'Failed to load employees');
      setEmployees([]);
      setLoading(false);
    }
  }, [token]);

  // Fetch employees on mount and when authenticated
  useEffect(() => {
    if (token && isAdmin) {
      fetchEmployees();
    }
  }, [token, isAdmin, fetchEmployees]);

  /* Refresh when user returns from Add/Edit page */
  useEffect(() => {
    if (!token || !isAdmin) return;
    
    const onFocus = () => {
      console.log('🔄 Window focused, refreshing employees');
      fetchEmployees();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token, isAdmin, fetchEmployees]);

  /* =========================
     FILTERING LOGIC
     ========================= */
  useEffect(() => {
    let filtered = [...employees];

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(emp => emp.is_active === true);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(emp => emp.is_active === false);
    }

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, statusFilter]);

  /* =========================
     DELETE EMPLOYEE
     ========================= */
  const handleDeleteEmployee = async (employeeId) => {
    try {
      await adminAPI.deleteEmployee(employeeId);
      toast.success('Employee deactivated successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to deactivate employee');
    }
  };

  /* =========================
     LOADING STATE
     ========================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* =========================
     UI
     ========================= */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage employee accounts</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/add-employee')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            Employees ({filteredEmployees.length})
          </h3>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium">Employee</th>
              <th className="px-6 py-4 text-left text-xs font-medium">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-medium">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium">WFH</th>
              <th className="px-6 py-4 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredEmployees.length ? (
              filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-sm text-gray-500">ID: {emp.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{emp.email}</div>
                    <div className="text-sm text-gray-500">{emp.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.is_active ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {emp.work_from_home_allowed ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/admin/edit-employee/${emp.id}`)}
                      className="text-blue-600 mr-3"
                      title="Edit employee info"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/employee-restrictions/${emp.id}`)}
                      className="text-purple-600 mr-3"
                      title="Manage restrictions"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="text-red-600"
                      title="Deactivate employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
