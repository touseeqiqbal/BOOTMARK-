const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { authRequired } = require('../middleware/auth');

// Default form configuration
const DEFAULT_CONFIG = {
    version: "1.0",
    layout: {
        theme: "default",
        columns: 1,
        spacing: "normal"
    },
    tabs: [
        {
            id: "basic-info",
            label: "Basic Information",
            icon: "info",
            order: 0,
            visible: true,
            sections: [
                {
                    id: "workflow-template",
                    label: "Workflow & Template",
                    order: 0,
                    visible: true,
                    collapsible: false,
                    fields: ["workflowId", "templateId", "title"]
                },
                {
                    id: "client-property",
                    label: "Client & Property",
                    order: 1,
                    visible: true,
                    collapsible: false,
                    fields: ["clientId", "propertyId", "address", "clientName"]
                },
                {
                    id: "team-assignment",
                    label: "Team Assignment",
                    order: 2,
                    visible: true,
                    collapsible: false,
                    fields: ["assignedTo"]
                }
            ]
        },
        {
            id: "scheduling",
            label: "Scheduling",
            icon: "calendar",
            order: 1,
            visible: true,
            sections: [
                {
                    id: "dates-times",
                    label: "Dates & Times",
                    order: 0,
                    visible: true,
                    collapsible: false,
                    fields: ["scheduledDate", "startTime", "finishTime", "estimatedDuration"]
                },
                {
                    id: "status-pricing",
                    label: "Status & Pricing",
                    order: 1,
                    visible: true,
                    collapsible: false,
                    fields: ["status", "price"]
                }
            ]
        },
        {
            id: "services-materials",
            label: "Services & Materials",
            icon: "package",
            order: 2,
            visible: true,
            sections: [
                {
                    id: "services",
                    label: "Work Order Services",
                    order: 0,
                    visible: true,
                    collapsible: false,
                    fields: ["serviceItems"]
                },
                {
                    id: "materials",
                    label: "Materials Used",
                    order: 1,
                    visible: true,
                    collapsible: false,
                    fields: ["materialsUsed", "deicingMaterial", "deicingMaterialOther"]
                }
            ]
        },
        {
            id: "notes",
            label: "Notes & Details",
            icon: "file-text",
            order: 3,
            visible: true,
            sections: [
                {
                    id: "descriptions",
                    label: "Descriptions",
                    order: 0,
                    visible: true,
                    collapsible: false,
                    fields: ["description", "internalNotes"]
                },
                {
                    id: "invoicing",
                    label: "Invoicing",
                    order: 1,
                    visible: true,
                    collapsible: false,
                    fields: ["autoCreateInvoice"]
                }
            ]
        }
    ],
    fields: {
        workflowId: {
            visible: true,
            required: false,
            label: "Select Workflow",
            placeholder: "-- Use Default Workflow --",
            helpText: "Define the lifecycle stages for this job",
            order: 0,
            width: "full",
            type: "select"
        },
        templateId: {
            visible: true,
            required: false,
            label: "Select Template (Optional)",
            placeholder: "-- No Template (Custom Job) --",
            helpText: "Select a form template to auto-fill job details",
            order: 1,
            width: "full",
            type: "select"
        },
        title: {
            visible: true,
            required: true,
            label: "Title / Job Name",
            placeholder: "e.g. Spring Cleanup",
            helpText: "",
            order: 2,
            width: "full",
            type: "text"
        },
        clientId: {
            visible: true,
            required: true,
            label: "Client",
            placeholder: "Select Client --",
            helpText: "",
            order: 3,
            width: "half",
            type: "select"
        },
        propertyId: {
            visible: true,
            required: true,
            label: "Property",
            placeholder: "Select Property",
            helpText: "",
            order: 4,
            width: "half",
            type: "select"
        },
        address: {
            visible: true,
            required: false,
            label: "Address",
            placeholder: "",
            helpText: "",
            order: 5,
            width: "full",
            type: "text",
            readonly: true
        },
        clientName: {
            visible: true,
            required: false,
            label: "Client Name",
            placeholder: "",
            helpText: "",
            order: 6,
            width: "full",
            type: "text",
            readonly: true
        },
        assignedTo: {
            visible: true,
            required: false,
            label: "Assign Team Members (Optional)",
            placeholder: "",
            helpText: "Hold Ctrl (Windows) or Cmd (Mac) to select multiple team members. Includes Super Admin, Admin, and all users.",
            order: 7,
            width: "full",
            type: "multiselect"
        },
        scheduledDate: {
            visible: true,
            required: true,
            label: "Scheduled Date",
            placeholder: "dd/mm/yyyy",
            helpText: "",
            order: 8,
            width: "full",
            type: "date"
        },
        startTime: {
            visible: true,
            required: false,
            label: "Start Time (Optional)",
            placeholder: "--:--",
            helpText: "",
            order: 9,
            width: "half",
            type: "time"
        },
        finishTime: {
            visible: true,
            required: false,
            label: "Finish Time (Optional)",
            placeholder: "--:--",
            helpText: "",
            order: 10,
            width: "half",
            type: "time"
        },
        estimatedDuration: {
            visible: true,
            required: false,
            label: "Estimated Duration (Optional)",
            placeholder: "Hours",
            helpText: "",
            order: 11,
            width: "full",
            type: "number"
        },
        status: {
            visible: true,
            required: true,
            label: "Status",
            placeholder: "",
            helpText: "",
            order: 12,
            width: "half",
            type: "select"
        },
        price: {
            visible: true,
            required: true,
            label: "Price ($)",
            placeholder: "0.00",
            helpText: "",
            order: 13,
            width: "half",
            type: "number"
        },
        deicingMaterial: {
            visible: true,
            required: false,
            label: "Deicing Material (Optional)",
            placeholder: "",
            helpText: "",
            order: 14,
            width: "full",
            type: "select"
        },
        deicingMaterialOther: {
            visible: false,
            required: false,
            label: "Specify Other Material",
            placeholder: "Enter material name",
            helpText: "",
            order: 15,
            width: "full",
            type: "text"
        },
        description: {
            visible: true,
            required: false,
            label: "Description (Additional Notes)",
            placeholder: "Usage notes...",
            helpText: "",
            order: 16,
            width: "full",
            type: "textarea"
        },
        internalNotes: {
            visible: true,
            required: false,
            label: "Internal Notes",
            placeholder: "Access codes, crew instructions, etc.",
            helpText: "",
            order: 17,
            width: "full",
            type: "textarea"
        },
        autoCreateInvoice: {
            visible: true,
            required: false,
            label: "Auto create invoice when work order is marked as completed",
            placeholder: "",
            helpText: "An invoice will be automatically generated when you change the status to 'completed'",
            order: 18,
            width: "full",
            type: "checkbox"
        }
    },
    customFields: [],
    conditionalRules: [
        {
            id: "rule_deicing_other",
            fieldId: "deicingMaterial",
            condition: "equals",
            value: "Other",
            action: "show",
            targetFields: ["deicingMaterialOther"]
        }
    ],
    validationRules: {}
};

// GET /api/work-orders/form-settings - Get current business's form configuration
router.get('/', authRequired, async (req, res) => {
    try {
        const businessId = req.user.businessId;

        const configDoc = await db.collection('businesses')
            .doc(businessId)
            .collection('formConfigurations')
            .doc('workOrder')
            .get();

        if (configDoc.exists) {
            res.json(configDoc.data());
        } else {
            // Return default configuration if none exists
            res.json(DEFAULT_CONFIG);
        }
    } catch (error) {
        console.error('Error fetching form settings:', error);
        res.status(500).json({ error: 'Failed to fetch form settings' });
    }
});

// POST /api/work-orders/form-settings - Save form configuration
router.post('/', authRequired, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.uid;

        // Check if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only admins can modify form settings' });
        }

        const configuration = req.body;

        // Validate configuration structure
        if (!configuration.version || !configuration.tabs || !configuration.fields) {
            return res.status(400).json({ error: 'Invalid configuration structure' });
        }

        // Add metadata
        configuration.lastModified = new Date();
        configuration.modifiedBy = userId;

        await db.collection('businesses')
            .doc(businessId)
            .collection('formConfigurations')
            .doc('workOrder')
            .set(configuration);

        res.json({ success: true, message: 'Form configuration saved successfully' });
    } catch (error) {
        console.error('Error saving form settings:', error);
        res.status(500).json({ error: 'Failed to save form settings' });
    }
});

// PUT /api/work-orders/form-settings - Update form configuration (alias for POST)
router.put('/', authRequired, async (req, res) => {
    // Use the same logic as POST
    return router.post('/', authRequired)(req, res);
});

// GET /api/work-orders/form-settings/default - Get system default configuration
router.get('/default', authRequired, async (req, res) => {
    try {
        res.json(DEFAULT_CONFIG);
    } catch (error) {
        console.error('Error fetching default settings:', error);
        res.status(500).json({ error: 'Failed to fetch default settings' });
    }
});

module.exports = router;
