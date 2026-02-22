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
    <div className="submissions-page animate-fadeIn">
      <header className="submissions-header" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', padding: '24px 0', marginBottom: '32px' }}>
        <div className="container">
          <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn-modern btn-modern-secondary" onClick={handleBack} style={{ padding: '8px 12px' }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{form?.title || 'Form'}</h1>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DATA SUBMISSION ORCHESTRATION</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-modern btn-modern-primary" onClick={() => navigate(`/form/${id}/entry`)} disabled={!form}>
                <ClipboardList size={18} /> LOG ENTRY
              </button>
              <button className="btn-modern btn-modern-secondary" onClick={exportCSV} disabled={submissions.length === 0}>
                <Download size={18} /> CSV
              </button>
              <button className="btn-modern btn-modern-secondary" onClick={exportPDF} disabled={submissions.length === 0}>
                <FileText size={18} /> PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        {!form ? (
          <div className="modern-card" style={{ textAlign: 'center', padding: '60px' }}>
            <p style={{ fontWeight: '900', fontSize: '18px', color: 'var(--error-600)' }}>FORM SCHEMATIC NOT FOUND</p>
            <button className="btn-modern btn-modern-secondary" onClick={() => navigate('/dashboard')} style={{ marginTop: '16px' }}>
              Return to Dashboard
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="modern-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '50%', display: 'inline-flex', marginBottom: '24px' }}>
              <Send size={48} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>Waiting for incoming data...</h3>
            <p style={{ color: 'var(--text-tertiary)', maxWidth: '400px', margin: '0 auto 24px auto', fontWeight: '600' }}>Your form is ready for synchronization. Share the link below to begin collecting high-fidelity submissions.</p>

            {form.shareKey && (
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
                  <button
                    className="btn-modern btn-modern-primary"
                    onClick={() => setShowSendEmailModal(true)}
                  >
                    <Send size={16} /> SEND INVITATION
                  </button>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                  <p style={{ margin: '0 0 12px 0', fontWeight: '900', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', textAlign: 'left', letterSpacing: '0.05em' }}>PUBLIC SHARE IDENTIFIER</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/share/${form.shareKey}`}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)'
                      }}
                    />
                    <button
                      className="btn-modern btn-modern-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/share/${form.shareKey}`)
                        alert('Share link copied!')
                      }}
                    >
                      COPY LINK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="submissions-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {submissions.map((submission, idx) => (
              <div key={submission.id} className="modern-card animate-fadeIn" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="submission-header" style={{
                  background: 'var(--bg-secondary)',
                  padding: '20px 32px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)' }}>SUBMISSION #{submissions.length - idx}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '700' }}>
                        {new Date(submission.submittedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-modern btn-modern-danger"
                    onClick={() => deleteSubmission(submission.id)}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    <Trash2 size={14} /> PURGE
                  </button>
                </div>
                <div className="submission-data" style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' }}>
                  {form.fields && form.fields.length > 0 ? (
                    form.fields.map(field => {
                      const value = submission.data?.[field.id]
                      return (
                        <div key={field.id} className="submission-field">
                          <label style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: '900',
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '8px'
                          }}>
                            {field.label}
                          </label>
                          <div className="field-value" style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            background: 'var(--bg-secondary)',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            minHeight: '44px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {value === undefined || value === null || value === ''
                              ? <span style={{ color: 'var(--text-tertiary)', fontWeight: '500', fontStyle: 'italic' }}>No record</span>
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
                    <div className="submission-field" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                      <p style={{ fontWeight: '600', margin: 0 }}>No dynamic fields configured for this orchestration.</p>
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
  );
}
