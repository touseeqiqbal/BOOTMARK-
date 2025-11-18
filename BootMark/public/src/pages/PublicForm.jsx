import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../utils/api'
import FieldRenderer from '../components/FieldRenderer'
import { Eye, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'
import '../styles/PublicForm.css'

export default function PublicForm() {
  const { shareKey } = useParams()
  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [formData, setFormData] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(-1) // -1 means start page, 0+ means form pages
  const [pages, setPages] = useState([{ id: '1', name: 'Page 1', order: 0 }])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchForm()
  }, [shareKey])

  const fetchForm = async () => {
    try {
      const response = await api.get(`/public/form/${shareKey}`)
      setForm(response.data)
      setFields(response.data.fields || [])
      if (response.data.pages && response.data.pages.length > 0) {
        setPages(response.data.pages)
      } else {
        setPages([{ id: '1', name: 'Page 1', order: 0 }])
      }
      // Initialize current page based on start page setting
      if (response.data.settings?.showStartPage) {
        setCurrentPage(-1) // Start with start page
      } else {
        setCurrentPage(0) // Start with first form page
      }
    } catch (error) {
      console.error('Failed to fetch form:', error)
      alert('Form not found')
    } finally {
      setLoading(false)
    }
  }

  const getFieldsForPage = (pageIndex) => {
    if (pages.length === 1) return fields
    
    let pageBreakCount = 0
    const pageFields = []
    
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].type === 'page-break') {
        pageBreakCount++
        if (pageBreakCount > pageIndex) break
        continue
      }
      if (pageBreakCount === pageIndex) {
        pageFields.push(fields[i])
      } else if (pageIndex === 0 && pageBreakCount === 0) {
        pageFields.push(fields[i])
      }
    }
    
    return pageFields
  }

  const getProgress = () => {
    if (currentPage === -1) return 0 // Start page shows 0% progress
    const totalPages = pages.length
    if (totalPages <= 1) return 100
    const formPageIndex = currentPage + 1 // currentPage is 0-indexed for form pages
    return (formPageIndex / totalPages) * 100
  }

  const handleStartForm = () => {
    setCurrentPage(0) // Move to first form page
    window.scrollTo(0, 0)
  }

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
      window.scrollTo(0, 0)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    // Clear error for this field when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  // Validate required fields
  const validateForm = () => {
    const newErrors = {}
    const allFields = fields // Check all fields across all pages
    
    allFields.forEach(field => {
      // Skip validation for non-input fields
      if (['heading', 'divider', 'page-break', 'paragraph', 'logo', 'spinner'].includes(field.type)) {
        return
      }

      if (field.required) {
        const value = formData[field.id]
        let isEmpty = false

        // Check if field is empty based on type
        if (value === undefined || value === null || value === '') {
          isEmpty = true
        } else if (Array.isArray(value)) {
          // For checkbox/multiple choice, check if array is empty or only contains empty strings
          isEmpty = value.length === 0 || value.every(v => !v || v === '')
        } else if (typeof value === 'object') {
          // For complex fields like full-name, address, appointment
          if (field.type === 'full-name') {
            isEmpty = !value.firstName && !value.lastName
          } else if (field.type === 'address') {
            isEmpty = !value.street && !value.city && !value.state && !value.zip
          } else if (field.type === 'appointment') {
            isEmpty = !value.date || !value.time
          } else if (field.type === 'input-table') {
            // Check if table has any values
            isEmpty = Object.keys(value).length === 0 || Object.values(value).every(v => !v)
          } else {
            // Generic object check
            isEmpty = Object.keys(value).length === 0 || Object.values(value).every(v => !v || v === '')
          }
        } else if (field.type === 'file' || field.type === 'image') {
          // File inputs - check if files are selected
          isEmpty = !value || (value instanceof FileList && value.length === 0)
        } else if (field.type === 'signature') {
          isEmpty = !value || value === ''
        } else if (field.type === 'captcha') {
          isEmpty = value !== true // Captcha returns boolean
        }

        if (isEmpty) {
          newErrors[field.id] = `${field.label || 'This field'} is required`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields first
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      if (firstErrorField) {
        const errorElement = document.querySelector(`[data-field-id="${firstErrorField}"]`)
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
      return
    }
    
    // Show preview if enabled
    if (form.settings?.showPreviewBeforeSubmit && !showPreview) {
      setShowPreview(true)
      return
    }
    
    setSubmitting(true)

    try {
      await api.post(`/public/form/${shareKey}/submit`, {
        data: formData
      })
      setSubmitted(true)
      setFormData({})
      setShowPreview(false)
      setErrors({})
    } catch (error) {
      console.error('Failed to submit form:', error)
      alert(error.response?.data?.error || 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPDF = () => {
    import('jspdf').then((jsPDF) => {
      const { jsPDF: JSPDF } = jsPDF
      const doc = new JSPDF()
      
      // Add logo if available
      if (form.settings?.logo) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          doc.addImage(img, 'PNG', 10, 10, 50, 20)
          doc.text(form.title, 10, 40)
          let yPos = 50
          
          fields.forEach((field, idx) => {
            if (yPos > 280) {
              doc.addPage()
              yPos = 20
            }
            const value = formData[field.id]
            if (value !== undefined && value !== null && value !== '') {
              doc.setFontSize(10)
              doc.text(`${field.label}:`, 10, yPos)
              doc.setFontSize(9)
              const valueStr = Array.isArray(value) ? value.join(', ') : String(value)
              const lines = doc.splitTextToSize(valueStr, 180)
              doc.text(lines, 10, yPos + 5)
              yPos += lines.length * 5 + 10
            }
          })
          
          doc.save(`${form.title}_submission.pdf`)
        }
        img.src = form.settings.logo
      } else {
        doc.text(form.title, 10, 20)
        let yPos = 30
        
        fields.forEach((field) => {
          if (yPos > 280) {
            doc.addPage()
            yPos = 20
          }
          const value = formData[field.id]
          if (value !== undefined && value !== null && value !== '') {
            doc.setFontSize(10)
            doc.text(`${field.label}:`, 10, yPos)
            doc.setFontSize(9)
            const valueStr = Array.isArray(value) ? value.join(', ') : String(value)
            const lines = doc.splitTextToSize(valueStr, 180)
            doc.text(lines, 10, yPos + 5)
            yPos += lines.length * 5 + 10
          }
        })
        
        doc.save(`${form.title}_submission.pdf`)
      }
    }).catch(() => {
      alert('PDF library not loaded. Please install jspdf package.')
    })
  }

  if (loading) {
    return <div className="loading">Loading form...</div>
  }

  if (!form) {
    return <div className="error-message">Form not found</div>
  }

  // Apply styles to page container
  const pageStyle = {
    backgroundImage: form.settings?.backgroundImage ? `url(${form.settings.backgroundImage})` : 'none',
    backgroundColor: form.settings?.pageBackgroundColor || form.settings?.backgroundColor || '#f5f5f5',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: form.settings?.fontFamily || 'Inter, sans-serif',
    fontSize: form.settings?.fontSize || '16px',
    color: form.settings?.textColor || '#1f2937',
    '--primary-color': form.settings?.primaryColor || '#4f46e5',
    '--secondary-color': form.settings?.secondaryColor || '#6366f1',
    '--border-radius': form.settings?.borderRadius || '8px',
    '--field-spacing': form.settings?.fieldSpacing || '16px',
  }

  // Apply styles to form container
  const alignment = form.settings?.formAlignment || 'center'
  const containerStyle = {
    maxWidth: form.settings?.formWidth === '100%'
      ? (form.settings?.maxWidth || '800px')
      : (form.settings?.formWidth || '800px'),
    width: form.settings?.formWidth === '100%' ? '100%' : 'auto',
    // Default to centered alignment when not specified
    margin: alignment === 'center' ? '0 auto'
      : alignment === 'left' ? '0 auto 0 0'
      : '0 0 0 auto'
  }

  // Apply styles to form card
  const cardStyle = {
    backgroundColor: form.settings?.formCardBackgroundColor || form.settings?.backgroundColor || '#ffffff',
    borderRadius: form.settings?.borderRadius || '12px',
  }

  // Button style classes
  const getButtonClass = (type = 'primary') => {
    const baseClass = `btn btn-${type}`
    const style = form.settings?.buttonStyle || 'rounded'
    if (style === 'pill') return `${baseClass} btn-pill`
    if (style === 'square') return `${baseClass} btn-square`
    return baseClass
  }

  const isOnStartPage = currentPage === -1 && form?.settings?.showStartPage
  const pageFields = isOnStartPage ? [] : getFieldsForPage(currentPage)
  const isLastPage = !isOnStartPage && currentPage === pages.length - 1
  const isFirstPage = !isOnStartPage && currentPage === 0

  return (
    <>
      {/* Inject custom CSS */}
      {form.settings?.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: form.settings.customCSS }} />
      )}
      <div className="public-form-page" style={pageStyle}>
        <div className="public-form-container" style={containerStyle}>
          <div className="public-form-card" style={cardStyle}>
          {form.settings?.logo && (
            <div className="form-logo-header">
              <img src={form.settings.logo} alt="Logo" className="form-header-logo" />
            </div>
          )}
          <h1 className="form-title">{form.title}</h1>
          
          {/* Progress Bar */}
          {form.settings?.showProgressBar && pages.length > 1 && !isOnStartPage && (
            <div className="form-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${getProgress()}%`,
                    backgroundColor: form.settings?.primaryColor || '#4f46e5'
                  }}
                />
              </div>
              <div className="progress-text">
                Page {currentPage + 1} of {pages.length}
              </div>
            </div>
          )}
          
          {submitted ? (
            <div className="submission-success">
              <div className="success-icon">✓</div>
              <h2>Thank you!</h2>
              <p>{form.settings?.confirmationMessage || 'Your submission has been received.'}</p>
            </div>
          ) : isOnStartPage ? (
            <div className="start-page">
              <div className="start-page-content">
                <h2 className="start-page-title">
                  {form.settings?.startPageTitle || 'Welcome'}
                </h2>
                {form.settings?.startPageDescription && (
                  <div className="start-page-description">
                    {form.settings.startPageDescription.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="start-page-actions">
                <button 
                  type="button"
                  className={`${getButtonClass('primary')} btn-large`}
                  onClick={handleStartForm}
                  style={{ 
                    backgroundColor: form.settings?.primaryColor || '#4f46e5',
                    borderRadius: form.settings?.borderRadius || '8px'
                  }}
                >
                  {form.settings?.startButtonText || 'Start'}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="public-form">
              {pageFields.map(field => (
                <div key={field.id} data-field-id={field.id}>
                  <FieldRenderer
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                  />
                  {errors[field.id] && (
                    <div className="field-error" style={{ 
                      color: '#ef4444', 
                      fontSize: '14px', 
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>⚠</span>
                      <span>{errors[field.id]}</span>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="form-actions">
                {!isFirstPage && (
                  <button 
                    type="button"
                    className={getButtonClass('secondary')}
                    onClick={prevPage}
                    style={{ 
                      backgroundColor: form.settings?.secondaryColor || '#6366f1',
                      borderRadius: form.settings?.borderRadius || '8px'
                    }}
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>
                )}
                {!isLastPage ? (
                  <button 
                    type="button"
                    className={getButtonClass('primary')}
                    onClick={() => {
                      // Validate current page before moving to next
                      const pageFields = getFieldsForPage(currentPage)
                      const pageErrors = {}
                      pageFields.forEach(field => {
                        if (field.required && !formData[field.id]) {
                          const value = formData[field.id]
                          let isEmpty = value === undefined || value === null || value === ''
                          if (Array.isArray(value)) {
                            isEmpty = value.length === 0 || value.every(v => !v || v === '')
                          } else if (typeof value === 'object' && value !== null) {
                            if (field.type === 'full-name') {
                              isEmpty = !value.firstName && !value.lastName
                            } else if (field.type === 'address') {
                              isEmpty = !value.street && !value.city && !value.state && !value.zip
                            } else if (field.type === 'appointment') {
                              isEmpty = !value.date || !value.time
                            } else {
                              isEmpty = Object.keys(value).length === 0
                            }
                          }
                          if (isEmpty) {
                            pageErrors[field.id] = `${field.label || 'This field'} is required`
                          }
                        }
                      })
                      if (Object.keys(pageErrors).length > 0) {
                        setErrors(prev => ({ ...prev, ...pageErrors }))
                        const firstError = Object.keys(pageErrors)[0]
                        const errorElement = document.querySelector(`[data-field-id="${firstError}"]`)
                        if (errorElement) {
                          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                        return
                      }
                      nextPage()
                    }}
                    style={{ 
                      backgroundColor: form.settings?.primaryColor || '#4f46e5',
                      borderRadius: form.settings?.borderRadius || '8px'
                    }}
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <>
                    {form.settings?.showPreviewBeforeSubmit && !showPreview && (
                      <button 
                        type="button"
                        className={getButtonClass('secondary')}
                        onClick={() => setShowPreview(true)}
                        style={{ 
                          backgroundColor: form.settings?.secondaryColor || '#6366f1',
                          borderRadius: form.settings?.borderRadius || '8px'
                        }}
                      >
                        <Eye size={18} />
                        Preview
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className={`${getButtonClass('primary')} btn-large`}
                      disabled={submitting}
                      style={{ 
                        backgroundColor: form.settings?.primaryColor || '#4f46e5',
                        borderRadius: form.settings?.borderRadius || '8px'
                      }}
                    >
                      {submitting ? 'Submitting...' : showPreview ? 'Confirm Submit' : 'Submit'}
                    </button>
                  </>
                )}
                {isLastPage && (
                  <>
                    <button 
                      type="button"
                      className={getButtonClass('secondary')}
                      onClick={downloadPDF}
                      style={{ 
                        backgroundColor: form.settings?.secondaryColor || '#6366f1',
                        borderRadius: form.settings?.borderRadius || '8px'
                      }}
                    >
                      <Download size={18} />
                      Download PDF
                    </button>
                    {showPreview && (
                      <button 
                        type="button"
                        className={getButtonClass('secondary')}
                        onClick={() => setShowPreview(false)}
                        style={{ 
                          backgroundColor: form.settings?.secondaryColor || '#6366f1',
                          borderRadius: form.settings?.borderRadius || '8px'
                        }}
                      >
                        <X size={18} />
                        Edit
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {showPreview && isLastPage && (
                <div className="form-preview-section">
                  <h3>Preview Your Submission</h3>
                  <div className="preview-content">
                    {fields.map(field => {
                      const value = formData[field.id]
                      if (value === undefined || value === null || value === '') return null
                      return (
                        <div key={field.id} className="preview-item">
                          <strong>{field.label}:</strong>
                          <span>
                            {Array.isArray(value) 
                              ? value.join(', ') 
                              : typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </form>
          )}
          </div>
        </div>
      </div>
    </>
  )
}
