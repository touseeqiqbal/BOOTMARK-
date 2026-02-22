const express = require('express');
const router = express.Router();
const path = require('path');
const { getCollectionRef } = require('../utils/db');

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

        const users = [];

        // Get employees from Firestore
        let employeesQuery = getCollectionRef('employees');
        if (businessId) {
            employeesQuery = employeesQuery.where('businessId', '==', businessId);
        }
        const employeesSnap = await employeesQuery.get();

        employeesSnap.forEach(doc => {
            const emp = { id: doc.id, ...doc.data() };
            users.push({
                id: emp.id,
                name: emp.name,
                email: emp.email,
                role: emp.role || 'employee',
                type: 'employee',
                phone: emp.phone,
                active: emp.status === 'active'
            });
        });

        // Get business users/admins from businesses collection
        let businessesSnap;
        if (businessId) {
            // Optimization: If we know the businessId, just fetch that one document
            const bizDoc = await getCollectionRef('businesses').doc(businessId).get();
            businessesSnap = bizDoc.exists ? [bizDoc] : [];
        } else {
            // CRITICAL FIX: Do not allow fetching all businesses if businessId is missing.
            // Unless we explicitly verify Super Admin status (which requires DB lookup), we must block this.
            // For now, fast fail to prevent leak.
            return res.status(400).json({ error: 'Business ID is required to fetch users' });
        }

        businessesSnap.forEach(doc => {
            const biz = { id: doc.id, ...doc.data() };
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
        });

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
