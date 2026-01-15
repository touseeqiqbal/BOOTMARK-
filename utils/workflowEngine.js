const path = require('path');
const { useFirestore, getDoc, setDoc, getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));
const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));

/**
 * Automated Workflow Engine
 * Executes predefined workflows based on triggers
 */

class WorkflowEngine {
    constructor() {
        this.workflows = new Map();
    }

    /**
     * Register a workflow
     */
    registerWorkflow(workflowId, workflow) {
        this.workflows.set(workflowId, workflow);
        console.log(`[Workflow] Registered: ${workflowId}`);
    }

    /**
     * Execute a workflow
     */
    async executeWorkflow(workflowId, context) {
        const workflow = this.workflows.get(workflowId);

        if (!workflow) {
            console.error(`[Workflow] Not found: ${workflowId}`);
            return { success: false, error: 'Workflow not found' };
        }

        console.log(`[Workflow] Executing: ${workflowId}`);

        try {
            for (const step of workflow.steps) {
                await this.executeStep(step, context);
            }

            return { success: true };
        } catch (error) {
            console.error(`[Workflow] Error in ${workflowId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute a single workflow step
     */
    async executeStep(step, context) {
        console.log(`[Workflow] Step: ${step.type}`);

        switch (step.type) {
            case 'send-email':
                await this.sendEmail(step.config, context);
                break;

            case 'send-notification':
                await this.sendNotification(step.config, context);
                break;

            case 'create-invoice':
                await this.createInvoice(step.config, context);
                break;

            case 'update-status':
                await this.updateStatus(step.config, context);
                break;

            case 'assign-employee':
                await this.assignEmployee(step.config, context);
                break;

            case 'wait':
                await this.wait(step.config.duration);
                break;

            default:
                console.warn(`[Workflow] Unknown step type: ${step.type}`);
        }
    }

    async sendEmail(config, context) {
        const { sendEmail } = require(path.join(__dirname, '..', 'utils', 'smtpConfig'));

        await sendEmail({
            to: config.to || context.customerEmail,
            subject: this.interpolate(config.subject, context),
            html: this.interpolate(config.body, context),
            userId: context.businessId
        });
    }

    async sendNotification(config, context) {
        sendBusinessNotification(context.businessId, {
            type: config.notificationType || 'info',
            title: this.interpolate(config.title, context),
            message: this.interpolate(config.message, context),
            link: config.link
        });
    }

    async createInvoice(config, context) {
        // Invoice creation logic
        const invoice = {
            id: Date.now().toString(),
            customerId: context.customerId,
            businessId: context.businessId,
            items: config.items,
            status: 'draft',
            createdAt: new Date().toISOString()
        };

        await setDoc('invoices', invoice.id, invoice);
    }

    async updateStatus(config, context) {
        const collection = config.collection || 'workOrders';
        const doc = await getDoc(collection, context.resourceId);

        if (doc) {
            doc.status = config.status;
            doc.updatedAt = new Date().toISOString();
            await setDoc(collection, context.resourceId, doc);
        }
    }

    async assignEmployee(config, context) {
        const workOrder = await getDoc('workOrders', context.workOrderId);

        if (workOrder) {
            workOrder.assignedTo = config.employeeId;
            workOrder.assignedAt = new Date().toISOString();
            await setDoc('workOrders', context.workOrderId, workOrder);

            // Notify employee
            sendBusinessNotification(context.businessId, {
                type: 'work-order-assigned',
                title: 'New Work Order Assigned',
                message: `You have been assigned to work order #${workOrder.id}`,
                userId: config.employeeId
            });
        }
    }

    async wait(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    interpolate(template, context) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context[key] || match;
        });
    }
}

// Create singleton instance
const workflowEngine = new WorkflowEngine();

// Register default workflows
workflowEngine.registerWorkflow('new-customer-welcome', {
    name: 'New Customer Welcome',
    trigger: 'customer.created',
    steps: [
        {
            type: 'send-email',
            config: {
                subject: 'Welcome to {{businessName}}!',
                body: '<h1>Welcome!</h1><p>Thank you for choosing us.</p>'
            }
        },
        {
            type: 'send-notification',
            config: {
                notificationType: 'success',
                title: 'New Customer',
                message: 'Customer {{customerName}} has been added'
            }
        }
    ]
});

workflowEngine.registerWorkflow('work-order-completed', {
    name: 'Work Order Completion',
    trigger: 'workOrder.completed',
    steps: [
        {
            type: 'update-status',
            config: {
                collection: 'workOrders',
                status: 'completed'
            }
        },
        {
            type: 'create-invoice',
            config: {
                items: []
            }
        },
        {
            type: 'send-email',
            config: {
                subject: 'Work Order Completed',
                body: '<p>Your work order has been completed. Invoice attached.</p>'
            }
        }
    ]
});

module.exports = workflowEngine;
