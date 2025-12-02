import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import ImageUpload from './ImageUpload'
import '../styles/FormSettings.css'

export default function FormSettings({ form, onUpdate, onClose }) {
  // Merge existing settings with defaults to ensure all properties are present
  const defaultSettings = {
    theme: 'default',
    allowMultipleSubmissions: true,
    showProgressBar: true,
    confirmationMessage: 'Thank you for your submission!',
    backgroundImage: '',
    pageBackgroundColor: '#f5f5f5',
    formCardBackgroundColor: '#ffffff',
    logo: '',
    showPreviewBeforeSubmit: false,
    showStartPage: false,
    startPageTitle: 'Welcome',
    startPageDescription: '',
    startButtonText: 'Start',
    // Private link settings
    isPrivateLink: false,
    allowedEmails: [],
    // Advanced styling
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    primaryColor: '#4f46e5',
    secondaryColor: '#6366f1',
    textColor: '#1f2937',
    borderColor: '#e5e7eb',
    borderRadius: '8px',
    buttonStyle: 'rounded',
    customCSS: '',
    // Layout
    formWidth: '100%',
    maxWidth: '800px',
    formAlignment: 'center',
    fieldSpacing: '16px',
    emailNotifications: {
      enabled: false,
      notifyOwner: true,
      notifySubmitter: false,
      ownerEmail: '',
      submitterEmailField: ''
    }
  }

  // Merge existing form.settings with defaults, ensuring allowedEmails is always an array
  const mergedSettings = form.settings ? {
    ...defaultSettings,
    ...form.settings,
    // Ensure allowedEmails is always an array
    allowedEmails: Array.isArray(form.settings.allowedEmails) 
      ? form.settings.allowedEmails 
      : (form.settings.allowedEmails ? [form.settings.allowedEmails] : []),
    // Ensure emailNotifications object exists
    emailNotifications: {
      ...defaultSettings.emailNotifications,
      ...(form.settings.emailNotifications || {})
    }
  } : defaultSettings

  const [settings, setSettings] = useState(mergedSettings)

  // Update parent when settings change
  useEffect(() => {
    // Merge settings into form object properly
    console.log('[FormSettings] Settings updated:', {
      isPrivateLink: settings.isPrivateLink,
      allowedEmails: settings.allowedEmails,
      settingsKeys: Object.keys(settings)
    })
    onUpdate({ settings })
  }, [settings, onUpdate])

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Form Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          <div className="form-group">
            <label>Theme</label>
            <select
              className="input"
              value={settings.theme}
              onChange={(e) => updateSetting('theme', e.target.value)}
            >
              <option value="default">Default</option>
              <option value="modern">Modern</option>
              <option value="minimal">Minimal</option>
              <option value="colorful">Colorful</option>
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.allowMultipleSubmissions}
                onChange={(e) => updateSetting('allowMultipleSubmissions', e.target.checked)}
              />
              <span>Allow multiple submissions</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showProgressBar}
                onChange={(e) => updateSetting('showProgressBar', e.target.checked)}
              />
              <span>Show progress bar</span>
            </label>
          </div>

          <div className="form-group">
            <label>Confirmation Message</label>
            <textarea
              className="input"
              value={settings.confirmationMessage}
              onChange={(e) => updateSetting('confirmationMessage', e.target.value)}
              rows={3}
              placeholder="Message shown after form submission"
            />
          </div>

          <div className="form-group">
            <label>Page Background Color</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                value={settings.pageBackgroundColor || '#f5f5f5'}
                onChange={(e) => updateSetting('pageBackgroundColor', e.target.value)}
                style={{ width: '60px', height: '40px', cursor: 'pointer' }}
              />
              <input
                type="text"
                className="input"
                value={settings.pageBackgroundColor || '#f5f5f5'}
                onChange={(e) => updateSetting('pageBackgroundColor', e.target.value)}
                placeholder="#f5f5f5"
              />
            </div>
            <small className="help-text">Background color for the page around the form</small>
          </div>

          <div className="form-group">
            <label>Form Card Background Color</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                value={settings.formCardBackgroundColor || '#ffffff'}
                onChange={(e) => updateSetting('formCardBackgroundColor', e.target.value)}
                style={{ width: '60px', height: '40px', cursor: 'pointer' }}
              />
              <input
                type="text"
                className="input"
                value={settings.formCardBackgroundColor || '#ffffff'}
                onChange={(e) => updateSetting('formCardBackgroundColor', e.target.value)}
                placeholder="#ffffff"
              />
            </div>
            <small className="help-text">Background color for the form card/container</small>
          </div>

          <div className="form-group">
            <ImageUpload
              label="Background Image"
              value={settings.backgroundImage || ''}
              onChange={(value) => updateSetting('backgroundImage', value)}
            />
            <small className="help-text">Background image for the page (behind the form)</small>
          </div>

          <div className="form-group">
            <ImageUpload
              label="Form Logo"
              value={settings.logo || ''}
              onChange={(value) => updateSetting('logo', value)}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showPreviewBeforeSubmit || false}
                onChange={(e) => updateSetting('showPreviewBeforeSubmit', e.target.checked)}
              />
              <span>Show preview before submit</span>
            </label>
          </div>

          <div className="settings-section-divider">
            <h3>Start Page</h3>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showStartPage || false}
                onChange={(e) => updateSetting('showStartPage', e.target.checked)}
              />
              <span>Show start/welcome page before form</span>
            </label>
          </div>

          {settings.showStartPage && (
            <>
              <div className="form-group">
                <label>Start Page Title</label>
                <input
                  type="text"
                  className="input"
                  value={settings.startPageTitle || 'Welcome'}
                  onChange={(e) => updateSetting('startPageTitle', e.target.value)}
                  placeholder="Welcome"
                />
                <small className="help-text">Title displayed on the start page</small>
              </div>

              <div className="form-group">
                <label>Start Page Description</label>
                <textarea
                  className="input"
                  value={settings.startPageDescription || ''}
                  onChange={(e) => updateSetting('startPageDescription', e.target.value)}
                  rows={4}
                  placeholder="Enter a welcome message or instructions for form users..."
                />
                <small className="help-text">Description or instructions shown on the start page</small>
              </div>

              <div className="form-group">
                <label>Start Button Text</label>
                <input
                  type="text"
                  className="input"
                  value={settings.startButtonText || 'Start'}
                  onChange={(e) => updateSetting('startButtonText', e.target.value)}
                  placeholder="Start"
                />
                <small className="help-text">Text displayed on the start button</small>
              </div>
            </>
          )}

          <div className="settings-section-divider">
            <h3>Advanced Styling</h3>
          </div>

          <div className="form-group">
            <label>Font Family</label>
            <select
              className="input"
              value={settings.fontFamily || 'Inter, sans-serif'}
              onChange={(e) => updateSetting('fontFamily', e.target.value)}
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Open Sans, sans-serif">Open Sans</option>
              <option value="Lato, sans-serif">Lato</option>
              <option value="Montserrat, sans-serif">Montserrat</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
            </select>
          </div>

          <div className="form-group">
            <label>Font Size</label>
            <select
              className="input"
              value={settings.fontSize || '16px'}
              onChange={(e) => updateSetting('fontSize', e.target.value)}
            >
              <option value="14px">Small (14px)</option>
              <option value="16px">Medium (16px)</option>
              <option value="18px">Large (18px)</option>
              <option value="20px">Extra Large (20px)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Primary Color</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.primaryColor || '#4f46e5'}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  style={{ width: '60px', height: '40px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="input"
                  value={settings.primaryColor || '#4f46e5'}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  placeholder="#4f46e5"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Secondary Color</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.secondaryColor || '#6366f1'}
                  onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                  style={{ width: '60px', height: '40px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="input"
                  value={settings.secondaryColor || '#6366f1'}
                  onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Text Color</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                value={settings.textColor || '#1f2937'}
                onChange={(e) => updateSetting('textColor', e.target.value)}
                style={{ width: '60px', height: '40px', cursor: 'pointer' }}
              />
              <input
                type="text"
                className="input"
                value={settings.textColor || '#1f2937'}
                onChange={(e) => updateSetting('textColor', e.target.value)}
                placeholder="#1f2937"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Border Radius</label>
            <select
              className="input"
              value={settings.borderRadius || '8px'}
              onChange={(e) => updateSetting('borderRadius', e.target.value)}
            >
              <option value="0px">Sharp (0px)</option>
              <option value="4px">Small (4px)</option>
              <option value="8px">Medium (8px)</option>
              <option value="12px">Large (12px)</option>
              <option value="20px">Extra Large (20px)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Button Style</label>
            <select
              className="input"
              value={settings.buttonStyle || 'rounded'}
              onChange={(e) => updateSetting('buttonStyle', e.target.value)}
            >
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
              <option value="pill">Pill</option>
            </select>
          </div>

          <div className="form-group">
            <label>Form Width</label>
            <select
              className="input"
              value={settings.formWidth || '100%'}
              onChange={(e) => updateSetting('formWidth', e.target.value)}
            >
              <option value="100%">Full Width</option>
              <option value="800px">800px</option>
              <option value="600px">600px</option>
              <option value="400px">400px</option>
            </select>
          </div>

          <div className="form-group">
            <label>Form Alignment</label>
            <select
              className="input"
              value={settings.formAlignment || 'center'}
              onChange={(e) => updateSetting('formAlignment', e.target.value)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="form-group">
            <label>Field Spacing</label>
            <select
              className="input"
              value={settings.fieldSpacing || '16px'}
              onChange={(e) => updateSetting('fieldSpacing', e.target.value)}
            >
              <option value="8px">Tight (8px)</option>
              <option value="16px">Normal (16px)</option>
              <option value="24px">Loose (24px)</option>
              <option value="32px">Very Loose (32px)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Custom CSS</label>
            <textarea
              className="input"
              value={settings.customCSS || ''}
              onChange={(e) => updateSetting('customCSS', e.target.value)}
              rows={6}
              placeholder="Add custom CSS to style your form..."
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
            <small className="help-text">Add custom CSS rules to further customize your form appearance</small>
          </div>

          <div className="settings-section-divider">
            <h3>Private Link Settings</h3>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.isPrivateLink || false}
                onChange={(e) => updateSetting('isPrivateLink', e.target.checked)}
              />
              <span>Require sign-in for this form (Private Link)</span>
            </label>
            <small className="help-text">When enabled, users must sign in to BootMark to access and submit this form. They will only see their own submissions.</small>
          </div>

          {settings.isPrivateLink && (
            <div className="form-group">
              <label>Allowed Client Emails (Optional)</label>
              <textarea
                className="input"
                value={settings.allowedEmails?.join('\n') || ''}
                onChange={(e) => {
                  const emails = e.target.value
                    .split('\n')
                    .map(email => email.trim())
                    .filter(email => email.length > 0 && email.includes('@'))
                  updateSetting('allowedEmails', emails)
                }}
                rows={4}
                placeholder="client1@example.com&#10;client2@example.com&#10;Leave empty to allow any signed-in user"
              />
              <small className="help-text">Enter one email per line. Only these emails will be able to access the form. Leave empty to allow any signed-in user.</small>
            </div>
          )}

          <div className="settings-section-divider">
            <h3>Email Notifications</h3>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.emailNotifications?.enabled || false}
                onChange={(e) => updateSetting('emailNotifications', {
                  ...settings.emailNotifications,
                  enabled: e.target.checked
                })}
              />
              <span>Enable email notifications</span>
            </label>
          </div>

          {settings.emailNotifications?.enabled && (
            <>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications?.notifyOwner !== false}
                    onChange={(e) => updateSetting('emailNotifications', {
                      ...settings.emailNotifications,
                      notifyOwner: e.target.checked
                    })}
                  />
                  <span>Notify form owner when form is submitted</span>
                </label>
              </div>

              {settings.emailNotifications?.notifyOwner && (
                <div className="form-group">
                  <label>Owner Email Address</label>
                  <input
                    type="email"
                    className="input"
                    value={settings.emailNotifications?.ownerEmail || ''}
                    onChange={(e) => updateSetting('emailNotifications', {
                      ...settings.emailNotifications,
                      ownerEmail: e.target.value
                    })}
                    placeholder="owner@example.com"
                  />
                  <small className="help-text">Email address to receive submission notifications</small>
                </div>
              )}

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications?.notifySubmitter || false}
                    onChange={(e) => updateSetting('emailNotifications', {
                      ...settings.emailNotifications,
                      notifySubmitter: e.target.checked
                    })}
                  />
                  <span>Send confirmation email to submitter</span>
                </label>
              </div>

              {settings.emailNotifications?.notifySubmitter && (
                <div className="form-group">
                  <label>Email Field (for submitter notification)</label>
                  <select
                    className="input"
                    value={settings.emailNotifications?.submitterEmailField || ''}
                    onChange={(e) => updateSetting('emailNotifications', {
                      ...settings.emailNotifications,
                      submitterEmailField: e.target.value
                    })}
                  >
                    <option value="">Select email field from form</option>
                    {form.fields?.filter(f => f.type === 'email').map(field => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>
                  <small className="help-text">Select which email field to use for submitter notifications</small>
                </div>
              )}
            </>
          )}

          <div className="settings-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                // Ensure settings are updated before closing
                onUpdate({ settings });
                onClose();
              }}
            >
              Save Settings
            </button>
            {settings.isPrivateLink && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                ⚠️ Remember to click "Save" in the form builder for private link settings to take effect
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
