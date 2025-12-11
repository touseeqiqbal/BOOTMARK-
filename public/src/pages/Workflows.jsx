import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, Plus, Trash2, Mail, Bell, CheckCircle } from 'lucide-react'
import '../styles/Workflows.css'

export default function Workflows() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddWorkflow, setShowAddWorkflow] = useState(false)

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
    try {
      await api.put(`/forms/${id}`, {
        ...form,
        workflows
      })
      alert('Workflows saved successfully!')
    } catch (error) {
      console.error('Failed to save workflows:', error)
      alert('Failed to save workflows')
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
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="workflows-page">
      <header className="workflows-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-secondary" onClick={() => navigate(`/form/${id}`)}>
              <ArrowLeft size={18} />
              Back to Form
            </button>
            <h1>{form?.title} - Workflows</h1>
            <button className="btn btn-primary" onClick={saveWorkflows}>
              Save Workflows
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="workflows-intro">
          <h2>Automate Your Forms</h2>
          <p>Set up automated workflows to streamline approvals and notifications when forms are submitted.</p>
        </div>

        <div className="workflows-list">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="workflow-card">
              <div className="workflow-header">
                <div className="workflow-title-section">
                  <input
                    type="text"
                    className="workflow-name-input"
                    value={workflow.name}
                    onChange={(e) => updateWorkflow(workflow.id, { name: e.target.value })}
                    placeholder="Workflow Name"
                  />
                  <label className="workflow-toggle">
                    <input
                      type="checkbox"
                      checked={workflow.enabled}
                      onChange={(e) => updateWorkflow(workflow.id, { enabled: e.target.checked })}
                    />
                    <span>{workflow.enabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteWorkflow(workflow.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="workflow-content">
                <div className="form-group">
                  <label>Trigger</label>
                  <select
                    className="input"
                    value={workflow.trigger}
                    onChange={(e) => updateWorkflow(workflow.id, { trigger: e.target.value })}
                  >
                    <option value="on-submit">On Form Submit</option>
                    <option value="on-update">On Form Update</option>
                    <option value="on-approval">On Approval</option>
                  </select>
                </div>

                <div className="workflow-actions">
                  <div className="actions-header">
                    <h3>Actions</h3>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => addAction(workflow.id)}
                    >
                      <Plus size={14} />
                      Add Action
                    </button>
                  </div>

                  {workflow.actions.map((action, idx) => (
                    <div key={idx} className="action-item">
                      <div className="action-type">
                        <select
                          className="input"
                          value={action.type}
                          onChange={(e) => updateAction(workflow.id, idx, { type: e.target.value, config: {} })}
                        >
                          <option value="email">Send Email</option>
                          <option value="notification">Send Notification</option>
                          <option value="approval">Request Approval</option>
                          <option value="webhook">Webhook</option>
                        </select>
                      </div>

                      {action.type === 'email' && (
                        <div className="action-config">
                          <input
                            type="email"
                            className="input"
                            placeholder="Recipient email"
                            value={action.config.email || ''}
                            onChange={(e) => updateAction(workflow.id, idx, {
                              config: { ...action.config, email: e.target.value }
                            })}
                          />
                          <input
                            type="text"
                            className="input"
                            placeholder="Email subject"
                            value={action.config.subject || ''}
                            onChange={(e) => updateAction(workflow.id, idx, {
                              config: { ...action.config, subject: e.target.value }
                            })}
                          />
                        </div>
                      )}

                      {action.type === 'approval' && (
                        <div className="action-config">
                          <input
                            type="email"
                            className="input"
                            placeholder="Approver email"
                            value={action.config.approver || ''}
                            onChange={(e) => updateAction(workflow.id, idx, {
                              config: { ...action.config, approver: e.target.value }
                            })}
                          />
                        </div>
                      )}

                      {action.type === 'webhook' && (
                        <div className="action-config">
                          <input
                            type="url"
                            className="input"
                            placeholder="Webhook URL"
                            value={action.config.url || ''}
                            onChange={(e) => updateAction(workflow.id, idx, {
                              config: { ...action.config, url: e.target.value }
                            })}
                          />
                        </div>
                      )}

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeAction(workflow.id, idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button className="btn btn-primary add-workflow-btn" onClick={addWorkflow}>
            <Plus size={18} />
            Add New Workflow
          </button>
        </div>
      </div>
    </div>
  )
}
