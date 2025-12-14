import { useState, useMemo } from 'react';
import {
    ChevronDown, ChevronUp, Download, FileSpreadsheet,
    FileText, Search, Filter, MoreHorizontal, CheckSquare, Square
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function DataGrid({
    data = [],
    columns = [],
    selectable = true,
    onSelectionChange,
    actions = [],
    tableName = 'Data Export'
}) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting Logic
    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        // Simple search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            sortableItems = sortableItems.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(lowerSearch)
                )
            );
        }
        return sortableItems;
    }, [data, sortConfig, searchTerm]);

    // Selection Logic
    const handleSelectAll = () => {
        if (selectedIds.size === sortedData.length) {
            setSelectedIds(new Set());
            onSelectionChange?.([]);
        } else {
            const allIds = new Set(sortedData.map(item => item.id));
            setSelectedIds(allIds);
            onSelectionChange?.(Array.from(allIds));
        }
    };

    const handleSelectRow = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        onSelectionChange?.(Array.from(newSelected));
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Export Logic
    const exportToExcel = () => {
        const exportData = selectedIds.size > 0
            ? sortedData.filter(item => selectedIds.has(item.id))
            : sortedData;

        // Flatten data based on columns
        const flattened = exportData.map(item => {
            const row = {};
            columns.forEach(col => {
                // Use render function result if string, else item value
                row[col.label] = item[col.key] || '';
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(flattened);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${tableName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const exportData = selectedIds.size > 0
            ? sortedData.filter(item => selectedIds.has(item.id))
            : sortedData;

        const tableColumn = columns.map(col => col.label);
        const tableRows = exportData.map(item => {
            return columns.map(col => item[col.key] || '');
        });

        doc.text(tableName, 14, 15);
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8, cellPadding: 2 },
            theme: 'grid'
        });
        doc.save(`${tableName}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {/* Toolbar */}
            <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '8px 12px 8px 32px',
                            border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={exportToExcel}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                    >
                        <FileSpreadsheet size={16} color="#10b981" /> Excel
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                    >
                        <FileText size={16} color="#ef4444" /> PDF
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                        <tr>
                            {selectable && (
                                <th style={{ padding: '10px 16px', width: '40px' }}>
                                    <div
                                        onClick={handleSelectAll}
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        {selectedIds.size === sortedData.length && sortedData.length > 0
                                            ? <CheckSquare size={16} color="#4f46e5" />
                                            : <Square size={16} color="#d1d5db" />
                                        }
                                    </div>
                                </th>
                            )}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    onClick={() => requestSort(col.key)}
                                    style={{
                                        padding: '10px 16px', textAlign: col.align || 'left',
                                        cursor: 'pointer', userSelect: 'none', fontWeight: '600',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                                        {col.label}
                                        {sortConfig.key === col.key && (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions.length > 0 && <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                                    No records found.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item, rowIdx) => (
                                <tr
                                    key={item.id || rowIdx}
                                    style={{
                                        borderBottom: '1px solid #f3f4f6',
                                        background: selectedIds.has(item.id) ? '#eff6ff' : 'white',
                                        transition: 'background 0.1s'
                                    }}
                                    className="data-grid-row"
                                >
                                    {selectable && (
                                        <td style={{ padding: '8px 16px' }}>
                                            <div
                                                onClick={() => handleSelectRow(item.id)}
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {selectedIds.has(item.id)
                                                    ? <CheckSquare size={16} color="#4f46e5" />
                                                    : <Square size={16} color="#d1d5db" />
                                                }
                                            </div>
                                        </td>
                                    )}
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} style={{ padding: '8px 16px', textAlign: col.align || 'left', whiteSpace: 'nowrap', maxWidth: col.width || 'auto', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {col.render ? col.render(item) : item[col.key]}
                                        </td>
                                    ))}
                                    {actions.length > 0 && (
                                        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                {actions.map((Action, aIdx) => (
                                                    <Action key={aIdx} item={item} />
                                                ))}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination (simplified) */}
            <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', color: '#6b7280', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    {selectedIds.size > 0 ? `${selectedIds.size} rows selected` : ''}
                </div>
                <div>
                    Total: {sortedData.length} rows
                </div>
            </div>
        </div>
    );
}
