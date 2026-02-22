import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { FileText, ArrowLeft, Calendar, ExternalLink } from 'lucide-react'
import '../styles/ClientSubmissions.css'

export default function ClientSubmissions() {
  const { shareKey } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/client/submissions/${shareKey}`)
      return
    }
    fetchSubmissions()
  }, [shareKey, user])

  const fetchSubmissions = async () => {
    try {
      // First get the form to check if it requires auth
      const formResponse = await api.get(`/public/form/${shareKey}`)
      setForm(formResponse.data)

      // Then get client's submissions
      const submissionsResponse = await api.get(`/public/form/${shareKey}/submissions`)
      setSubmissions(submissionsResponse.data)
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
      if (error.response?.status === 401) {
        navigate(`/login?redirect=/client/submissions/${shareKey}`)
      } else {
        alert(error.response?.data?.error || 'Failed to fetch submissions')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderSubmissionValue = (value) => {
    if (value === null || value === undefined) return 'N/A'
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  if (loading) {
    return <div className="loading">Loading submissions...</div>
  }

  if (!form) {
    return <div className="error-message">Form not found</div>
  }

  return (
    <div className="client-submissions-page">
      <div className="client-submissions-container">
        <div className="client-submissions-header">
          <Link to={`/share/${shareKey}`} className="back-link">
            <ArrowLeft size={20} />
            Back to Form
          </Link>
          <h1>My Submissions</h1>
          <p className="form-title-display">{form.title}</p>
        </div>

        {submissions.length === 0 ? (
          <div className="no-submissions">
            <FileText size={48} />
            <h2>No Submissions Yet</h2>
            <p>You haven't submitted this form yet. Click below to start your submission.</p>
            <Link to={`/share/${shareKey}`} className="btn btn-primary">
              Go to Form
            </Link>
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.map((submission, index) => (
              <div key={submission.id} className="submission-card">
                <div className="submission-header">
                  <div className="submission-number">
                    <FileText size={20} />
                    <span>Submission #{submissions.length - index}</span>
                  </div>
                  <div className="submission-date">
                    <Calendar size={16} />
                    <span>{formatDate(submission.submittedAt)}</span>
                  </div>
                </div>
                <div className="submission-content">
                  {form.fields && form.fields.map(field => {
                    const value = submission.data?.[field.id]
                    if (value === null || value === undefined || value === '') return null
                    
                    return (
                      <div key={field.id} className="submission-field">
                        <strong>{field.label}:</strong>
                        <span>{renderSubmissionValue(value)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

