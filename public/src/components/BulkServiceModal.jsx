import { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

export default function BulkServiceModal({ onClose, onConfirm, category }) {
    const [selectedServices, setSelectedServices] = useState([]);

    // Predefined services for each category
    const serviceTemplates = {
        'Lawn / Turf Care': [
            { name: 'Lawn Mowing', price: 45, unit: 'per visit', description: 'Standard lawn mowing service' },
            { name: 'Trimming / Line Trimming', price: 15, unit: 'per visit', description: 'Trimming around obstacles, trees, posts, beds, fencing' },
            { name: 'Edging', price: 20, unit: 'per visit', description: 'Edging along sidewalks, driveways, and beds' },
            { name: 'Blowing / Cleanup', price: 10, unit: 'per visit', description: 'Cleanup of clippings from hard surfaces' },
            { name: 'Fertilization', price: 75, unit: 'per application', description: 'Granular or liquid fertilization' },
            { name: 'Weed Control', price: 65, unit: 'per application', description: 'Spot treatment or blanket spray' },
            { name: 'Aeration', price: 150, unit: 'flat rate', description: 'Core aeration service' },
            { name: 'Overseeding', price: 200, unit: 'flat rate', description: 'Lawn overseeding' },
            { name: 'Dethatching', price: 180, unit: 'flat rate', description: 'Power raking / dethatching' },
            { name: 'Topdressing', price: 250, unit: 'flat rate', description: 'Loam/compost over lawn' },
            { name: 'Lawn Repair / Patching', price: 100, unit: 'flat rate', description: 'Small area repairs' },
            { name: 'New Sod Installation', price: 3.5, unit: 'sqft', description: 'Fresh sod installation' }
        ],
        'Beds, Gardens & Mulch': [
            { name: 'Bed Weeding', price: 50, unit: 'per hour', description: 'Hand weeding or hoeing' },
            { name: 'Bed Edging', price: 40, unit: 'per visit', description: 'Spade or mechanical edger' },
            { name: 'Mulch Install', price: 75, unit: 'per yard', description: 'Bark, woodchips, or stone mulch' },
            { name: 'Mulch Refresh / Top-off', price: 50, unit: 'per yard', description: 'Adding fresh mulch layer' },
            { name: 'Bed Cleanup', price: 60, unit: 'per visit', description: 'Removing leaves, debris, dead plant material' },
            { name: 'Planting Annuals', price: 8, unit: 'per plant', description: 'Seasonal flower planting' },
            { name: 'Planting Perennials', price: 15, unit: 'per plant', description: 'Perennial installation' },
            { name: 'Planting Shrubs', price: 45, unit: 'per plant', description: 'Shrub installation' },
            { name: 'Planting Small Trees', price: 125, unit: 'per plant', description: 'Small ornamental tree planting' },
            { name: 'Deadheading', price: 35, unit: 'per hour', description: 'Removing spent flowers' },
            { name: 'Staking / Tying Plants', price: 25, unit: 'per visit', description: 'Plant support installation' },
            { name: 'Soil Amending', price: 60, unit: 'per yard', description: 'Compost added to beds' }
        ],
        'Shrubs, Hedges & Trees': [
            { name: 'Shrub Trimming', price: 75, unit: 'per visit', description: 'Formal hedges or natural shrubs' },
            { name: 'Ornamental Tree Pruning', price: 100, unit: 'per tree', description: 'Small tree pruning' },
            { name: 'Overgrowth Cutting', price: 85, unit: 'per hour', description: 'Cutting back overgrown shrubs away from house/walkways' },
            { name: 'Selective Pruning', price: 90, unit: 'per hour', description: 'Pruning for shape and health' },
            { name: 'Small Shrub Removal', price: 50, unit: 'per shrub', description: 'Removal of small shrubs' },
            { name: 'Small Tree Removal', price: 200, unit: 'per tree', description: 'Removal of small trees' },
            { name: 'Brush Clearing', price: 75, unit: 'per hour', description: 'Scrub removal along edges/fencelines' },
            { name: 'Sucker Removal', price: 40, unit: 'per visit', description: 'Removing suckers from tree bases' },
            { name: 'Fertilizing Shrubs', price: 45, unit: 'per application', description: 'Ornamental fertilization' }
        ],
        'Seasonal Cleanups': [
            { name: 'Spring Cleanup', price: 200, unit: 'flat rate', description: 'General lawn & bed cleanup after winter' },
            { name: 'Fall Cleanup', price: 250, unit: 'flat rate', description: 'Leaves, pine needles, branches' },
            { name: 'Leaf Removal', price: 150, unit: 'flat rate', description: 'Lawn and bed leaf removal' },
            { name: 'Gutter Cleaning', price: 125, unit: 'flat rate', description: 'Gutter debris removal' },
            { name: 'Cutting Back Perennials', price: 75, unit: 'per visit', description: 'Cutting back ornamental grasses and perennials' },
            { name: 'Winter Protection Removal', price: 50, unit: 'per visit', description: 'Removing burlap, stakes, etc.' },
            { name: 'Storm Debris Cleanup', price: 100, unit: 'per hour', description: 'Branches, fallen limbs, scattered trash' },
            { name: 'Yard Waste Hauling', price: 75, unit: 'per load', description: 'Off-site dump and disposal' }
        ],
        'Hardscape / Property Care': [
            { name: 'Blowing / Sweeping', price: 35, unit: 'per visit', description: 'Driveways, patios, walkways' },
            { name: 'Hardscape Weed Control', price: 50, unit: 'per application', description: 'Weeds in pavers, gravel, cracks' },
            { name: 'Power Washing', price: 150, unit: 'flat rate', description: 'Patios and walkways' },
            { name: 'Gravel Raking', price: 60, unit: 'per visit', description: 'Driveway raking or light grading' },
            { name: 'Paver Re-leveling', price: 75, unit: 'per hour', description: 'Small pavers or stepping stones' },
            { name: 'Trash Pickup', price: 25, unit: 'per visit', description: 'Property trash removal' },
            { name: 'Fence Line Clearing', price: 65, unit: 'per hour', description: 'Brush/weed removal along fences' },
            { name: 'Perimeter Clearing', price: 80, unit: 'per hour', description: 'Clearing along property lines' }
        ],
        'Irrigation': [
            { name: 'System Turn On (Spring)', price: 75, unit: 'flat rate', description: 'Spring system activation' },
            { name: 'System Turn Off (Fall)', price: 85, unit: 'flat rate', description: 'Fall winterization and blow out' },
            { name: 'Controller Adjustment', price: 50, unit: 'per visit', description: 'Time/zone tweaks' },
            { name: 'Sprinkler Head Adjustment', price: 40, unit: 'per visit', description: 'Minor repairs and adjustments' },
            { name: 'Leak Checks', price: 60, unit: 'per visit', description: 'System inspection and simple fixes' }
        ],
        'Snow & Ice': [
            { name: 'Driveway Plowing', price: 75, unit: 'per visit', description: 'Residential driveway plowing' },
            { name: 'Parking Lot Plowing', price: 150, unit: 'per visit', description: 'Commercial lot plowing' },
            { name: 'Walkway Shoveling', price: 40, unit: 'per visit', description: 'Walkway and sidewalk clearing' },
            { name: 'Steps / Porch Shoveling', price: 30, unit: 'per visit', description: 'Entry clearing' },
            { name: 'Snow Blowing', price: 50, unit: 'per visit', description: 'Snow blower service' },
            { name: 'Salting Walkways', price: 35, unit: 'per application', description: 'Salt/sand application for walkways' },
            { name: 'Salting Driveways', price: 50, unit: 'per application', description: 'Driveway salt/sand' },
            { name: 'Ice Scraping', price: 45, unit: 'per visit', description: 'Chip and clear ice' },
            { name: 'Snow Relocation', price: 100, unit: 'per hour', description: 'Moving big piles on site' }
        ]
    };

    const services = serviceTemplates[category] || [];

    const toggleService = (index) => {
        if (selectedServices.includes(index)) {
            setSelectedServices(selectedServices.filter(i => i !== index));
        } else {
            setSelectedServices([...selectedServices, index]);
        }
    };

    const selectAll = () => {
        setSelectedServices(services.map((_, i) => i));
    };

    const deselectAll = () => {
        setSelectedServices([]);
    };

    const handleConfirm = () => {
        const servicesToAdd = selectedServices.map(i => ({
            ...services[i],
            category
        }));
        onConfirm(servicesToAdd);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '12px', width: '90%', maxWidth: '700px',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Add Services to {category}</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                Select services to add to your catalog
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <X size={24} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                            onClick={selectAll}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '13px' }}
                        >
                            Select All
                        </button>
                        <button
                            onClick={deselectAll}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '13px' }}
                        >
                            Deselect All
                        </button>
                    </div>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {services.map((service, index) => {
                            const isSelected = selectedServices.includes(index);
                            return (
                                <div
                                    key={index}
                                    onClick={() => toggleService(index)}
                                    style={{
                                        padding: '16px',
                                        border: `2px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: isSelected ? '#eff6ff' : 'white',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '4px',
                                            border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                                            background: isSelected ? '#2563eb' : 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '2px'
                                        }}>
                                            {isSelected && <Check size={14} color="white" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                                                <div style={{ fontWeight: '500', fontSize: '15px', color: '#111827' }}>
                                                    {service.name}
                                                </div>
                                                <div style={{ fontWeight: '600', color: '#059669', fontSize: '14px', marginLeft: '12px' }}>
                                                    ${service.price} / {service.unit}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                {service.description}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button
                            onClick={handleConfirm}
                            className="btn btn-primary"
                            disabled={selectedServices.length === 0}
                        >
                            <Plus size={18} /> Add {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
