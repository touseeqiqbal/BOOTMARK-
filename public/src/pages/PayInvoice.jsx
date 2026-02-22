import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { CreditCard, Lock, CheckCircle, XCircle, Loader } from 'lucide-react'
import '../styles/Login.css'

export default function PayInvoice() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expirationDate: '',
    cvv: '',
    email: '',
    cardholderName: ''
  })

  useEffect(() => {
    fetchInvoiceData()
  }, [token])

  const fetchInvoiceData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/payments/link/${token}`)
      if (response.data) {
        setInvoice(response.data.invoice)
        setCustomer(response.data.customer)
        setPaymentData(prev => ({
          ...prev,
          email: response.data.customer?.email || ''
        }))
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error)
      if (error.response?.status === 404) {
        setError('Payment link not found or has expired.')
      } else if (error.response?.status === 410) {
        setError('This payment link has expired. Please contact the invoice sender for a new link.')
      } else {
        setError('Failed to load invoice. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpirationDate = (value) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    setPaymentData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleExpirationChange = (e) => {
    const formatted = formatExpirationDate(e.target.value)
    setPaymentData(prev => ({ ...prev, expirationDate: formatted }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setProcessing(true)

    // Validate
    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 13) {
      setError('Please enter a valid card number')
      setProcessing(false)
      return
    }

    if (!paymentData.expirationDate || paymentData.expirationDate.length !== 5) {
      setError('Please enter a valid expiration date (MM/YY)')
      setProcessing(false)
      return
    }

    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      setError('Please enter a valid CVV')
      setProcessing(false)
      return
    }

    if (!paymentData.email || !paymentData.email.includes('@')) {
      setError('Please enter a valid email address')
      setProcessing(false)
      return
    }

    try {
      const response = await api.post('/payments/process', {
        token,
        paymentData: {
          cardNumber: paymentData.cardNumber.replace(/\s/g, ''),
          expirationDate: paymentData.expirationDate,
          cvv: paymentData.cvv,
          email: paymentData.email,
          cardholderName: paymentData.cardholderName
        }
      })

      if (response.data.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/')
        }, 5000)
      } else {
        setError(response.data.error || 'Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      setError(error.response?.data?.error || 'Payment failed. Please check your card details and try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <Loader size={48} className="spinner" style={{ margin: '0 auto', display: 'block' }} />
          <p style={{ textAlign: 'center', marginTop: '20px' }}>Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 20px', display: 'block' }} />
          <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Payment Link Error</h1>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ width: '100%' }}>
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <CheckCircle size={64} color="#22c55e" style={{ margin: '0 auto 20px', display: 'block' }} />
          <h1 style={{ textAlign: 'center', marginBottom: '10px', color: '#22c55e' }}>Payment Successful!</h1>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px' }}>
            Your payment has been processed successfully. A receipt has been sent to your email.
          </p>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
            Redirecting to home page in 5 seconds...
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ width: '100%', marginTop: '20px' }}>
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return null
  }

  const items = invoice.items || []
  const subtotal = invoice.subtotal || 0
  const tax = invoice.tax || 0
  const total = invoice.total || 0

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
          <Lock size={24} color="#4f46e5" />
          <h1 style={{ margin: 0 }}>Secure Payment</h1>
        </div>

        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '6px', 
            marginBottom: '20px',
            color: '#dc2626'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          {/* Invoice Details */}
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Invoice Details</h2>
            <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
              <p><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> {new Date(invoice.createdAt).toLocaleDateString()}</p>
              {invoice.dueDate && (
                <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
              )}
              {customer && (
                <>
                  <p style={{ marginTop: '15px' }}><strong>Bill To:</strong></p>
                  <p>{customer.name}</p>
                  {customer.email && <p>{customer.email}</p>}
                </>
              )}
              
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px' }}>Item</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '12px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 0', fontSize: '14px' }}>{item.name || 'Item'}</td>
                        <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '14px' }}>
                          ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Tax:</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Payment Information</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  className="input"
                  value={paymentData.cardholderName}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, cardholderName: e.target.value }))}
                  placeholder="Name on card"
                  required
                />
              </div>

              <div className="form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  className="input"
                  value={paymentData.cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Expiration Date</label>
                  <input
                    type="text"
                    className="input"
                    value={paymentData.expirationDate}
                    onChange={handleExpirationChange}
                    placeholder="MM/YY"
                    maxLength="5"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>CVV</label>
                  <input
                    type="text"
                    className="input"
                    value={paymentData.cvv}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').substring(0, 4) }))}
                    placeholder="123"
                    maxLength="4"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="input"
                  value={paymentData.email}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  required
                />
                <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Receipt will be sent to this email
                </small>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={processing}
                style={{ width: '100%', marginTop: '20px' }}
              >
                {processing ? (
                  <>
                    <Loader size={18} className="spinner" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Pay ${total.toFixed(2)}
                  </>
                )}
              </button>

              <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Lock size={16} color="#22c55e" />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534' }}>Secure Payment</span>
                </div>
                <p style={{ fontSize: '11px', color: '#166534', margin: 0 }}>
                  Your payment is processed securely through Authorize.net. We do not store your card information.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
