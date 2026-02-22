import { useState } from 'react'
import { X } from 'lucide-react'
import '../styles/ConditionalLogic.css'

export default function ConditionalLogic({ fields, form, onUpdate, onClose }) {
  const [rules, setRules] = useState(form.conditionalLogic || [])

  const addRule = () => {
    setRules([...rules, {
      id: Date.now().toString(),
      fieldId: '',
      condition: 'equals',
      value: '',
      showFields: []
    }])
  }

  const updateRule = (ruleId, updates) => {
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, ...updates } : r
    ))
  }

  const deleteRule = (ruleId) => {
    setRules(rules.filter(r => r.id !== ruleId))
  }

  const saveLogic = () => {
    onUpdate({ conditionalLogic: rules })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal conditional-logic-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Conditional Logic</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="conditional-logic-content">
          <p className="help-text">
            Show or hide fields based on answers to other fields.
          </p>

          {rules.map((rule, idx) => (
            <div key={rule.id} className="logic-rule">
              <div className="rule-header">
                <span>Rule {idx + 1}</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteRule(rule.id)}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="rule-conditions">
                <div className="form-group">
                  <label>If this field</label>
                  <select
                    className="input"
                    value={rule.fieldId}
                    onChange={(e) => updateRule(rule.id, { fieldId: e.target.value })}
                  >
                    <option value="">Select field</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Condition</label>
                  <select
                    className="input"
                    value={rule.condition}
                    onChange={(e) => updateRule(rule.id, { condition: e.target.value })}
                  >
                    <option value="equals">Equals</option>
                    <option value="not-equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater-than">Greater Than</option>
                    <option value="less-than">Less Than</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Value</label>
                  <input
                    type="text"
                    className="input"
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    placeholder="Enter value"
                  />
                </div>

                <div className="form-group">
                  <label>Then show these fields</label>
                  <select
                    className="input"
                    multiple
                    value={rule.showFields}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, opt => opt.value)
                      updateRule(rule.id, { showFields: selected })
                    }}
                  >
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <small>Hold Ctrl/Cmd to select multiple</small>
                </div>
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" onClick={addRule}>
            + Add Rule
          </button>

          <div className="modal-actions">
            <button className="btn btn-primary" onClick={saveLogic}>
              Save Logic
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
