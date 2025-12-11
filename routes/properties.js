const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

// Get properties file path
function getPropertiesFilePath() {
    return getDataFilePath("properties.json");
}

// Get all properties
async function getProperties() {
    if (useFirestore) {
        try {
            const snap = await getCollectionRef('properties').get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('Error fetching properties from Firestore:', e);
            return [];
        }
    }
    const PROPERTIES_FILE = getPropertiesFilePath();
    try {
        const data = await fs.readFile(PROPERTIES_FILE, "utf8");
        const properties = JSON.parse(data);
        return Array.isArray(properties) ? properties : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        return [];
    }
}

// Save properties
async function saveProperties(properties) {
    if (useFirestore) {
        try {
            for (const p of properties) {
                const id = p.id;
                if (!id) continue;
                await setDoc('properties', id, p);
            }
            return;
        } catch (e) {
            console.error('Error saving properties to Firestore:', e);
            throw e;
        }
    }
    const PROPERTIES_FILE = getPropertiesFilePath();
    const dir = path.dirname(PROPERTIES_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(PROPERTIES_FILE, JSON.stringify(properties, null, 2), 'utf8');
}

// Get all properties
router.get("/", async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const { customerId } = req.query;
        const properties = await getProperties();

        // Filter by user permissions/ownership
        // In a real app, you'd check if the user owns the properties or the customers they belong to
        // For now, we assume properties are linked to customers which are linked to users (or business logic)

        // If filtering by customerId
        if (customerId) {
            const filtered = properties.filter(p => p.customerId === customerId);
            return res.json(filtered);
        }

        res.json(properties);
    } catch (error) {
        console.error("Get properties error:", error);
        res.status(500).json({ error: "Failed to fetch properties" });
    }
});

// Get property by ID
router.get("/:id", async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        let property;
        if (useFirestore) {
            property = await getDoc('properties', req.params.id);
        } else {
            const properties = await getProperties();
            property = properties.find((p) => p.id === req.params.id);
        }

        if (!property) {
            return res.status(404).json({ error: "Property not found" });
        }

        res.json(property);
    } catch (error) {
        console.error("Get property error:", error);
        res.status(500).json({ error: "Failed to fetch property" });
    }
});

// Create property
router.post("/", async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const newProperty = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId
        };

        if (useFirestore) {
            await setDoc('properties', newProperty.id, newProperty);
        } else {
            const properties = await getProperties();
            properties.push(newProperty);
            await saveProperties(properties);
        }

        res.status(201).json(newProperty);
    } catch (error) {
        console.error("Create property error:", error);
        res.status(500).json({ error: "Failed to create property" });
    }
});

// Update property
router.put("/:id", async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        let property;
        if (useFirestore) {
            property = await getDoc('properties', req.params.id);
        } else {
            const properties = await getProperties();
            property = properties.find((p) => p.id === req.params.id);
        }

        if (!property) {
            return res.status(404).json({ error: "Property not found" });
        }

        const updatedProperty = {
            ...property,
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('properties', req.params.id, updatedProperty);
        } else {
            const properties = await getProperties();
            const index = properties.findIndex((p) => p.id === req.params.id);
            if (index !== -1) {
                properties[index] = updatedProperty;
                await saveProperties(properties);
            }
        }

        res.json(updatedProperty);
    } catch (error) {
        console.error("Update property error:", error);
        res.status(500).json({ error: "Failed to update property" });
    }
});

// Delete property
router.delete("/:id", async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        if (useFirestore) {
            await deleteDoc('properties', req.params.id);
        } else {
            const properties = await getProperties();
            const updatedProperties = properties.filter((p) => p.id !== req.params.id);
            await saveProperties(updatedProperties);
        }

        res.json({ message: "Property deleted successfully" });
    } catch (error) {
        console.error("Delete property error:", error);
        res.status(500).json({ error: "Failed to delete property" });
    }
});

module.exports = router;
