const express = require("express");
const router = express.Router();
// You might import other services here to aggregate data, 
// e.g., const { getInvoices } = require('./invoices');

router.get("/summary", async (req, res) => {
    // This would typically aggregate data from invoices, expenses, etc.
    // For now, returning mock summary data for the dashboard/reports page
    res.json({
        totalRevenue: 54000,
        jobsCompleted: 142,
        pendingEstimates: 12,
        outstandingInvoices: 4500,
        topServices: [
            { name: "Lawn Mowing", count: 45, revenue: 2250 },
            { name: "Landscaping", count: 12, revenue: 12000 },
            { name: "Tree Trimming", count: 8, revenue: 3200 }
        ]
    });
});

module.exports = router;
