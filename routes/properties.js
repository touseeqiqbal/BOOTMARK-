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

// Get all properties (optionally filtered by businessId)
async function getProperties(businessId = null) {
    if (useFirestore) {
        try {
            let query = getCollectionRef('properties');
            if (businessId) {
                query = query.where('businessId', '==', businessId);
            }
            const snap = await query.get();
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
        let properties = JSON.parse(data);
        properties = Array.isArray(properties) ? properties : [];
        if (businessId) {
            properties = properties.filter(p => p.businessId === businessId);
        }
        return properties;
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

        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business registration required. Please register your business first." });
        }

        const { customerId } = req.query;
        const properties = await getProperties(businessId);

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

        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business registration required" });
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

        // Verify the property belongs to the user's business
        if (property.businessId !== businessId) {
            return res.status(403).json({ error: "Access denied" });
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

        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business registration required. Please register your business first." });
        }

        const newProperty = {
            id: Date.now().toString(),
            ...req.body,
            businessId,
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

        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business registration required" });
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

        // Verify the property belongs to the user's business
        if (property.businessId !== businessId) {
            return res.status(403).json({ error: "Access denied" });
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

        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business registration required" });
        }

        // Verify the property exists and belongs to the user's business
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

        if (property.businessId !== businessId) {
            return res.status(403).json({ error: "Access denied" });
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

module.exports = { router, getProperties, saveProperties };
