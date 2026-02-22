const Joi = require('joi');

/**
 * Validation Schemas for BOOTMARK Application
 * Provides comprehensive input validation to prevent XSS, injection, and business logic bypass
 */

// ============================================
// WORK ORDER VALIDATION
// ============================================

const workOrderSchema = Joi.object({
    title: Joi.string().allow('', null).max(200).trim()
        .messages({
            'string.max': 'Title must not exceed 200 characters'
        }),

    description: Joi.string().allow('').max(5000).trim()
        .messages({
            'string.max': 'Description must not exceed 5000 characters'
        }),

    status: Joi.string()
        .valid('draft', 'scheduled', 'in-progress', 'in_progress', 'completed', 'cancelled', 'invoiced', 'pending', 'on_hold')
        .default('draft')
        .messages({
            'any.only': 'Status must be one of: draft, scheduled, in-progress, completed, cancelled, invoiced, pending, on_hold'
        }),

    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .default('medium'),

    // Accept both customerId and clientId (clientId is an alias)
    customerId: Joi.string().allow(null, ''),
    clientId: Joi.string().allow(null, ''),

    propertyId: Joi.string().allow(null, ''),

    assignedTo: Joi.array().items(Joi.string()).default([]),

    scheduledDate: Joi.date().iso().allow(null)
        .messages({
            'date.format': 'Scheduled date must be in ISO format'
        }),

    estimatedHours: Joi.number().min(0).max(1000).allow(null)
        .messages({
            'number.min': 'Estimated hours cannot be negative',
            'number.max': 'Estimated hours cannot exceed 1000'
        }),

    actualHours: Joi.number().min(0).max(1000).allow(null)
        .messages({
            'number.min': 'Actual hours cannot be negative',
            'number.max': 'Actual hours cannot exceed 1000'
        }),

    customFields: Joi.object().pattern(
        Joi.string(),
        Joi.alternatives().try(
            Joi.string().max(1000),
            Joi.number(),
            Joi.boolean(),
            Joi.date()
        )
    ).allow(null),

    notes: Joi.string().allow('').max(5000).trim(),

    workflowId: Joi.string().allow(null, ''),

    // Additional fields that might be sent from the form
    price: Joi.number().min(0).allow(null),
    startTime: Joi.string().allow(null, ''),
    finishTime: Joi.string().allow(null, ''),
    deicingMaterial: Joi.string().allow(null, '').max(50),
    estimatedDuration: Joi.number().min(0).allow(null, '').empty(''),

    // Allow address fields
    address: Joi.string().allow(null, '').max(500),
    clientName: Joi.string().allow(null, '').max(200)
})
    // Ensure at least one of customerId or clientId is provided
    .or('customerId', 'clientId')
    .messages({
        'object.missing': 'Either customerId or clientId is required'
    });

// ============================================
// INVOICE VALIDATION
// ============================================

const invoiceItemSchema = Joi.object({
    name: Joi.string().required().max(200).trim()
        .messages({
            'string.empty': 'Item name is required',
            'string.max': 'Name must not exceed 200 characters'
        }),

    description: Joi.string().allow('', null).max(500).trim(),

    quantity: Joi.number().min(0).max(100000).required()
        .messages({
            'number.min': 'Quantity cannot be negative',
            'number.max': 'Quantity cannot exceed 100,000'
        }),

    price: Joi.number().min(0).max(1000000).required()
        .messages({
            'number.min': 'Price cannot be negative',
            'number.max': 'Price cannot exceed $1,000,000'
        }),

    taxRate: Joi.number().min(0).max(1).default(0)
        .messages({
            'number.min': 'Tax rate cannot be negative',
            'number.max': 'Tax rate cannot exceed 100%'
        })
});

const invoiceSchema = Joi.object({
    customerId: Joi.string().required()
        .messages({
            'string.empty': 'Customer ID is required'
        }),

    workOrderId: Joi.string().allow(null, ''),

    items: Joi.array().items(invoiceItemSchema).min(1).required()
        .messages({
            'array.min': 'Invoice must have at least one item',
            'array.base': 'Items must be an array'
        }),

    discount: Joi.number().min(0).max(100000).default(0)
        .messages({
            'number.min': 'Discount cannot be negative',
            'number.max': 'Discount cannot exceed $100,000'
        }),

    notes: Joi.string().allow('').max(2000).trim(),

    dueDate: Joi.date().iso().allow(null)
        .messages({
            'date.format': 'Due date must be in ISO format'
        }),

    status: Joi.string()
        .valid('draft', 'sent', 'paid', 'overdue', 'cancelled')
        .default('draft')
});

// ============================================
// CONTRACT VALIDATION
// ============================================

const contractSchema = Joi.object({
    title: Joi.string().required().max(200).trim()
        .messages({
            'string.empty': 'Contract title is required',
            'string.max': 'Title must not exceed 200 characters'
        }),

    customerId: Joi.string().required()
        .messages({
            'string.empty': 'Customer ID is required'
        }),

    amount: Joi.number().min(0).max(10000000).required()
        .messages({
            'number.min': 'Amount cannot be negative',
            'number.max': 'Amount cannot exceed $10,000,000',
            'number.base': 'Amount must be a number'
        }),

    startDate: Joi.date().iso().required()
        .messages({
            'date.base': 'Start date is required',
            'date.format': 'Start date must be in ISO format'
        }),

    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
        .messages({
            'date.base': 'End date is required',
            'date.min': 'End date must be on or after start date',
            'date.format': 'End date must be in ISO format'
        }),

    terms: Joi.string().allow('').max(10000).trim()
        .messages({
            'string.max': 'Terms must not exceed 10,000 characters'
        }),

    autoRenewal: Joi.boolean().default(false),

    renewalNoticePeriod: Joi.number().min(0).max(365).default(30)
        .messages({
            'number.min': 'Renewal notice period cannot be negative',
            'number.max': 'Renewal notice period cannot exceed 365 days'
        }),

    status: Joi.string()
        .valid('draft', 'pending', 'pending-signature', 'active', 'expired', 'cancelled')
        .default('draft')
});

// ============================================
// CUSTOMER VALIDATION
// ============================================

const customerSchema = Joi.object({
    name: Joi.string().required().max(200).trim()
        .messages({
            'string.empty': 'Customer name is required',
            'string.max': 'Name must not exceed 200 characters'
        }),

    email: Joi.string().email().allow(null, '').max(255).trim()
        .messages({
            'string.email': 'Must be a valid email address',
            'string.max': 'Email must not exceed 255 characters'
        }),

    phone: Joi.string().allow(null, '').max(20).trim()
        .pattern(/^[0-9\s\-\+\(\)]+$/)
        .messages({
            'string.pattern.base': 'Phone number can only contain numbers, spaces, and +-() characters'
        }),

    address: Joi.object({
        street: Joi.string().allow('').max(200),
        city: Joi.string().allow('').max(100),
        state: Joi.string().allow('').max(100),
        zip: Joi.string().allow('').max(20),
        country: Joi.string().allow('').max(100)
    }).allow(null),

    notes: Joi.string().allow('').max(5000).trim()
});

// ============================================
// PROPERTY VALIDATION
// ============================================

const propertySchema = Joi.object({
    customerId: Joi.string().required()
        .messages({
            'string.empty': 'Customer ID is required'
        }),

    name: Joi.string().required().max(200).trim()
        .messages({
            'string.empty': 'Property name is required',
            'string.max': 'Name must not exceed 200 characters'
        }),

    address: Joi.object({
        street: Joi.string().required().max(200),
        city: Joi.string().required().max(100),
        state: Joi.string().required().max(100),
        zip: Joi.string().required().max(20),
        country: Joi.string().default('USA').max(100)
    }).required(),

    location: Joi.object({
        lat: Joi.number().min(-90).max(90).required()
            .messages({
                'number.min': 'Latitude must be between -90 and 90',
                'number.max': 'Latitude must be between -90 and 90'
            }),
        lng: Joi.number().min(-180).max(180).required()
            .messages({
                'number.min': 'Longitude must be between -180 and 180',
                'number.max': 'Longitude must be between -180 and 180'
            })
    }).allow(null),

    notes: Joi.string().allow('').max(5000).trim()
});

// ============================================
// ESTIMATE VALIDATION
// ============================================

const estimateSchema = Joi.object({
    customerId: Joi.string().allow(null, ''),
    clientId: Joi.string().allow(null, ''),

    title: Joi.string().allow('', null).max(200).trim(),
    estimateNumber: Joi.string().required().max(50).trim(), // Frontend sends this

    propertyId: Joi.string().allow(null, ''),

    items: Joi.array().items(invoiceItemSchema).min(1).required()
        .messages({
            'array.min': 'Estimate must have at least one item'
        }),

    discount: Joi.number().min(0).max(100000).default(0),
    discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),

    taxRate: Joi.number().min(0).default(0),
    tax: Joi.number().min(0).default(0),
    subtotal: Joi.number().min(0).default(0),
    total: Joi.number().min(0).default(0),

    validUntil: Joi.date().iso().allow(null), // Removed min('now') to avoid timezone issues
    issueDate: Joi.date().iso().required(),

    notes: Joi.string().allow('').max(2000).trim(),
    terms: Joi.string().allow('').max(5000).trim(),

    status: Joi.string()
        .valid('draft', 'sent', 'accepted', 'rejected', 'expired', 'viewed', 'converted')
        .default('draft'),

    clientName: Joi.string().allow('', null),
    clientEmail: Joi.string().allow('', null),
    clientPhone: Joi.string().allow('', null),
    clientAddress: Joi.string().allow('', null)
})
    .or('customerId', 'clientId')
    .messages({
        'object.missing': 'Client is required'
    });

// ============================================
// EMPLOYEE VALIDATION
// ============================================

const employeeSchema = Joi.object({
    name: Joi.string().required().max(200).trim()
        .messages({
            'string.empty': 'Employee name is required'
        }),

    email: Joi.string().email().required().max(255).trim()
        .messages({
            'string.email': 'Must be a valid email address',
            'string.empty': 'Email is required'
        }),

    phone: Joi.string().allow(null, '').max(20).trim()
        .pattern(/^[0-9\s\-\+\(\)]+$/),

    role: Joi.string().required().max(100).trim()
        .messages({
            'string.empty': 'Role is required'
        }),

    skills: Joi.array().items(Joi.string().max(100)).default([]),

    hourlyRate: Joi.number().min(0).max(1000).allow(null)
        .messages({
            'number.min': 'Hourly rate cannot be negative',
            'number.max': 'Hourly rate cannot exceed $1,000'
        }),

    status: Joi.string()
        .valid('active', 'inactive', 'on-leave')
        .default('active')
});

// ============================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================

/**
 * Creates a validation middleware for the given schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateRequest(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true, // Remove unknown fields for security
            convert: true // Convert types (e.g., string to number)
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            console.warn(`[Validation] Request validation failed:`, {
                path: req.path,
                method: req.method,
                errors: errors.map(e => `${e.field}: ${e.message}`)
            });

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
}

/**
 * Validate query parameters
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Query validation failed',
                details: errors
            });
        }

        req.query = value;
        next();
    };
}

// ============================================
// SERVICE & PRODUCT LAYERS
// ============================================

const serviceSchema = Joi.object({
    name: Joi.string().required().max(200).trim(),
    description: Joi.string().allow('', null).max(1000).trim(),
    price: Joi.number().min(0).required(),
    duration: Joi.number().min(1).default(60), // in minutes, default 1 hour
    unit: Joi.string().allow('', null).max(50).default('per visit'),
    category: Joi.string().allow('', null).max(100).trim(),
    recurring: Joi.boolean().default(false),
    frequency: Joi.string().valid('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly').allow(null),
    taxable: Joi.boolean().default(true),
    isActive: Joi.boolean().default(true)
});

const productSchema = Joi.object({
    name: Joi.string().required().max(200).trim(),
    description: Joi.string().allow('', null).max(1000).trim(),
    sku: Joi.string().allow('', null).max(50).trim(),
    unitPrice: Joi.number().min(0).required(),
    costPrice: Joi.number().min(0).allow(null),
    quantity: Joi.number().integer().min(0).default(0),
    lowStockThreshold: Joi.number().integer().min(0).default(5),
    category: Joi.string().max(100).trim(),
    taxable: Joi.boolean().default(true),
    isActive: Joi.boolean().default(true)
});

const materialSchema = Joi.object({
    name: Joi.string().required().max(200).trim(),
    sku: Joi.string().allow('', null).max(100).trim(),
    categories: Joi.array().items(Joi.string()).default(['General']),
    description: Joi.string().allow('', null).max(1000).trim(),
    unit: Joi.string().allow('', null).max(50).default('unit'),
    costPrice: Joi.number().min(0).allow(null).default(0),
    sellingPrice: Joi.number().min(0).allow(null).default(0),
    quantityInStock: Joi.number().integer().min(0).default(0),
    minStockLevel: Joi.number().integer().min(0).default(5),
    supplier: Joi.string().allow('', null).max(200).trim(),
    location: Joi.string().allow('', null).max(200).trim(),
    notes: Joi.string().allow('', null).max(2000).trim(),
    isActive: Joi.boolean().default(true)
});

// ============================================
// ADVANCED FEATURES
// ============================================

const formSchema = Joi.object({
    title: Joi.string().required().max(200).trim(),
    description: Joi.string().allow('', null).max(1000).trim(),
    fields: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            type: Joi.string().required().valid('text', 'textarea', 'number', 'date', 'select', 'checkbox', 'signature', 'image', 'section'),
            label: Joi.string().required(),
            required: Joi.boolean().default(false),
            options: Joi.array().items(Joi.string()).when('type', { is: 'select', then: Joi.required() }),
            placeholder: Joi.string().allow('', null),
            defaultValue: Joi.any()
        })
    ).required(),
    settings: Joi.object({
        submitButtonText: Joi.string().default('Submit'),
        successMessage: Joi.string().default('Form submitted successfully'),
        notifyEmails: Joi.array().items(Joi.string().email())
    }).default({})
});

// Automation workflow schema (for triggered workflows with steps)
const workflowSchema = Joi.object({
    name: Joi.string().required().max(200).trim(),
    description: Joi.string().allow('', null).max(1000),
    trigger: Joi.string().required().valid('form_submission', 'invoice_paid', 'work_order_completed', 'client_signup', 'manual'),
    isActive: Joi.boolean().default(true),
    steps: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            type: Joi.string().required().valid('email', 'notification', 'delay', 'condition', 'task'),
            config: Joi.object().required().unknown(true)
        })
    ).min(1).required()
});

// Job workflow schema (for work order workflows with stages)
const jobWorkflowSchema = Joi.object({
    name: Joi.string().required().max(200).trim()
        .messages({
            'string.empty': 'Workflow name is required',
            'string.max': 'Name must not exceed 200 characters'
        }),
    description: Joi.string().allow('', null).max(1000).trim(),
    isDefault: Joi.boolean().default(false),
    stages: Joi.array().items(
        Joi.object({
            id: Joi.string().allow(null, '').optional(), // Allow null/empty/undefined for new stages
            name: Joi.string().required().max(100).trim()
                .messages({
                    'string.empty': 'Stage name is required'
                }),
            color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6b7280')
                .messages({
                    'string.pattern.base': 'Color must be a valid hex color (e.g., #6b7280)'
                }),
            type: Joi.string().valid('system', 'custom').default('custom'),
            order: Joi.number().integer().min(0).required()
        })
    ).min(1).required()
        .messages({
            'array.min': 'Workflow must have at least one stage'
        })
});

// ============================================
// CLIENT PORTAL VALIDATION
// ============================================

const clientMessageSchema = Joi.object({
    message: Joi.string().required().max(2000).trim(),
    customerId: Joi.string().allow(null, ''),
    fromClient: Joi.boolean().default(true)
});

const serviceRequestSchema = Joi.object({
    serviceType: Joi.string().required().max(100).trim(),
    description: Joi.string().allow('', null).max(1000).trim(),
    preferredDate: Joi.date().iso().allow(null),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
});

const profileUpdateSchema = Joi.object({
    name: Joi.string().max(200).trim(),
    phone: Joi.string().allow(null, '').max(20).trim(),
    address: Joi.string().allow(null, '').max(200),
    city: Joi.string().allow(null, '').max(100),
    state: Joi.string().allow(null, '').max(100),
    zip: Joi.string().allow(null, '').max(20),
    notes: Joi.string().allow('').max(2000)
});

const accountUpdateSchema = Joi.object({
    name: Joi.string().max(200).trim(),
    phone: Joi.string().allow(null, '').max(20).trim(),
    photoURL: Joi.string().uri().allow(null, ''),
    companyName: Joi.string().allow(null, '').max(200)
    // No email, role, or businessId allowed here
});

const scheduleSchema = Joi.object({
    title: Joi.string().required().max(200).trim(),
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required().greater(Joi.ref('start')),
    resourceId: Joi.string().allow(null, ''), // Employee ID
    workOrderId: Joi.string().allow(null, ''),
    type: Joi.string().valid('job', 'task', 'reminder', 'time_off').default('job'),
    notes: Joi.string().allow('', null).max(500),
    allDay: Joi.boolean().default(false),
    status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'canceled').default('scheduled'),

    // Recurrence fields
    isRecurring: Joi.boolean().default(false),
    recurrencePattern: Joi.object({
        frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
        interval: Joi.number().integer().min(1).default(1),
        endDate: Joi.date().iso().allow(null, '').optional(),
        daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)).optional()
    }).allow(null).optional(),

    // Allow other fields that might be passed but not strictly validated yet
    assignedCrew: Joi.array().items(Joi.string()).optional(),
    crewNames: Joi.array().items(Joi.string()).optional(),
    clientId: Joi.string().allow(null, '').optional(),
    clientName: Joi.string().allow(null, '').optional(),
    propertyId: Joi.string().allow(null, '').optional(),
    propertyAddress: Joi.string().allow(null, '').optional(),
    description: Joi.string().allow('', null).optional(),
    serviceType: Joi.string().allow(null, '').optional(),
    scheduledDate: Joi.string().optional(), // We convert this to start/end but it might be sent
    startTime: Joi.string().optional(),
    endTime: Joi.string().optional(),
    estimatedDuration: Joi.number().optional()
});

// ============================================
// CONTRACT TEMPLATE VALIDATION
// ============================================

const contractTemplateSchema = Joi.object({
    name: Joi.string().required().max(200).trim(),
    description: Joi.string().allow('', null).max(1000).trim(),
    icon: Joi.string().allow('', null).max(50),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
    defaultDuration: Joi.number().integer().min(1).default(12),
    billingFrequency: Joi.string().valid('one-time', 'monthly', 'quarterly', 'annually', 'milestone').default('monthly'),
    autoRenewal: Joi.boolean().default(false),
    terms: Joi.string().allow('').max(20000), // Larger limit for templates
    fields: Joi.object().unknown(true).default({}),
    isActive: Joi.boolean().default(true)
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Schemas
    workOrderSchema,
    invoiceSchema,
    contractSchema,
    customerSchema,
    propertySchema,
    estimateSchema,
    employeeSchema,

    // New Feature Schemas
    serviceSchema,
    productSchema,
    materialSchema,
    formSchema,
    workflowSchema,
    jobWorkflowSchema,
    scheduleSchema,

    // Client Portal Schemas
    clientMessageSchema,
    serviceRequestSchema,
    profileUpdateSchema,
    accountUpdateSchema,

    // Middleware
    validateRequest,
    validateQuery,

    // Contract Templates
    contractTemplateSchema
};


