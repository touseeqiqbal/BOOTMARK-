const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { generateNumber } = require(path.join(__dirname, "..", "utils", "numberGenerator"));

// Data file path (fallback)
function getWorkOrdersFilePath() {
    return getDataFilePath("workOrders.json");
}

// Helper: Read work orders
const readWorkOrders = async (businessId = null) => {
    if (useFirestore) {
        try {
            let query = getCollectionRef('workOrders');
            if (businessId) {
                query = query.where('businessId', '==', businessId);
            }
            const snapshot = await query.get();
            const items = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            return items;
        } catch (error) {
            console.error('Firestore read error:', error);
            return [];
        }
    }

    // Fallback to JSON
    const DATA_FILE = getWorkOrdersFilePath();
    try {
        await fs.access(DATA_FILE);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// Helper: Write work orders (JSON only)
const saveWorkOrders = async (orders) => {
    if (useFirestore) {
        // Not used when Firestore is enabled
        return;
    }
    const DATA_FILE = getWorkOrdersFilePath();
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(orders, null, 2));
};

// GET all work orders
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const orders = await readWorkOrders(businessId);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching work orders:', error);
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
});

// GET query filter
router.get('/query', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        let orders = await readWorkOrders(businessId);

        // Apply additional filters
        if (req.query.clientId) {
            orders = orders.filter(o => o.clientId === req.query.clientId);
        }
        if (req.query.status) {
            orders = orders.filter(o => o.status === req.query.status);
        }
        if (req.query.propertyId) {
            orders = orders.filter(o => o.propertyId === req.query.propertyId);
        }

        res.json(orders);
    } catch (error) {
        console.error('Error querying work orders:', error);
        res.status(500).json({ error: 'Failed to query work orders' });
    }
});

// ============================================
// WORK ORDER SETTINGS / CUSTOMIZATION
// ============================================

// Get work order settings for a business
router.get('/settings', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        let settings = null;

        if (useFirestore) {
            settings = await getDoc('workOrderSettings', businessId);
        } else {
            // JSON fallback
            const settingsFile = getDataFilePath('workOrderSettings.json');
            try {
                const data = await fs.readFile(settingsFile, 'utf8');
                const allSettings = JSON.parse(data);
                settings = allSettings.find(s => s.businessId === businessId);
            } catch (error) {
                // File doesn't exist yet
            }
        }

        // Return default settings if none exist
        if (!settings) {
            settings = {
                businessId,
                defaultFields: {
                    scheduledDate: { visible: true, required: false, label: 'Scheduled Date' },
                    status: { visible: true, required: true, label: 'Status' },
                    price: { visible: true, required: false, label: 'Price' },
                    startTime: { visible: true, required: false, label: 'Start Time' },
                    finishTime: { visible: true, required: false, label: 'Finish Time' },
                    deicingMaterial: { visible: true, required: false, label: 'Deicing Material?' },
                    estimatedDuration: { visible: false, required: false, label: 'Estimated Duration' },
                    description: { visible: true, required: false, label: 'Description (Additional Notes)' },
                    notes: { visible: true, required: false, label: 'Internal Notes' }
                },
                customFields: [],
                fieldOrder: ['client', 'property', 'scheduledDate', 'status', 'price', 'startTime', 'finishTime', 'deicingMaterial'],
                templates: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }

        res.json(settings);
    } catch (error) {
        console.error('Error fetching work order settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update work order settings
router.put('/settings', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const settings = {
            ...req.body,
            businessId,
            updatedAt: new Date().toISOString()
        };

        // Ensure createdAt exists
        if (!settings.createdAt) {
            settings.createdAt = new Date().toISOString();
        }

        if (useFirestore) {
            await setDoc('workOrderSettings', businessId, settings);
        } else {
            // JSON fallback
            const settingsFile = getDataFilePath('workOrderSettings.json');
            let allSettings = [];

            try {
                const data = await fs.readFile(settingsFile, 'utf8');
                allSettings = JSON.parse(data);
            } catch (error) {
                // File doesn't exist yet
            }

            const index = allSettings.findIndex(s => s.businessId === businessId);
            if (index !== -1) {
                allSettings[index] = settings;
            } else {
                allSettings.push(settings);
            }

            const dir = path.dirname(settingsFile);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(settingsFile, JSON.stringify(allSettings, null, 2));
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating work order settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Add custom field
router.post('/settings/custom-field', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const { name, label, type, options, required, placeholder, helpText } = req.body;

        if (!name || !label || !type) {
            return res.status(400).json({ error: 'Name, label, and type are required' });
        }

        // Get current settings
        let settings = null;
        if (useFirestore) {
            settings = await getDoc('workOrderSettings', businessId);
        } else {
            const settingsFile = getDataFilePath('workOrderSettings.json');
            try {
                const data = await fs.readFile(settingsFile, 'utf8');
                const allSettings = JSON.parse(data);
                settings = allSettings.find(s => s.businessId === businessId);
            } catch (error) {
                // Will create new settings
            }
        }

        if (!settings) {
            return res.status(404).json({ error: 'Settings not found. Please initialize settings first.' });
        }

        // Create new custom field
        const customField = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            label,
            type,
            options: options || [],
            required: required || false,
            placeholder: placeholder || '',
            helpText: helpText || '',
            order: settings.customFields.length,
            createdAt: new Date().toISOString()
        };

        settings.customFields.push(customField);
        settings.updatedAt = new Date().toISOString();

        // Save updated settings
        if (useFirestore) {
            await setDoc('workOrderSettings', businessId, settings);
        } else {
            const settingsFile = getDataFilePath('workOrderSettings.json');
            const data = await fs.readFile(settingsFile, 'utf8');
            const allSettings = JSON.parse(data);
            const index = allSettings.findIndex(s => s.businessId === businessId);
            allSettings[index] = settings;
            await fs.writeFile(settingsFile, JSON.stringify(allSettings, null, 2));
        }

        res.json({ success: true, customField, settings });
    } catch (error) {
        console.error('Error adding custom field:', error);
        res.status(500).json({ error: 'Failed to add custom field' });
    }
});

// Delete custom field
router.delete('/settings/custom-field/:fieldId', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const { fieldId } = req.params;

        // Get current settings
        let settings = null;
        if (useFirestore) {
            settings = await getDoc('workOrderSettings', businessId);
        } else {
            const settingsFile = getDataFilePath('workOrderSettings.json');
            const data = await fs.readFile(settingsFile, 'utf8');
            const allSettings = JSON.parse(data);
            settings = allSettings.find(s => s.businessId === businessId);
        }

        if (!settings) {
            return res.status(404).json({ error: 'Settings not found' });
        }

        // Remove custom field
        settings.customFields = settings.customFields.filter(f => f.id !== fieldId);
        settings.updatedAt = new Date().toISOString();

        // Save updated settings
        if (useFirestore) {
            await setDoc('workOrderSettings', businessId, settings);
        } else {
            const settingsFile = getDataFilePath('workOrderSettings.json');
            const data = await fs.readFile(settingsFile, 'utf8');
            const allSettings = JSON.parse(data);
            const index = allSettings.findIndex(s => s.businessId === businessId);
            allSettings[index] = settings;
            await fs.writeFile(settingsFile, JSON.stringify(allSettings, null, 2));
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error deleting custom field:', error);
        res.status(500).json({ error: 'Failed to delete custom field' });
    }
});


// GET single work order
router.get('/:id', async (req, res) => {
    try {
        if (useFirestore) {
            const order = await getDoc('workOrders', req.params.id);
            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (req.user?.businessId && order.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(order);
        } else {
            const orders = await readWorkOrders();
            const order = orders.find(o => o.id === req.params.id);

            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (req.user?.businessId && order.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(order);
        }
    } catch (error) {
        console.error('Error fetching work order:', error);
        res.status(500).json({ error: 'Failed to fetch work order' });
    }
});

// POST create work order
router.post('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        if (!req.body.clientId) {
            return res.status(400).json({ error: 'Client ID is required' });
        }

        const id = uuidv4();

        // Generate work order number using custom format
        let workOrderNumber;
        try {
            workOrderNumber = await generateNumber(businessId, 'workOrder');
        } catch (error) {
            console.error('Error generating work order number:', error);
            // Fallback to timestamp-based number if generation fails
            workOrderNumber = `WO-${Date.now().toString().slice(-6)}`;
        }

        const newOrder = {
            id,
            businessId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft', // draft, scheduled, in-progress, completed, invoiced, paid
            workOrderNumber,
            ...req.body
        };

        if (useFirestore) {
            await setDoc('workOrders', id, newOrder);
        } else {
            const orders = await readWorkOrders();
            orders.push(newOrder);
            await saveWorkOrders(orders);
        }

        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Error creating work order:', error);
        res.status(500).json({ error: 'Failed to create work order' });
    }
});

// PUT update work order
router.put('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const existing = await getDoc('workOrders', req.params.id);

            if (!existing) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && existing.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const updatedOrder = {
                ...existing,
                ...req.body,
                id: req.params.id,
                businessId: existing.businessId, // Prevent businessId from being changed
                updatedAt: new Date().toISOString()
            };

            await setDoc('workOrders', req.params.id, updatedOrder);
            res.json(updatedOrder);
        } else {
            const orders = await readWorkOrders();
            const index = orders.findIndex(o => o.id === req.params.id);

            if (index === -1) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && orders[index].businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            orders[index] = {
                ...orders[index],
                ...req.body,
                businessId: orders[index].businessId, // Prevent businessId from being changed
                updatedAt: new Date().toISOString()
            };

            await saveWorkOrders(orders);
            res.json(orders[index]);
        }
    } catch (error) {
        console.error('Error updating work order:', error);
        res.status(500).json({ error: 'Failed to update work order' });
    }
});

// DELETE work order
router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const order = await getDoc('workOrders', req.params.id);

            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && order.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            await deleteDoc('workOrders', req.params.id);
        } else {
            const orders = await readWorkOrders();
            const order = orders.find(o => o.id === req.params.id);

            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && order.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const filtered = orders.filter(o => o.id !== req.params.id);
            await saveWorkOrders(filtered);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting work order:', error);
        res.status(500).json({ error: 'Failed to delete work order' });
    }
});

// GET work order as PDF
router.get('/:id/pdf', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        let workOrder;

        if (useFirestore) {
            workOrder = await getDoc('workOrders', req.params.id);
        } else {
            const orders = await readWorkOrders();
            workOrder = orders.find(o => o.id === req.params.id);
        }

        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Check business access
        if (businessId && workOrder.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Generate HTML for PDF
        const itemsHtml = (workOrder.items || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name || item.description || 'Item'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.price || 0).toFixed(2)}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Work Order ${workOrder.workOrderNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 40px; }
                    .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .section { margin-bottom: 20px; }
                    .section-title { font-size: 18px; font-weight: bold; color: #4f46e5; margin-bottom: 10px; border-bottom: 2px solid #4f46e5; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; }
                    td { padding: 8px; }
                    .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                    .info-item { padding: 10px; background: #f9fafb; border-radius: 6px; }
                    .info-label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
                    .info-value { font-size: 16px; margin-top: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Work Order</h1>
                    <p style="margin: 5px 0 0 0; font-size: 16px;">#${workOrder.workOrderNumber || workOrder.id}</p>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Client</div>
                        <div class="info-value">${workOrder.clientName || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value" style="text-transform: capitalize;">${workOrder.status || 'Draft'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Address</div>
                        <div class="info-value">${workOrder.address || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Date</div>
                        <div class="info-value">${workOrder.scheduledDate ? new Date(workOrder.scheduledDate).toLocaleDateString() : 'Not scheduled'}</div>
                    </div>
                </div>

                ${workOrder.title ? `
                <div class="section">
                    <div class="section-title">Title</div>
                    <p>${workOrder.title}</p>
                </div>
                ` : ''}

                ${workOrder.description ? `
                <div class="section">
                    <div class="section-title">Description</div>
                    <p>${workOrder.description}</p>
                </div>
                ` : ''}

                ${workOrder.items && workOrder.items.length > 0 ? `
                <div class="section">
                    <div class="section-title">Items</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <div class="total">
                        Total: $${Number(workOrder.price || workOrder.totalAmount || 0).toFixed(2)}
                    </div>
                </div>
                ` : ''}

                ${workOrder.notes ? `
                <div class="section">
                    <div class="section-title">Notes</div>
                    <p>${workOrder.notes}</p>
                </div>
                ` : ''}

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>
            </body>
            </html>
        `;

        // For now, return HTML (you can integrate a PDF library like puppeteer or pdfkit later)
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="work-order-${workOrder.workOrderNumber || req.params.id}.html"`);
        res.send(html);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// POST email work order
router.post('/:id/email', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const { to, message } = req.body;

        if (!to || !to.includes('@')) {
            return res.status(400).json({ error: 'Valid email address is required' });
        }

        let workOrder;
        if (useFirestore) {
            workOrder = await getDoc('workOrders', req.params.id);
        } else {
            const orders = await readWorkOrders();
            workOrder = orders.find(o => o.id === req.params.id);
        }

        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Check business access
        if (businessId && workOrder.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get user/business info for email
        let user;
        if (useFirestore) {
            user = await getDoc('users', req.user.uid || req.user.id);
        } else {
            const usersFile = getDataFilePath("users.json");
            const usersData = await fs.readFile(usersFile, "utf8");
            const users = JSON.parse(usersData);
            user = users.find((u) => (u.uid || u.id) === (req.user.uid || req.user.id));
        }

        const businessInfo = user?.businessInfo || {};
        const companyName = businessInfo.companyName || user?.companyName || 'Your Company';

        // Generate work order HTML
        const itemsHtml = (workOrder.items || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name || item.description || 'Item'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.price || 0).toFixed(2)}</td>
            </tr>
        `).join('');

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                    table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; }
                    th { background: #4f46e5; color: white; padding: 10px; text-align: left; }
                    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
                    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">Work Order</h1>
                        <p style="margin: 10px 0 0 0;">#${workOrder.workOrderNumber || workOrder.id}</p>
                    </div>
                    <div class="content">
                        ${message ? `<p style="white-space: pre-line;">${message}</p><hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">` : ''}
                        
                        <h3>Work Order Details</h3>
                        <p><strong>Client:</strong> ${workOrder.clientName || 'N/A'}</p>
                        <p><strong>Address:</strong> ${workOrder.address || 'N/A'}</p>
                        <p><strong>Status:</strong> ${workOrder.status || 'Draft'}</p>
                        ${workOrder.scheduledDate ? `<p><strong>Scheduled:</strong> ${new Date(workOrder.scheduledDate).toLocaleDateString()}</p>` : ''}
                        
                        ${workOrder.title ? `<h3>Title</h3><p>${workOrder.title}</p>` : ''}
                        ${workOrder.description ? `<h3>Description</h3><p>${workOrder.description}</p>` : ''}
                        
                        ${workOrder.items && workOrder.items.length > 0 ? `
                        <h3>Items</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th style="text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <div class="total">Total: $${Number(workOrder.price || workOrder.totalAmount || 0).toFixed(2)}</div>
                        ` : ''}
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send email using email service
        const { sendEmail } = require(path.join(__dirname, "..", "utils", "emailService"));

        const result = await sendEmail({
            to: to,
            subject: `Work Order ${workOrder.workOrderNumber || workOrder.id}${companyName ? ` from ${companyName}` : ''}`,
            html: emailHtml,
            userSmtpConfig: user?.smtpConfig || null
        });

        if (result.success) {
            res.json({
                success: true,
                message: "Work order sent successfully!",
                messageId: result.messageId
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || "Failed to send work order email"
            });
        }
    } catch (error) {
        console.error('Error sending work order email:', error);
        res.status(500).json({ error: 'Failed to send work order email', message: error.message });
    }
});

module.exports = router;

