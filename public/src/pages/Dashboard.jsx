import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Plus, FileText, Trash2, ExternalLink, Table, BarChart, Workflow, Settings, TrendingUp, Users, CreditCard, Mail, CheckCircle, ClipboardList, LayoutTemplate, Send, Shield, Upload, Download, Square, CheckSquare } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'
import { hasPermission } from '../utils/permissionUtils'
import SendFormEmail from '../components/SendFormEmail'

export default function Dashboard() {
  const [forms, setForms] = useState([])
  const [invitedForms, setInvitedForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateLoadingId, setTemplateLoadingId] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showSendEmailModal, setShowSendEmailModal] = useState(false)
  const [selectedFormForEmail, setSelectedFormForEmail] = useState(null)
  const [selectedForms, setSelectedForms] = useState(new Set())
  const [selectedTemplates, setSelectedTemplates] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showTemplateBulkActions, setShowTemplateBulkActions] = useState(false)
  const { user, logout, loading: authLoading, updateUser } = useAuth()
  const navigate = useNavigate()

  const canManageForms = hasPermission(user, 'forms')
  const canManageCustomers = hasPermission(user, 'customers')
  const canManageInvoices = hasPermission(user, 'invoices')
  // Settings is a higher-level/global permission
  // Customize App can be accessed with either business.settings or settings permission
  const canManageSettings = hasPermission(user, 'business.settings') || hasPermission(user, 'settings')
  // Managing users within a business is controlled by users.manage,
  // but settings should still imply full access.
  const canManageUsers = hasPermission(user, 'users.manage') || hasPermission(user, 'settings')

  useEffect(() => {
    // Fetch forms when component mounts (PrivateRoute ensures user is authenticated)
    if (!authLoading) {
      if (canManageForms) {
        fetchForms()
        fetchInvitedForms()
        fetchTemplates()
      } else {
        setLoading(false)
      }
      refreshMembership()
    }
  }, [authLoading, canManageForms])

  const refreshMembership = async () => {
    try {
      const response = await api.get('/businesses/my-membership')
      if (response.data) {
        updateUser({
          currentBusiness: {
            id: response.data.businessId,
            name: response.data.businessName,
            membersCount: response.data.membersCount
          },
          isBusinessOwner: response.data.isOwner,
          businessRole: response.data.role,
          businessPermissions: response.data.permissions || []
        })
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Failed to refresh membership info:', error)
      }
    }
  }

  const fetchForms = async () => {
    try {
      const response = await api.get('/forms')
      setForms(response.data)
    } catch (error) {
      console.error('Failed to fetch forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    if (!canManageForms) return
    setLoadingTemplates(true)
    try {
      const response = await api.get('/forms/templates')
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const fetchInvitedForms = async () => {
    try {
      const response = await api.get('/forms/invited')
      setInvitedForms(response.data || [])
    } catch (error) {
      console.error('Failed to fetch invited forms:', error)
      // If endpoint doesn't exist yet, just set empty array
      setInvitedForms([])
    }
  }

  const createForm = async () => {
    try {
      const response = await api.post('/forms', {
        title: 'Untitled Form',
        fields: [],
        settings: {}
      })
      navigate(`/form/${response.data.id}`)
    } catch (error) {
      // Extract error message from various possible locations
      let errorMessage = 'Failed to create form';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        } else if (data.details) {
          errorMessage = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
        } else if (data.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(`Failed to create form: ${errorMessage}`)
    }
  }

  const createFormFromTemplate = async (template) => {
    try {
      setTemplateLoadingId(template.id)
      const timestamp = Date.now().toString()
      const hydratedFields = (template.fields || []).map((field, index) => ({
        ...field,
        id: field.id || `${template.id}-${timestamp}-${index}`,
      }))

      const payload = {
        title: template.title,
        fields: hydratedFields,
        settings: {
          ...(template.settings || {}),
          templateId: template.id,
          templateName: template.title,
        },
      }

      const response = await api.post('/forms', payload)
      navigate(`/form/${response.data.id}`)
    } catch (error) {
      console.error('Failed to start from template:', error)
      const message = error.response?.data?.error || error.message || 'Failed to create form from template'
      alert(message)
    } finally {
      setTemplateLoadingId(null)
    }
  }

  const deleteForm = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this form?')) return

    try {
      await api.delete(`/forms/${id}`)
      setForms(forms.filter(f => f.id !== id))
      setSelectedForms(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (error) {
      console.error('Failed to delete form:', error)
      alert('Failed to delete form')
    }
  }

  const handleBulkDeleteForms = async () => {
    if (selectedForms.size === 0) return
    const count = selectedForms.size
    if (!confirm(`Are you sure you want to delete ${count} form(s)?`)) return

    try {
      await Promise.all(Array.from(selectedForms).map(id => api.delete(`/forms/${id}`)))
      setForms(forms.filter(f => !selectedForms.has(f.id)))
      setSelectedForms(new Set())
      setShowBulkActions(false)
      alert(`Successfully deleted ${count} form(s)`)
    } catch (error) {
      console.error('Failed to delete forms:', error)
      alert('Failed to delete some forms')
    }
  }

  const handleBulkExportForms = () => {
    if (selectedForms.size === 0) return
    
    const selected = forms.filter(f => selectedForms.has(f.id))
    const exportData = selected.map(form => ({
      id: form.id,
      title: form.title,
      fields: form.fields || [],
      settings: form.settings || {},
      createdAt: form.createdAt,
      updatedAt: form.updatedAt
    }))

    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forms-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleImportForms = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedForms = JSON.parse(text)
      
      if (!Array.isArray(importedForms)) {
        alert('Invalid file format. Expected an array of forms.')
        return
      }

      let imported = 0
      let errors = 0

      for (const formData of importedForms) {
        try {
          const payload = {
            title: formData.title || 'Imported Form',
            fields: formData.fields || [],
            settings: formData.settings || {}
          }
          await api.post('/forms', payload)
          imported++
        } catch (err) {
          console.error('Error importing form:', err)
          errors++
        }
      }

      alert(`Import complete: ${imported} imported, ${errors} errors`)
      fetchForms()
    } catch (error) {
      console.error('Failed to import forms:', error)
      alert('Failed to import forms. Please check the file format.')
    }
    
    event.target.value = ''
  }

  const handleSelectAllForms = () => {
    if (selectedForms.size === forms.length) {
      setSelectedForms(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedForms(new Set(forms.map(f => f.id)))
      setShowBulkActions(true)
    }
  }

  const handleToggleSelectForm = (formId) => {
    setSelectedForms(prev => {
      const next = new Set(prev)
      if (next.has(formId)) {
        next.delete(formId)
      } else {
        next.add(formId)
      }
      if (next.size === 0) {
        setShowBulkActions(false)
      } else {
        setShowBulkActions(true)
      }
      return next
    })
  }

  const handleBulkDeleteTemplates = async () => {
    if (selectedTemplates.size === 0) return
    const count = selectedTemplates.size
    if (!confirm(`Are you sure you want to delete ${count} template(s)?`)) return

    try {
      // Only delete user-created templates (those with userId)
      const templatesToDelete = templates.filter(t => selectedTemplates.has(t.id) && t.userId)
      const defaultTemplates = templates.filter(t => selectedTemplates.has(t.id) && !t.userId)
      
      if (defaultTemplates.length > 0) {
        alert(`Note: ${defaultTemplates.length} default template(s) cannot be deleted. Only user-created templates will be deleted.`)
      }

      if (templatesToDelete.length > 0) {
        await Promise.all(templatesToDelete.map(t => api.delete(`/forms/templates/${t.id}`)))
        setTemplates(templates.filter(t => !selectedTemplates.has(t.id)))
        setSelectedTemplates(new Set())
        setShowTemplateBulkActions(false)
        alert(`Successfully deleted ${templatesToDelete.length} template(s)`)
      } else {
        alert('No user-created templates selected. Default templates cannot be deleted.')
        setSelectedTemplates(new Set())
        setShowTemplateBulkActions(false)
      }
    } catch (error) {
      console.error('Failed to delete templates:', error)
      alert('Failed to delete some templates')
    }
  }

  const handleBulkExportTemplates = () => {
    if (selectedTemplates.size === 0) return
    
    const selected = templates.filter(t => selectedTemplates.has(t.id))
    const exportData = selected.map(template => ({
      id: template.id,
      title: template.title,
      description: template.description,
      fields: template.fields || [],
      settings: template.settings || {}
    }))

    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `templates-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleImportTemplates = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedTemplates = JSON.parse(text)
      
      if (!Array.isArray(importedTemplates)) {
        alert('Invalid file format. Expected an array of templates.')
        return
      }

      let imported = 0
      let errors = 0

      for (const templateData of importedTemplates) {
        try {
          const payload = {
            title: templateData.title || 'Imported Template',
            description: templateData.description || '',
            fields: templateData.fields || [],
            settings: templateData.settings || {}
          }
          await api.post('/forms/templates', payload)
          imported++
        } catch (err) {
          console.error('Error importing template:', err)
          errors++
        }
      }

      alert(`Import complete: ${imported} imported, ${errors} errors`)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to import templates:', error)
      alert('Failed to import templates. Please check the file format.')
    }
    
    event.target.value = ''
  }

  const handleSelectAllTemplates = () => {
    if (selectedTemplates.size === templates.length) {
      setSelectedTemplates(new Set())
      setShowTemplateBulkActions(false)
    } else {
      setSelectedTemplates(new Set(templates.map(t => t.id)))
      setShowTemplateBulkActions(true)
    }
  }

  const handleToggleSelectTemplate = (templateId) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      if (next.size === 0) {
        setShowTemplateBulkActions(false)
      } else {
        setShowTemplateBulkActions(true)
      }
      return next
    })
  }

  const copyShareLink = (shareKey, e) => {
    e.stopPropagation()
    const link = `${window.location.origin}/share/${shareKey}`
    navigator.clipboard.writeText(link)
    alert('Share link copied to clipboard!')
  }

  // Show loading while auth is loading or forms are being fetched
  if (authLoading || loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="dashboard-brand">
              <img src={logo} alt="BootMark Logo" className="brand-logo" />
              <div className="brand-text">
                <h1 className="brand-title">BootMark Landscaping Management</h1>
                <span className="brand-subtitle">My Forms</span>
              </div>
            </div>
            <div className="header-actions">
              <span className="user-name">{user?.name || user?.email}</span>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('/account-settings')}
                title="Account Settings"
              >
                <Settings size={16} />
                Settings
              </button>
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="dashboard-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {canManageForms && (
          <button className="btn btn-primary create-form-btn" onClick={createForm}>
            <Plus size={20} />
            Create New Form
          </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setShowTemplates(!showTemplates)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <LayoutTemplate size={18} />
            {showTemplates ? 'Hide Template Library' : 'Browse Templates'}
          </button>
          {canManageCustomers && (
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/customers')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={18} />
            Customers
          </button>
          )}
          {canManageInvoices && (
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/invoices')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <CreditCard size={18} />
            Invoices
          </button>
          )}
          {user?.isSuperAdmin && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/admin/approvals')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle size={18} />
                Business Approvals
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/admin/business-permissions')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Shield size={18} />
                Manage Permissions
              </button>
            </>
          )}
          {canManageUsers && (
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/user-management')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Users size={18} />
              Manage Users
            </button>
          )}
          {canManageSettings && (
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/app-customization')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={18} />
              Customize App
            </button>
          )}
        </div>

        {showTemplates && (
          <section className="template-library">
            <div className="template-library-header">
              <div>
                <h2>Templates</h2>
                <p>Create forms faster with curated sets or your own saved layouts.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <Upload size={16} />
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportTemplates}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {showTemplateBulkActions && selectedTemplates.size > 0 && (
              <div style={{ 
                padding: '12px 16px', 
                backgroundColor: '#eff6ff', 
                borderRadius: '8px', 
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '500' }}>
                  {selectedTemplates.size} template(s) selected
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleBulkExportTemplates}>
                    <Download size={16} />
                    Export Selected
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleBulkDeleteTemplates}>
                    <Trash2 size={16} />
                    Delete Selected
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    setSelectedTemplates(new Set())
                    setShowTemplateBulkActions(false)
                  }}>
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {loadingTemplates ? (
              <p style={{ color: '#6b7280' }}>Loading templates...</p>
            ) : templates.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No templates available yet. Save one from any form.</p>
            ) : (
              <>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    className="btn btn-link btn-sm"
                    onClick={handleSelectAllTemplates}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                  >
                    {selectedTemplates.size === templates.length && templates.length > 0 ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} />
                    )}
                    {selectedTemplates.size === templates.length && templates.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="template-grid">
                  {templates.map(template => {
                    const isSelected = selectedTemplates.has(template.id)
                    return (
                      <div
                        key={template.id}
                        className="template-card"
                        style={{ borderTopColor: template.accent || '#4f46e5', position: 'relative' }}
                      >
                        <div style={{ 
                          position: 'absolute', 
                          top: '12px', 
                          left: '12px', 
                          zIndex: 10 
                        }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectTemplate(template.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </div>
                        <div className="template-card-body" style={{ paddingLeft: '32px' }}>
                          <p className="template-label">Template</p>
                          <h3>{template.title}</h3>
                          <p className="template-description">{template.description}</p>
                          <p className="template-meta">
                            {template.fields?.length || 0} ready-to-use fields
                          </p>
                        </div>
                        <div className="template-card-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => createFormFromTemplate(template)}
                            disabled={templateLoadingId === template.id}
                          >
                            {templateLoadingId === template.id ? 'Creating...' : 'Use Template'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {/* Invited Forms Section */}
        {invitedForms.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={24} color="#f59e0b" />
              Pending Invitations ({invitedForms.length})
            </h2>
            <div className="forms-grid">
              {invitedForms.map(form => (
                <div
                  key={form.id}
                  className="form-card"
                  style={{ border: '2px solid #f59e0b', position: 'relative' }}
                >
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#f59e0b', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    INVITED
                  </div>
                  <div className="form-card-header">
                    <FileText size={24} color="#f59e0b" />
                    <div className="form-card-actions">
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/accept-invite/${form.inviteId}`)
                        }}
                        title="Accept invitation"
                        style={{ background: '#10b981', color: 'white' }}
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </div>
                  <h3>{form.title}</h3>
                  <p className="form-meta">
                    Role: {form.inviteRole === 'editor' ? 'Editor' : 'Viewer'} • Invited {new Date(form.invitedAt).toLocaleDateString()}
                  </p>
                  <div className="form-card-footer">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/accept-invite/${form.inviteId}`)
                      }}
                    >
                      <CheckCircle size={14} />
                      Accept Invitation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Forms Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>My Forms</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportForms}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {showBulkActions && selectedForms.size > 0 && (
            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '8px', 
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: '500' }}>
                {selectedForms.size} form(s) selected
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleBulkExportForms}>
                  <Download size={16} />
                  Export Selected
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleBulkDeleteForms}>
                  <Trash2 size={16} />
                  Delete Selected
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  setSelectedForms(new Set())
                  setShowBulkActions(false)
                }}>
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {forms.length === 0 ? (
            <div className="empty-state">
              <FileText size={64} color="#9ca3af" />
              <h2>No forms yet</h2>
              <p>Create your first form to get started</p>
              <button className="btn btn-primary" onClick={createForm}>
                Create Form
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn btn-link btn-sm"
                  onClick={handleSelectAllForms}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                >
                  {selectedForms.size === forms.length && forms.length > 0 ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                  {selectedForms.size === forms.length && forms.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="forms-grid">
                {forms.map(form => {
                  const isSelected = selectedForms.has(form.id)
                  return (
                    <div
                      key={form.id}
                      className="form-card"
                      onClick={() => navigate(`/form/${form.id}`)}
                      style={{ position: 'relative' }}
                    >
                      <div style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        left: '12px', 
                        zIndex: 10 
                      }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectForm(form.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </div>
                      <div className="form-card-header" style={{ paddingLeft: '32px' }}>
                        <FileText size={24} color="#4f46e5" />
                        <div className="form-card-actions">
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFormForEmail(form)
                              setShowSendEmailModal(true)
                            }}
                            title="Send form via email"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={(e) => copyShareLink(form.shareKey, e)}
                            title="Copy share link"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={(e) => deleteForm(form.id, e)}
                            title="Delete form"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h3>{form.title}</h3>
                      <p className="form-meta">
                        {form.fields?.length || 0} fields • Updated {new Date(form.updatedAt).toLocaleDateString()}
                      </p>
                      <div className="form-card-footer">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/form/${form.id}/entry`)
                          }}
                        >
                          <ClipboardList size={14} />
                          Log Entry
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/form/${form.id}/submissions`)
                          }}
                        >
                          Submissions
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/form/${form.id}/table`)
                          }}
                        >
                          <Table size={14} />
                          Table
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/form/${form.id}/reports`)
                          }}
                        >
                          <BarChart size={14} />
                          Reports
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/form/${form.id}/workflows`)
                          }}
                        >
                          <Workflow size={14} />
                          Workflows
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/form/${form.id}/analytics`)
                          }}
                        >
                          <TrendingUp size={14} />
                          Analytics
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/form/${form.id}/team`)
                          }}
                        >
                          <Users size={14} />
                          Team
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Send Form Email Modal */}
      {showSendEmailModal && selectedFormForEmail && (
        <SendFormEmail
          form={selectedFormForEmail}
          onClose={() => {
            setShowSendEmailModal(false)
            setSelectedFormForEmail(null)
          }}
          onSuccess={() => {
            // Optionally refresh or show success message
          }}
        />
      )}
    </div>
  )
}
