import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'

import LoginPage from './pages/auth/LoginPage'
import FarmerDashboard from './pages/FarmerDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import GovtDashboard from './pages/GovtDashboard'
import AppointmentsPage from './pages/AppointmentsPage'
import LiveSessionPage from './pages/LiveSessionPage'

function RoleRoute({ children, allowedRoles }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!profile) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getRoleHome(profile.role)} replace />
  }
  return children
}

function RootRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner w-8 h-8" /></div>
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={getRoleHome(profile?.role)} replace />
}

function getRoleHome(role) {
  switch (role) {
    case 'farmer':       return '/farmer'
    case 'doctor':       return '/doctor'
    case 'govt_official': return '/govt'
    default:             return '/login'
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />

      <Route path="/farmer" element={
        <RoleRoute allowedRoles={['farmer']}>
          <FarmerDashboard />
        </RoleRoute>
      } />

      <Route path="/doctor" element={
        <RoleRoute allowedRoles={['doctor']}>
          <DoctorDashboard />
        </RoleRoute>
      } />

      <Route path="/govt" element={
        <RoleRoute allowedRoles={['govt_official']}>
          <GovtDashboard />
        </RoleRoute>
      } />

      <Route path="/appointments" element={
        <RoleRoute allowedRoles={['farmer', 'doctor']}>
          <AppointmentsPage />
        </RoleRoute>
      } />

      <Route path="/session/:appointmentId" element={
        <RoleRoute>
          <LiveSessionPage />
        </RoleRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#052e16' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#450a0a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
