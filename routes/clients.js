const express = require('express');
const router = express.Router();
const path = require('path');
const {
    admin,
    getCollectionRef,
    getDoc,
    setDoc
} = require('../utils/db');

const { Filter } = require('firebase-admin/firestore');
const { validateRequest, clientMessageSchema, serviceRequestSchema, profileUpdateSchema } = require('../utils/validation');

// ============================================
// MIDDLEWARE: ENFORCE BUSINESS CONTEXT
// ============================================

const determineBusinessContext = async (req, res, next) => {
    // 1. If user already has businessId (employee/owner), use it
    if (req.user?.businessId) {
        return next();
    }

    // 2. Client User - Check for explicit context
    const businessIdHeader = req.headers['x-business-id'];
    const businessIdQuery = req.query.businessId;
    const requestedBusinessId = businessIdHeader || businessIdQuery;

    // 3. Fallback: If no explicit context, we must be strict
    // We cannot just guess, but for legacy compatibility we might need to "peek"
    // However, the security requirement is strict: "If missing, block or limit"

    if (requestedBusinessId) {
        req.user.businessId = requestedBusinessId;
    }
    // Optimization: If no business ID provided, we must rely on email but we MUST fetch *only* if the email is truly unique or we return nothing to be safe against leakage.
    // However, the existing logic relied on iterating searches.
    // The safer approach: If no businessId, we force the portal to select one if multiple exist.
    // For now, we'll proceed but flag it. Or we can auto-detect if the user belongs to exactly one business.

    // Let's implement auto-detect for single-business clients
    if (!req.user.businessId) {
        try {
            // Find all customers with this email
            const snap = await getCollectionRef('customers').where('email', '==', req.user.email).get();
            if (snap.empty) {
                return res.status(403).json({ error: 'No associated customer account found' });
            }
            if (snap.size === 1) {
                req.user.businessId = snap.docs[0].data().businessId;
            } else {
                return res.status(400).json({
                    error: 'Multiple business accounts found. Please select a business context.',
                    code: 'AMBIGUOUS_CONTEXT',
                    businesses: snap.docs.map(d => ({ id: d.data().businessId, name: d.data().businessName || 'Unknown Business' }))
                });
            }
        } catch (e) {
            console.error('Context detection failed:', e);
            return res.status(500).json({ error: 'Failed to determine account context' });
        }
    }

    next();
};

// Apply context middleware to all routes
router.use(determineBusinessContext);

// Helper: Get invoices with DB filtering
async function getInvoices(businessId, customerEmail, customerId) {
    try {
        let query = getCollectionRef('invoices');

        // Base filter: match customer by ID or Email
        const customerFilters = [];
        if (customerId) customerFilters.push(Filter.where('customerId', '==', customerId));
        if (customerEmail) customerFilters.push(Filter.where('customerEmail', '==', customerEmail));

        if (customerFilters.length === 0) return [];

        let filter = Filter.or(...customerFilters);

        // Add businessId filter if present (now enforced by middleware)
        if (businessId) {
            filter = Filter.and(Filter.where('businessId', '==', businessId), filter);
        }

        const snap = await query.where(filter).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    } catch (e) {
        console.error('Error fetching invoices from Firestore:', e);
        return [];
    }
}

const customerService = require('../utils/CustomerService');

// Helper: Get customer by email
async function getCustomerByEmail(email) {
    return await customerService.getCustomerByEmail(email);
}

// Helper: Get customer by ID
async function getCustomerById(id) {
    // Optimized: Fetch directly if ID known, otherwise legacy scan (but we should avoid scan)
    const doc = await getDoc('customers', id);
    return doc;
}

// Helper: Get work orders with DB filtering
async function getWorkOrders(businessId, customerEmail, customerId) {
    try {
        let query = getCollectionRef('workOrders');

        const customerFilters = [];
        if (customerId) {
            customerFilters.push(Filter.where('clientId', '==', customerId));
            customerFilters.push(Filter.where('customerId', '==', customerId));
        }
        if (customerEmail) {
            customerFilters.push(Filter.where('clientEmail', '==', customerEmail));
        }

        if (customerFilters.length === 0) return [];

        let filter = Filter.or(...customerFilters);

        if (businessId) {
            filter = Filter.and(Filter.where('businessId', '==', businessId), filter);
        }

        const snap = await query.where(filter).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    } catch (e) {
        console.error('Error fetching work orders from Firestore:', e);
        return [];
    }
}

// Helper: Get submissions with DB filtering
async function getSubmissions(businessId, customerEmail, customerId) {
    try {
        let query = getCollectionRef('submissions');

        const customerFilters = [];
        if (customerId) customerFilters.push(Filter.where('customerId', '==', customerId));
        if (customerEmail) customerFilters.push(Filter.where('customerEmail', '==', customerEmail));

        if (customerFilters.length === 0) return [];

        let filter = Filter.or(...customerFilters);

        if (businessId) {
            filter = Filter.and(Filter.where('businessId', '==', businessId), filter);
        }

        const snap = await query.where(filter).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    } catch (e) {
        console.error('Error fetching submissions from Firestore:', e);
        return [];
    }
}

// Helper: Get contracts with DB filtering
async function getContracts(businessId, customerEmail, customerId) {
    try {
        let query = getCollectionRef('contracts');

        const customerFilters = [];
        if (customerId) {
            customerFilters.push(Filter.where('clientId', '==', customerId));
            customerFilters.push(Filter.where('customerId', '==', customerId));
        }
        if (customerEmail) {
            customerFilters.push(Filter.where('clientEmail', '==', customerEmail));
        }

        if (customerFilters.length === 0) return [];

        let filter = Filter.or(...customerFilters);

        if (businessId) {
            filter = Filter.and(Filter.where('businessId', '==', businessId), filter);
        }

        const snap = await query.where(filter).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    } catch (e) {
        console.error('Error fetching contracts from Firestore:', e);
        return [];
    }
}

// GET /api/clients/dashboard - Client overview
router.get('/dashboard', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId; // Populated by middleware

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // We specifically want the customer record FOR THIS BUSINESS
        // getCustomerByEmail is generic, we need specific
        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();

        if (snap.empty) {
            return res.status(404).json({ error: 'Customer record not found for this business' });
        }
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        // Fetch filtered data using strictly scoped ID
        // We rely on ID matching now that we have the specific customer record
        const customerInvoices = await getInvoices(businessId, null, customer.id);
        const customerWorkOrders = await getWorkOrders(businessId, null, customer.id);
        const customerSubmissions = await getSubmissions(businessId, null, customer.id);
        const customerContracts = await getContracts(businessId, null, customer.id);

        const unpaidInvoices = customerInvoices.filter(inv => inv.status !== 'paid');
        const totalBalance = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
        const upcomingAppointments = customerWorkOrders.filter(wo =>
            wo.status === 'scheduled' && new Date(wo.scheduledDate) > new Date()
        ).length;

        const stats = {
            totalInvoices: customerInvoices.length,
            unpaidInvoices: unpaidInvoices.length,
            totalBalance: totalBalance.toFixed(2),
            totalWorkOrders: customerWorkOrders.length,
            pendingWorkOrders: customerWorkOrders.filter(wo => wo.status === 'pending' || wo.status === 'scheduled').length,
            upcomingAppointments,
            activeServices: customerWorkOrders.filter(wo => wo.status === 'in-progress' || wo.status === 'scheduled').length,
            totalDocuments: customerInvoices.length + customerWorkOrders.length + customerSubmissions.length,
            activeContracts: customerContracts.filter(c => c.status === 'active').length,
            totalContracts: customerContracts.length,
            pendingSignatures: customerContracts.filter(c => c.signatureStatus === 'pending' || c.signatureStatus === 'unsigned').length
        };

        const recentActivity = [
            ...customerInvoices.slice(0, 3).map(inv => ({
                type: 'invoice',
                title: `Invoice #${inv.invoiceNumber} - $${inv.total}`,
                date: inv.createdAt,
                status: inv.status
            })),
            ...customerWorkOrders.slice(0, 3).map(wo => ({
                type: 'service',
                title: wo.title || 'Service completed',
                date: wo.completedDate || wo.createdAt,
                status: wo.status
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        const recentInvoices = customerInvoices
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const recentWorkOrders = customerWorkOrders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const recentSubmissions = customerSubmissions
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
            .slice(0, 5);

        res.json({
            customer,
            invoices: recentInvoices,
            workOrders: recentWorkOrders,
            recentSubmissions,
            stats,
            recentActivity
        });
    } catch (error) {
        console.error('Client dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// GET /api/clients/invoices - Client's invoices
router.get('/invoices', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.json([]);
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        const customerInvoices = await getInvoices(businessId, null, customer.id);
        res.json(customerInvoices);
    } catch (error) {
        console.error('Client invoices error:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// GET /api/clients/invoices/:id - Single invoice details
router.get('/invoices/:id', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        // Verify the invoice belongs to this business AND the user
        const invoice = await getDoc('invoices', req.params.id);

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        // Verify ownership (match customerId)
        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();

        if (snap.empty) return res.status(403).json({ error: 'Access denied' });
        const customer = snap.docs[0].data();

        if (invoice.customerId !== snap.docs[0].id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(invoice);
    } catch (error) {
        console.error('Client invoice detail error:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// GET /api/clients/work-orders - Client's work orders
router.get('/work-orders', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.json([]);
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        const customerWorkOrders = await getWorkOrders(businessId, null, customer.id);
        res.json(customerWorkOrders);
    } catch (error) {
        console.error('Client work orders error:', error);
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
});

// GET /api/clients/work-orders/:id - Single work order details
router.get('/work-orders/:id', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const workOrder = await getDoc('workOrders', req.params.id);
        if (!workOrder) return res.status(404).json({ error: 'Work order not found' });
        if (workOrder.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();

        if (snap.empty) return res.status(403).json({ error: 'Access denied' });
        const customerId = snap.docs[0].id;

        if (workOrder.customerId !== customerId && workOrder.clientId !== customerId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(workOrder);
    } catch (error) {
        console.error('Client work order detail error:', error);
        res.status(500).json({ error: 'Failed to fetch work order' });
    }
});

// GET /api/clients/profile - Client profile
router.get('/profile', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user.businessId;
        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();

        if (snap.empty) return res.status(404).json({ error: 'Customer profile not found' });
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        res.json(customer);
    } catch (error) {
        console.error('Client profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/clients/profile - Update profile
router.put('/profile', validateRequest(profileUpdateSchema), async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user.businessId;
        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();

        if (snap.empty) return res.status(404).json({ error: 'Customer profile not found' });
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        const { name, phone, address, city, state, zip, notes } = req.body;

        const updatedCustomer = {
            ...customer,
            name: name || customer.name,
            phone: phone || customer.phone,
            address: address || customer.address,
            city: city || customer.city,
            state: state || customer.state,
            zip: zip || customer.zip,
            notes: notes !== undefined ? notes : customer.notes,
            updatedAt: new Date().toISOString()
        };

        // Use standard db method
        await setDoc('customers', customer.id, updatedCustomer);

        res.json(updatedCustomer);
    } catch (error) {
        console.error('Client profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET /api/clients/service-requests
router.get('/service-requests', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user.businessId;
        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.json([]);
        const customerId = snap.docs[0].id;

        // Filtered Query
        const reqSnap = await getCollectionRef('serviceRequests')
            .where('customerId', '==', customerId)
            .where('businessId', '==', businessId)
            .get();
        const serviceRequests = [];
        reqSnap.forEach(d => serviceRequests.push({ id: d.id, ...d.data() }));
        serviceRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(serviceRequests);
    } catch (error) {
        console.error('Client service requests error:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// POST /api/clients/service-requests
router.post('/service-requests', validateRequest(serviceRequestSchema), async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.status(404).json({ error: 'Customer not found' });
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        const { serviceType, description, preferredDate, priority } = req.body;

        const serviceRequest = {
            id: Date.now().toString(),
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: userEmail,
            businessId: businessId,
            serviceType,
            description,
            preferredDate,
            priority: priority || 'normal',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        await setDoc('serviceRequests', serviceRequest.id, serviceRequest);

        const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
        sendBusinessNotification(serviceRequest.businessId, {
            type: 'info',
            title: 'New Service Request',
            message: `${customer.name} requested ${serviceType}`
        });

        res.json({ success: true, request: serviceRequest });
    } catch (error) {
        console.error('Service request error:', error);
        res.status(500).json({ error: 'Failed to submit service request' });
    }
});

// GET /api/clients/messages
router.get('/messages', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user.businessId;
        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.json([]);
        const customerId = snap.docs[0].id;

        const msgSnap = await getCollectionRef('messages')
            .where('customerId', '==', customerId)
            .where('businessId', '==', businessId)
            .get();
        const messages = [];
        msgSnap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(messages);
    } catch (error) {
        console.error('Messages fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/clients/messages
router.post('/messages', validateRequest(clientMessageSchema), async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;
        const { message, fromClient } = req.body;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.status(404).json({ error: 'Customer not found' });
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        const newMessage = {
            id: Date.now().toString(),
            customerId: customer.id,
            customerName: customer.name,
            businessId: businessId,
            message,
            fromClient: fromClient !== undefined ? fromClient : true,
            createdAt: new Date().toISOString()
        };

        await setDoc('messages', newMessage.id, newMessage);

        const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
        sendBusinessNotification(newMessage.businessId, {
            type: 'info',
            title: 'New Message',
            message: `${newMessage.customerName}: ${message.substring(0, 50)}...`
        });

        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Message send error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// GET /api/clients/contracts
router.get('/contracts', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.status(404).json({ error: 'Customer not found' });
        const customer = { id: snap.docs[0].id, ...snap.docs[0].data() };

        const clientContracts = await getContracts(businessId, null, customer.id);
        const filtered = clientContracts.filter(c => c.status !== 'draft');
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(filtered);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
});

// GET /api/clients/contracts/:id
router.get('/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const contract = await getDoc('contracts', id);
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (contract.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.status(403).json({ error: 'Access denied' });
        const customerId = snap.docs[0].id;

        if (contract.customerId !== customerId && contract.clientId !== customerId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

// GET /api/clients/contracts/:id/pdf
router.get('/contracts/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });

        const contract = await getDoc('contracts', id);
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (contract.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.status(403).json({ error: 'Access denied' });
        const customerId = snap.docs[0].id;

        if (contract.customerId !== customerId && contract.clientId !== customerId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Generate PDF
        const { generateContractPDF } = require('../utils/pdfGenerator');
        const pdfBuffer = await generateContractPDF(contract);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.contractNumber}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating contract PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// POST /api/clients/contracts/:id/sign
router.post('/contracts/:id/sign', async (req, res) => {
    try {
        const { id } = req.params;
        const { signature, signatureType } = req.body;
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });
        if (!signature || !signatureType) {
            return res.status(400).json({ error: 'Signature and signature type are required' });
        }

        const contract = await getDoc('contracts', id);
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (contract.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        const snap = await getCollectionRef('customers')
            .where('email', '==', userEmail)
            .where('businessId', '==', businessId)
            .get();
        if (snap.empty) return res.status(403).json({ error: 'Unauthorized' });
        const customer = { id: snap.docs[0].id, name: snap.docs[0].data().name };

        if (contract.customerId !== customer.id && contract.clientId !== customer.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updatedContract = {
            ...contract,
            status: 'signed',
            signedAt: new Date().toISOString(),
            signature: {
                type: signatureType,
                data: signature,
                signedBy: customer?.name || userEmail,
                signedByEmail: userEmail,
                signedAt: new Date().toISOString()
            }
        };

        await setDoc('contracts', id, updatedContract);

        const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
        sendBusinessNotification(contract.businessId, {
            type: 'success',
            title: 'Contract Signed',
            message: `${updatedContract.signature.signedBy} has signed the contract: ${contract.title}`
        });

        res.json({ success: true, contract: updatedContract });
    } catch (error) {
        console.error('Error signing contract:', error);
        res.status(500).json({ error: 'Failed to sign contract' });
    }
});

module.exports = router;
