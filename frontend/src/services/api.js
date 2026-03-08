import axios from 'axios';

/* =============================
   BASE CONFIG
============================= */

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // (Deprecated) previously allowed long timeout for DeepFace model warm-up
  timeout: 60000,
});

/* =============================
   REQUEST INTERCEPTOR
============================= */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =============================
   RESPONSE INTERCEPTOR
============================= */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || '';

    // Auto logout on auth failure
    if (
      status === 401 &&
      (detail.toLowerCase().includes('token') ||
        detail.toLowerCase().includes('unauthorized'))
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

/* =============================
   AUTH APIs
============================= */
export const authAPI = {
  login: (data) =>
    api.post('/auth/login', data),

  verifyOTP: (data) =>
    api.post('/auth/verify-otp', data),

  resendOTP: (data) =>
    api.post('/auth/resend-otp', data),

  // face-related endpoints removed (biometrics disabled)

  // Device Fingerprint
  registerDevice: (data) =>
    api.post('/auth/device/register', data),

  verifyDevice: (data) =>
    api.post('/auth/device/verify', data),

  listDevices: () =>
    api.get('/auth/device/list'),

  revokeDevice: (deviceId) =>
    api.delete(`/auth/device/${deviceId}`),

  // WiFi SSID Detection
  getWiFiSSID: () =>
    api.get('/auth/wifi-ssid'),
};

/* =============================
   ADMIN APIs
============================= */
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),

  getEmployees: () =>
    api.get('/admin/employees'),

  getEmployee: (employeeId) =>
    api.get(`/admin/employee/${employeeId}`),

  addEmployee: (data) =>
    api.post('/admin/add-employee', data),

  editEmployee: (employeeId, data) =>
    api.put(`/admin/edit-employee/${employeeId}`, data),

  deleteEmployee: (employeeId) =>
    api.delete(`/admin/employee/${employeeId}`),

  approveWFH: (requestId) =>
    api.post(`/admin/approve-wfh/${requestId}`),

  rejectWFH: (requestId) =>
    api.post(`/admin/reject-wfh/${requestId}`),

  getFiles: () =>
    api.get('/admin/files'),

  getFileDetails: (fileId) =>
    api.get(`/admin/files/${fileId}`),

  viewFileContent: (fileId, config) =>
    api.get(`/admin/files/${fileId}/content`, { 
      ...config,
      responseType: 'blob' 
    }),

  deleteFile: (fileId) =>
    api.delete(`/admin/files/${fileId}`),

  uploadFile: (file, employeeId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (employeeId) {
      formData.append('employee_id', employeeId);
    }

    return api.post('/admin/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAccessLogs: () =>
    api.get('/admin/access-logs'),

  getSettings: () =>
    api.get('/admin/settings'),

  resetLogs: () =>
    api.post('/admin/settings/reset-logs'),

  clearOldFiles: (days) =>
    api.post('/admin/settings/clear-old-files', { days }),
};

/* =============================
   EMPLOYEE APIs
============================= */
export const employeeAPI = {
  getDashboard: () =>
    api.get('/employee/dashboard'),

  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post('/employee/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  accessFile: (data, config) =>
    api.post('/employee/access-file', data, config),

  accessFileForViewing: (data, config) =>
    api.post('/employee/access-file', data, config),

  requestWFH: (data) =>
    api.post('/employee/request-work-from-home', data),

  renameFile: (fileId, newFilename) => {
    const formData = new FormData();
    formData.append('new_filename', newFilename);

    return api.put(
      `/employee/rename-file/${fileId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  deleteFile: (fileId) =>
    api.delete(`/employee/delete-file/${fileId}`),

  openTextFile: (fileId) =>
    api.get(`/employee/open-text-file/${fileId}`),

  saveTextFile: (fileId, content) => {
    const formData = new FormData();
    formData.append('content', content);

    return api.put(
      `/employee/save-text-file/${fileId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};

/* =============================
   AI / ANALYTICS APIs  ✅ FIXED
============================= */
export const aiAPI = {
  // List employees for AI monitoring
  getEmployees: () =>
    api.get('/admin/ai-monitoring/employees'),

  // Analyze employee behavior
  analyzeEmployee: (employeeId) =>
    api.get(`/admin/ai-monitoring/analyze/${employeeId}`),
};

export default api;
