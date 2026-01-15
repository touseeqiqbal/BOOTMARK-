const express = require('express');
const router = express.Router();
const path = require('path');
const { useFirestore, getCollectionRef, getDoc } = require(path.join(__dirname, '..', 'utils', 'db'));
const { getInvoices } = require('./invoices');
const { getCustomers } = require('./customers');

// Helper: Get customer by email
async function getCustomerByEmail(email) {
    const customers = await getCustomers();
    return customers.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
}

// Helper: Get customer by ID
async function getCustomerById(id) {
    const customers = await getCustomers();
    return customers.find(c => c.id === id);
}

// Helper: Get work orders (from workOrders.js logic)
async function getWorkOrders() {
    if (useFirestore) {
        try {
            const snap = await getCollectionRef('workOrders').get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('Error fetching work orders from Firestore:', e);
            return [];
        }
    }

    // JSON fallback
    const fs = require('fs').promises;
    const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
    const workOrdersPath = getDataFilePath('workOrders.json');
    try {
        const data = await fs.readFile(workOrdersPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Helper: Get submissions
async function getSubmissions() {
    if (useFirestore) {
        try {
            const snap = await getCollectionRef('submissions').get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('Error fetching submissions from Firestore:', e);
            return [];
        }
    }

    // JSON fallback
    const fs = require('fs').promises;
    const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
    const submissionsPath = getDataFilePath('submissions.json');
    try {
        const data = await fs.readFile(submissionsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Helper: Get contracts
async function getContracts() {
    if (useFirestore) {
        try {
            const snap = await getCollectionRef('contracts').get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('Error fetching contracts from Firestore:', e);
            return [];
        }
    }

    // JSON fallback
    const fs = require('fs').promises;
    const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
    const contractsPath = getDataFilePath('contracts.json');
    try {
        const data = await fs.readFile(contractsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// GET /api/clients/dashboard - Client overview
router.get('/dashboard', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId; // Get businessId from custom claims

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Find customer by email
        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.json({
                invoices: [],
                workOrders: [],
                recentSubmissions: [],
                stats: {
                    totalInvoices: 0,
                    unpaidInvoices: 0,
                    totalWorkOrders: 0,
                    pendingWorkOrders: 0
                }
            });
        }

        // Get all data
        const allInvoices = await getInvoices();
        const allWorkOrders = await getWorkOrders();
        const allSubmissions = await getSubmissions();

        // Get contracts
        const allContracts = await getContracts();

        // Filter by customer AND businessId for multi-tenant isolation
        const customerInvoices = allInvoices.filter(inv =>
            (inv.customerId === customer.id || (inv.customerEmail && inv.customerEmail.toLowerCase() === userEmail.toLowerCase())) &&
            (!businessId || inv.businessId === businessId || inv.userId === businessId) // Business tenant filter
        );

        const customerContracts = allContracts.filter(contract =>
            (contract.clientId === customer.id || (contract.clientEmail && contract.clientEmail.toLowerCase() === userEmail.toLowerCase())) &&
            (!businessId || contract.businessId === businessId)
        );

        const customerWorkOrders = allWorkOrders.filter(wo =>
            (wo.clientId === customer.id || wo.customerId === customer.id || (wo.clientEmail && wo.clientEmail.toLowerCase() === userEmail.toLowerCase())) &&
            (!businessId || wo.businessId === businessId || wo.userId === businessId) // Business tenant filter
        );

        const customerSubmissions = allSubmissions.filter(sub =>
            (sub.customerId === customer.id || (sub.customerEmail && sub.customerEmail.toLowerCase() === userEmail.toLowerCase())) &&
            (!businessId || sub.businessId === businessId || sub.userId === businessId) // Business tenant filter
        );

        // Calculate enhanced stats
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

        // Build recent activity timeline
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

        // Get recent items (last 5)
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

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.json([]);
        }

        const allInvoices = await getInvoices();
        const customerInvoices = allInvoices.filter(inv =>
            (inv.customerId === customer.id || (inv.customerEmail && inv.customerEmail.toLowerCase() === userEmail.toLowerCase())) &&
            (!businessId || inv.businessId === businessId || inv.userId === businessId)
        );

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
        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        let invoice;
        if (useFirestore) {
            invoice = await getDoc('invoices', req.params.id);
        } else {
            const allInvoices = await getInvoices();
            invoice = allInvoices.find(inv => inv.id === req.params.id);
        }

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Verify this invoice belongs to the customer
        if (invoice.customerId !== customer.id &&
            (!invoice.customerEmail || invoice.customerEmail.toLowerCase() !== userEmail.toLowerCase())) {
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

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.json([]);
        }

        const allWorkOrders = await getWorkOrders();
        const customerWorkOrders = allWorkOrders.filter(wo =>
            (wo.clientId === customer.id || wo.customerId === customer.id || (wo.clientEmail && wo.clientEmail.toLowerCase() === userEmail.toLowerCase())) &&
            (!businessId || wo.businessId === businessId || wo.userId === businessId)
        );

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
        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        let workOrder;
        if (useFirestore) {
            workOrder = await getDoc('workOrders', req.params.id);
        } else {
            const allWorkOrders = await getWorkOrders();
            workOrder = allWorkOrders.find(wo => wo.id === req.params.id);
        }

        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Verify this work order belongs to the customer
        if (workOrder.clientId !== customer.id &&
            workOrder.customerId !== customer.id &&
            (!workOrder.clientEmail || workOrder.clientEmail.toLowerCase() !== userEmail.toLowerCase())) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(workOrder);
    } catch (error) {
        console.error('Client work order detail error:', error);
        res.status(500).json({ error: 'Failed to fetch work order' });
    }
});

// GET /api/clients/profile - Client profile info
router.get('/profile', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        res.json(customer);
    } catch (error) {
        console.error('Client profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/clients/profile - Update client profile
router.put('/profile', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        const { name, phone, address, city, state, zip, notes } = req.body;

        // Update customer
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

        // Save using the customers module
        const { saveCustomers } = require('./customers');
        const { setDoc } = require(path.join(__dirname, '..', 'utils', 'db'));

        if (useFirestore) {
            await setDoc('customers', customer.id, updatedCustomer);
        } else {
            const allCustomers = await getCustomers();
            const index = allCustomers.findIndex(c => c.id === customer.id);
            if (index !== -1) {
                allCustomers[index] = updatedCustomer;
                await saveCustomers(allCustomers);
            }
        }

        res.json(updatedCustomer);
    } catch (error) {
        console.error('Client profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET /api/clients/service-requests - Get client's service requests
router.get('/service-requests', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.json([]);
        }

        let serviceRequests = [];
        if (useFirestore) {
            try {
                const snap = await getCollectionRef('serviceRequests')
                    .where('customerId', '==', customer.id)
                    .get();
                snap.forEach(d => serviceRequests.push({ id: d.id, ...d.data() }));
                // Sort in JavaScript to avoid needing composite index
                serviceRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } catch (e) {
                console.error('Error fetching service requests from Firestore:', e);
            }
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const requestsPath = getDataFilePath('serviceRequests.json');
            try {
                const data = await fs.readFile(requestsPath, 'utf8');
                const allRequests = JSON.parse(data);
                serviceRequests = allRequests
                    .filter(sr => sr.customerId === customer.id && (!businessId || sr.businessId === businessId))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } catch (e) {
                // File doesn't exist yet
            }
        }

        res.json(serviceRequests);
    } catch (error) {
        console.error('Client service requests error:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// POST /api/clients/service-requests - Submit service request
router.post('/service-requests', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const { serviceType, description, preferredDate, priority } = req.body;

        const serviceRequest = {
            id: Date.now().toString(),
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: userEmail,
            businessId: businessId || customer.businessId,
            serviceType,
            description,
            preferredDate,
            priority: priority || 'normal',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Save to database
        if (useFirestore) {
            await getCollectionRef('serviceRequests').doc(serviceRequest.id).set(serviceRequest);
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const requestsPath = getDataFilePath('serviceRequests.json');
            let requests = [];
            try {
                const data = await fs.readFile(requestsPath, 'utf8');
                requests = JSON.parse(data);
            } catch (e) {
                // File doesn't exist yet
            }
            requests.push(serviceRequest);
            await fs.writeFile(requestsPath, JSON.stringify(requests, null, 2));
        }

        // Send notification to business
        const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
        sendBusinessNotification(businessId || customer.businessId, {
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

// GET /api/clients/messages - Get messages
router.get('/messages', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.json([]);
        }

        let messages = [];
        if (useFirestore) {
            const snap = await getCollectionRef('messages')
                .where('customerId', '==', customer.id)
                .get();
            snap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
            // Sort in JavaScript to avoid needing composite index
            messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const messagesPath = getDataFilePath('messages.json');
            try {
                const data = await fs.readFile(messagesPath, 'utf8');
                const allMessages = JSON.parse(data);
                messages = allMessages
                    .filter(m => m.customerId === customer.id)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } catch (e) {
                // File doesn't exist
            }
        }

        res.json(messages);
    } catch (error) {
        console.error('Messages fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/clients/messages - Send message
router.post('/messages', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;
        const { message, fromClient, customerId: providedCustomerId } = req.body;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let customerId, customerName;

        // If customerId is provided in body, this is a business owner sending a message
        if (providedCustomerId) {
            // Business owner sending message to client
            const customer = await getCustomerById(providedCustomerId);
            if (!customer) {
                return res.status(404).json({ error: 'Customer not found' });
            }
            customerId = customer.id;
            customerName = customer.name;
        } else {
            // Client sending message
            const customer = await getCustomerByEmail(userEmail);
            if (!customer) {
                return res.status(404).json({ error: 'Customer not found' });
            }
            customerId = customer.id;
            customerName = customer.name;
        }

        const newMessage = {
            id: Date.now().toString(),
            customerId,
            customerName,
            businessId: businessId || (await getCustomerById(customerId))?.businessId,
            message,
            fromClient: fromClient !== undefined ? fromClient : true,
            createdAt: new Date().toISOString()
        };

        // Save to database
        if (useFirestore) {
            await getCollectionRef('messages').doc(newMessage.id).set(newMessage);
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const messagesPath = getDataFilePath('messages.json');
            let messages = [];
            try {
                const data = await fs.readFile(messagesPath, 'utf8');
                messages = JSON.parse(data);
            } catch (e) {
                // File doesn't exist yet
            }
            messages.push(newMessage);
            await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2));
        }

        // Send real-time notification to business
        const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
        sendBusinessNotification(businessId || customer.businessId, {
            type: 'info',
            title: 'New Message',
            message: `${customer.name}: ${message.substring(0, 50)}...`
        });

        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Message send error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// GET /api/clients/contracts - Get all contracts for client
router.get('/contracts', async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        console.log('[Client Contracts] Request from:', userEmail, 'businessId:', businessId);

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            console.log('[Client Contracts] Customer not found for email:', userEmail);
            return res.status(404).json({ error: 'Customer not found' });
        }

        const contracts = await getContracts();
        console.log('[Client Contracts] Total contracts fetched:', contracts.length);
        console.log('[Client Contracts] Customer ID:', customer.id);
        console.log('[Client Contracts] Customer businessId:', customer.businessId);
        console.log('[Client Contracts] Request businessId:', businessId || customer.businessId);

        // Filter contracts by customerId OR clientId (for compatibility) and businessId for multi-tenancy
        const clientContracts = contracts.filter(c => {
            const matchesCustomer = c.customerId === customer.id || c.clientId === customer.id;
            const matchesBusiness = c.businessId === (businessId || customer.businessId);
            console.log(`[Client Contracts] Contract ${c.id}:`, {
                customerId: c.customerId,
                clientId: c.clientId,
                businessId: c.businessId,
                matchesCustomer,
                matchesBusiness,
                included: matchesCustomer && matchesBusiness
            });
            return matchesCustomer && matchesBusiness;
        });

        console.log('[Client Contracts] Filtered contracts for client:', clientContracts.length);

        // Sort by creation date, newest first
        clientContracts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(clientContracts);
    } catch (error) {
        console.error('[Client Contracts] Error fetching contracts:', error);
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
});

// GET /api/clients/contracts/:id - Get single contract details
router.get('/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const contracts = await getContracts();
        const contract = contracts.find(c =>
            c.id === id &&
            (c.customerId === customer.id || c.clientId === customer.id) &&
            c.businessId === (businessId || customer.businessId)
        );

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        res.json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

// POST /api/clients/contracts/:id/sign - Sign a contract
router.post('/contracts/:id/sign', async (req, res) => {
    try {
        const { id } = req.params;
        const { signature, signatureType } = req.body;
        const userEmail = req.user?.email;
        const businessId = req.user?.businessId;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!signature || !signatureType) {
            return res.status(400).json({ error: 'Signature and signature type are required' });
        }

        const customer = await getCustomerByEmail(userEmail);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Update contract with signature
        if (useFirestore) {
            const contractRef = getCollectionRef('contracts').doc(id);
            const contractDoc = await contractRef.get();

            if (!contractDoc.exists) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            const contractData = contractDoc.data();

            // Verify contract belongs to this customer and business
            if ((contractData.customerId !== customer.id && contractData.clientId !== customer.id) ||
                contractData.businessId !== (businessId || customer.businessId)) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // Update contract with signature
            await contractRef.update({
                status: 'signed',
                signedAt: new Date().toISOString(),
                signature: {
                    type: signatureType,
                    data: signature,
                    signedBy: customer.name,
                    signedByEmail: customer.email,
                    signedAt: new Date().toISOString()
                }
            });

            const updatedContract = { id: contractDoc.id, ...contractData, status: 'signed' };

            // Send notification to business
            const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
            sendBusinessNotification(contractData.businessId, {
                type: 'success',
                title: 'Contract Signed',
                message: `${customer.name} has signed the contract: ${contractData.title}`
            });

            res.json({ success: true, contract: updatedContract });
        } else {
            // JSON file fallback
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const contractsPath = getDataFilePath('contracts.json');

            let contracts = [];
            try {
                const data = await fs.readFile(contractsPath, 'utf8');
                contracts = JSON.parse(data);
            } catch (e) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            const contractIndex = contracts.findIndex(c =>
                c.id === id &&
                (c.customerId === customer.id || c.clientId === customer.id) &&
                c.businessId === (businessId || customer.businessId)
            );

            if (contractIndex === -1) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            contracts[contractIndex].status = 'signed';
            contracts[contractIndex].signedAt = new Date().toISOString();
            contracts[contractIndex].signature = {
                type: signatureType,
                data: signature,
                signedBy: customer.name,
                signedByEmail: customer.email,
                signedAt: new Date().toISOString()
            };

            await fs.writeFile(contractsPath, JSON.stringify(contracts, null, 2));

            res.json({ success: true, contract: contracts[contractIndex] });
        }
    } catch (error) {
        console.error('Error signing contract:', error);
        res.status(500).json({ error: 'Failed to sign contract' });
    }
});

module.exports = router;
