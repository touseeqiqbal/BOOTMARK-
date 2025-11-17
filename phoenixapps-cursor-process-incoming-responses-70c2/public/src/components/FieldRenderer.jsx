import { useState } from 'react'
import '../styles/FieldRenderer.css'

export default function FieldRenderer({ field, value, onChange, disabled }) {
  const [signatureData, setSignatureData] = useState('')
  const [captchaValue, setCaptchaValue] = useState('')
  const [captchaCode] = useState(Math.random().toString(36).substring(2, 8).toUpperCase())

  const renderField = () => {
    switch (field.type) {
      // Basic Fields
      case 'text':
      case 'short-text':
        return (
          <input
            type="text"
            placeholder={field.placeholder || field.label}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-input"
            maxLength={field.maxLength}
          />
        )

      case 'long-text':
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder || field.label}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-textarea"
            rows={field.rows || 4}
          />
        )

      case 'paragraph':
        return (
          <div className="field-paragraph">
            <p>{field.content || field.label}</p>
          </div>
        )

      case 'email':
        return (
          <input
            type="email"
            placeholder={field.placeholder || field.label}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-input"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder || field.label}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-input"
            min={field.min}
            max={field.max}
            step={field.step || 1}
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-input"
          />
        )

      case 'dropdown':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-select"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'single-choice':
      case 'radio': {
        const allowOther = field.allowOther
        const otherLabel = field.otherLabel || 'Other'
        const otherPlaceholder = field.otherPlaceholder || 'Please specify'
        const isOtherSelected = allowOther && value && !field.options?.includes(value)
        return (
          <div className="radio-group">
            {field.options?.map((option, idx) => (
              <label key={idx} className="radio-label">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange?.(e.target.value)}
                  disabled={disabled}
                  required={field.required}
                />
                <span>{option}</span>
              </label>
            ))}
            {allowOther && (
              <div className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="radio-label" style={{ margin: 0 }}>
                  <input
                    type="radio"
                    name={field.id}
                    value="__other__"
                    checked={isOtherSelected}
                    onChange={() => onChange?.('')}
                    disabled={disabled}
                    required={field.required}
                  />
                  <span>{otherLabel}</span>
                </label>
                <input
                  type="text"
                  placeholder={otherPlaceholder}
                  value={isOtherSelected ? value : ''}
                  onChange={(e) => onChange?.(e.target.value)}
                  disabled={disabled || !isOtherSelected}
                  className="field-input"
                  style={{ maxWidth: 240 }}
                />
              </div>
            )}
          </div>
        )
      }

      case 'multiple-choice':
      case 'checkbox': {
        const allowOther = field.allowOther
        const otherLabel = field.otherLabel || 'Other'
        const otherPlaceholder = field.otherPlaceholder || 'Please specify'
        const current = Array.isArray(value) ? value : []
        const otherValue = current.find(v => !field.options?.includes(v)) || ''
        const isOtherChecked = allowOther && !!otherValue
        return (
          <div className="checkbox-group">
            {field.options?.map((option, idx) => (
              <label key={idx} className="checkbox-label">
                <input
                  type="checkbox"
                  value={option}
                  checked={current.includes(option)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...current, option]
                      : current.filter(v => v !== option && v !== '')
                    onChange?.(newValue)
                  }}
                  disabled={disabled}
                />
                <span>{option}</span>
              </label>
            ))}
            {allowOther && (
              <div className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="checkbox-label" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    value="__other__"
                    checked={isOtherChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange?.([...current, ''])
                      } else {
                        onChange?.(current.filter(v => field.options?.includes(v)))
                      }
                    }}
                    disabled={disabled}
                  />
                  <span>{otherLabel}</span>
                </label>
                <input
                  type="text"
                  placeholder={otherPlaceholder}
                  value={otherValue}
                  onChange={(e) => {
                    const typed = e.target.value
                    const filtered = current.filter(v => field.options?.includes(v))
                    if (typed) {
                      onChange?.([...filtered, typed])
                    } else {
                      onChange?.(filtered)
                    }
                  }}
                  disabled={disabled || !isOtherChecked}
                  className="field-input"
                  style={{ maxWidth: 240 }}
                />
              </div>
            )}
          </div>
        )
      }

      case 'file':
        return (
          <div className="file-upload-wrapper">
            <input
              type="file"
              onChange={(e) => onChange?.(e.target.files)}
              disabled={disabled}
              required={field.required}
              multiple={field.multiple}
              accept={field.accept}
              className="field-input"
            />
            {value && (
              <div className="file-preview">
                {Array.from(value).map((file, idx) => (
                  <span key={idx} className="file-name">{file.name}</span>
                ))}
              </div>
            )}
          </div>
        )

      case 'image':
        return (
          <div className="image-upload-wrapper">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (e) => onChange?.(e.target.result)
                  reader.readAsDataURL(file)
                }
              }}
              disabled={disabled}
              required={field.required}
              className="field-input"
            />
            {value && (
              <img src={value} alt="Preview" className="image-preview" />
            )}
          </div>
        )

      case 'date':
      case 'date-picker':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-input"
            min={field.minDate}
            max={field.maxDate}
          />
        )

      case 'appointment':
        return (
          <div className="appointment-wrapper">
            <input
              type="date"
              value={value?.date || ''}
              onChange={(e) => onChange?.({ ...value, date: e.target.value })}
              disabled={disabled}
              required={field.required}
              className="field-input"
              style={{ marginBottom: '10px' }}
            />
            <input
              type="time"
              value={value?.time || ''}
              onChange={(e) => onChange?.({ ...value, time: e.target.value })}
              disabled={disabled}
              required={field.required}
              className="field-input"
            />
          </div>
        )

      // Widgets
      case 'heading':
        return (
          <h2 className="field-heading" style={{ 
            fontSize: field.size || '24px',
            color: field.color || '#1f2937',
            textAlign: field.align || 'left'
          }}>
            {field.label}
          </h2>
        )

      case 'logo':
        return (
          <div className="logo-wrapper">
            {field.imageUrl ? (
              <img 
                src={field.imageUrl} 
                alt={field.label || 'Logo'} 
                className="form-logo"
                style={{
                  maxWidth: field.width || '200px',
                  maxHeight: field.height || '100px',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div className="logo-placeholder">
                <span>Logo</span>
              </div>
            )}
          </div>
        )

      case 'full-name':
        return (
          <div className="full-name-wrapper">
            <input
              type="text"
              placeholder="First Name"
              value={value?.firstName || ''}
              onChange={(e) => onChange?.({ ...value, firstName: e.target.value })}
              disabled={disabled}
              required={field.required}
              className="field-input"
              style={{ marginBottom: '10px' }}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={value?.lastName || ''}
              onChange={(e) => onChange?.({ ...value, lastName: e.target.value })}
              disabled={disabled}
              required={field.required}
              className="field-input"
            />
          </div>
        )

      case 'address':
        return (
          <div className="address-wrapper">
            <input
              type="text"
              placeholder="Street Address"
              value={value?.street || ''}
              onChange={(e) => onChange?.({ ...value, street: e.target.value })}
              disabled={disabled}
              required={field.required}
              className="field-input"
              style={{ marginBottom: '10px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="City"
                value={value?.city || ''}
                onChange={(e) => onChange?.({ ...value, city: e.target.value })}
                disabled={disabled}
                className="field-input"
              />
              <input
                type="text"
                placeholder="State"
                value={value?.state || ''}
                onChange={(e) => onChange?.({ ...value, state: e.target.value })}
                disabled={disabled}
                className="field-input"
              />
            </div>
            <input
              type="text"
              placeholder="ZIP Code"
              value={value?.zip || ''}
              onChange={(e) => onChange?.({ ...value, zip: e.target.value })}
              disabled={disabled}
              className="field-input"
            />
          </div>
        )

      case 'phone':
        return (
          <input
            type="tel"
            placeholder={field.placeholder || "(123) 456-7890"}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="field-input"
            pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
          />
        )

      case 'signature':
        return (
          <div className="signature-wrapper">
            <canvas
              ref={(canvas) => {
                if (canvas && !canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3]) {
                  const ctx = canvas.getContext('2d')
                  ctx.strokeStyle = '#000'
                  ctx.lineWidth = 2
                  let isDrawing = false
                  
                  canvas.addEventListener('mousedown', (e) => {
                    isDrawing = true
                    ctx.beginPath()
                    ctx.moveTo(e.offsetX, e.offsetY)
                  })
                  
                  canvas.addEventListener('mousemove', (e) => {
                    if (isDrawing) {
                      ctx.lineTo(e.offsetX, e.offsetY)
                      ctx.stroke()
                    }
                  })
                  
                  canvas.addEventListener('mouseup', () => {
                    isDrawing = false
                    onChange?.(canvas.toDataURL())
                  })
                }
              }}
              width={400}
              height={150}
              style={{ border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'crosshair' }}
            />
            <button
              type="button"
              onClick={() => {
                const canvas = document.querySelector('.signature-wrapper canvas')
                if (canvas) {
                  const ctx = canvas.getContext('2d')
                  ctx.clearRect(0, 0, canvas.width, canvas.height)
                  onChange?.('')
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '10px' }}
            >
              Clear
            </button>
          </div>
        )

      case 'fill-blank':
        const text = field.content || 'Fill in the blank: The capital of France is ____'
        const parts = text.split('____')
        return (
          <div className="fill-blank-wrapper">
            <span>{parts[0]}</span>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled}
              required={field.required}
              className="field-input fill-blank-input"
              style={{ display: 'inline-block', width: '150px', margin: '0 5px' }}
            />
            <span>{parts[1]}</span>
          </div>
        )

      // Payments
      case 'product-list':
        return (
          <div className="product-list-wrapper">
            {field.products?.map((product, idx) => (
              <div key={idx} className="product-item">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(product.id)}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : []
                    const newValue = e.target.checked
                      ? [...current, product.id]
                      : current.filter(v => v !== product.id)
                    onChange?.(newValue)
                  }}
                  disabled={disabled}
                />
                <span>{product.name} - ${product.price}</span>
              </div>
            ))}
            {field.products && (
              <div className="product-total">
                Total: ${field.products
                  .filter(p => Array.isArray(value) && value.includes(p.id))
                  .reduce((sum, p) => sum + (p.price || 0), 0)
                  .toFixed(2)}
              </div>
            )}
          </div>
        )

      // Survey Elements
      case 'input-table':
        const rows = field.rows || 3
        const cols = field.columns || 3
        return (
          <div className="input-table-wrapper">
            <table className="input-table">
              <thead>
                <tr>
                  <th></th>
                  {Array.from({ length: cols }).map((_, colIdx) => (
                    <th key={colIdx}>{field.columnHeaders?.[colIdx] || `Column ${colIdx + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    <td>{field.rowHeaders?.[rowIdx] || `Row ${rowIdx + 1}`}</td>
                    {Array.from({ length: cols }).map((_, colIdx) => (
                      <td key={colIdx}>
                        <input
                          type="text"
                          value={value?.[`${rowIdx}-${colIdx}`] || ''}
                          onChange={(e) => {
                            const newValue = { ...value, [`${rowIdx}-${colIdx}`]: e.target.value }
                            onChange?.(newValue)
                          }}
                          disabled={disabled}
                          className="table-input"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      case 'star-rating':
      case 'rating':
        return (
          <div className="rating-group">
            {Array.from({ length: field.max || 5 }).map((_, idx) => {
              const starValue = idx + 1
              return (
                <button
                  key={idx}
                  type="button"
                  className={`rating-star ${value >= starValue ? 'filled' : ''}`}
                  onClick={() => !disabled && onChange?.(starValue)}
                  disabled={disabled}
                >
                  ★
                </button>
              )
            })}
          </div>
        )

      case 'scale-rating':
        return (
          <div className="scale-rating-wrapper">
            <div className="scale-labels">
              <span>{field.minLabel || 'Poor'}</span>
              <span>{field.maxLabel || 'Excellent'}</span>
            </div>
            <input
              type="range"
              min={field.min || 1}
              max={field.max || 10}
              value={value || field.min || 1}
              onChange={(e) => onChange?.(parseInt(e.target.value))}
              disabled={disabled}
              required={field.required}
              className="scale-slider"
            />
            <div className="scale-value">Value: {value || field.min || 1}</div>
          </div>
        )

      // Page Elements
      case 'divider':
        return (
          <hr className="field-divider" style={{
            border: 'none',
            borderTop: `2px solid ${field.color || '#e5e7eb'}`,
            margin: '20px 0'
          }} />
        )

      case 'section-collapse':
        const [isExpanded, setIsExpanded] = useState(field.defaultExpanded || false)
        return (
          <div className="section-collapse-wrapper">
            <button
              type="button"
              className="section-collapse-header"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span>{field.label}</span>
              <span>{isExpanded ? '−' : '+'}</span>
            </button>
            {isExpanded && (
              <div className="section-collapse-content">
                {field.content || 'Collapsible section content'}
              </div>
            )}
          </div>
        )

      case 'page-break':
        return (
          <div className="page-break">
            <div className="page-break-line"></div>
            <div className="page-break-label">Page Break</div>
            <div className="page-break-line"></div>
          </div>
        )

      case 'captcha':
        return (
          <div className="captcha-wrapper">
            <div className="captcha-display">{captchaCode}</div>
            <input
              type="text"
              placeholder="Enter the code above"
              value={captchaValue}
              onChange={(e) => {
                setCaptchaValue(e.target.value)
                onChange?.(e.target.value === captchaCode)
              }}
              disabled={disabled}
              required={field.required}
              className="field-input"
            />
          </div>
        )

      case 'spinner':
        return (
          <div className="spinner-wrapper">
            <div className="spinner"></div>
            <span>{field.label || 'Loading...'}</span>
          </div>
        )

      default:
        return <div className="field-placeholder">{field.label}</div>
    }
  }

  // Don't show label for certain field types
  const hideLabel = ['heading', 'divider', 'page-break', 'paragraph'].includes(field.type)

  return (
    <div className="field-renderer">
      {!hideLabel && (
        <label className="field-label">
          {field.label}
          {field.required && <span className="required">*</span>}
        </label>
      )}
      {renderField()}
      {field.description && (
        <p className="field-description">{field.description}</p>
      )}
    </div>
  )
}
