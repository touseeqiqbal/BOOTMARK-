import { useAuth } from '../utils/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../styles/Login.css'

export default function AccountReview() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const status = user?.accountStatus || 'pending-approval'

  const statusConfig = {
    'pending-approval': {
      title: 'Your application is under review',
      message: 'Thanks for submitting your business details. We are reviewing your application and will email you as soon as it is approved.'
    },
    rejected: {
      title: 'Application requires attention',
      message: 'Your submission was marked as needing changes. Please contact support so we can help you get set up.'
    }
  }

  const content = statusConfig[status] || statusConfig['pending-approval']

  return (
    <div className="auth-container" style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: '540px' }}>
        <h1>BOOTMARK</h1>
        <h2 style={{ marginTop: '10px' }}>{content.title}</h2>
        <p style={{ marginTop: '16px', color: '#4b5563' }}>{content.message}</p>
        <p style={{ marginTop: '12px', color: '#6b7280' }}>
          Need to speed things up? Email us at <strong>support@bootmark.app</strong> with your business name.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh Status
          </button>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

