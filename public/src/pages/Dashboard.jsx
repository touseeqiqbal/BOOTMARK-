import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Plus, FileText, Trash2, ExternalLink, Table, BarChart, Workflow, Settings, TrendingUp, Users, CreditCard } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'

export default function Dashboard() {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch forms when component mounts (PrivateRoute ensures user is authenticated)
    if (!authLoading) {
      fetchForms()
    }
  }, [authLoading])

  const fetchForms = async () => {
    try {
      const response = await api.get('/forms')
      setForms(response.data)
    } catch (error) {
      console.error('Failed to fetch forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const createForm = async () => {
    try {
      const response = await api.post('/forms', {
        title: 'Untitled Form',
        fields: [],
        settings: {}
      })
      navigate(`/form/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create form:', error)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to create form';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        } else if (data.details) {
          errorMessage = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
        } else if (data.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(`Failed to create form: ${errorMessage}`)
    }
  }

  const deleteForm = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this form?')) return

    try {
      await api.delete(`/forms/${id}`)
      setForms(forms.filter(f => f.id !== id))
    } catch (error) {
      console.error('Failed to delete form:', error)
      alert('Failed to delete form')
    }
  }

  const copyShareLink = (shareKey, e) => {
    e.stopPropagation()
    const link = `${window.location.origin}/share/${shareKey}`
    navigator.clipboard.writeText(link)
    alert('Share link copied to clipboard!')
  }

  // Show loading while auth is loading or forms are being fetched
  if (authLoading || loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="dashboard-brand">
              <img src={logo} alt="BootMark Logo" className="brand-logo" />
              <div className="brand-text">
                <h1 className="brand-title">BootMark Landscaping Management</h1>
                <span className="brand-subtitle">My Forms</span>
              </div>
            </div>
            <div className="header-actions">
              <span className="user-name">{user?.name || user?.email}</span>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('/account-settings')}
                title="Account Settings"
              >
                <Settings size={16} />
                Settings
              </button>
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="dashboard-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary create-form-btn" onClick={createForm}>
            <Plus size={20} />
            Create New Form
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/customers')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={18} />
            Customers
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/invoices')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <CreditCard size={18} />
            Invoices
          </button>
        </div>

        {forms.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} color="#9ca3af" />
            <h2>No forms yet</h2>
            <p>Create your first form to get started</p>
            <button className="btn btn-primary" onClick={createForm}>
              Create Form
            </button>
          </div>
        ) : (
          <div className="forms-grid">
            {forms.map(form => (
              <div
                key={form.id}
                className="form-card"
                onClick={() => navigate(`/form/${form.id}`)}
              >
                <div className="form-card-header">
                  <FileText size={24} color="#4f46e5" />
                  <div className="form-card-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => copyShareLink(form.shareKey, e)}
                      title="Copy share link"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={(e) => deleteForm(form.id, e)}
                      title="Delete form"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3>{form.title}</h3>
                <p className="form-meta">
                  {form.fields?.length || 0} fields • Updated {new Date(form.updatedAt).toLocaleDateString()}
                </p>
                <div className="form-card-footer">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/form/${form.id}/submissions`)
                    }}
                  >
                    Submissions
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/form/${form.id}/table`)
                    }}
                  >
                    <Table size={14} />
                    Table
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/form/${form.id}/reports`)
                    }}
                  >
                    <BarChart size={14} />
                    Reports
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/form/${form.id}/workflows`)
                    }}
                  >
                    Workflows
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/form/${form.id}/analytics`)
                    }}
                  >
                    <TrendingUp size={14} />
                    Analytics
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/form/${form.id}/team`)
                    }}
                  >
                    <Users size={14} />
                    Team
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
