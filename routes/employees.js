const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

function getEmployeesFilePath() {
    return getDataFilePath("employees.json");
}

async function getEmployees(businessId = null) {
    if (useFirestore) {
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

    try {
        const data = await fs.readFile(getEmployeesFilePath(), 'utf8');
        const allEmployees = JSON.parse(data) || [];
        if (businessId) {
            return allEmployees.filter(emp => emp.businessId === businessId);
        }
        return allEmployees;
    } catch {
        return [];
    }
}

async function saveEmployees(employees) {
    if (useFirestore) {
        for (const emp of employees) {
            if (emp.id) await setDoc('employees', emp.id, emp);
        }
        return;
    }

    const filePath = getEmployeesFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(employees, null, 2), 'utf8');
}

// GET all employees for the business
router.get("/", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business ID required" });
        }

        const employees = await getEmployees(businessId);
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: "Failed to fetch employees" });
    }
});

// GET single employee
router.get("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const employees = await getEmployees(businessId);
        const employee = employees.find(e => e.id === req.params.id);

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.json(employee);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: "Failed to fetch employee" });
    }
});

// POST create new employee
router.post("/", async (req, res) => {
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

        if (useFirestore) {
            await setDoc('employees', newEmployee.id, newEmployee);
        } else {
            const employees = await getEmployees();
            employees.push(newEmployee);
            await saveEmployees(employees);
        }

        res.status(201).json(newEmployee);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: "Failed to create employee" });
    }
});

// PUT update employee
router.put("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const employees = await getEmployees();
        const index = employees.findIndex(e => e.id === req.params.id && e.businessId === businessId);

        if (index === -1) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const updatedEmployee = {
            ...employees[index],
            ...req.body,
            id: req.params.id,
            businessId: employees[index].businessId,
            updatedAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('employees', req.params.id, updatedEmployee);
        } else {
            employees[index] = updatedEmployee;
            await saveEmployees(employees);
        }

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
        const employees = await getEmployees();
        const index = employees.findIndex(e => e.id === req.params.id && e.businessId === businessId);

        if (index === -1) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const updatedEmployee = {
            ...employees[index],
            currentLocation: {
                lat: req.body.lat,
                lng: req.body.lng,
                timestamp: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('employees', req.params.id, updatedEmployee);
        } else {
            employees[index] = updatedEmployee;
            await saveEmployees(employees);
        }

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

        if (useFirestore) {
            const employees = await getEmployees(businessId);
            const employee = employees.find(e => e.id === req.params.id);
            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }
            await deleteDoc('employees', req.params.id);
        } else {
            const employees = await getEmployees();
            const filtered = employees.filter(e => !(e.id === req.params.id && e.businessId === businessId));
            if (filtered.length === employees.length) {
                return res.status(404).json({ error: "Employee not found" });
            }
            await saveEmployees(filtered);
        }

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
        const employees = await getEmployees();
        const employee = employees.find(e => e.id === req.params.id && e.businessId === businessId);

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (!employee.email) {
            return res.status(400).json({ error: "Employee must have an email address" });
        }

        if (employee.hasAccount) {
            return res.status(400).json({ error: "Employee already has an account" });
        }

        // Generate random password
        const generatePassword = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
            let password = '';
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        };

        const temporaryPassword = generatePassword();

        // Create Firebase user
        let userId = null;
        try {
            const admin = require('firebase-admin');

            // Check if Firebase is initialized
            if (!admin.apps || admin.apps.length === 0) {
                throw new Error('Firebase Admin not initialized');
            }

            const userRecord = await admin.auth().createUser({
                email: employee.email,
                password: temporaryPassword,
                displayName: employee.name,
                disabled: false
            });

            userId = userRecord.uid;

            // Create user document in Firestore
            const db = admin.firestore();
            await db.collection('users').doc(userId).set({
                email: employee.email,
                displayName: employee.name,
                businessId: businessId,
                role: 'employee',
                employeeId: employee.id,
                permissions: employee.permissions || [],
                createdAt: new Date().toISOString(),
                accountStatus: 'active'
            });

        } catch (firebaseError) {
            console.error('Firebase error:', firebaseError);
            return res.status(500).json({
                error: "Failed to create user account",
                details: firebaseError.message
            });
        }

        // Update employee record
        const updatedEmployee = {
            ...employee,
            hasAccount: true,
            userId: userId,
            invitedAt: new Date().toISOString(),
            inviteStatus: 'invited',
            updatedAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('employees', req.params.id, updatedEmployee);
        } else {
            const index = employees.findIndex(e => e.id === req.params.id);
            employees[index] = updatedEmployee;
            await saveEmployees(employees);
        }

        // Return credentials (to show in modal)
        res.json({
            success: true,
            employee: updatedEmployee,
            credentials: {
                email: employee.email,
                temporaryPassword: temporaryPassword
            }
        });

    } catch (error) {
        console.error('Error inviting employee:', error);
        res.status(500).json({ error: "Failed to invite employee" });
    }
});

module.exports = router;
