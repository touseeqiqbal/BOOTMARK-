const express = require('express');
const router = express.Router();
const path = require('path');
const { useFirestore, getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));
const fs = require('fs').promises;
const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));

/**
 * GET /api/users - Get all users (employees, admins, etc.) for assignments
 * Combines employees and other user types for unified user selection
 */
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const userId = req.user?.uid || req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let users = [];

        // Get employees
        if (useFirestore) {
            const employeesSnap = await getCollectionRef('employees').get();
            employeesSnap.forEach(doc => {
                const emp = { id: doc.id, ...doc.data() };
                if (!businessId || emp.businessId === businessId) {
                    users.push({
                        id: emp.id,
                        name: emp.name,
                        email: emp.email,
                        role: emp.role || 'employee',
                        type: 'employee',
                        phone: emp.phone,
                        active: emp.status === 'active'
                    });
                }
            });
        } else {
            const employeesPath = getDataFilePath('employees.json');
            try {
                const data = await fs.readFile(employeesPath, 'utf8');
                const employees = JSON.parse(data);
                employees.forEach(emp => {
                    if (!businessId || emp.businessId === businessId) {
                        users.push({
                            id: emp.id,
                            name: emp.name,
                            email: emp.email,
                            role: emp.role || 'employee',
                            type: 'employee',
                            phone: emp.phone,
                            active: emp.status === 'active'
                        });
                    }
                });
            } catch (error) {
                console.error('Error reading employees:', error);
            }
        }

        // Get business users/admins from businesses collection
        if (useFirestore) {
            const businessesSnap = await getCollectionRef('businesses').get();
            businessesSnap.forEach(doc => {
                const biz = { id: doc.id, ...doc.data() };
                if (!businessId || biz.id === businessId) {
                    if (biz.ownerEmail) {
                        users.push({
                            id: biz.ownerId || biz.id,
                            name: biz.ownerName || biz.businessName,
                            email: biz.ownerEmail,
                            role: 'admin',
                            type: 'admin',
                            phone: biz.phone,
                            active: true
                        });
                    }
                }
            });
        } else {
            const businessesPath = getDataFilePath('businesses.json');
            try {
                const data = await fs.readFile(businessesPath, 'utf8');
                const businesses = JSON.parse(data);
                businesses.forEach(biz => {
                    if (!businessId || biz.id === businessId) {
                        if (biz.ownerEmail) {
                            users.push({
                                id: biz.ownerId || biz.id,
                                name: biz.ownerName || biz.businessName,
                                email: biz.ownerEmail,
                                role: 'admin',
                                type: 'admin',
                                phone: biz.phone,
                                active: true
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Error reading businesses:', error);
            }
        }

        // Remove duplicates by email
        const uniqueUsers = users.reduce((acc, user) => {
            if (!acc.find(u => u.email === user.email)) {
                acc.push(user);
            }
            return acc;
        }, []);

        // Sort by name
        uniqueUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        res.json(uniqueUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;
