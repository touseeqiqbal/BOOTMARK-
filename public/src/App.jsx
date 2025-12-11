import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './utils/AuthContext'
import ModernSidebar from './components/ModernSidebar'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/NewDashboard'
import Forms from './pages/Dashboard'  // Old dashboard renamed to Forms
import FormBuilder from './pages/FormBuilder'
import Submissions from './pages/Submissions'
import PublicForm from './pages/PublicForm'
import TableView from './pages/TableView'
import Reports from './pages/Reports'
import Workflows from './pages/Workflows'
import AccountSettings from './pages/AccountSettings'
import Analytics from './pages/Analytics'
import TeamCollaboration from './pages/TeamCollaboration'
import Clients from './pages/Clients'
import WorkOrders from './pages/WorkOrders'
import WorkOrderForm from './pages/WorkOrderForm'
import WorkOrderDetail from './pages/WorkOrderDetail'
import WorkOrderTemplates from './pages/WorkOrderTemplates'
import WorkOrderTemplateBuilder from './pages/WorkOrderTemplateBuilder'

// ... existing code ...

import Services from './pages/Services'
import Products from './pages/Products'
import Materials from './pages/Materials'
import Properties from './pages/Properties';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Estimates from './pages/Estimates';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import Scheduling from './pages/Scheduling';
import Employees from './pages/Employees';
import QuickBooks from './pages/QuickBooks';
import BusinessReports from './pages/BusinessReports';
import CustomerDashboard from './pages/CustomerDashboard'
import ClientSubmissions from './pages/ClientSubmissions'
import ClientPortal from './pages/ClientPortal'
import ClientDetail from './pages/ClientDetail'
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
import PayInvoice from './pages/PayInvoice'
import BusinessTheme from './components/BusinessTheme'
import './styles/modern-ui.css'

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
  const { user } = useAuth()

  // Routes that don't need sidebar
  const publicRoutes = (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-2fa" element={<Verify2FA />} />
      <Route path="/share/:shareKey/fill" element={<PublicForm />} />
      <Route path="/share/:shareKey" element={<ShareRoute />} />
      <Route path="/pay/:token" element={<PayInvoice />} />
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
    </>
  )

  // Routes that need sidebar
  const protectedRoutes = (
    <Route element={<ModernSidebar />}>
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
        path="/forms"
        element={
          <PrivateRoute>
            <Forms />
          </PrivateRoute>
        }
      />
      <Route
        path="/properties"
        element={
          <PrivateRoute>
            <Properties />
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
            <Clients />
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
      <Route
        path="/invoices/new"
        element={
          <PrivateRoute>
            <InvoiceForm />
          </PrivateRoute>
        }
      />

      {/* New Landscaping Management Routes - Placeholders */}
      <Route
        path="/clients"
        element={
          <PrivateRoute>
            <Clients />
          </PrivateRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <PrivateRoute>
            <ClientDetail />
          </PrivateRoute>
        }
      />

      <Route
        path="/work-orders"
        element={
          <PrivateRoute>
            <WorkOrders />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/templates"
        element={
          <PrivateRoute>
            <WorkOrderTemplates />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/templates/new"
        element={
          <PrivateRoute>
            <WorkOrderTemplateBuilder />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/templates/:id"
        element={
          <PrivateRoute>
            <WorkOrderTemplateBuilder />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/new"
        element={
          <PrivateRoute>
            <WorkOrderForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/edit/:id"
        element={
          <PrivateRoute>
            <WorkOrderForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/:id"
        element={
          <PrivateRoute>
            <WorkOrderDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/scheduling"
        element={
          <PrivateRoute>
            <Scheduling />
          </PrivateRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <PrivateRoute>
            <Employees />
          </PrivateRoute>
        }
      />
      <Route
        path="/business-reports"
        element={
          <PrivateRoute>
            <BusinessReports />
          </PrivateRoute>
        }
      />
      <Route
        path="/services"
        element={
          <PrivateRoute>
            <Services />
          </PrivateRoute>
        }
      />
      <Route
        path="/products"
        element={
          <PrivateRoute>
            <Products />
          </PrivateRoute>
        }
      />
      <Route
        path="/materials"
        element={
          <PrivateRoute>
            <Materials />
          </PrivateRoute>
        }
      />
      <Route
        path="/contracts"
        element={
          <PrivateRoute>
            <Contracts />
          </PrivateRoute>
        }
      />
      <Route
        path="/contracts/:id"
        element={
          <PrivateRoute>
            <ContractDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/estimates"
        element={
          <PrivateRoute>
            <Estimates />
          </PrivateRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <PrivateRoute>
            <UserManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/crew-mobile"
        element={
          <PrivateRoute>
            <div style={{ padding: '2rem' }}>
              <h1>Crew Mobile - Coming Soon</h1>
              <p>Mobile crew interface will be available here.</p>
            </div>
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <PrivateRoute>
            <Analytics />
          </PrivateRoute>
        }
      />
      <Route
        path="/quickbooks"
        element={
          <PrivateRoute>
            <QuickBooks />
          </PrivateRoute>
        }
      />
    </Route>
  )

  return (
    <Routes>
      {publicRoutes}
      {protectedRoutes}
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
