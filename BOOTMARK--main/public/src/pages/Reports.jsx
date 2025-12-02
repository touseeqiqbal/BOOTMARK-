import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, Download, BarChart, PieChart, TrendingUp } from 'lucide-react'
import '../styles/Reports.css'

export default function Reports() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedField, setSelectedField] = useState(null)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [formRes, submissionsRes] = await Promise.all([
        api.get(`/forms/${id}`),
        api.get(`/submissions/form/${id}`)
      ])
      setForm(formRes.data)
      setSubmissions(submissionsRes.data)
      if (formRes.data.fields.length > 0) {
        setSelectedField(formRes.data.fields[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      alert('Failed to load reports')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const generateFieldReport = (fieldId) => {
    const field = form.fields.find(f => f.id === fieldId)
    if (!field) return null

    const fieldData = submissions.map(s => s.data[fieldId]).filter(v => v !== undefined && v !== null)
    
    if (['single-choice', 'radio', 'dropdown'].includes(field.type)) {
      const counts = {}
      fieldData.forEach(val => {
        counts[val] = (counts[val] || 0) + 1
      })
      return { type: 'choice', data: counts, total: fieldData.length }
    }

    if (['multiple-choice', 'checkbox'].includes(field.type)) {
      const counts = {}
      fieldData.forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(val => {
            counts[val] = (counts[val] || 0) + 1
          })
        }
      })
      return { type: 'choice', data: counts, total: fieldData.length }
    }

    if (field.type === 'number' || field.type === 'scale-rating') {
      const numbers = fieldData.map(v => parseFloat(v)).filter(v => !isNaN(v))
      if (numbers.length === 0) return null
      const sum = numbers.reduce((a, b) => a + b, 0)
      const avg = sum / numbers.length
      const min = Math.min(...numbers)
      const max = Math.max(...numbers)
      return { type: 'number', avg, min, max, total: numbers.length, values: numbers }
    }

    if (field.type === 'star-rating' || field.type === 'rating') {
      const ratings = fieldData.map(v => parseInt(v)).filter(v => !isNaN(v))
      const counts = {}
      ratings.forEach(r => {
        counts[r] = (counts[r] || 0) + 1
      })
      return { type: 'rating', data: counts, total: ratings.length }
    }

    return { type: 'text', total: fieldData.length }
  }

  const exportReport = () => {
    if (!selectedField) return
    
    const report = generateFieldReport(selectedField)
    if (!report) return

    let content = `Report for: ${form.fields.find(f => f.id === selectedField)?.label}\n`
    content += `Total Responses: ${report.total}\n\n`

    if (report.type === 'choice' || report.type === 'rating') {
      Object.entries(report.data).forEach(([key, value]) => {
        const percentage = ((value / report.total) * 100).toFixed(1)
        content += `${key}: ${value} (${percentage}%)\n`
      })
    }

    if (report.type === 'number') {
      content += `Average: ${report.avg.toFixed(2)}\n`
      content += `Min: ${report.min}\n`
      content += `Max: ${report.max}\n`
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${selectedField}.txt`
    a.click()
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const report = selectedField ? generateFieldReport(selectedField) : null
  const selectedFieldObj = form.fields.find(f => f.id === selectedField)

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-secondary" onClick={() => navigate(`/form/${id}`)}>
              <ArrowLeft size={18} />
              Back to Form
            </button>
            <h1>{form?.title} - Reports</h1>
            {report && (
              <button className="btn btn-primary" onClick={exportReport}>
                <Download size={18} />
                Export Report
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <div className="reports-controls">
          <div className="form-group">
            <label>Select Field to Analyze</label>
            <select
              className="input"
              value={selectedField || ''}
              onChange={(e) => setSelectedField(e.target.value)}
            >
              <option value="">Select a field</option>
              {form.fields.map(field => (
                <option key={field.id} value={field.id}>{field.label}</option>
              ))}
            </select>
          </div>
        </div>

        {report && selectedFieldObj && (
          <div className="report-content">
            <div className="report-header">
              <h2>{selectedFieldObj.label}</h2>
              <div className="report-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Responses</span>
                  <span className="stat-value">{report.total}</span>
                </div>
              </div>
            </div>

            {report.type === 'choice' && (
              <div className="report-chart">
                <h3>Response Distribution</h3>
                <div className="bar-chart">
                  {Object.entries(report.data)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, value]) => {
                      const percentage = (value / report.total) * 100
                      return (
                        <div key={key} className="bar-item">
                          <div className="bar-label">{key}</div>
                          <div className="bar-container">
                            <div 
                              className="bar-fill" 
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="bar-value">{value} ({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {report.type === 'rating' && (
              <div className="report-chart">
                <h3>Rating Distribution</h3>
                <div className="rating-chart">
                  {Array.from({ length: selectedFieldObj.max || 5 }, (_, i) => i + 1)
                    .reverse()
                    .map(rating => {
                      const count = report.data[rating] || 0
                      const percentage = (count / report.total) * 100
                      return (
                        <div key={rating} className="rating-bar-item">
                          <div className="rating-label">
                            {rating} {rating === 1 ? 'star' : 'stars'}
                          </div>
                          <div className="bar-container">
                            <div 
                              className="bar-fill" 
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="bar-value">{count}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {report.type === 'number' && (
              <div className="report-stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Average</div>
                    <div className="stat-value-large">{report.avg.toFixed(2)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <BarChart size={24} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Minimum</div>
                    <div className="stat-value-large">{report.min}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <BarChart size={24} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Maximum</div>
                    <div className="stat-value-large">{report.max}</div>
                  </div>
                </div>
              </div>
            )}

            {report.type === 'text' && (
              <div className="report-info">
                <p>This field contains text responses. View individual submissions for details.</p>
              </div>
            )}
          </div>
        )}

        {!report && selectedField && (
          <div className="empty-state">
            <p>No data available for this field type</p>
          </div>
        )}

        {!selectedField && (
          <div className="empty-state">
            <BarChart size={64} color="#9ca3af" />
            <h2>Select a field to generate a report</h2>
            <p>Choose a field from the dropdown above to view analytics</p>
          </div>
        )}
      </div>
    </div>
  )
}
