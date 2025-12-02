import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, TrendingUp, Eye, FileText, Users, Clock } from 'lucide-react'
import '../styles/Analytics.css'

export default function Analytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d') // 7d, 30d, 90d, all

  useEffect(() => {
    fetchData()
  }, [id, timeRange])

  const fetchData = async () => {
    try {
      const [formRes, submissionsRes] = await Promise.all([
        api.get(`/forms/${id}`),
        api.get(`/submissions/form/${id}`)
      ])
      setForm(formRes.data)
      setSubmissions(submissionsRes.data || [])
      calculateAnalytics(submissionsRes.data || [], timeRange)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      alert('Failed to load analytics')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (subs, range) => {
    const now = new Date()
    let startDate = new Date()
    
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate = new Date(0) // All time
    }

    const filteredSubs = subs.filter(s => new Date(s.submittedAt) >= startDate)
    
    // Calculate metrics
    const totalSubmissions = filteredSubs.length
    const totalViews = form?.views || 0
    const conversionRate = totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(2) : 0
    
    // Submissions over time
    const submissionsByDate = {}
    filteredSubs.forEach(sub => {
      const date = new Date(sub.submittedAt).toLocaleDateString()
      submissionsByDate[date] = (submissionsByDate[date] || 0) + 1
    })
    
    // Field completion rates
    const fieldStats = {}
    if (form?.fields) {
      form.fields.forEach(field => {
        const completed = filteredSubs.filter(s => 
          s.data?.[field.id] !== undefined && 
          s.data?.[field.id] !== null && 
          s.data?.[field.id] !== ''
        ).length
        fieldStats[field.id] = {
          label: field.label,
          completed,
          total: totalSubmissions,
          rate: totalSubmissions > 0 ? ((completed / totalSubmissions) * 100).toFixed(1) : 0
        }
      })
    }

    // Average completion time (if we track it)
    const avgTime = filteredSubs.length > 0 
      ? filteredSubs.reduce((sum, s) => sum + (s.completionTime || 0), 0) / filteredSubs.length 
      : 0

    setAnalytics({
      totalSubmissions,
      totalViews,
      conversionRate,
      submissionsByDate,
      fieldStats,
      avgTime,
      timeRange: range
    })
  }

  if (loading) {
    return <div className="loading">Loading analytics...</div>
  }

  if (!form) {
    return <div className="loading">Form not found</div>
  }

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-secondary" onClick={() => navigate(`/form/${id}`)}>
              <ArrowLeft size={18} />
              Back to Form
            </button>
            <h1>{form.title} - Analytics</h1>
            <select 
              className="input" 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </header>

      <div className="container">
        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon" style={{ background: '#dbeafe' }}>
                  <FileText size={24} color="#1e40af" />
                </div>
                <div className="metric-content">
                  <h3>{analytics.totalSubmissions}</h3>
                  <p>Total Submissions</p>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" style={{ background: '#d1fae5' }}>
                  <Eye size={24} color="#065f46" />
                </div>
                <div className="metric-content">
                  <h3>{analytics.totalViews}</h3>
                  <p>Total Views</p>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" style={{ background: '#fef3c7' }}>
                  <TrendingUp size={24} color="#92400e" />
                </div>
                <div className="metric-content">
                  <h3>{analytics.conversionRate}%</h3>
                  <p>Conversion Rate</p>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" style={{ background: '#e9d5ff' }}>
                  <Clock size={24} color="#6b21a8" />
                </div>
                <div className="metric-content">
                  <h3>{analytics.avgTime > 0 ? `${Math.round(analytics.avgTime)}s` : 'N/A'}</h3>
                  <p>Avg. Completion</p>
                </div>
              </div>
            </div>

            {/* Submissions Chart */}
            <div className="chart-section">
              <h2>Submissions Over Time</h2>
              <div className="chart-container">
                {Object.keys(analytics.submissionsByDate).length > 0 ? (
                  <div className="bar-chart">
                    {Object.entries(analytics.submissionsByDate).map(([date, count]) => {
                      const maxCount = Math.max(...Object.values(analytics.submissionsByDate))
                      const height = (count / maxCount) * 100
                      return (
                        <div key={date} className="bar-item">
                          <div 
                            className="bar" 
                            style={{ height: `${height}%` }}
                            title={`${count} submissions on ${date}`}
                          />
                          <span className="bar-label">{date}</span>
                          <span className="bar-value">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="no-data">No submissions in this time range</p>
                )}
              </div>
            </div>

            {/* Field Completion Rates */}
            <div className="field-stats-section">
              <h2>Field Completion Rates</h2>
              <div className="field-stats-list">
                {Object.entries(analytics.fieldStats).map(([fieldId, stats]) => (
                  <div key={fieldId} className="field-stat-item">
                    <div className="field-stat-header">
                      <span className="field-name">{stats.label}</span>
                      <span className="field-rate">{stats.rate}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${stats.rate}%` }}
                      />
                    </div>
                    <div className="field-stat-meta">
                      <span>{stats.completed} of {stats.total} completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
