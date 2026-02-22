const express = require("express");
const router = express.Router();
// You might import other services here to aggregate data, 
// e.g., const { getInvoices } = require('./invoices');

const { getCollectionRef } = require("../utils/db");
const { authRequired } = require("../middleware/auth");

// Dashboard Summary Stats
router.get("/dashboard-stats", authRequired, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business context required" });
        }

        // Initialize response object
        const responseData = {
            totalCustomers: 0,
            totalWorkOrders: 0,
            totalServices: 0,
            totalContracts: 0,
            recentWorkOrders: [],
            upcomingJobs: []
        };

        // 1. Fetch Counts (Robust Promise.all)
        try {
            const [
                customersSnap,
                workOrdersSnap,
                servicesSnap,
                contractsSnap
            ] = await Promise.all([
                getCollectionRef('customers').where('businessId', '==', businessId).count().get(),
                getCollectionRef('workOrders').where('businessId', '==', businessId).count().get(),
                getCollectionRef('services').where('businessId', '==', businessId).count().get(),
                getCollectionRef('contracts').where('businessId', '==', businessId).count().get()
            ]);

            responseData.totalCustomers = customersSnap.data().count;
            responseData.totalWorkOrders = workOrdersSnap.data().count;
            responseData.totalServices = servicesSnap.data().count;
            responseData.totalContracts = contractsSnap.data().count;
        } catch (error) {
            console.error("Error fetching dashboard counts:", error);
            // Continue with default 0s
        }

        // 2. Fetch Recent Work Orders
        try {
            const recentWOSnap = await getCollectionRef('workOrders')
                .where('businessId', '==', businessId)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();

            recentWOSnap.forEach(doc => responseData.recentWorkOrders.push({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching recent work orders:", error);
        }

        // 3. Fetch Upcoming Jobs (In-Memory Filter to avoid Missing Index)
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            // Fetch recent work orders by creation (usually indexed) or just fetch latest 50
            // Since we want upcoming by scheduledDate, and scheduledDate index is missing...
            // We'll fetch all active work orders for this business (limit 50 or 100) and sort in JavaSript.
            const upcomingJobsSnap = await getCollectionRef('workOrders')
                .where('businessId', '==', businessId)
                .limit(100)
                .get();

            const jobs = [];
            upcomingJobsSnap.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'completed' && data.status !== 'cancelled' && data.scheduledDate) {
                    const scheduled = new Date(data.scheduledDate);
                    if (scheduled >= today) {
                        jobs.push({ id: doc.id, ...data });
                    }
                }
            });

            // Sort by Date Ascending
            jobs.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

            responseData.upcomingJobs = jobs.slice(0, 5);
        } catch (error) {
            console.error("Error fetching upcoming jobs:", error);
        }

        res.json(responseData);

    } catch (error) {
        console.error("Dashboard stats critical error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
});

module.exports = router;
