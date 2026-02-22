const express = require("express");
const path = require("path");
const { getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { validateRequest, employeeSchema } = require(path.join(__dirname, "..", "utils", "validation"));

const router = express.Router();

async function getEmployees(businessId = null) {
    try {
        let query = getCollectionRef('employees');
        if (businessId) {
            query = query.where('businessId', '==', businessId);
        }
        const snap = await query.get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    } catch (e) {
        console.error('Error fetching employees from Firestore:', e);
        return [];
    }
}

// GET all employees for the business (PAGINATED)
router.get("/", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business ID required" });
        }

        // Remove unused pagination import
        // const { paginate } = require(path.join(__dirname, "..", "utils", "pagination"));

        // Build base query
        console.log('Fetching employees for business:', businessId);
        const baseQuery = getCollectionRef('employees')
            .where('businessId', '==', businessId);

        // Fetch all employees for business and filter/sort in memory to avoid missing index
        const snapshot = await baseQuery.get();
        console.log('Employee snapshot size:', snapshot.size);

        let employees = [];
        snapshot.forEach(doc => {
            employees.push({ id: doc.id, ...doc.data() });
        });

        // ... rest of filtering ...

        // Apply filters in memory
        if (req.query.status) {
            employees = employees.filter(e => e.status === req.query.status);
        }
        if (req.query.role) {
            employees = employees.filter(e => e.role === req.query.role);
        }

        // Apply sorting
        const sortField = req.query.sort || 'name';
        const sortOrder = req.query.order === 'desc' ? -1 : 1;

        employees.sort((a, b) => {
            const valA = (a[sortField] || '').toString().toLowerCase();
            const valB = (b[sortField] || '').toString().toLowerCase();
            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
        });

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100; // Default to larger limit since we do in-memory
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const result = {
            items: employees.slice(startIndex, endIndex), // Return subset
            total: employees.length,
            page,
            limit,
            pages: Math.ceil(employees.length / limit)
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: "Failed to fetch employees" });
    }
});

// GET single employee
router.get("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const employee = await getDoc('employees', req.params.id);

        if (!employee || (businessId && employee.businessId !== businessId)) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.json(employee);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: "Failed to fetch employee" });
    }
});

// POST create new employee
router.post("/", validateRequest(employeeSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business ID required" });
        }

        const newEmployee = {
            id: Date.now().toString(),
            businessId,
            name: req.body.name,
            email: req.body.email || '',
            phone: req.body.phone || '',
            role: req.body.role || 'crew',
            skills: req.body.skills || [],
            permissions: req.body.permissions || [],
            status: req.body.status || 'active',
            currentLocation: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc('employees', newEmployee.id, newEmployee);
        res.status(201).json(newEmployee);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: "Failed to create employee" });
    }
});

// PUT update employee
router.put("/:id", validateRequest(employeeSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const employee = await getDoc('employees', req.params.id);

        if (!employee || (businessId && employee.businessId !== businessId)) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const updatedEmployee = {
            ...employee,
            ...req.body,
            id: req.params.id,
            businessId: employee.businessId,
            updatedAt: new Date().toISOString()
        };

        await setDoc('employees', req.params.id, updatedEmployee);
        res.json(updatedEmployee);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: "Failed to update employee" });
    }
});

// PUT update employee location (GPS)
router.put("/:id/location", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const employee = await getDoc('employees', req.params.id);

        if (!employee || (businessId && employee.businessId !== businessId)) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const updatedEmployee = {
            ...employee,
            currentLocation: {
                lat: req.body.lat,
                lng: req.body.lng,
                timestamp: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
        };

        await setDoc('employees', req.params.id, updatedEmployee);
        res.json(updatedEmployee);
    } catch (error) {
        console.error('Error updating employee location:', error);
        res.status(500).json({ error: "Failed to update location" });
    }
});

// DELETE employee
router.delete("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const employee = await getDoc('employees', req.params.id);

        if (!employee || (businessId && employee.businessId !== businessId)) {
            return res.status(404).json({ error: "Employee not found" });
        }

        await deleteDoc('employees', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: "Failed to delete employee" });
    }
});

// POST invite employee (create user account)
router.post("/:id/invite", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const employee = await getDoc('employees', req.params.id);

        if (!employee || (businessId && employee.businessId !== businessId)) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (!employee.email) {
            return res.status(400).json({ error: "Employee must have an email address" });
        }

        if (employee.hasAccount) {
            return res.status(400).json({ error: "Employee already has an account" });
        }

        // Generate random password
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let temporaryPassword = '';
        for (let i = 0; i < 12; i++) {
            temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const admin = require('firebase-admin');
        const userRecord = await admin.auth().createUser({
            email: employee.email,
            password: temporaryPassword,
            displayName: employee.name,
            disabled: false
        });

        const userId = userRecord.uid;
        await setDoc('users', userId, {
            email: employee.email,
            displayName: employee.name,
            businessId: businessId,
            role: 'employee',
            employeeId: employee.id,
            businessPermissions: employee.permissions || [],
            createdAt: new Date().toISOString(),
            accountStatus: 'active'
        });

        const updatedEmployee = {
            ...employee,
            hasAccount: true,
            userId: userId,
            invitedAt: new Date().toISOString(),
            inviteStatus: 'invited',
            updatedAt: new Date().toISOString()
        };

        await setDoc('employees', req.params.id, updatedEmployee);

        res.json({
            success: true,
            employee: updatedEmployee,
            credentials: { email: employee.email, temporaryPassword }
        });

    } catch (error) {
        console.error('Error inviting employee:', error);
        res.status(500).json({ error: "Failed to invite employee" });
    }
});

module.exports = router;
