// WORKORDERFORM.JSX - TEMPLATE FIELD RENDERING FIX
// This code should replace lines 301-337 in WorkOrderForm.jsx

{/* Render Form Fields if Template Selected */ }
{
    formData.templateId && (() => {
        console.log('[WorkOrderForm] Template ID selected:', formData.templateId);
        console.log('[WorkOrderForm] Available templates:', templates.length);
        const selectedTemplate = templates.find(t => t.id === formData.templateId);
        console.log('[WorkOrderForm] Selected template:', selectedTemplate);
        console.log('[WorkOrderForm] Template fields:', selectedTemplate?.fields);

        if (!selectedTemplate || !selectedTemplate.fields || selectedTemplate.fields.length === 0) {
            console.log('[WorkOrderForm] No template or no fields found');
            return null;
        }

        console.log('[WorkOrderForm] Rendering', selectedTemplate.fields.length, 'fields');
        return (
            <div style={{ marginBottom: '24px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                    Form Fields
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {selectedTemplate.fields.map((field, index) => (
                        <div key={field.id || index} className="form-group">
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                                {field.label || field.name || `Field ${index + 1}`}
                                {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                            </label>

                            {/* Short Text, Email, Phone, Number inputs */}
                            {(['short-text', 'text', 'email', 'phone', 'tel', 'number'].includes(field.type)) && (
                                <input
                                    type={field.type === 'short-text' ? 'text' : field.type === 'phone' ? 'tel' : field.type}
                                    value={formData.templateResponses[field.id] || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        templateResponses: {
                                            ...prev.templateResponses,
                                            [field.id]: e.target.value
                                        }
                                    }))}
                                    placeholder={field.placeholder || ''}
                                    required={field.required}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            )}

                            {/* Long Text / Textarea / Paragraph */}
                            {(['long-text', 'textarea', 'paragraph'].includes(field.type)) && (
                                <textarea
                                    value={formData.templateResponses[field.id] || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        templateResponses: {
                                            ...prev.templateResponses,
                                            [field.id]: e.target.value
                                        }
                                    }))}
                                    placeholder={field.placeholder || ''}
                                    required={field.required}
                                    rows={field.rows || 4}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            )}

                            {/* Dropdown / Select */}
                            {(['dropdown', 'select'].includes(field.type)) && (
                                <select
                                    value={formData.templateResponses[field.id] || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        templateResponses: {
                                            ...prev.templateResponses,
                                            [field.id]: e.target.value
                                        }
                                    }))}
                                    required={field.required}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="">-- Select --</option>
                                    {field.options && field.options.map((option, i) => (
                                        <option key={i} value={option}>{option}</option>
                                    ))}
                                </select>
                            )}

                            {/* Single Choice / Radio */}
                            {(['single-choice', 'radio'].includes(field.type)) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {field.options && field.options.map((option, i) => (
                                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name={field.id}
                                                value={option}
                                                checked={formData.templateResponses[field.id] === option}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    templateResponses: {
                                                        ...prev.templateResponses,
                                                        [field.id]: e.target.value
                                                    }
                                                }))}
                                                required={field.required && i === 0}
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Multiple Choice / Checkboxes */}
                            {(['multiple-choice', 'checkbox'].includes(field.type)) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {field.options && field.options.map((option, i) => (
                                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                value={option}
                                                checked={(formData.templateResponses[field.id] || []).includes(option)}
                                                onChange={(e) => {
                                                    const currentValues = formData.templateResponses[field.id] || [];
                                                    const newValues = e.target.checked
                                                        ? [...currentValues, option]
                                                        : currentValues.filter(v => v !== option);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        templateResponses: {
                                                            ...prev.templateResponses,
                                                            [field.id]: newValues
                                                        }
                                                    }));
                                                }}
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Date Picker */}
                            {(['date-picker', 'date'].includes(field.type)) && (
                                <input
                                    type="date"
                                    value={formData.templateResponses[field.id] || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        templateResponses: {
                                            ...prev.templateResponses,
                                            [field.id]: e.target.value
                                        }
                                    }))}
                                    required={field.required}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    })()
}
