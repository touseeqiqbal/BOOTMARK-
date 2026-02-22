import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = "Search...", style = {} }) {
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '400px',
            ...style
        }}>
            <Search
                size={18}
                style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280',
                    pointerEvents: 'none'
                }}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '10px 40px 10px 40px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: '#fff'
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                }}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.color = '#111827';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                    }}
                    title="Clear search"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
