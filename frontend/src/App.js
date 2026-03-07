import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import OtpVerify from './pages/OtpVerify';
import AdminDashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import AddEmployee from './pages/admin/AddEmployee';
import EditEmployee from './pages/admin/EditEmployee';
import AIMonitoring from './pages/admin/AIMonitoring';
// face registration page removed
import AdminFiles from './pages/admin/AdminFiles';
import AdminAccessLogs from './pages/admin/AdminAccessLogs';
import AdminSettings from './pages/admin/AdminSettings';
import EmployeeHome from './pages/employee/EmployeeHome';
import FileAccess from './pages/employee/FileAccess';
import WorkFromHomeRequest from './pages/employee/WorkFromHomeRequest';
import FileEditor from './pages/employee/FileEditor';
// Face verification functionality removed

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  console.log('ProtectedRoute check:', { isAuthenticated, user, loading, allowedRoles });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: not authenticated, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    console.log('ProtectedRoute: role not allowed, redirecting to /', { userRole: user?.role, allowedRoles });
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: access granted');
  return children;
};

// Layout Components
const AdminLayout = ({ children }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  </div>
);

const EmployeeLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <main className="container mx-auto px-6 py-8">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/otp" element={<OtpVerify />} />
            {/* face verification removed, proceed directly after OTP */}

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <Employees />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/add-employee"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AddEmployee />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/edit-employee/:employeeId"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <EditEmployee />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/edit-employee/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <EditEmployee />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-monitoring"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AIMonitoring />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/files"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminFiles />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminAccessLogs />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminSettings />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            {/* face registration routes removed */}

            {/* Employee Routes */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout>
                    <EmployeeHome />
                  </EmployeeLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/files"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout>
                    <FileAccess />
                  </EmployeeLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/wfh-request"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout>
                    <WorkFromHomeRequest />
                  </EmployeeLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/file/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout>
                    <FileEditor />
                  </EmployeeLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App;
