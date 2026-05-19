import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Auth/Login';
import DashboardIndex from './pages/Dashboard/Index';
import ClaimsCenter from './pages/Claims/ClaimsCenter';
import PoliciesCenter from './pages/Policies/PoliciesCenter';
import AIIntelligence from './pages/AIHub/AIIntelligence';
import Settings from './pages/Settings/Settings';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { loadFromStorage } = useAuthStore();

  // Load active session from localStorage on app bootstrap
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Workspace */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Executive Analytics Dashboard */}
          <Route index element={<DashboardIndex />} />

          {/* Core Claims Adjudication (Staff & Admins) */}
          <Route 
            path="claims" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'CLAIMS_STAFF', 'AUDITOR']}>
                <ClaimsCenter />
              </ProtectedRoute>
            } 
          />

          {/* Member Policies Register */}
          <Route path="policies" element={<PoliciesCenter />} />

          {/* AI Intelligence Nerve Center */}
          <Route path="ai-hub" element={<AIIntelligence />} />

          {/* Insurer Profile & Integration Admin Settings */}
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all Routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
