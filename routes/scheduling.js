const express = require("express");
const schedulingService = require("../utils/SchedulingService");
const router = express.Router();
const { validateRequest, scheduleSchema } = require('../utils/validation');

router.get("/", async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid;
        const events = await schedulingService.getEvents(businessId);
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: "Failed" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid;
        const event = await schedulingService.getEventById(req.params.id, businessId);
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: "Failed" });
    }
});

router.post("/", validateRequest(scheduleSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid;
        const event = await schedulingService.createEvent(businessId, req.body);
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: "Failed" });
    }
});

router.put("/:id", validateRequest(scheduleSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid;
        const updated = await schedulingService.updateEvent(req.params.id, businessId, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: "Failed" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid;
        await schedulingService.deleteEvent(req.params.id, businessId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed" });
    }
});

module.exports = router;
