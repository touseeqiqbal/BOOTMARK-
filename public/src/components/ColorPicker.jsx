import React from 'react';

export default function ColorPicker({ color, onChange }) {
    const presetColors = [
        '#3b82f6', // Blue
        '#10b981', // Green
        '#ef4444', // Red
        '#f59e0b', // Yellow
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#6b7280', // Gray
        '#111827'  // Black
    ];

    return (
        <div className="color-picker" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {presetColors.map(c => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: color === c ? '2px solid #000' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0
                    }}
                    title={c}
                />
            ))}
            <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                <input
                    type="color"
                    value={color || '#3b82f6'}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        cursor: 'pointer'
                    }}
                />
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    border: '2px solid transparent'
                }} />
            </div>
        </div>
    );
}
