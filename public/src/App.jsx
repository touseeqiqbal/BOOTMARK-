import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './utils/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import FormBuilder from './pages/FormBuilder'
import Submissions from './pages/Submissions'
import PublicForm from './pages/PublicForm'
import TableView from './pages/TableView'
import Reports from './pages/Reports'
import Workflows from './pages/Workflows'
import AccountSettings from './pages/AccountSettings'
import Analytics from './pages/Analytics'
import TeamCollaboration from './pages/TeamCollaboration'
import Customers from './pages/Customers'
import CustomerDashboard from './pages/CustomerDashboard'
import Invoices from './pages/Invoices'
import ClientSubmissions from './pages/ClientSubmissions'
import ClientPortal from './pages/ClientPortal'
import ShareRoute from './components/ShareRoute'
import AcceptInvite from './pages/AcceptInvite'
import BusinessRegistration from './pages/BusinessRegistration'
import AccountReview from './pages/AccountReview'
import BusinessApprovals from './pages/BusinessApprovals'
import BusinessPermissions from './pages/BusinessPermissions'
import UserManagement from './pages/UserManagement'
import AppCustomization from './pages/AppCustomization'
import FormEntry from './pages/FormEntry'
import Verify2FA from './pages/Verify2FA'
import BusinessTheme from './components/BusinessTheme'

function PrivateRoute({ children, allowPending = false, adminOnly = false, superAdminOnly = false }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }

  if (!allowPending && user.accountStatus && user.accountStatus !== 'active') {
    return <Navigate to="/account-review" />
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" />
  }

  if (superAdminOnly && !user.isSuperAdmin) {
    return <Navigate to="/dashboard" />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-2fa" element={<Verify2FA />} />
      <Route
        path="/business-registration"
        element={
          <PrivateRoute>
            <BusinessRegistration />
          </PrivateRoute>
        }
      />
      <Route
        path="/account-review"
        element={
          <PrivateRoute allowPending>
            <AccountReview />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/approvals"
        element={
          <PrivateRoute>
            <BusinessApprovals />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/business-permissions"
        element={
          <PrivateRoute superAdminOnly>
            <BusinessPermissions />
          </PrivateRoute>
        }
      />
      <Route path="/share/:shareKey/fill" element={<PublicForm />} />
      <Route path="/share/:shareKey" element={<ShareRoute />} />
      <Route
        path="/client/submissions/:shareKey"
        element={
          <PrivateRoute>
            <ClientSubmissions />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id"
        element={
          <PrivateRoute>
            <FormBuilder />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id/submissions"
        element={
          <PrivateRoute>
            <Submissions />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id/entry"
        element={
          <PrivateRoute>
            <FormEntry />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id/table"
        element={
          <PrivateRoute>
            <TableView />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id/workflows"
        element={
          <PrivateRoute>
            <Workflows />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id/analytics"
        element={
          <PrivateRoute>
            <Analytics />
          </PrivateRoute>
        }
      />
      <Route
        path="/form/:id/team"
        element={
          <PrivateRoute>
            <TeamCollaboration />
          </PrivateRoute>
        }
      />
      <Route
        path="/account-settings"
        element={
          <PrivateRoute>
            <AccountSettings />
          </PrivateRoute>
        }
      />
      <Route
        path="/user-management"
        element={
          <PrivateRoute>
            <UserManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/app-customization"
        element={
          <PrivateRoute>
            <AppCustomization />
          </PrivateRoute>
        }
      />
      <Route
        path="/accept-invite/:token"
        element={
          <PrivateRoute>
            <AcceptInvite />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <PrivateRoute>
            <Customers />
          </PrivateRoute>
        }
      />
      <Route
        path="/customer/:customerId/submissions"
        element={
          <PrivateRoute>
            <CustomerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <PrivateRoute>
            <Invoices />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BusinessTheme />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
