import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './utils/AuthContext'
import { CustomizationProvider } from './utils/CustomizationContext'
import ModernSidebar from './components/ModernSidebar'

// Critical pages - loaded immediately
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Verify2FA from './pages/Verify2FA'
import SetPassword from './pages/SetPassword'
import PublicForm from './pages/PublicForm'
import PayInvoice from './pages/PayInvoice'

// Heavy components - lazy loaded
const Dashboard = lazy(() => import('./pages/NewDashboard'))
const Forms = lazy(() => import('./pages/Dashboard'))
const FormBuilder = lazy(() => import('./pages/FormBuilder'))
const Submissions = lazy(() => import('./pages/Submissions'))
const TableView = lazy(() => import('./pages/TableView'))
const Reports = lazy(() => import('./pages/Reports'))
const Workflows = lazy(() => import('./pages/Workflows'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))
const NumberFormatSettings = lazy(() => import('./pages/NumberFormatSettings'))
const Analytics = lazy(() => import('./pages/Analytics'))
const TeamCollaboration = lazy(() => import('./pages/TeamCollaboration'))
const Clients = lazy(() => import('./pages/Clients'))
const WorkOrders = lazy(() => import('./pages/WorkOrders'))
const WorkOrderForm = lazy(() => import('./pages/WorkOrderForm'))
const WorkOrderDetail = lazy(() => import('./pages/WorkOrderDetail'))
const WorkOrderTemplates = lazy(() => import('./pages/WorkOrderTemplates'))
const WorkOrderTemplateBuilder = lazy(() => import('./pages/WorkOrderTemplateBuilder'))
const Services = lazy(() => import('./pages/Services'))
const Products = lazy(() => import('./pages/Products'))
const Materials = lazy(() => import('./pages/Materials'))
const Properties = lazy(() => import('./pages/Properties'))
const Contracts = lazy(() => import('./pages/Contracts'))
const ContractDetail = lazy(() => import('./pages/ContractDetail'))
const Estimates = lazy(() => import('./pages/Estimates'))
const Invoices = lazy(() => import('./pages/Invoices'))
const InvoiceForm = lazy(() => import('./pages/InvoiceForm'))
const Scheduling = lazy(() => import('./pages/Scheduling'))
const Employees = lazy(() => import('./pages/Employees'))
const QuickBooks = lazy(() => import('./pages/QuickBooks'))
const BusinessReports = lazy(() => import('./pages/BusinessReports'))
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'))
const ClientSubmissions = lazy(() => import('./pages/ClientSubmissions'))
const CrewMobile = lazy(() => import('./pages/CrewMobile'))
const ClientCrewTracking = lazy(() => import('./pages/ClientCrewTracking'))
const ClientSignaturePage = lazy(() => import('./pages/ClientSignaturePage'))
const ClientPortal = lazy(() => import('./pages/ClientPortal'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const ShareRoute = lazy(() => import('./components/ShareRoute'))
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'))
const BusinessRegistration = lazy(() => import('./pages/BusinessRegistration'))
const AccountReview = lazy(() => import('./pages/AccountReview'))
const BusinessApprovals = lazy(() => import('./pages/BusinessApprovals'))
const BusinessPermissions = lazy(() => import('./pages/BusinessPermissions'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const AppCustomization = lazy(() => import('./pages/AppCustomization'))
const FormEntry = lazy(() => import('./pages/FormEntry'))
const BusinessTheme = lazy(() => import('./components/BusinessTheme'))
import './styles/modern-ui.css'
import './styles/responsive-utilities.css'


function PrivateRoute({ children, allowPending = false, adminOnly = false, superAdminOnly = false, clientOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  // Redirect clients to client portal (unless already on client routes)
  if (user.role === 'client' && !clientOnly && !window.location.pathname.startsWith('/client')) {
    return <Navigate to="/client/portal" />
  }

  // Prevent clients from accessing admin routes
  if (user.role === 'client' && !clientOnly) {
    return <Navigate to="/client/portal" />
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

// Loading component for lazy loaded routes
function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p style={{ fontSize: '18px', fontWeight: '500' }}>Loading...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
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
      <Route path="/client/set-password" element={<SetPassword />} />
      <Route path="/client/dashboard" element={<PrivateRoute clientOnly={true}><ClientPortal /></PrivateRoute>} />
      <Route path="/client/portal" element={<PrivateRoute clientOnly={true}><ClientPortal /></PrivateRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-2fa" element={<Verify2FA />} />
      <Route path="/share/:shareKey/fill" element={<PublicForm />} />
      <Route path="/share/:shareKey" element={<ShareRoute />} />
      <Route path="/pay/:token" element={<PayInvoice />} />
      <Route path="/contracts/:id/sign/:token" element={<ClientSignaturePage />} />
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
        path="/number-format-settings"
        element={
          <PrivateRoute>
            <NumberFormatSettings />
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
            <CrewMobile />
          </PrivateRoute>
        }
      />
      <Route
        path="/client/crew-tracking"
        element={
          <PrivateRoute>
            <ClientCrewTracking />
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
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {publicRoutes}
        {protectedRoutes}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <CustomizationProvider>
        <BusinessTheme />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AppRoutes />
        </BrowserRouter>
      </CustomizationProvider>
    </AuthProvider>
  )
}

export default App
