import React, { useState } from 'react';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { contractTemplatesApi } from '../utils/contractTemplatesApi';
import ColorPicker from './ColorPicker'; // Assuming this exists or using simple input

export default function ContractTemplateForm({ initialData, onSave, onCancel }) {
    const isEditing = !!initialData;
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        icon: initialData?.icon || '📄',
        color: initialData?.color || '#3b82f6',
        defaultDuration: initialData?.defaultDuration || 12,
        billingFrequency: initialData?.billingFrequency || 'monthly',
        autoRenewal: initialData?.autoRenewal || false,
        terms: initialData?.terms || '',
        isActive: initialData?.isActive ?? true
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (isEditing) {
                await contractTemplatesApi.update(initialData.id, formData);
            } else {
                await contractTemplatesApi.create(formData);
            }
            onSave();
        } catch (err) {
            console.error('Failed to save template', err);
            setError(err.response?.data?.error || 'Failed to save template');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="form-container">
            <div className="form-header">
                <button className="btn-icon" onClick={onCancel} type="button">
                    <ArrowLeft size={20} />
                </button>
                <h2>{isEditing ? 'Edit Template' : 'Create Template'}</h2>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="form-content">
                <div className="form-section">
                    <h3>Basic Information</h3>
                    <div className="form-row">
                        <div className="form-group col-span-2">
                            <label>Template Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="form-control"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="form-control"
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Icon (Emoji)</label>
                            <input
                                type="text"
                                name="icon"
                                value={formData.icon}
                                onChange={handleChange}
                                className="form-control"
                                maxLength={2}
                            />
                        </div>
                        <div className="form-group">
                            <label>Color</label>
                            <input
                                type="color"
                                name="color"
                                value={formData.color}
                                onChange={handleChange}
                                className="form-control h-10 p-1 w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Contract Defaults</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Default Duration (Months)</label>
                            <input
                                type="number"
                                name="defaultDuration"
                                value={formData.defaultDuration}
                                onChange={handleChange}
                                min={1}
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>Billing Frequency</label>
                            <select
                                name="billingFrequency"
                                value={formData.billingFrequency}
                                onChange={handleChange}
                                className="form-control"
                            >
                                <option value="one-time">One Time</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                                <option value="milestone">Milestone Based</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group checkbox-group">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="autoRenewal"
                                    checked={formData.autoRenewal}
                                    onChange={handleChange}
                                />
                                Auto-renewal enabled by default
                            </label>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Terms & Conditions</h3>
                    <div className="form-group">
                        <label>Default Terms</label>
                        <textarea
                            name="terms"
                            value={formData.terms}
                            onChange={handleChange}
                            className="form-control font-mono"
                            rows={15}
                            placeholder="Enter the default contract terms here..."
                        />
                        <p className="text-sm text-secondary mt-1">
                            You can use placeholders like [START_DATE], [CLIENT_NAME], [AMOUNT], etc.
                        </p>
                    </div>
                </div>

                <div className="form-actions sticky-footer">
                    <button type="button" className="btn-modern btn-modern-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-modern btn-modern-primary" disabled={submitting}>
                        <Save size={20} />
                        {submitting ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </form>
        </div>
    );
}
