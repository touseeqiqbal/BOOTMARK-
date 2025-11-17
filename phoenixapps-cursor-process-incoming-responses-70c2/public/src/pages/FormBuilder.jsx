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
import { Save, Eye, ArrowLeft, Share2, Copy, Check, GitBranch, FileText } from 'lucide-react'
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
      const response = await api.put(`/forms/${id}`, {
        ...form,
        fields,
        pages,
        title: form.title
      })
      setForm(response.data)
      alert('Form saved successfully!')
    } catch (error) {
      console.error('Failed to save form:', error)
      alert('Failed to save form')
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
    setFields(fields.filter(f => f.id !== fieldId))
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
    }
  }

  const moveField = (dragIndex, hoverIndex) => {
    const draggedField = fields[dragIndex]
    const newFields = [...fields]
    newFields.splice(dragIndex, 1)
    newFields.splice(hoverIndex, 0, draggedField)
    setFields(newFields)
  }

  const copyShareLink = () => {
    if (form?.shareKey) {
      const link = `${window.location.origin}/share/${form.shareKey}`
      navigator.clipboard.writeText(link)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
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
      props.content = 'Fill in the blank: The capital of France is ____'
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
        <div className="builder-header-content">
          <div className="builder-brand">
            <h1 className="brand-title">Phoenix Form Builder</h1>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
            Back
          </button>
          <input
            type="text"
            className="form-title-input"
            value={form.title}
            onChange={(e) => updateFormTitle(e.target.value)}
            placeholder="Form Title"
          />
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
      </header>

      <div className="builder-content">
        <div className="builder-left-panel">
          <FieldPalette onAddField={addField} />
          <PageManager 
            pages={pages} 
            onUpdatePages={setPages}
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
          <div className="field-editor-sidebar">
            <FieldEditor
              field={selectedField}
              onUpdate={(updates) => updateField(selectedField.id, updates)}
              onClose={() => setSelectedField(null)}
            />
          </div>
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
          onUpdate={(updates) => setForm({ ...form, ...updates })}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
