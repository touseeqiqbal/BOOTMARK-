import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CSVImportModal({ onClose, onConfirm, categories }) {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;

        const validTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
            setErrors(['Invalid file type. Please upload a CSV or Excel file.']);
            return;
        }

        setFile(selectedFile);
        parseFile(selectedFile);
    };

    const parseFile = (file) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target.result;
                let parsedServices = [];

                if (file.name.endsWith('.csv')) {
                    parsedServices = parseCSV(data);
                } else {
                    parsedServices = parseExcel(data);
                }

                validateAndSetData(parsedServices);
            } catch (error) {
                console.error('Parse error:', error);
                setErrors([`Failed to parse file: ${error.message}`]);
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    };

    const parseCSV = (csvText) => {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const services = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const service = {};

            headers.forEach((header, index) => {
                service[header] = values[index] || '';
            });

            services.push(service);
        }

        return services;
    };

    const parseExcel = (arrayBuffer) => {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
            throw new Error('Excel file is empty or has no data rows');
        }

        const headers = jsonData[0].map(h => String(h).trim().toLowerCase());
        const services = [];

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const service = {};
            headers.forEach((header, index) => {
                service[header] = row[index] !== undefined ? String(row[index]).trim() : '';
            });

            services.push(service);
        }

        return services;
    };

    const validateAndSetData = (services) => {
        const validatedServices = [];
        const validationErrors = [];

        services.forEach((service, index) => {
            const rowNumber = index + 2; // +2 because index 0 is header and we're 1-indexed
            const rowErrors = [];

            // Map common header variations to standard fields
            const name = service.name || service['service name'] || service.service || '';
            const description = service.description || service.desc || '';
            const price = service.price || service.cost || '';
            const category = service.category || service.cat || '';
            const unit = service.unit || service.pricing || 'per visit';

            // Validate required fields
            if (!name) {
                rowErrors.push(`Row ${rowNumber}: Missing service name`);
            }

            if (!price) {
                rowErrors.push(`Row ${rowNumber}: Missing price`);
            } else if (isNaN(parseFloat(price))) {
                rowErrors.push(`Row ${rowNumber}: Invalid price "${price}"`);
            }

            // Validate category if provided
            if (category && categories && !categories.includes(category)) {
                rowErrors.push(`Row ${rowNumber}: Invalid category "${category}". Available: ${categories.slice(1).join(', ')}`);
            }

            if (rowErrors.length > 0) {
                validationErrors.push(...rowErrors);
            } else {
                validatedServices.push({
                    name,
                    description,
                    price: parseFloat(price),
                    category: category || (categories && categories[1]) || 'Lawn / Turf Care',
                    unit: unit || 'per visit'
                });
            }
        });

        setParsedData(validatedServices);
        setErrors(validationErrors);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFileSelect(droppedFile);
    };

    const handleConfirm = () => {
        if (parsedData.length > 0) {
            onConfirm(parsedData);
            onClose();
        }
    };

    const downloadTemplate = () => {
        const template = [
            ['Name', 'Description', 'Price', 'Category', 'Unit'],
            ['Lawn Mowing', 'Standard lawn mowing service', '45', 'Lawn / Turf Care', 'per visit'],
            ['Trimming', 'Trimming around obstacles', '15', 'Lawn / Turf Care', 'per visit'],
            ['Fertilization', 'Granular or liquid fertilization', '75', 'Lawn / Turf Care', 'per application']
        ];

        const csv = template.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'services_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '12px', width: '90%', maxWidth: '800px',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Import Services from File</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                Upload a CSV or Excel file with your services
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <X size={24} />
                        </button>
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="btn btn-sm btn-secondary"
                        style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                        <Download size={16} /> Download CSV Template
                    </button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {!file ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${isDragging ? '#2563eb' : '#d1d5db'}`,
                                borderRadius: '8px',
                                padding: '40px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: isDragging ? '#eff6ff' : '#f9fafb',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Upload size={48} style={{ margin: '0 auto 16px', color: '#6b7280' }} />
                            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: '0 0 8px 0' }}>
                                Drop your file here or click to browse
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                                Supports CSV, XLSX, and XLS files
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => handleFileSelect(e.target.files[0])}
                                style={{ display: 'none' }}
                            />
                        </div>
                    ) : (
                        <div>
                            <div style={{
                                padding: '12px 16px',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '20px'
                            }}>
                                <FileText size={20} color="#2563eb" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{file.name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                        {(file.size / 1024).toFixed(2)} KB
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setParsedData([]);
                                        setErrors([]);
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {errors.length > 0 && (
                                <div style={{
                                    padding: '12px 16px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '8px',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <AlertCircle size={18} color="#dc2626" />
                                        <div style={{ fontWeight: '500', color: '#dc2626' }}>Validation Errors</div>
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#991b1b' }}>
                                        {errors.map((error, i) => (
                                            <li key={i}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {parsedData.length > 0 && (
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '12px',
                                        padding: '12px 16px',
                                        background: '#ecfdf5',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: '8px'
                                    }}>
                                        <Check size={18} color="#059669" />
                                        <div style={{ fontWeight: '500', color: '#059669' }}>
                                            {parsedData.length} service{parsedData.length !== 1 ? 's' : ''} ready to import
                                        </div>
                                    </div>

                                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                <tr>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Name</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Category</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedData.map((service, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        <td style={{ padding: '8px 12px' }}>
                                                            <div style={{ fontWeight: '500' }}>{service.name}</div>
                                                            {service.description && (
                                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>{service.description}</div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', color: '#6b7280' }}>{service.category}</td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '500', color: '#059669' }}>
                                                            ${service.price}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', color: '#6b7280' }}>{service.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {parsedData.length > 0 && `${parsedData.length} service${parsedData.length !== 1 ? 's' : ''} will be imported`}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button
                            onClick={handleConfirm}
                            className="btn btn-primary"
                            disabled={parsedData.length === 0}
                        >
                            <Upload size={18} /> Import {parsedData.length} Service{parsedData.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
