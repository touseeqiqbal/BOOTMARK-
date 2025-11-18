import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, Download, Filter, Search, FileText } from 'lucide-react'
import '../styles/TableView.css'

export default function TableView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [filteredSubmissions, setFilteredSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  useEffect(() => {
    if (searchTerm) {
      const filtered = submissions.filter(sub => {
        return Object.values(sub.data).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
      setFilteredSubmissions(filtered)
    } else {
      setFilteredSubmissions(submissions)
    }
  }, [searchTerm, submissions])

  const fetchData = async () => {
    try {
      const [formRes, submissionsRes] = await Promise.all([
        api.get(`/forms/${id}`),
        api.get(`/submissions/form/${id}`)
      ])
      setForm(formRes.data)
      setSubmissions(submissionsRes.data)
      setFilteredSubmissions(submissionsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      alert('Failed to load data')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (filteredSubmissions.length === 0) return

    const headers = ['Submission ID', 'Submitted At', ...form.fields.map(f => f.label)].join(',')
    const rows = filteredSubmissions.map(sub => {
      const rowData = [
        sub.id,
        new Date(sub.submittedAt).toLocaleString(),
        ...form.fields.map(field => {
          const value = sub.data[field.id]
          if (Array.isArray(value)) {
            return `"${value.join('; ')}"`
          }
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value)}"`
          }
          return `"${value || ''}"`
        })
      ]
      return rowData.join(',')
    })

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.title}_table.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    if (filteredSubmissions.length === 0) return

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(18)
      doc.text(form.title || 'Form Data Table', 14, 20)
      doc.setFontSize(12)
      doc.text(`Total Submissions: ${filteredSubmissions.length}`, 14, 30)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36)
      
      // Table setup
      const startY = 50
      const colWidths = [30, 40, ...form.fields.map(() => 20)]
      const headers = ['ID', 'Date', ...form.fields.map(f => f.label)]
      
      let yPosition = startY
      const pageHeight = doc.internal.pageSize.height
      const rowHeight = 8
      const margin = 14
      
      // Draw table headers
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      let xPosition = margin
      headers.forEach((header, idx) => {
        const text = doc.splitTextToSize(header, colWidths[idx] - 2)
        doc.text(text, xPosition, yPosition)
        xPosition += colWidths[idx]
      })
      
      yPosition += rowHeight
      doc.setLineWidth(0.5)
      doc.line(margin, yPosition - 2, margin + colWidths.reduce((a, b) => a + b, 0), yPosition - 2)
      
      // Draw table rows
      doc.setFont(undefined, 'normal')
      doc.setFontSize(8)
      
      filteredSubmissions.forEach((submission) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage()
          yPosition = 20
          // Redraw headers on new page
          doc.setFont(undefined, 'bold')
          doc.setFontSize(10)
          xPosition = margin
          headers.forEach((header, idx) => {
            const text = doc.splitTextToSize(header, colWidths[idx] - 2)
            doc.text(text, xPosition, yPosition)
            xPosition += colWidths[idx]
          })
          yPosition += rowHeight
          doc.line(margin, yPosition - 2, margin + colWidths.reduce((a, b) => a + b, 0), yPosition - 2)
          doc.setFont(undefined, 'normal')
          doc.setFontSize(8)
        }
        
        xPosition = margin
        const rowData = [
          submission.id.substring(0, 8),
          new Date(submission.submittedAt).toLocaleDateString(),
          ...form.fields.map(field => {
            const value = submission.data[field.id]
            if (Array.isArray(value)) {
              return value.join(', ')
            }
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value).substring(0, 15) + '...'
            }
            return String(value || '').substring(0, 15)
          })
        ]
        
        rowData.forEach((cell, idx) => {
          const text = doc.splitTextToSize(String(cell), colWidths[idx] - 2)
          doc.text(text, xPosition, yPosition)
          xPosition += colWidths[idx]
        })
        
        yPosition += rowHeight
      })
      
      doc.save(`${form.title}_table.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="table-view-page">
      <header className="table-view-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-secondary" onClick={() => navigate(`/form/${id}`)}>
              <ArrowLeft size={18} />
              Back to Form
            </button>
            <h1>{form?.title} - Data Table</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={exportCSV} disabled={filteredSubmissions.length === 0}>
                <Download size={18} />
                Export CSV
              </button>
              <button className="btn btn-primary" onClick={exportPDF} disabled={filteredSubmissions.length === 0}>
                <FileText size={18} />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="table-stats">
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <p>No submissions found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Submitted</th>
                  {form.fields.map(field => (
                    <th key={field.id}>{field.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((submission, idx) => (
                  <tr key={submission.id}>
                    <td>{idx + 1}</td>
                    <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                    {form.fields.map(field => (
                      <td key={field.id}>
                        {Array.isArray(submission.data[field.id])
                          ? submission.data[field.id].join(', ')
                          : typeof submission.data[field.id] === 'object' && submission.data[field.id] !== null
                          ? JSON.stringify(submission.data[field.id])
                          : submission.data[field.id] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
