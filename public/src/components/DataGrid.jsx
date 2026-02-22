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
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Search data orchestration..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px 10px 40px',
                            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '14px',
                            fontWeight: '600', color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-secondary)',
                            transition: 'all 0.2s'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={exportToExcel}
                        className="btn-modern btn-modern-secondary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                        <FileSpreadsheet size={16} color="var(--success-600)" />
                        <span style={{ fontWeight: '800' }}>EXPORT EXCEL</span>
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="btn-modern btn-modern-secondary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                        <FileText size={16} color="var(--error-600)" />
                        <span style={{ fontWeight: '800' }}>EXPORT PDF</span>
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div style={{ overflowX: 'auto' }}>
                <table className="modern-table" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            {selectable && (
                                <th style={{ width: '48px', padding: '16px 20px', textAlign: 'center' }}>
                                    <label className="checkbox-custom">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === sortedData.length && sortedData.length > 0}
                                            onChange={handleSelectAll}
                                        />
                                        <span className="checkmark"></span>
                                    </label>
                                </th>
                            )}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    onClick={() => requestSort(col.key)}
                                    style={{
                                        cursor: 'pointer',
                                        textAlign: col.align || 'left',
                                        padding: '16px 20px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                                        {col.label}
                                        {sortConfig.key === col.key && (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} color="var(--primary-600)" /> : <ChevronDown size={14} color="var(--primary-600)" />
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions.length > 0 && <th style={{ textAlign: 'right', paddingRight: '20px' }}>ACTIONS</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} style={{ padding: '64px 32px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <Filter size={32} color="var(--text-tertiary)" style={{ opacity: 0.3 }} />
                                        <span style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>No synchronized records found.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item, rowIdx) => (
                                <tr
                                    key={item.id || rowIdx}
                                    className={`${selectedIds.has(item.id) ? 'selected' : ''}`}
                                >
                                    {selectable && (
                                        <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                                            <label className="checkbox-custom">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => handleSelectRow(item.id)}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>
                                    )}
                                    {columns.map((col, cIdx) => (
                                        <td key={cIdx} style={{ padding: '16px 20px', textAlign: col.align || 'left', maxWidth: col.width || 'auto' }}>
                                            <div style={{ fontWeight: cIdx === 0 ? '900' : '600', color: cIdx === 0 ? 'var(--primary-600)' : 'var(--text-secondary)' }}>
                                                {col.render ? col.render(item) : item[col.key]}
                                            </div>
                                        </td>
                                    ))}
                                    {actions.length > 0 && (
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
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
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', fontSize: '11px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div>
                    {selectedIds.size > 0 ? `${selectedIds.size} ENTRIES SELECTED` : 'NO SELECTION'}
                </div>
                <div>
                    SYNCHRONIZED TOTAL: {sortedData.length} RECORDS
                </div>
            </div>
        </div>
    );
}
