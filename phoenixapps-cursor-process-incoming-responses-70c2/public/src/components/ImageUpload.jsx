import { useState } from 'react'
import { Upload, Link as LinkIcon, X } from 'lucide-react'
import '../styles/ImageUpload.css'

export default function ImageUpload({ 
  label, 
  value, 
  onChange, 
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024 // 5MB
}) {
  const [uploadMode, setUploadMode] = useState(value?.startsWith('data:') || value?.startsWith('blob:') ? 'upload' : value ? 'link' : 'link')
  const [preview, setPreview] = useState(value || '')
  const [error, setError] = useState('')

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / 1024 / 1024}MB`)
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result
      setPreview(dataUrl)
      onChange(dataUrl)
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsDataURL(file)
  }

  const handleUrlChange = (url) => {
    setError('')
    setPreview(url)
    onChange(url)
  }

  const clearImage = () => {
    setPreview('')
    onChange('')
    setError('')
  }

  return (
    <div className="image-upload-component">
      <label className="form-label">{label}</label>
      
      <div className="upload-mode-selector">
        <button
          type="button"
          className={`mode-btn ${uploadMode === 'link' ? 'active' : ''}`}
          onClick={() => setUploadMode('link')}
        >
          <LinkIcon size={16} />
          Use URL
        </button>
        <button
          type="button"
          className={`mode-btn ${uploadMode === 'upload' ? 'active' : ''}`}
          onClick={() => setUploadMode('upload')}
        >
          <Upload size={16} />
          Upload
        </button>
      </div>

      {uploadMode === 'upload' ? (
        <div className="upload-section">
          <div className="file-upload-area">
            <input
              type="file"
              accept={accept}
              onChange={handleFileUpload}
              className="file-input"
              id={`file-upload-${label}`}
            />
            <label htmlFor={`file-upload-${label}`} className="file-upload-label">
              <Upload size={24} />
              <span>Click to upload or drag and drop</span>
              <small>PNG, JPG, GIF up to {maxSize / 1024 / 1024}MB</small>
            </label>
          </div>
          {preview && (
            <div className="image-preview-container">
              <img src={preview} alt="Preview" className="image-preview" />
              <button type="button" className="remove-image-btn" onClick={clearImage}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="url-section">
          <input
            type="url"
            className="input"
            value={preview}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {preview && (
            <div className="image-preview-container">
              <img 
                src={preview} 
                alt="Preview" 
                className="image-preview"
                onError={() => setError('Invalid image URL')}
              />
              <button type="button" className="remove-image-btn" onClick={clearImage}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {error && <div className="upload-error">{error}</div>}
    </div>
  )
}
