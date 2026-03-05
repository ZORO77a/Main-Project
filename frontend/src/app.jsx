import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";

// Public pages
import Login from "./pages/Login";
import OtpVerify from "./pages/OtpVerify";
import FaceVerification from "./pages/FaceVerification";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEmployees from "./pages/admin/Employees";
import AdminFiles from "./pages/admin/AdminFiles";
import AdminAccessLogs from "./pages/admin/AdminAccessLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import AIMonitoring from "./pages/admin/AIMonitoring";
import AddEmployee from "./pages/admin/AddEmployee";
import EditEmployee from "./pages/admin/EditEmployee";

// Employee pages
import EmployeeHome from "./pages/employee/EmployeeHome";
import FileAccess from "./pages/employee/FileAccess";
import FileEditor from "./pages/employee/FileEditor";
import WorkFromHomeRequest from "./pages/employee/WorkFromHomeRequest";

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/employee" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/otp" element={<OtpVerify />} />
      <Route path="/face-verify" element={<FaceVerification />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute requireAdmin>
            <AdminEmployees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/add"
        element={
          <ProtectedRoute requireAdmin>
            <AddEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/edit/:id"
        element={
          <ProtectedRoute requireAdmin>
            <EditEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/files"
        element={
          <ProtectedRoute requireAdmin>
            <AdminFiles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute requireAdmin>
            <AdminAccessLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ai"
        element={
          <ProtectedRoute requireAdmin>
            <AIMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requireAdmin>
            <AdminSettings />
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute>
            <EmployeeHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/files"
        element={
          <ProtectedRoute>
            <FileAccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/file/:id/edit"
        element={
          <ProtectedRoute>
            <FileEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/wfh-request"
        element={
          <ProtectedRoute>
            <WorkFromHomeRequest />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;
