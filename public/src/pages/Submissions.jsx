import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, Download, Trash2, FileText, ClipboardList, Send } from 'lucide-react'
import SendFormEmail from '../components/SendFormEmail'
import '../styles/Submissions.css'

const formatFieldValue = (value, { fallback = '—', delimiter = ', ' } = {}) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (Array.isArray(value)) {
    return value.join(delimiter)
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }

  return String(value)
}

const escapeCsvValue = (value) => {
  const primitive = value === undefined || value === null ? '' : String(value)
  const needsQuotes = /[",\n]/.test(primitive)
  const safeValue = primitive.replace(/"/g, '""')
  return needsQuotes ? `"${safeValue}"` : safeValue
}

const buildPdfRows = (form, submissions) => {
  if (!form?.fields?.length) {
    return []
  }

  return submissions.flatMap((submission, idx) => {
    const submittedAt = submission.submittedAt
      ? new Date(submission.submittedAt).toLocaleString()
      : 'Not timestamped'

    const submissionHeader = [
      {
        content: `Submission #${submissions.length - idx} • ${submittedAt}`,
        colSpan: 2,
        styles: {
          fillColor: [241, 245, 249],
          fontStyle: 'bold',
          textColor: [17, 24, 39],
        },
      },
    ]

    const idRow = ['Submission ID', submission.id]
    const fieldRows = form.fields.map((field) => [
      field.label,
      formatFieldValue(submission.data?.[field.id], { fallback: '—', delimiter: '; ' }),
    ])

    const spacerRow = [{ content: '', colSpan: 2, styles: { cellPadding: 4 } }]

    return [submissionHeader, idRow, ...fieldRows, spacerRow]
  })
}

export default function Submissions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSendEmailModal, setShowSendEmailModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      console.log('Fetching submissions for form:', id)
      const [formRes, submissionsRes] = await Promise.all([
        api.get(`/forms/${id}`),
        api.get(`/submissions/form/${id}`)
      ])
      console.log('Form data:', formRes.data)
      console.log('Submissions data:', submissionsRes.data)
      setForm(formRes.data)
      setSubmissions(submissionsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      console.error('Error response:', error.response?.data)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load submissions'
      alert(`Failed to load submissions: ${errorMessage}`)
      // Don't navigate away, just show error
    } finally {
      setLoading(false)
    }
  }

  const deleteSubmission = async (submissionId) => {
    if (!confirm('Are you sure you want to delete this submission?')) return

    try {
      await api.delete(`/submissions/${submissionId}`)
      setSubmissions(submissions.filter(s => s.id !== submissionId))
    } catch (error) {
      console.error('Failed to delete submission:', error)
      alert('Failed to delete submission')
    }
  }

  const exportCSV = () => {
    if (!form || submissions.length === 0) return

    const fieldDefinitions = form.fields || []
    const headers = ['Submission ID', 'Submitted At', ...fieldDefinitions.map((f) => f.label)]
    const csvRows = submissions.map((submission) => {
      const submittedAt = submission.submittedAt
        ? new Date(submission.submittedAt).toLocaleString()
        : ''

      const row = [
        submission.id || '',
        submittedAt,
        ...fieldDefinitions.map((field) =>
          formatFieldValue(submission.data?.[field.id], { fallback: '', delimiter: '; ' })
        ),
      ]

      return row.map(escapeCsvValue).join(',')
    })

    const csv = [headers.map(escapeCsvValue).join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.title}_submissions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    if (!form || submissions.length === 0) return

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])

      const autoTable = autoTableModule.default || autoTableModule
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      
      doc.setFontSize(18)
      doc.text(form.title || 'Form Submissions', 40, 40)
      doc.setFontSize(11)
      doc.text(`Total submissions: ${submissions.length}`, 40, 60)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 75)

      const bodyRows = buildPdfRows(form, submissions)

      if (bodyRows.length === 0) {
        doc.text('No fields available to export for this form.', 40, 100)
              } else {
        autoTable(doc, {
          head: [['Field', 'Value']],
          body: bodyRows,
          startY: 95,
          theme: 'grid',
          margin: { left: 40, right: 40 },
          styles: { cellPadding: 8, fontSize: 10, lineWidth: 0.1, textColor: [31, 41, 55] },
          headStyles: { fillColor: [24, 88, 155], textColor: 255 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 170, fontStyle: 'bold' },
            1: { cellWidth: 'auto' },
          },
          didDrawPage: () => {
            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            doc.setFontSize(9)
            doc.setTextColor(120)
            doc.text(
              `Page ${doc.internal.getNumberOfPages()}`,
              pageWidth - 80,
              pageHeight - 20
            )
          },
      })
      }
      
      doc.save(`${form.title}_submissions.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  if (loading) {
    return <div className="loading">Loading submissions...</div>
  }

  if (!form) {
    return (
      <div className="submissions-page">
        <div className="container">
          <div className="empty-state">
            <p>Form not found</p>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="submissions-page">
      <header className="submissions-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={18} />
              Back
            </button>
            <h1>{form?.title || 'Form'} - Submissions</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/form/${id}/entry`)} disabled={!form}>
                <ClipboardList size={18} />
                Log Entry
              </button>
              <button className="btn btn-secondary" onClick={exportCSV} disabled={submissions.length === 0}>
                <Download size={18} />
                Export CSV
              </button>
              <button className="btn btn-primary" onClick={exportPDF} disabled={submissions.length === 0}>
                <FileText size={18} />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        {!form ? (
          <div className="empty-state">
            <p>Form not found</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="empty-state">
            <p>No submissions yet</p>
            <p className="hint">Share your form to start collecting responses</p>
            {form.shareKey && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowSendEmailModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={14} />
                    Send Form for Entries
                  </button>
                </div>
                <p style={{ marginBottom: '10px', fontWeight: 600 }}>Share Link:</p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/share/${form.shareKey}`}
                    style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/share/${form.shareKey}`)
                      alert('Share link copied!')
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.map((submission, idx) => (
              <div key={submission.id} className="submission-card">
                <div className="submission-header">
                  <h3>Submission #{submissions.length - idx}</h3>
                  <div className="submission-meta">
                    <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteSubmission(submission.id)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
                <div className="submission-data">
                  {form.fields && form.fields.length > 0 ? (
                    form.fields.map(field => {
                      const value = submission.data?.[field.id]
                      return (
                        <div key={field.id} className="submission-field">
                          <label>{field.label}</label>
                          <div className="field-value">
                            {value === undefined || value === null || value === '' 
                              ? '—'
                              : Array.isArray(value)
                              ? value.join(', ')
                              : typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="submission-field">
                      <p>No fields in form</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Form Email Modal */}
      {showSendEmailModal && form && (
        <SendFormEmail
          form={form}
          onClose={() => setShowSendEmailModal(false)}
          onSuccess={() => {
            // Optionally show success message
          }}
        />
      )}
    </div>
  )
}
