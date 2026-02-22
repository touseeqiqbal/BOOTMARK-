import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function JobWorkflowBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id;

    const [loading, setLoading] = useState(!isNew);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [stages, setStages] = useState([
        { id: 'stage-1', name: 'Draft', color: '#9ca3af', type: 'system', order: 0 },
        { id: 'stage-2', name: 'Scheduled', color: '#3b82f6', type: 'custom', order: 1 },
        { id: 'stage-3', name: 'Completed', color: '#10b981', type: 'system', order: 2 }
    ]);

    useEffect(() => {
        if (!isNew) {
            fetchWorkflow();
        }
    }, [id]);

    const fetchWorkflow = async () => {
        try {
            const res = await api.get(`/workflows/${id}`);
            const w = res.data;
            setName(w.name);
            setDescription(w.description || '');
            setIsDefault(w.isDefault || false);
            if (w.stages) {
                // Ensure stages have IDs for drag and drop
                setStages(w.stages.map(s => ({ ...s, id: s.id || `stage-${Math.random()}` })));
            }
        } catch (error) {
            console.error('Failed to fetch workflow:', error);
            navigate('/job-workflows');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Please enter a workflow name');
            return;
        }
        if (stages.length === 0) {
            alert('Please add at least one stage');
            return;
        }

        const payload = {
            name,
            description,
            isDefault,
            stages: stages.map((s, index) => ({
                id: s.id.startsWith('stage-') ? undefined : s.id, // Remove temp IDs if backend generates them, or keep if UUID
                name: s.name,
                color: s.color,
                type: s.type,
                order: index
            }))
        };

        try {
            if (isNew) {
                await api.post('/workflows', payload);
            } else {
                await api.put(`/workflows/${id}`, payload);
            }
            navigate('/job-workflows');
        } catch (error) {
            console.error('Failed to save workflow:', error);
            alert('Failed to save workflow');
        }
    };

    const addStage = () => {
        const newStage = {
            id: `stage-${Date.now()}`,
            name: 'New Stage',
            color: '#6b7280',
            type: 'custom',
            order: stages.length
        };
        // Insert before the last item (usually 'Completed' or similar final stage) if possible, 
        // but for generic builder just append.
        setStages([...stages, newStage]);
    };

    const updateStage = (index, field, value) => {
        const newStages = [...stages];
        newStages[index] = { ...newStages[index], [field]: value };
        setStages(newStages);
    };

    const removeStage = (index) => {
        const newStages = [...stages];
        newStages.splice(index, 1);
        setStages(newStages);
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const newStages = Array.from(stages);
        const [reorderedItem] = newStages.splice(result.source.index, 1);
        newStages.splice(result.destination.index, 0, reorderedItem);
        setStages(newStages);
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button className="btn btn-icon" onClick={() => navigate('/job-workflows')}>
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="brand-title">{isNew ? 'Create Workflow' : 'Edit Workflow'}</h1>
                        </div>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={18} /> Save Workflow
                        </button>
                    </div>
                </div>
            </header>

            <div className="container" style={{ paddingTop: '24px', maxWidth: '800px' }}>
                <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Workflow Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Standard Service, Installation Job"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
                        <textarea
                            className="form-control"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this workflow is used for..."
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                            />
                            Set as default workflow for new Work Orders
                        </label>
                    </div>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Workflow Stages</h3>
                        <button className="btn btn-secondary btn-sm" onClick={addStage}>
                            <Plus size={16} /> Add Stage
                        </button>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="stages">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {stages.map((stage, index) => (
                                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        background: '#f9fafb',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        marginBottom: '8px',
                                                        ...provided.draggableProps.style
                                                    }}
                                                >
                                                    <div {...provided.dragHandleProps} style={{ color: '#9ca3af', cursor: 'grab' }}>
                                                        <GripVertical size={20} />
                                                    </div>

                                                    <input
                                                        type="color"
                                                        value={stage.color}
                                                        onChange={(e) => updateStage(index, 'color', e.target.value)}
                                                        style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                    />

                                                    <input
                                                        type="text"
                                                        value={stage.name}
                                                        onChange={(e) => updateStage(index, 'name', e.target.value)}
                                                        placeholder="Stage Name"
                                                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                                    />

                                                    <button
                                                        className="btn btn-icon"
                                                        onClick={() => removeStage(index)}
                                                        title="Remove Stage"
                                                        style={{ color: '#ef4444' }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </div>
        </div>
    );
}
