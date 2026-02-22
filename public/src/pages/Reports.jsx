import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import PageHeader from '../components/ui/PageHeader'
import { ArrowLeft, Download, BarChart, PieChart, TrendingUp, ChevronLeft } from 'lucide-react'
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
    <div className="dashboard animate-fadeIn">
      <PageHeader
        title="Form Analytics & Reports"
        subtitle={`${form?.title || 'Form'} Submission Insights`}
        actions={
          <>
            <button className="btn-modern btn-modern-secondary" onClick={() => navigate(`/form/${id}`)}>
              <ChevronLeft size={18} /> Back to Form
            </button>
            {report && (
              <button className="btn-modern btn-modern-primary" onClick={exportReport}>
                <Download size={18} /> Export Data
              </button>
            )}
          </>
        }
      />

      <div className="container" style={{ paddingTop: 0, marginTop: '24px' }}>
        <div className="modern-card" style={{ marginBottom: '32px', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Field to Analyze</label>
            <select
              className="input-modern"
              value={selectedField || ''}
              onChange={(e) => setSelectedField(e.target.value)}
              style={{ maxWidth: '400px' }}
            >
              <option value="">Select a field</option>
              {form.fields.map(field => (
                <option key={field.id} value={field.id}>{field.label}</option>
              ))}
            </select>
          </div>
        </div>

        {report && selectedFieldObj && (
          <div className="report-content animate-fadeIn">
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{selectedFieldObj.label}</h2>
              <div className="badge badge-info" style={{ padding: '8px 16px', fontSize: '14px' }}>
                {report.total} Responses
              </div>
            </div>

            {report.type === 'choice' && (
              <div className="modern-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Response Distribution</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(report.data)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, value]) => {
                      const percentage = (value / report.total) * 100
                      return (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{key}</span>
                            <span style={{ color: 'var(--primary-600)', fontWeight: '800' }}>{value} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${percentage}%`,
                                background: 'linear-gradient(90deg, var(--primary-500) 0%, var(--primary-600) 100%)',
                                borderRadius: 'var(--radius-full)',
                                transition: 'width 1s cubic-bezier(0.165, 0.84, 0.44, 1)'
                              }}
                            />
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                {[
                  { label: 'Average', value: report.avg.toFixed(2), icon: TrendingUp, color: 'var(--primary-500)' },
                  { label: 'Minimum', value: report.min, icon: BarChart, color: 'var(--success-500)' },
                  { label: 'Maximum', value: report.max, icon: BarChart, color: 'var(--error-500)' }
                ].map((stat, i) => (
                  <div key={i} className="modern-card animate-fadeIn" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <stat.icon size={24} color={stat.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stat.value}</div>
                    </div>
                  </div>
                ))}
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
          <div className="modern-card animate-fadeIn" style={{ padding: '80px 24px', textAlign: 'center' }}>
            <BarChart size={64} color="var(--primary-200)" style={{ marginBottom: '24px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>Analyze Your Submission Data</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>Select a specific field from the dropdown above to generate visual insights and statistical breakdowns of your responses.</p>
          </div>
        )}
      </div>
    </div>
  )
}
