import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import DashboardPage from './pages/DashboardPage';
import CompaniesPage from './pages/CompaniesPage';
import UserManagementPage from './pages/UserManagementPage';
import UploadPage from './pages/UploadPage';
import GreenAuditPage from './pages/GreenAuditPage';
import OptimizationPage from './pages/OptimizationPage';
import SimulatorPage from './pages/SimulatorPage';
import ReportsPage from './pages/ReportsPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0e13',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #4d8eff, #4ae176)',
            margin: '0 auto 16px', animation: 'pulse 1.5s ease infinite',
          }} />
          <p style={{ color: '#c2c6d6', fontSize: '0.8rem', fontWeight: 600 }}>Loading CarbonLens AI...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  
  if (user.must_reset_password) {
    return <Navigate to="/reset-password" />;
  }

  return (
    <AppProvider>
      <div className="app-layout">
        <div className="bg-mesh" />
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="app-content">
            <AnimatePresence mode="wait">
              <Outlet />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}

/** Route guard: only allow specific roles */
function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  return children;
}

/** Smart dashboard: renders different page based on role */
function SmartDashboard() {
  const { user } = useAuth();
  if (user?.role === 'csp_admin') return <AdminDashboardPage />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<SmartDashboard />} />
            <Route path="/companies" element={
              <RoleRoute roles={['csp_admin', 'csp_analyst']}><CompaniesPage /></RoleRoute>
            } />
            <Route path="/users" element={
              <RoleRoute roles={['csp_admin']}><UserManagementPage /></RoleRoute>
            } />
            <Route path="/upload" element={
              <RoleRoute roles={['company_user', 'csp_admin']}><UploadPage /></RoleRoute>
            } />
            <Route path="/audit" element={
              <RoleRoute roles={['csp_analyst', 'company_user']}><GreenAuditPage /></RoleRoute>
            } />
            <Route path="/optimization" element={
              <RoleRoute roles={['csp_analyst']}><OptimizationPage /></RoleRoute>
            } />
            <Route path="/simulator" element={
              <RoleRoute roles={['csp_analyst']}><SimulatorPage /></RoleRoute>
            } />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
