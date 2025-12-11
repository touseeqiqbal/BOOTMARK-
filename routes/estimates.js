const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

function getEstimatesFilePath() {
    return getDataFilePath("estimates.json");
}

// Get all estimates
async function getEstimates() {
    if (useFirestore) {
        try {
            const snap = await getCollectionRef('estimates').get()
            const items = []
            snap.forEach(d => items.push({ id: d.id, ...d.data() }))
            return items
        } catch (e) {
            console.error('Error fetching estimates:', e)
            return []
        }
    }
    try {
        const data = await fs.readFile(getEstimatesFilePath(), "utf8");
        return JSON.parse(data) || [];
    } catch (error) {
        return [];
    }
}

// Save estimates
async function saveEstimates(estimates) {
    if (useFirestore) {
        for (const est of estimates) {
            if (est.id) await setDoc('estimates', est.id, est)
        }
        return;
    }
    const filePath = getEstimatesFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(estimates, null, 2), 'utf8');
}

// Routes
router.get("/", async (req, res) => {
    try {
        const estimates = await getEstimates();
        res.json(estimates);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch estimates" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const estimates = await getEstimates();
        const estimate = estimates.find(e => e.id === req.params.id);
        if (!estimate) return res.status(404).json({ error: "Estimate not found" });
        res.json(estimate);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch estimate" });
    }
});

router.post("/", async (req, res) => {
    try {
        const newEstimate = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            status: 'draft', // draft, sent, approved, rejected, converted
            ...req.body
        };
        if (useFirestore) {
            await setDoc('estimates', newEstimate.id, newEstimate);
        } else {
            const estimates = await getEstimates();
            estimates.push(newEstimate);
            await saveEstimates(estimates);
        }
        res.status(201).json(newEstimate);
    } catch (e) {
        res.status(500).json({ error: "Failed to create estimate" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const estimates = await getEstimates();
        const index = estimates.findIndex(e => e.id === req.params.id);
        /* 
           Note: With Firestore logic mixed in, finding index is only valid for local JSON.
           For Firestore, we'd update directly. Simulating hybrid behavior for consistency.
        */
        if (useFirestore) {
            await setDoc('estimates', req.params.id, req.body);
            res.json(req.body);
            return;
        }

        if (index === -1) return res.status(404).json({ error: "Estimate not found" });
        const updated = { ...estimates[index], ...req.body, updatedAt: new Date().toISOString() };
        estimates[index] = updated;
        await saveEstimates(estimates);
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: "Failed to update estimate" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        if (useFirestore) {
            await deleteDoc('estimates', req.params.id);
        } else {
            const estimates = await getEstimates();
            const filtered = estimates.filter(e => e.id !== req.params.id);
            await saveEstimates(filtered);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete estimate" });
    }
});

module.exports = router;
