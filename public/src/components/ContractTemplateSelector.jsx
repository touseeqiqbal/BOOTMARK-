import React, { useState } from 'react';
import { FileText, Check } from 'lucide-react';
import { CONTRACT_TEMPLATES, getAllTemplates } from '../utils/contractTemplates';

export default function ContractTemplateSelector({ onSelect, selectedTemplate }) {
    const templates = getAllTemplates();

    return (
        <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>
                Select Contract Template
            </label>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
            }}>
                {templates.map(template => {
                    const isSelected = selectedTemplate === template.id;

                    return (
                        <div
                            key={template.id}
                            onClick={() => onSelect(template)}
                            style={{
                                padding: '16px',
                                border: `2px solid ${isSelected ? template.color : '#e5e7eb'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: isSelected ? `${template.color}10` : 'white',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.borderColor = template.color;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                        >
                            {isSelected && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: template.color,
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Check size={16} />
                                </div>
                            )}

                            <div style={{
                                fontSize: '32px',
                                marginBottom: '8px',
                                textAlign: 'center'
                            }}>
                                {template.icon}
                            </div>

                            <h4 style={{
                                margin: '0 0 4px 0',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#111827',
                                textAlign: 'center'
                            }}>
                                {template.name}
                            </h4>

                            <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: '#6b7280',
                                textAlign: 'center',
                                lineHeight: '1.4'
                            }}>
                                {template.description}
                            </p>

                            <div style={{
                                marginTop: '12px',
                                paddingTop: '12px',
                                borderTop: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '10px',
                                color: '#9ca3af'
                            }}>
                                <span>{template.defaultDuration}mo</span>
                                <span>{template.billingFrequency}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTemplate && (
                <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#166534'
                }}>
                    <strong>Selected:</strong> {templates.find(t => t.id === selectedTemplate)?.name}
                </div>
            )}
        </div>
    );
}
