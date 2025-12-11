import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = [];
    const keys = Object.keys(data[0]);

    keys.forEach((key, i) => {
        const maxLength = Math.max(
            key.length,
            ...data.map(row => String(row[key] || '').length)
        );
        colWidths[i] = { wch: Math.min(maxLength + 2, 50) };
    });

    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export multiple sheets to one Excel file
 * @param {Array} sheets - Array of {data, sheetName} objects
 * @param {string} filename - Name of the file (without extension)
 */
export const exportMultipleSheets = (sheets, filename) => {
    if (!sheets || sheets.length === 0) {
        alert('No data to export');
        return;
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    sheets.forEach(({ data, sheetName }) => {
        if (data && data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);

            // Auto-size columns
            const colWidths = [];
            const keys = Object.keys(data[0]);

            keys.forEach((key, i) => {
                const maxLength = Math.max(
                    key.length,
                    ...data.map(row => String(row[key] || '').length)
                );
                colWidths[i] = { wch: Math.min(maxLength + 2, 50) };
            });

            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    });

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Format clients data for Excel export
 */
export const formatClientsForExcel = (clients) => {
    return clients.map(client => ({
        'Name': client.name || '',
        'Email': client.email || '',
        'Phone': client.phone || '',
        'Company': client.company || '',
        'Address': client.address || '',
        'City': client.city || '',
        'State': client.state || '',
        'Zip': client.zip || '',
        'Status': client.status || '',
        'Created Date': client.createdAt ? new Date(client.createdAt).toLocaleDateString() : ''
    }));
};

/**
 * Format properties data for Excel export
 */
export const formatPropertiesForExcel = (properties) => {
    return properties.map(property => ({
        'Address': property.address || '',
        'City': property.city || '',
        'State': property.state || '',
        'Zip': property.zip || '',
        'Property Type': property.propertyType || '',
        'Created Date': property.createdAt ? new Date(property.createdAt).toLocaleDateString() : ''
    }));
};

/**
 * Format work orders data for Excel export
 */
export const formatWorkOrdersForExcel = (workOrders) => {
    return workOrders.map(order => ({
        'Work Order #': order.workOrderNumber || '',
        'Title': order.title || '',
        'Status': order.status || '',
        'Client': order.clientName || '',
        'Address': order.address || '',
        'Scheduled Date': order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : '',
        'Total Amount': order.totalAmount ? `$${order.totalAmount.toFixed(2)}` : '$0.00',
        'Created Date': order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''
    }));
};

/**
 * Format materials data for Excel export
 */
export const formatMaterialsForExcel = (materials) => {
    return materials.map(material => ({
        'Name': material.name || '',
        'SKU': material.sku || '',
        'Category': material.category || '',
        'Description': material.description || '',
        'Unit': material.unit || '',
        'Cost Price': material.costPrice || 0,
        'Selling Price': material.sellingPrice || 0,
        'Quantity in Stock': material.quantityInStock || 0,
        'Min Stock Level': material.minStockLevel || 0,
        'Supplier': material.supplier || '',
        'Location': material.location || '',
        'Notes': material.notes || ''
    }));
};

/**
 * Format services data for Excel export
 */
export const formatServicesForExcel = (services) => {
    return services.map(service => ({
        'Name': service.name || '',
        'Category': service.category || '',
        'Description': service.description || '',
        'Price': service.price ? `$${service.price.toFixed(2)}` : '$0.00',
        'Duration': service.duration || '',
        'Status': service.active ? 'Active' : 'Inactive'
    }));
};

/**
 * Format products data for Excel export
 */
export const formatProductsForExcel = (products) => {
    return products.map(product => ({
        'Name': product.name || '',
        'SKU': product.sku || '',
        'Category': product.category || '',
        'Description': product.description || '',
        'Price': product.price ? `$${product.price.toFixed(2)}` : '$0.00',
        'Stock': product.stock || 0,
        'Status': product.active ? 'Active' : 'Inactive'
    }));
};

/**
 * Format invoices data for Excel export
 */
export const formatInvoicesForExcel = (invoices) => {
    return invoices.map(invoice => ({
        'Invoice #': invoice.invoiceNumber || '',
        'Client': invoice.clientName || '',
        'Status': invoice.status || '',
        'Issue Date': invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '',
        'Due Date': invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
        'Subtotal': invoice.subtotal ? `$${invoice.subtotal.toFixed(2)}` : '$0.00',
        'Tax': invoice.tax ? `$${invoice.tax.toFixed(2)}` : '$0.00',
        'Total': invoice.total ? `$${invoice.total.toFixed(2)}` : '$0.00',
        'Amount Paid': invoice.amountPaid ? `$${invoice.amountPaid.toFixed(2)}` : '$0.00',
        'Balance': invoice.balance ? `$${invoice.balance.toFixed(2)}` : '$0.00'
    }));
};

/**
 * Format employees data for Excel export
 */
export const formatEmployeesForExcel = (employees) => {
    return employees.map(employee => ({
        'Name': employee.name || '',
        'Email': employee.email || '',
        'Phone': employee.phone || '',
        'Role': employee.role || '',
        'Skills': Array.isArray(employee.skills) ? employee.skills.join(', ') : '',
        'Status': employee.status || '',
        'Hire Date': employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : ''
    }));
};

/**
 * Format schedules data for Excel export
 */
export const formatSchedulesForExcel = (schedules) => {
    return schedules.map(schedule => ({
        'Title': schedule.title || '',
        'Work Order #': schedule.workOrderNumber || '',
        'Client': schedule.clientName || '',
        'Property': schedule.propertyAddress || '',
        'Start Date': schedule.startDate ? new Date(schedule.startDate).toLocaleString() : '',
        'End Date': schedule.endDate ? new Date(schedule.endDate).toLocaleString() : '',
        'Status': schedule.status || '',
        'Assigned Crew': Array.isArray(schedule.assignedCrew) ? schedule.assignedCrew.join(', ') : '',
        'Recurring': schedule.isRecurring ? 'Yes' : 'No'
    }));
};

/**
 * Format contracts data for Excel export
 */
export const formatContractsForExcel = (contracts, clients = []) => {
    return contracts.map(contract => {
        const client = clients.find(c => c.id === contract.clientId);
        return {
            'Contract Title': contract.title || '',
            'Client': client?.name || contract.clientName || 'Unknown',
            'Status': contract.status || 'draft',
            'Start Date': contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '',
            'End Date': contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '',
            'Value': contract.amount ? `$${parseFloat(contract.amount).toFixed(2)}` : '$0.00',
            'Description': contract.description || '',
            'Created Date': contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : ''
        };
    });
};
