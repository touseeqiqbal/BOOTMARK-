import React, { useState } from 'react';
import { Plus, Trash2, Calendar, DollarSign } from 'lucide-react';

export default function PaymentScheduleBuilder({ schedule, onChange }) {
    const [milestones, setMilestones] = useState(schedule || [
        { id: 1, description: '', amount: '', dueDate: '', status: 'pending' }
    ]);

    const addMilestone = () => {
        const newMilestone = {
            id: Date.now(),
            description: '',
            amount: '',
            dueDate: '',
            status: 'pending'
        };
        const updated = [...milestones, newMilestone];
        setMilestones(updated);
        onChange(updated);
    };

    const removeMilestone = (id) => {
        const updated = milestones.filter(m => m.id !== id);
        setMilestones(updated);
        onChange(updated);
    };

    const updateMilestone = (id, field, value) => {
        const updated = milestones.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        );
        setMilestones(updated);
        onChange(updated);
    };

    const totalAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

    return (
        <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px' }}>
                    Payment Schedule
                </label>
                <button
                    type="button"
                    onClick={addMilestone}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                    <Plus size={14} /> Add Milestone
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {milestones.map((milestone, index) => (
                    <div
                        key={milestone.id}
                        style={{
                            padding: '16px',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr auto',
                            gap: '12px',
                            alignItems: 'end'
                        }}
                    >
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                                Description / Milestone {index + 1}
                            </label>
                            <input
                                type="text"
                                value={milestone.description}
                                onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                                placeholder="e.g., Initial deposit, Project completion"
                                className="form-control"
                                style={{ fontSize: '13px' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                                <DollarSign size={12} style={{ display: 'inline', marginRight: '2px' }} />
                                Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={milestone.amount}
                                onChange={(e) => updateMilestone(milestone.id, 'amount', e.target.value)}
                                placeholder="0.00"
                                className="form-control"
                                style={{ fontSize: '13px' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', marginBottom: '4px', color: '#6b7280' }}>
                                <Calendar size={12} style={{ display: 'inline', marginRight: '2px' }} />
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={milestone.dueDate}
                                onChange={(e) => updateMilestone(milestone.id, 'dueDate', e.target.value)}
                                className="form-control"
                                style={{ fontSize: '13px' }}
                            />
                        </div>

                        {milestones.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeMilestone(milestone.id)}
                                className="btn btn-icon"
                                style={{ marginBottom: '2px' }}
                                title="Remove milestone"
                            >
                                <Trash2 size={16} color="#ef4444" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {milestones.length > 0 && (
                <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '500' }}>
                        Total Payment Schedule
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', fontFamily: 'monospace' }}>
                        ${totalAmount.toFixed(2)}
                    </span>
                </div>
            )}

            <p style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280', margin: '8px 0 0 0' }}>
                💡 Tip: Break down the total contract value into payment milestones. Each milestone can be linked to specific deliverables.
            </p>
        </div>
    );
}
