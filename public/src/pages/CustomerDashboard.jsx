import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { FileText, Calendar, Download, ArrowLeft } from 'lucide-react'
import '../styles/Dashboard.css'

export default function CustomerDashboard() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [customerId])

  const fetchData = async () => {
    try {
      const [customerRes, submissionsRes] = await Promise.all([
        api.get(`/customers/${customerId}`),
        api.get(`/customers/${customerId}/submissions`)
      ])
      setCustomer(customerRes.data)
      setSubmissions(submissionsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (submissions.length === 0) return

    // Get all unique field IDs from submissions
    const allFieldIds = new Set()
    submissions.forEach(sub => {
      Object.keys(sub.data || {}).forEach(key => allFieldIds.add(key))
    })

    const headers = ['Submission ID', 'Submitted At', 'Form ID', ...Array.from(allFieldIds)]
    const rows = submissions.map(sub => [
      sub.id,
      sub.submittedAt || '',
      sub.formId || '',
      ...Array.from(allFieldIds).map(fieldId => {
        const value = sub.data?.[fieldId] || ''
        return `"${String(value).replace(/"/g, '""')}"`
      })
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customer-submissions-${customerId}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!customer) {
    return (
      <div className="dashboard">
        <div className="container">
          <p>Customer not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div style={{ marginBottom: '20px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/customers')}
            style={{ marginBottom: '16px' }}
          >
            <ArrowLeft size={18} style={{ marginRight: '8px' }} />
            Back to Customers
          </button>
          <h1>{customer.name}'s Submissions</h1>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            {customer.email && <span>Email: {customer.email}</span>}
            {customer.phone && <span style={{ marginLeft: '16px' }}>Phone: {customer.phone}</span>}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>All Submissions ({submissions.length})</h2>
          {submissions.length > 0 && (
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Download size={18} />
              Export CSV
            </button>
          )}
        </div>

        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No submissions found for this customer</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {submissions.map((submission) => (
              <div key={submission.id} className="form-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Submission #{submission.id.substring(0, 8)}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', color: '#6b7280', fontSize: '14px' }}>
                      <Calendar size={14} />
                      <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {Object.entries(submission.data || {}).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                        {key}
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

