import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, Plus, Trash2, Mail, Bell, CheckCircle, Settings, Play, Shield, Globe, ChevronLeft } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import '../styles/Workflows.css'

export default function Workflows() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddWorkflow, setShowAddWorkflow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const response = await api.get(`/forms/${id}`)
      setForm(response.data)
      setWorkflows(response.data.workflows || [])
    } catch (error) {
      console.error('Failed to fetch form:', error)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const saveWorkflows = async () => {
    setSaving(true)
    try {
      await api.put(`/forms/${id}`, {
        ...form,
        workflows
      })
      console.log('Workflows saved successfully!')
    } catch (error) {
      console.error('Failed to save workflows:', error)
    } finally {
      setSaving(false)
    }
  }

  const addWorkflow = () => {
    setWorkflows([...workflows, {
      id: Date.now().toString(),
      name: 'New Workflow',
      trigger: 'on-submit',
      actions: [],
      enabled: true
    }])
    setShowAddWorkflow(true)
  }

  const updateWorkflow = (workflowId, updates) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId ? { ...w, ...updates } : w
    ))
  }

  const deleteWorkflow = (workflowId) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      setWorkflows(workflows.filter(w => w.id !== workflowId))
    }
  }

  const addAction = (workflowId) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId
        ? { ...w, actions: [...w.actions, { type: 'email', config: {} }] }
        : w
    ))
  }

  const updateAction = (workflowId, actionIndex, updates) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId
        ? {
          ...w,
          actions: w.actions.map((a, idx) =>
            idx === actionIndex ? { ...a, ...updates } : a
          )
        }
        : w
    ))
  }

  const removeAction = (workflowId, actionIndex) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId
        ? { ...w, actions: w.actions.filter((_, idx) => idx !== actionIndex) }
        : w
    ))
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ marginBottom: '16px' }}></div>
            <p style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>Synchronizing Workflows...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard animate-fadeIn">
      <PageHeader
        title={`${form?.title} - Automation`}
        subtitle="Configure intelligent workflows and auto-responses"
        actions={
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-modern btn-modern-secondary" onClick={() => navigate(`/form/${id}`)}>
              <ChevronLeft size={18} /> Back to Editor
            </button>
            <button className="btn-modern btn-modern-primary" onClick={saveWorkflows} disabled={saving}>
              {saving ? 'Saving...' : 'Publish Changes'}
            </button>
          </div>
        }
      />

      <div className="container" style={{ paddingTop: 0, marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {workflows.length === 0 ? (
            <div className="modern-card animate-fadeIn" style={{ textAlign: 'center', padding: '80px 48px', background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
              <Play size={64} color="var(--primary-600)" style={{ marginBottom: '24px', opacity: 0.5 }} />
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: '0 0 12px 0' }}>No Active Automations</h2>
              <p style={{ margin: '0 auto 32px auto', color: 'var(--text-tertiary)', fontSize: '16px', fontWeight: '600', maxWidth: '480px' }}>
                Set up automated workflows to streamline approvals, notifications, and data sync when forms are submitted.
              </p>
              <button className="btn-modern btn-modern-primary" onClick={addWorkflow}>
                <Plus size={18} /> Initialize First Workflow
              </button>
            </div>
          ) : (
            <>
              {workflows.map((workflow) => (
                <div key={workflow.id} className="modern-card animate-fadeIn" style={{ borderLeft: workflow.enabled ? '4px solid var(--primary-600)' : '4px solid var(--text-tertiary)' }}>
                  <div className="workflow-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: workflow.enabled ? 'var(--primary-100)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Settings size={20} color={workflow.enabled ? 'var(--primary-600)' : 'var(--text-tertiary)'} />
                      </div>
                      <input
                        type="text"
                        className="input-modern"
                        value={workflow.name}
                        onChange={(e) => updateWorkflow(workflow.id, { name: e.target.value })}
                        style={{ fontSize: '18px', fontWeight: '900', border: 'none', background: 'transparent', padding: 0, width: '100%', maxWidth: '400px' }}
                        placeholder="Name your workflow..."
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: workflow.enabled ? 'var(--primary-700)' : 'var(--text-tertiary)' }}>{workflow.enabled ? 'ACTIVE' : 'INACTIVE'}</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={workflow.enabled}
                            onChange={(e) => updateWorkflow(workflow.id, { enabled: e.target.checked })}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                      <button className="btn-modern btn-modern-secondary" onClick={() => deleteWorkflow(workflow.id)} style={{ padding: '8px', color: 'var(--error-600)' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="workflow-content" style={{ padding: '32px' }}>
                    <div className="form-group" style={{ maxWidth: '320px', marginBottom: '32px' }}>
                      <label className="label-modern">Activation Trigger</label>
                      <select
                        className="input-modern"
                        value={workflow.trigger}
                        onChange={(e) => updateWorkflow(workflow.id, { trigger: e.target.value })}
                      >
                        <option value="on-submit">On Initial Submission</option>
                        <option value="on-update">On Data Update</option>
                        <option value="on-approval">On Status Approval</option>
                      </select>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Workflow Actions ({workflow.actions.length})</h4>
                        <button className="btn-modern btn-modern-primary" onClick={() => addAction(workflow.id)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                          <Plus size={14} /> Add Step
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {workflow.actions.map((action, idx) => (
                          <div key={idx} className="modern-card animate-fadeIn" style={{ padding: '16px', background: 'var(--bg-primary)', display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '16px', alignItems: 'start' }}>
                            <select
                              className="input-modern"
                              value={action.type}
                              onChange={(e) => updateAction(workflow.id, idx, { type: e.target.value, config: {} })}
                              style={{ padding: '8px 12px' }}
                            >
                              <option value="email">Send Email</option>
                              <option value="notification">Push Notify</option>
                              <option value="approval">Request Approval</option>
                              <option value="webhook">Outbound Webhook</option>
                            </select>

                            <div className="action-config">
                              {action.type === 'email' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                  <input
                                    type="email"
                                    className="input-modern"
                                    placeholder="Recipient email"
                                    value={action.config.email || ''}
                                    onChange={(e) => updateAction(workflow.id, idx, {
                                      config: { ...action.config, email: e.target.value }
                                    })}
                                    style={{ padding: '8px 12px' }}
                                  />
                                  <input
                                    type="text"
                                    className="input-modern"
                                    placeholder="Subject line"
                                    value={action.config.subject || ''}
                                    onChange={(e) => updateAction(workflow.id, idx, {
                                      config: { ...action.config, subject: e.target.value }
                                    })}
                                    style={{ padding: '8px 12px' }}
                                  />
                                </div>
                              )}

                              {action.type === 'approval' && (
                                <input
                                  type="email"
                                  className="input-modern"
                                  placeholder="Approver email address"
                                  value={action.config.approver || ''}
                                  onChange={(e) => updateAction(workflow.id, idx, {
                                    config: { ...action.config, approver: e.target.value }
                                  })}
                                  style={{ padding: '8px 12px' }}
                                />
                              )}

                              {action.type === 'webhook' && (
                                <input
                                  type="url"
                                  className="input-modern"
                                  placeholder="https://api.external.com/webhook"
                                  value={action.config.url || ''}
                                  onChange={(e) => updateAction(workflow.id, idx, {
                                    config: { ...action.config, url: e.target.value }
                                  })}
                                  style={{ padding: '8px 12px' }}
                                />
                              )}

                              {action.type === 'notification' && (
                                <input
                                  type="text"
                                  className="input-modern"
                                  placeholder="Notification message body"
                                  value={action.config.message || ''}
                                  onChange={(e) => updateAction(workflow.id, idx, {
                                    config: { ...action.config, message: e.target.value }
                                  })}
                                  style={{ padding: '8px 12px' }}
                                />
                              )}
                            </div>

                            <button
                              className="btn-modern btn-modern-secondary"
                              onClick={() => removeAction(workflow.id, idx)}
                              style={{ padding: '8px', color: 'var(--error-600)', border: 'none' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button className="btn-modern btn-modern-primary" onClick={addWorkflow} style={{ padding: '16px', fontSize: '16px', justifyContent: 'center', border: '2px dashed var(--primary-200)', background: 'var(--primary-50)', color: 'var(--primary-700)' }}>
                <Plus size={20} /> Deploy Additional Workflow
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
