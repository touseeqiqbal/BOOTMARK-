import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import FieldPalette from '../components/FieldPalette'
import FormCanvas from '../components/FormCanvas'
import FormPreview from '../components/FormPreview'
import FormSettings from '../components/FormSettings'
import ConditionalLogic from '../components/ConditionalLogic'
import FieldEditor from '../components/FieldEditor'
import PageManager from '../components/PageManager'
import { Save, Eye, ArrowLeft, Share2, Copy, Check, GitBranch, FileText, Download, Upload, Cloud } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/FormBuilder.css'

export default function FormBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [selectedField, setSelectedField] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showConditionalLogic, setShowConditionalLogic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [pages, setPages] = useState([{ id: '1', name: 'Page 1', order: 0 }])
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    fetchForm()
  }, [id])

  const fetchForm = async () => {
    try {
      const response = await api.get(`/forms/${id}`)
      setForm(response.data)
      setFields(response.data.fields || [])
      // Initialize pages if not exists
      if (response.data.pages && response.data.pages.length > 0) {
        setPages(response.data.pages)
      } else {
        setPages([{ id: '1', name: 'Page 1', order: 0 }])
      }
    } catch (error) {
      console.error('Failed to fetch form:', error)
      alert('Failed to load form')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const saveForm = async () => {
    setSaving(true)
    try {
      // Ensure settings object exists and is properly structured
      const formToSave = {
        ...form,
        fields,
        pages,
        title: form.title,
        settings: form.settings || {}
      }
      
      // Log settings to debug - especially private link settings
      console.log('[FormBuilder] Saving form with settings:', {
        hasSettings: !!formToSave.settings,
        isPrivateLink: formToSave.settings.isPrivateLink,
        allowedEmails: formToSave.settings.allowedEmails,
        allSettingsKeys: Object.keys(formToSave.settings || {})
      })
      console.log('[FormBuilder] Full settings object:', JSON.stringify(formToSave.settings, null, 2))
      
      const response = await api.put(`/forms/${id}`, formToSave)
      
      // Verify settings were saved correctly
      console.log('[FormBuilder] Form saved. Response settings:', {
        isPrivateLink: response.data.settings?.isPrivateLink,
        allowedEmails: response.data.settings?.allowedEmails
      })
      
      setForm(response.data)
      alert('Form saved successfully!')
      
      // If private link is enabled, remind user
      if (response.data.settings?.isPrivateLink) {
        console.log('[FormBuilder] Private link enabled - form will require authentication')
      }
    } catch (error) {
      console.error('[FormBuilder] Failed to save form:', error)
      console.error('[FormBuilder] Error response:', error.response?.data)
      alert('Failed to save form: ' + (error.response?.data?.error || error.message))
    } finally {
      setSaving(false)
    }
  }

  const handlePageBreak = (fieldId) => {
    // When page-break is added, create a new page
    const fieldIndex = fields.findIndex(f => f.id === fieldId)
    if (fieldIndex !== -1 && fields[fieldIndex].type === 'page-break') {
      const newPage = {
        id: Date.now().toString(),
        name: `Page ${pages.length + 1}`,
        order: pages.length
      }
      setPages([...pages, newPage])
    }
  }

  const handleAddPage = () => {
    // When adding a page, insert a page-break field at the end
    const newPage = {
      id: Date.now().toString(),
      name: `Page ${pages.length + 1}`,
      order: pages.length
    }
    setPages([...pages, newPage])
    
    // Add a page-break field at the end of fields
    const pageBreakField = {
      id: Date.now().toString() + '-break',
      type: 'page-break',
      label: 'Page Break',
      required: false,
      placeholder: '',
    }
    setFields([...fields, pageBreakField])
  }

  const handleDeletePage = (pageId) => {
    if (pages.length <= 1) {
      alert('Cannot delete the last page')
      return
    }
    
    if (!confirm('Are you sure you want to delete this page? All fields on this page will be moved to the previous page.')) {
      return
    }
    
    const pageIndex = pages.findIndex(p => p.id === pageId)
    if (pageIndex === -1) return
    
    // Find and remove the corresponding page-break field
    // Page N (0-indexed) corresponds to the (N-1)th page-break (0-indexed)
    let pageBreakCount = 0
    const pageBreakToRemoveIndex = fields.findIndex(field => {
      if (field.type === 'page-break') {
        if (pageBreakCount === pageIndex - 1) {
          return true
        }
        pageBreakCount++
      }
      return false
    })
    
    // Remove the page-break field if found
    const newFields = pageBreakToRemoveIndex !== -1
      ? fields.filter((_, idx) => idx !== pageBreakToRemoveIndex)
      : fields
    
    setFields(newFields)
    
    // Remove the page
    const newPages = pages.filter(p => p.id !== pageId)
    // Reorder remaining pages
    const reorderedPages = newPages.map((p, idx) => ({ ...p, order: idx }))
    setPages(reorderedPages)
  }

  const updateFormTitle = (title) => {
    setForm({ ...form, title })
  }

  const addField = (fieldType) => {
    const defaultProps = getDefaultProps(fieldType)
    const newField = {
      id: Date.now().toString(),
      type: fieldType,
      label: getDefaultLabel(fieldType),
      required: false,
      placeholder: '',
      ...defaultProps,
      // Ensure options are set for choice fields
      options: ['dropdown', 'radio', 'checkbox', 'single-choice', 'multiple-choice'].includes(fieldType)
        ? (defaultProps.options || ['Option 1', 'Option 2'])
        : (defaultProps.options || [])
    }
    setFields([...fields, newField])
    setSelectedField(newField)
    
    // If page-break is added, create new page
    if (fieldType === 'page-break') {
      const newPage = {
        id: Date.now().toString(),
        name: `Page ${pages.length + 1}`,
        order: pages.length
      }
      setPages([...pages, newPage])
    }
  }

  const updateField = (fieldId, updates) => {
    setFields(fields.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    ))
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates })
    }
  }

  const deleteField = (fieldId) => {
    if (!fieldId) return
    
    const fieldToDelete = fields.find(f => f.id === fieldId)
    if (!fieldToDelete) return
    
    const isPageBreak = fieldToDelete.type === 'page-break'
    
    // If deleting a page-break, remove the corresponding page
    if (isPageBreak && pages.length > 1) {
      // Find which page this break corresponds to
      let pageBreakCount = 0
      let pageIndexToRemove = -1
      
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].id === fieldId) {
          // Found the page-break to delete
          // It corresponds to page (pageBreakCount + 1)
          pageIndexToRemove = pageBreakCount + 1
          break
        }
        if (fields[i].type === 'page-break') {
          pageBreakCount++
        }
      }
      
      // Remove the corresponding page if found
      if (pageIndexToRemove > 0 && pageIndexToRemove < pages.length) {
        const pageToRemove = pages[pageIndexToRemove]
        const newPages = pages.filter(p => p.id !== pageToRemove.id)
        const reorderedPages = newPages.map((p, idx) => ({ ...p, order: idx }))
        setPages(reorderedPages)
      }
    }
    
    // Remove the field
    const updatedFields = fields.filter(f => f.id !== fieldId)
    setFields(updatedFields)
    
    // Clear selection if deleted field was selected
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
    }
  }

  const moveField = (dragIndex, hoverIndex) => {
    if (dragIndex === hoverIndex) return
    
    const draggedField = fields[dragIndex]
    if (!draggedField) return
    
    const newFields = [...fields]
    newFields.splice(dragIndex, 1)
    newFields.splice(hoverIndex, 0, draggedField)
    setFields(newFields)
    
    // Update selected field if it was moved
    if (selectedField?.id === draggedField.id) {
      setSelectedField(draggedField)
    }
  }

  const copyShareLink = () => {
    if (form?.shareKey) {
      const link = `${window.location.origin}/share/${form.shareKey}`
      navigator.clipboard.writeText(link)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    }
  }

  // Export form as JSON
  const exportForm = async () => {
    try {
      // Try API endpoint first (more reliable, includes all server data)
      try {
        const response = await api.get(`/forms/${id}/export`)
        const dataStr = JSON.stringify(response.data, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = window.URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${form.title || 'form'}_${Date.now()}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        alert('Form exported successfully!')
        return
      } catch (apiError) {
        console.warn('API export failed, using client-side export:', apiError)
      }
      
      // Fallback to client-side export
      const formData = {
        ...form,
        fields,
        pages,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
      const dataStr = JSON.stringify(formData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${form.title || 'form'}_${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      alert('Form exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export form')
    }
  }

  // Import form from JSON
  const importForm = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const importedData = JSON.parse(text)
        
        // Validate imported data
        if (!importedData.fields || !Array.isArray(importedData.fields)) {
          alert('Invalid form file. Missing fields array.')
          return
        }

        // Confirm import
        if (!confirm('This will replace your current form. Continue?')) {
          return
        }

        // Use API endpoint for import (more reliable)
        try {
          await api.post(`/forms/${id}/import`, { formData: importedData })
          // Refresh form data
          await fetchForm()
          alert('Form imported successfully!')
        } catch (apiError) {
          // Fallback to client-side import if API fails
          console.warn('API import failed, using client-side import:', apiError)
          setFields(importedData.fields || [])
          if (importedData.pages && Array.isArray(importedData.pages)) {
            setPages(importedData.pages)
          }
          if (importedData.settings) {
            setForm(prev => ({ ...prev, settings: importedData.settings }))
          }
          if (importedData.title) {
            setForm(prev => ({ ...prev, title: importedData.title }))
          }
          await saveForm()
          alert('Form imported successfully!')
        }
      } catch (error) {
        console.error('Import error:', error)
        alert('Failed to import form. Invalid file format.')
      }
    }
    input.click()
  }

  // Backup form to Google Drive
  const backupToDrive = async () => {
    try {
      // Check if Google Drive API is available
      if (typeof gapi === 'undefined' || !gapi.auth2) {
        alert('Google Drive API not loaded. Please ensure Google Drive integration is configured.')
        return
      }

      const formData = {
        ...form,
        fields,
        pages,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        backupType: 'google_drive'
      }
      const dataStr = JSON.stringify(formData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      // Get access token
      const authInstance = gapi.auth2.getAuthInstance()
      const user = authInstance.currentUser.get()
      const authResponse = user.getAuthResponse()
      
      if (!authResponse.access_token) {
        // Request authorization
        await authInstance.signIn({ scope: 'https://www.googleapis.com/auth/drive.file' })
        const newAuthResponse = authInstance.currentUser.get().getAuthResponse()
        if (!newAuthResponse.access_token) {
          alert('Failed to get Google Drive access. Please try again.')
          return
        }
      }

      // Upload to Google Drive
      const metadata = {
        name: `${form.title || 'form'}_backup_${Date.now()}.json`,
        mimeType: 'application/json',
        parents: [] // Root folder, or specify folder ID
      }

      const formDataUpload = new FormData()
      formDataUpload.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      formDataUpload.append('file', dataBlob)

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authInstance.currentUser.get().getAuthResponse().access_token}`
        },
        body: formDataUpload
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Form backed up to Google Drive successfully!\nFile ID: ${result.id}`)
      } else {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to upload to Google Drive')
      }
    } catch (error) {
      console.error('Google Drive backup error:', error)
      alert(`Failed to backup to Google Drive: ${error.message}\n\nNote: Google Drive integration requires additional setup. You can use Export instead.`)
    }
  }

  const getDefaultLabel = (type) => {
    const labels = {
      // Basic
      'short-text': 'Short Text',
      'long-text': 'Long Text',
      'paragraph': 'Paragraph',
      'dropdown': 'Dropdown',
      'single-choice': 'Single Choice',
      'multiple-choice': 'Multiple Choice',
      'number': 'Number',
      'image': 'Image',
      'file': 'File Upload',
      'time': 'Time',
      'captcha': 'Captcha',
      'spinner': 'Spinner',
      // Widgets
      'heading': 'Heading',
      'full-name': 'Full Name',
      'email': 'Email',
      'address': 'Address',
      'phone': 'Phone',
      'date-picker': 'Date Picker',
      'appointment': 'Appointment',
      'signature': 'Signature',
      'fill-blank': 'Fill in the Blank',
      // Services
      'service-category': 'Service Category',
      // Payments
      'product-list': 'Product List',
      // Survey
      'input-table': 'Input Table',
      'star-rating': 'Star Rating',
      'scale-rating': 'Scale Rating',
      // Page Elements
      'divider': 'Divider',
      'section-collapse': 'Section Collapse',
      'page-break': 'Page Break',
      // Legacy
      text: 'Short Text',
      textarea: 'Long Text',
      radio: 'Single Choice',
      checkbox: 'Multiple Choice',
      date: 'Date Picker',
      rating: 'Star Rating'
    }
    return labels[type] || 'Field'
  }

  const getDefaultProps = (type) => {
    const props = {}
    
    // Number fields
    if (type === 'number') {
      props.min = 0
      props.max = 100
      props.step = 1
    }
    
    // Rating fields
    if (type === 'rating' || type === 'star-rating') {
      props.max = 5
    }
    
    // Scale rating
    if (type === 'scale-rating') {
      props.min = 1
      props.max = 10
      props.minLabel = 'Poor'
      props.maxLabel = 'Excellent'
    }
    
    // File upload
    if (type === 'file') {
      props.accept = '*'
      props.multiple = false
    }
    
    // Textarea/Long text
    if (type === 'long-text' || type === 'textarea') {
      props.rows = 4
    }
    
    // Short text
    if (type === 'short-text' || type === 'text') {
      props.maxLength = 255
    }
    
    // Heading
    if (type === 'heading') {
      props.size = '24px'
      props.color = '#1f2937'
      props.align = 'left'
    }
    
    // Product list
    if (type === 'product-list') {
      props.products = [
        { id: '1', name: 'Product 1', price: 10.00 },
        { id: '2', name: 'Product 2', price: 20.00 }
      ]
    }
    
    // Input table
    if (type === 'input-table') {
      props.rows = 3
      props.columns = 3
      props.rowHeaders = []
      props.columnHeaders = []
    }
    
    // Fill in the blank
    if (type === 'fill-blank') {
      props.blanks = [
        { before: 'The capital of France is ', correctAnswer: 'Paris', after: '' }
      ]
      props.showCorrectAnswer = false
    }
    
    // Section collapse
    if (type === 'section-collapse') {
      props.defaultExpanded = false
    }
    
    // Logo
    if (type === 'logo') {
      props.imageUrl = ''
      props.width = 200
      props.height = 100
    }

    if (type === 'service-category') {
      props.allowMultipleCategories = true
      props.enablePriceInput = false
    }
    
    // Options for choice fields
    if (['dropdown', 'single-choice', 'multiple-choice', 'radio', 'checkbox'].includes(type)) {
      props.options = ['Option 1', 'Option 2']
    }
    
    return props
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!form) {
    return null
  }

  return (
    <div className="form-builder">
      <header className="builder-header">
        <div className="builder-header-top">
          <div className="builder-header-top-left">
            <button className="btn btn-secondary btn-back" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={18} />
              Back
            </button>
            <div className="builder-brand">
              <img src={logo} alt="BootMark Logo" className="brand-logo" />
              <h1 className="brand-title">BootMark Landscaping Management</h1>
            </div>
          </div>
          <div className="builder-actions">
            {form?.shareKey && (
              <button 
                className={`btn ${shareLinkCopied ? 'btn-success' : 'btn-secondary'}`}
                onClick={copyShareLink}
                title="Copy share link"
              >
                {shareLinkCopied ? <Check size={18} /> : <Share2 size={18} />}
                {shareLinkCopied ? 'Copied!' : 'Share'}
              </button>
            )}
            <button 
              className="btn btn-secondary" 
              onClick={exportForm}
              title="Export form as JSON"
            >
              <Download size={18} />
              Export
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={importForm}
              title="Import form from JSON"
            >
              <Upload size={18} />
              Import
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={backupToDrive}
              title="Backup form to Google Drive"
            >
              <Cloud size={18} />
              Backup
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye size={18} />
              Preview
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowConditionalLogic(!showConditionalLogic)}
            >
              <GitBranch size={18} />
              Logic
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowSettings(!showSettings)}
            >
              Settings
            </button>
            <button 
              className="btn btn-primary" 
              onClick={saveForm}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="builder-header-title-section">
          <label className="form-title-label">Enter form title here</label>
          <input
            type="text"
            className="form-title-input"
            value={form.title}
            onChange={(e) => updateFormTitle(e.target.value)}
            placeholder="Enter form title here"
          />
        </div>
      </header>

      <div className="builder-content">
        <div className="builder-left-panel">
          <FieldPalette onAddField={addField} />
          <PageManager 
            pages={pages} 
            onUpdatePages={setPages}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            fields={fields}
          />
        </div>
        <FormCanvas
          fields={fields}
          selectedField={selectedField}
          onSelectField={setSelectedField}
          onUpdateField={updateField}
          onDeleteField={deleteField}
          onMoveField={moveField}
          currentPage={currentPage}
          pages={pages}
        />
        
        {selectedField && (
          <>
            <div 
              className="field-editor-backdrop" 
              onClick={() => setSelectedField(null)}
            />
            <div className="field-editor-sidebar open">
              <FieldEditor
                field={selectedField}
                onUpdate={(updates) => updateField(selectedField.id, updates)}
                onClose={() => setSelectedField(null)}
              />
            </div>
          </>
        )}
      </div>

      {showPreview && (
        <FormPreview
          form={form}
          fields={fields}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showConditionalLogic && (
        <ConditionalLogic
          fields={fields}
          form={form}
          onUpdate={(updates) => setForm({ ...form, ...updates })}
          onClose={() => setShowConditionalLogic(false)}
        />
      )}

      {showSettings && (
        <FormSettings
          form={{ ...form, fields }}
          onUpdate={(updates) => {
            console.log('[FormBuilder] Settings update received:', {
              hasSettings: !!updates.settings,
              isPrivateLink: updates.settings?.isPrivateLink,
              allowedEmails: updates.settings?.allowedEmails,
              allKeys: updates.settings ? Object.keys(updates.settings) : []
            });
            // Ensure settings are properly merged
            if (updates.settings) {
              const mergedSettings = {
                ...(form.settings || {}),
                ...updates.settings
              };
              console.log('[FormBuilder] Merged settings:', {
                isPrivateLink: mergedSettings.isPrivateLink,
                allowedEmails: mergedSettings.allowedEmails
              });
              setForm(prevForm => ({
                ...prevForm,
                settings: mergedSettings
              }));
            } else {
              setForm({ ...form, ...updates });
            }
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
