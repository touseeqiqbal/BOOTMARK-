import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import ImageUpload from './ImageUpload'
import '../styles/FieldEditor.css'

export default function FieldEditor({ field, onUpdate, onClose }) {
  if (!field) {
    return null
  }
  
  const initializeFormData = (fieldData) => {
    const needsOptions = ['dropdown', 'radio', 'checkbox', 'single-choice', 'multiple-choice'].includes(fieldData.type)
    
    return {
      label: fieldData.label || '',
      placeholder: fieldData.placeholder || '',
      required: fieldData.required || false,
      description: fieldData.description || '',
      options: needsOptions ? (fieldData.options && fieldData.options.length > 0 ? [...fieldData.options] : ['Option 1', 'Option 2']) : [],
      ...(needsOptions && {
        allowOther: fieldData.allowOther || false,
        otherLabel: fieldData.otherLabel || 'Other',
        otherPlaceholder: fieldData.otherPlaceholder || 'Please specify'
      }),
      ...(fieldData.type === 'number' && { min: fieldData.min, max: fieldData.max }),
      ...(fieldData.type === 'rating' && { max: fieldData.max || 5 }),
      ...(fieldData.type === 'star-rating' && { max: fieldData.max || 5 }),
      ...(fieldData.type === 'scale-rating' && { max: fieldData.max || 5 }),
      ...(fieldData.type === 'file' && { 
        accept: fieldData.accept || '*',
        multiple: fieldData.multiple || false 
      }),
      ...(fieldData.type === 'textarea' && { rows: fieldData.rows || 4 }),
      ...(fieldData.type === 'long-text' && { rows: fieldData.rows || 4 }),
      ...(fieldData.type === 'logo' && {
        imageUrl: fieldData.imageUrl || '',
        width: fieldData.width || 200,
        height: fieldData.height || 100
      }),
      ...(fieldData.type === 'input-table' && {
        rows: fieldData.rows || 3,
        columns: fieldData.columns || 3,
        rowHeaders: fieldData.rowHeaders || [],
        columnHeaders: fieldData.columnHeaders || []
      }),
      ...(fieldData.type === 'product-list' && {
        products: fieldData.products || [
          { id: '1', name: 'Product 1', price: 10.00 },
          { id: '2', name: 'Product 2', price: 20.00 }
        ]
      })
    }
  }

  const [formData, setFormData] = useState(() => initializeFormData(field))

  // Update formData when field changes (when a different field is selected)
  useEffect(() => {
    if (field) {
      setFormData(initializeFormData(field))
    }
  }, [field.id, field.type]) // Update when field ID or type changes

  // Call onUpdate when formData changes
  useEffect(() => {
    if (field && formData) {
      onUpdate(formData)
    }
  }, [formData, onUpdate, field])

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const addOption = () => {
    setFormData(prev => {
      const currentOptions = prev.options || []
      return {
        ...prev,
        options: [...currentOptions, `Option ${currentOptions.length + 1}`]
      }
    })
  }

  const updateOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, idx) => idx === index ? value : opt)
    }))
  }

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== index)
    }))
  }

  const needsOptions = ['dropdown', 'radio', 'checkbox', 'single-choice', 'multiple-choice'].includes(field.type)

  return (
    <div className="field-editor">
      <div className="field-editor-header">
        <h3>Field Properties</h3>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="field-editor-content">
        <div className="form-group">
          <label>Label</label>
          <input
            type="text"
            className="input"
            value={formData.label}
            onChange={(e) => updateField('label', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Placeholder</label>
          <input
            type="text"
            className="input"
            value={formData.placeholder}
            onChange={(e) => updateField('placeholder', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            className="input"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.required}
              onChange={(e) => updateField('required', e.target.checked)}
            />
            <span>Required field</span>
          </label>
        </div>

        {needsOptions && (
          <div className="form-group">
            <label>Options</label>
            <div className="options-list">
              {formData.options && formData.options.length > 0 ? (
                formData.options.map((option, idx) => (
                  <div key={idx} className="option-item">
                    <input
                      type="text"
                      className="input"
                      value={option}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                    />
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeOption(idx)}
                      title="Remove option"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <p className="no-options-text">No options yet. Click "Add Option" to add one.</p>
              )}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={addOption}>
              + Add Option
            </button>
            {formData.options && formData.options.length === 0 && (
              <small className="help-text">Add at least one option for users to choose from</small>
            )}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.allowOther || false}
                  onChange={(e) => updateField('allowOther', e.target.checked)}
                />
                <span>Allow "Other" option</span>
              </label>
            </div>
            {formData.allowOther && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>Other label</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.otherLabel || 'Other'}
                    onChange={(e) => updateField('otherLabel', e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Other placeholder</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.otherPlaceholder || 'Please specify'}
                    onChange={(e) => updateField('otherPlaceholder', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {field.type === 'number' && (
          <>
            <div className="form-group">
              <label>Min Value</label>
              <input
                type="number"
                className="input"
                value={formData.min || 0}
                onChange={(e) => updateField('min', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label>Max Value</label>
              <input
                type="number"
                className="input"
                value={formData.max || 100}
                onChange={(e) => updateField('max', parseInt(e.target.value) || 100)}
              />
            </div>
          </>
        )}

        {(field.type === 'rating' || field.type === 'star-rating' || field.type === 'scale-rating') && (
          <div className="form-group">
            <label>Max Rating</label>
            <input
              type="number"
              className="input"
              value={formData.max || 5}
              onChange={(e) => updateField('max', parseInt(e.target.value) || 5)}
              min={1}
              max={10}
            />
          </div>
        )}

        {(field.type === 'long-text' || field.type === 'textarea') && (
          <div className="form-group">
            <label>Rows</label>
            <input
              type="number"
              className="input"
              value={formData.rows || 4}
              onChange={(e) => updateField('rows', parseInt(e.target.value) || 4)}
              min={1}
              max={20}
            />
          </div>
        )}

        {field.type === 'file' && (
          <>
            <div className="form-group">
              <label>Accept File Types</label>
              <input
                type="text"
                className="input"
                value={formData.accept || '*'}
                onChange={(e) => updateField('accept', e.target.value)}
                placeholder="e.g., image/*, .pdf, .doc"
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.multiple || false}
                  onChange={(e) => updateField('multiple', e.target.checked)}
                />
                <span>Allow multiple files</span>
              </label>
            </div>
          </>
        )}


        {field.type === 'logo' && (
          <>
            <div className="form-group">
              <ImageUpload
                label="Logo Image"
                value={formData.imageUrl || ''}
                onChange={(value) => updateField('imageUrl', value)}
              />
            </div>
            <div className="form-group">
              <label>Width (px)</label>
              <input
                type="number"
                className="input"
                value={formData.width || 200}
                onChange={(e) => updateField('width', parseInt(e.target.value) || 200)}
                min={50}
                max={500}
              />
            </div>
            <div className="form-group">
              <label>Height (px)</label>
              <input
                type="number"
                className="input"
                value={formData.height || 100}
                onChange={(e) => updateField('height', parseInt(e.target.value) || 100)}
                min={50}
                max={300}
              />
            </div>
          </>
        )}

        {field.type === 'input-table' && (
          <>
            <div className="form-group">
              <label>Number of Rows</label>
              <input
                type="number"
                className="input"
                value={formData.rows || 3}
                onChange={(e) => {
                  const newRows = parseInt(e.target.value) || 1
                  const currentRowHeaders = formData.rowHeaders || []
                  const newRowHeaders = Array.from({ length: newRows }, (_, i) => 
                    currentRowHeaders[i] || `Row ${i + 1}`
                  )
                  updateField('rows', newRows)
                  updateField('rowHeaders', newRowHeaders)
                }}
                min={1}
                max={20}
              />
            </div>
            <div className="form-group">
              <label>Number of Columns</label>
              <input
                type="number"
                className="input"
                value={formData.columns || 3}
                onChange={(e) => {
                  const newCols = parseInt(e.target.value) || 1
                  const currentColHeaders = formData.columnHeaders || []
                  const newColHeaders = Array.from({ length: newCols }, (_, i) => 
                    currentColHeaders[i] || `Column ${i + 1}`
                  )
                  updateField('columns', newCols)
                  updateField('columnHeaders', newColHeaders)
                }}
                min={1}
                max={10}
              />
            </div>
            <div className="form-group">
              <label>Row Headers</label>
              <div className="options-list">
                {(formData.rowHeaders || []).map((header, idx) => (
                  <div key={idx} className="option-item">
                    <input
                      type="text"
                      className="input"
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...(formData.rowHeaders || [])]
                        newHeaders[idx] = e.target.value
                        updateField('rowHeaders', newHeaders)
                      }}
                      placeholder={`Row ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Column Headers</label>
              <div className="options-list">
                {(formData.columnHeaders || []).map((header, idx) => (
                  <div key={idx} className="option-item">
                    <input
                      type="text"
                      className="input"
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...(formData.columnHeaders || [])]
                        newHeaders[idx] = e.target.value
                        updateField('columnHeaders', newHeaders)
                      }}
                      placeholder={`Column ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {field.type === 'product-list' && (
          <>
            <div className="form-group">
              <label>Products</label>
              <div className="options-list">
                {(formData.products || []).map((product, idx) => (
                  <div key={product.id || idx} className="option-item">
                    <input
                      type="text"
                      className="input"
                      value={product.name || ''}
                      onChange={(e) => {
                        const newProducts = [...(formData.products || [])]
                        newProducts[idx] = { ...newProducts[idx], name: e.target.value }
                        updateField('products', newProducts)
                      }}
                      placeholder="Product name"
                      style={{ marginBottom: '5px' }}
                    />
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input
                        type="number"
                        className="input"
                        value={product.price || 0}
                        onChange={(e) => {
                          const newProducts = [...(formData.products || [])]
                          newProducts[idx] = { ...newProducts[idx], price: parseFloat(e.target.value) || 0 }
                          updateField('products', newProducts)
                        }}
                        placeholder="Price"
                        step="0.01"
                        min="0"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          const newProducts = (formData.products || []).filter((_, i) => i !== idx)
                          updateField('products', newProducts)
                        }}
                        title="Remove product"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  const newProducts = [...(formData.products || []), {
                    id: Date.now().toString(),
                    name: `Product ${(formData.products || []).length + 1}`,
                    price: 0
                  }]
                  updateField('products', newProducts)
                }}
              >
                + Add Product
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
