import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './utils/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading">Loading...</div>
  }
  
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/share/:shareKey" element={<PublicForm />} />
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
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
