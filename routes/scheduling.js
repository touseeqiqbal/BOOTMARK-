const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

function getScheduleFilePath() {
    return getDataFilePath("schedule.json");
}

async function getEvents(businessId = null) {
    if (useFirestore) {
        try {
            let query = getCollectionRef('schedule');
            if (businessId) {
                query = query.where('businessId', '==', businessId);
            }
            const snap = await query.get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('Error fetching schedule from Firestore:', e);
            return [];
        }
    }

    try {
        const data = await fs.readFile(getScheduleFilePath(), 'utf8');
        const allEvents = JSON.parse(data) || [];
        if (businessId) {
            return allEvents.filter(ev => ev.businessId === businessId);
        }
        return allEvents;
    } catch {
        return [];
    }
}

async function saveEvents(events) {
    if (useFirestore) {
        for (const ev of events) {
            if (ev.id) await setDoc('schedule', ev.id, ev);
        }
        return;
    }

    const filePath = getScheduleFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(events, null, 2), 'utf8');
}

// Helper function to generate recurring events
function generateRecurringEvents(baseEvent, recurrencePattern) {
    const events = [];
    const startDate = new Date(baseEvent.scheduledDate);
    const endDate = recurrencePattern.endDate ? new Date(recurrencePattern.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default

    let currentDate = new Date(startDate);
    let occurrenceCount = 0;
    const maxOccurrences = 100; // Safety limit

    while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
        // Skip the first occurrence (it's the base event)
        if (occurrenceCount > 0) {
            const newEvent = {
                ...baseEvent,
                id: `${baseEvent.id}_${occurrenceCount}`,
                scheduledDate: currentDate.toISOString().split('T')[0],
                isRecurring: true,
                parentRecurringId: baseEvent.id,
                occurrenceNumber: occurrenceCount
            };
            events.push(newEvent);
        }

        // Calculate next occurrence
        switch (recurrencePattern.frequency) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + (recurrencePattern.interval || 1));
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7 * (recurrencePattern.interval || 1));
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + (recurrencePattern.interval || 1));
                break;
            default:
                return events; // Invalid frequency
        }

        occurrenceCount++;
    }

    return events;
}

// GET all scheduled events for the business
router.get("/", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business ID required" });
        }

        const events = await getEvents(businessId);
        res.json(events);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
});

// GET single scheduled event
router.get("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const events = await getEvents(businessId);
        const event = events.find(e => e.id === req.params.id);

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        res.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: "Failed to fetch event" });
    }
});

// POST create new scheduled event
router.post("/", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: "Business ID required" });
        }

        const newEvent = {
            id: Date.now().toString(),
            businessId,

            // Work Order Integration
            workOrderId: req.body.workOrderId || null,

            // Client & Property
            clientId: req.body.clientId || '',
            clientName: req.body.clientName || '',
            propertyId: req.body.propertyId || '',
            propertyAddress: req.body.propertyAddress || '',

            // Job Details
            title: req.body.title || '',
            description: req.body.description || '',
            serviceType: req.body.serviceType || '',

            // Scheduling
            scheduledDate: req.body.scheduledDate || req.body.date || '',
            startTime: req.body.startTime || '',
            endTime: req.body.endTime || '',
            estimatedDuration: req.body.estimatedDuration || 0,

            // Crew Assignment
            assignedCrew: req.body.assignedCrew || [],
            crewNames: req.body.crewNames || [],

            // Status & Tracking
            status: req.body.status || 'scheduled',
            actualStartTime: null,
            actualEndTime: null,
            checkInLocation: null,
            checkOutLocation: null,

            // Recurring
            isRecurring: req.body.isRecurring || false,
            recurrencePattern: req.body.recurrencePattern || null,
            parentRecurringId: null,

            // Invoice Integration
            invoiceId: null,

            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save the base event
        if (useFirestore) {
            await setDoc('schedule', newEvent.id, newEvent);
        } else {
            const events = await getEvents();
            events.push(newEvent);
            await saveEvents(events);
        }

        // Generate recurring events if applicable
        if (newEvent.isRecurring && newEvent.recurrencePattern) {
            const recurringEvents = generateRecurringEvents(newEvent, newEvent.recurrencePattern);

            if (useFirestore) {
                for (const event of recurringEvents) {
                    await setDoc('schedule', event.id, event);
                }
            } else {
                const events = await getEvents();
                events.push(...recurringEvents);
                await saveEvents(events);
            }
        }

        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({ error: "Failed to create schedule" });
    }
});

// PUT update scheduled event
router.put("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const events = await getEvents();
        const index = events.findIndex(e => e.id === req.params.id && e.businessId === businessId);

        if (index === -1) {
            return res.status(404).json({ error: "Event not found" });
        }

        const updatedEvent = {
            ...events[index],
            ...req.body,
            id: req.params.id,
            businessId: events[index].businessId,
            updatedAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('schedule', req.params.id, updatedEvent);
        } else {
            events[index] = updatedEvent;
            await saveEvents(events);
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ error: "Failed to update schedule" });
    }
});

// PUT update event status (for quick status changes)
router.put("/:id/status", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const events = await getEvents();
        const index = events.findIndex(e => e.id === req.params.id && e.businessId === businessId);

        if (index === -1) {
            return res.status(404).json({ error: "Event not found" });
        }

        const updatedEvent = {
            ...events[index],
            status: req.body.status,
            updatedAt: new Date().toISOString()
        };

        // Track actual times
        if (req.body.status === 'in-progress' && !updatedEvent.actualStartTime) {
            updatedEvent.actualStartTime = new Date().toISOString();
        }
        if (req.body.status === 'completed' && !updatedEvent.actualEndTime) {
            updatedEvent.actualEndTime = new Date().toISOString();
        }

        if (useFirestore) {
            await setDoc('schedule', req.params.id, updatedEvent);
        } else {
            events[index] = updatedEvent;
            await saveEvents(events);
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: "Failed to update status" });
    }
});

// PUT check-in (GPS location)
router.put("/:id/checkin", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const events = await getEvents();
        const index = events.findIndex(e => e.id === req.params.id && e.businessId === businessId);

        if (index === -1) {
            return res.status(404).json({ error: "Event not found" });
        }

        const updatedEvent = {
            ...events[index],
            status: 'in-progress',
            actualStartTime: new Date().toISOString(),
            checkInLocation: {
                lat: req.body.lat,
                lng: req.body.lng,
                timestamp: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('schedule', req.params.id, updatedEvent);
        } else {
            events[index] = updatedEvent;
            await saveEvents(events);
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('Error checking in:', error);
        res.status(500).json({ error: "Failed to check in" });
    }
});

// PUT check-out (GPS location)
router.put("/:id/checkout", async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const events = await getEvents();
        const index = events.findIndex(e => e.id === req.params.id && e.businessId === businessId);

        if (index === -1) {
            return res.status(404).json({ error: "Event not found" });
        }

        const updatedEvent = {
            ...events[index],
            status: 'completed',
            actualEndTime: new Date().toISOString(),
            checkOutLocation: {
                lat: req.body.lat,
                lng: req.body.lng,
                timestamp: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('schedule', req.params.id, updatedEvent);
        } else {
            events[index] = updatedEvent;
            await saveEvents(events);
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('Error checking out:', error);
        res.status(500).json({ error: "Failed to check out" });
    }
});

// DELETE scheduled event
router.delete("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const events = await getEvents(businessId);
            const event = events.find(e => e.id === req.params.id);
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Delete the event
            await deleteDoc('schedule', req.params.id);

            // If it's a recurring event parent, delete all children
            if (event.isRecurring && !event.parentRecurringId) {
                const children = events.filter(e => e.parentRecurringId === req.params.id);
                for (const child of children) {
                    await deleteDoc('schedule', child.id);
                }
            }
        } else {
            const events = await getEvents();
            const event = events.find(e => e.id === req.params.id && e.businessId === businessId);

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Filter out the event and its recurring children
            const filtered = events.filter(e => {
                if (e.id === req.params.id) return false;
                if (e.parentRecurringId === req.params.id) return false;
                return true;
            });

            await saveEvents(filtered);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: "Failed to delete schedule" });
    }
});

module.exports = router;
