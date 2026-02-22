import { useState } from 'react'
import { X } from 'lucide-react'
import FieldRenderer from './FieldRenderer'
import '../styles/FormPreview.css'

export default function FormPreview({ form, fields, onClose }) {
  const [formData, setFormData] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({})
    }, 3000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Form Preview</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="preview-content">
          <h3 className="preview-title">{form.title}</h3>
          
          {submitted ? (
            <div className="submission-success">
              <p>{form.settings?.confirmationMessage || 'Thank you for your submission!'}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="preview-form">
              {fields.map(field => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              ))}
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Submit
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setFormData({})}>
                  Reset
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
