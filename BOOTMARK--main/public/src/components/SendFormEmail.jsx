import { useState } from 'react'
import { X, Mail, Send, Loader, AlertCircle } from 'lucide-react'
import api from '../utils/api'

export default function SendFormEmail({ form, onClose, onSuccess }) {
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState(`Please fill out: ${form?.title || 'Form'}`)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const formLink = form?.shareKey 
    ? `${window.location.origin}/share/${form.shareKey}`
    : ''

  const defaultMessage = `Hello,

I'd like to invite you to fill out the following form:

${form?.title || 'Form'}

Please click the link below to access the form:
${formLink}

${form?.description ? `\nDescription:\n${form.description}\n` : ''}

Thank you for your time!

Best regards`

  const [emailMessage, setEmailMessage] = useState(defaultMessage)

  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validate recipients
    const recipientList = recipients
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (recipientList.length === 0) {
      setError('Please enter at least one email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = recipientList.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      setError(`Invalid email addresses: ${invalidEmails.join(', ')}`)
      return
    }

    if (!subject.trim()) {
      setError('Please enter a subject')
      return
    }

    if (!emailMessage.trim()) {
      setError('Please enter a message')
      return
    }

    setLoading(true)

    try {
      // Create HTML version of the message (convert line breaks to <br>)
      const htmlMessage = emailMessage
        .replace(/\n/g, '<br>')
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" style="color: #4f46e5; text-decoration: underline;">$&</a>')

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin-top: 0;">${form?.title || 'Form'}</h2>
            ${form?.description ? `<p style="color: #6b7280;">${form.description}</p>` : ''}
          </div>
          <div style="color: #374151; line-height: 1.6;">
            ${htmlMessage}
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="${formLink}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Open Form
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
            This form was sent from BootMark. If you have any questions, please contact the sender.
          </p>
        </div>
      `

      const response = await api.post('/auth/account/send-email', {
        to: recipientList,
        subject: subject.trim(),
        html: htmlContent,
        text: emailMessage
      })

      if (response.data?.success) {
        setSuccess(true)
        setTimeout(() => {
          if (onSuccess) onSuccess()
          if (onClose) onClose()
        }, 2000)
      } else {
        setError(response.data?.error || 'Failed to send email')
      }
    } catch (err) {
      console.error('Send email error:', err)
      let errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to send email'
      
      // Provide helpful message if SMTP is not configured
      if (errorMessage.includes('SMTP') || errorMessage.includes('email service not configured')) {
        errorMessage = 'Email service is not configured. Please configure SMTP settings in Account Settings, or contact your administrator to set up default SMTP configuration.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={24} />
            Send Form for Entries
          </h2>
          <button
            className="icon-btn"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#991b1b'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#166534'
          }}>
            <Mail size={18} />
            <span>Email sent successfully!</span>
          </div>
        )}

        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>
              Recipients <span className="required">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              required
              disabled={loading || success}
            />
            <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
              Enter email addresses separated by commas for multiple recipients
            </small>
          </div>

          <div className="form-group">
            <label>
              Subject <span className="required">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
              disabled={loading || success}
            />
          </div>

          <div className="form-group">
            <label>
              Message <span className="required">*</span>
            </label>
            <textarea
              className="input"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Email message"
              rows={8}
              required
              disabled={loading || success}
              style={{ fontFamily: 'monospace', fontSize: '14px' }}
            />
            <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
              The form link will be automatically included in the email. You can customize the message above.
            </small>
          </div>

          {formLink && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Form Link (will be included in email):
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={formLink}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: '#fff'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(formLink)
                    alert('Link copied to clipboard!')
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader size={16} className="spinner" />
                  Sending...
                </>
              ) : success ? (
                <>
                  <Mail size={16} />
                  Sent!
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

