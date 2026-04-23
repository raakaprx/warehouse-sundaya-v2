import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import SuperDashboard from './pages/SuperDashboard';
import SiteDashboard from './pages/SiteDashboard';
import ProgrammerDashboard from './pages/ProgrammerDashboard';
import Inventory from './pages/Inventory';
import MaterialRequests from './pages/MaterialRequests';
import ShippingControl from './pages/ShippingControl';
import SystemAlerts from './pages/SystemAlerts';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import UsedMaterials from './pages/UsedMaterials';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports'; // ← pastikan nama filenya Reports.jsx
import InventoryUsage from './pages/InventoryUsage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'NOC') return <Navigate to="/admin" />;
    if (user.role === 'PROGRAMMER') return <Navigate to="/programmer" />;
    if (user.role === 'GM') return <Navigate to="/gm" />;
    if (user.role === 'OM') return <Navigate to="/om" />;
  }

  return children;
};

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'NOC') return <Navigate to="/admin" />;
  if (user.role === 'PROGRAMMER') return <Navigate to="/programmer" />;
  if (user.role === 'GM') return <Navigate to="/gm" />;
  if (user.role === 'OM') return <Navigate to="/om" />;
  return <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        
        {/* Dashboards */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['NOC']}><SuperDashboard /></ProtectedRoute>
        } />
        <Route path="/programmer" element={
          <ProtectedRoute allowedRoles={['PROGRAMMER']}><ProgrammerDashboard /></ProtectedRoute>
        } />
        <Route path="/gm" element={
          <ProtectedRoute allowedRoles={['GM']}><SuperDashboard /></ProtectedRoute>
        } />
        <Route path="/om" element={
          <ProtectedRoute allowedRoles={['OM']}><SiteDashboard /></ProtectedRoute>
        } />

        {/* Common Modules */}
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/requests" element={<MaterialRequests />} />
        <Route path="/used-materials" element={<UsedMaterials />} />
        <Route path="/inventory-usage" element={<InventoryUsage />} />
        <Route path="/alerts" element={<SystemAlerts />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/logs" element={<AuditLogs />} />
        <Route path="/shipping" element={<ShippingControl />} />
        <Route path="/settings" element={<Settings />} />

        {/* ↓ TAMBAHKAN ROUTE REPORTS DISINI ↓ */}
        <Route path="/reports" element={<Reports />} />

      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;