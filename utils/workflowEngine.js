/**
 * Enhanced Workflow Engine with Retry Mechanism
 * Provides reliable workflow execution with step-level error recovery
 */

const Queue = require('bull');
const path = require('path');
const { getDoc, setDoc, getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));
const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));

// Create workflow queue
const workflowQueue = new Queue('workflow-queue', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000 // Start with 5 seconds
        },
        removeOnComplete: false, // Keep for audit trail
        removeOnFail: false
    }
});

class WorkflowEngine {
    constructor() {
        this.workflows = new Map();
        this.setupQueueProcessor();
    }

    /**
     * Setup queue processor
     */
    setupQueueProcessor() {
        workflowQueue.process(async (job) => {
            const { workflowId, context, executionId } = job.data;

            console.log(`[Workflow] Processing ${workflowId} (Execution: ${executionId}, Attempt: ${job.attemptsMade + 1})`);

            try {
                const result = await this.executeWorkflowSteps(workflowId, context, executionId, job);

                // Log successful execution
                await this.logExecution(executionId, {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    result
                });

                return result;
            } catch (error) {
                console.error(`[Workflow] Error in ${workflowId}:`, error);

                // Log failed execution
                await this.logExecution(executionId, {
                    status: 'failed',
                    failedAt: new Date().toISOString(),
                    error: error.message,
                    attemptsMade: job.attemptsMade + 1
                });

                throw error; // Will trigger retry
            }
        });

        // Handle completed workflows
        workflowQueue.on('completed', (job, result) => {
            console.log(`[Workflow] ✅ Workflow ${job.data.workflowId} completed successfully`);
        });

        // Handle failed workflows (after all retries)
        workflowQueue.on('failed', (job, err) => {
            console.error(`[Workflow] ❌ Workflow ${job.data.workflowId} failed permanently:`, err.message);
        });
    }

    /**
     * Register a workflow
     */
    registerWorkflow(workflowId, workflow) {
        this.workflows.set(workflowId, workflow);
        console.log(`[Workflow] Registered: ${workflowId}`);
    }

    /**
     * Queue workflow for execution
     */
    async queueWorkflow(workflowId, context) {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create execution log
        await this.logExecution(executionId, {
            workflowId,
            context,
            status: 'queued',
            queuedAt: new Date().toISOString()
        });

        const job = await workflowQueue.add({
            workflowId,
            context,
            executionId
        });

        console.log(`[Workflow] Queued ${workflowId} (Execution: ${executionId}, Job: ${job.id})`);

        return {
            success: true,
            executionId,
            jobId: job.id
        };
    }

    /**
     * Execute workflow steps with retry per step
     */
    async executeWorkflowSteps(workflowId, context, executionId, job) {
        const workflow = this.workflows.get(workflowId);

        if (!workflow) {
            // Try to load from database
            const dbWorkflow = await getDoc('workflows', workflowId);
            if (!dbWorkflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }
            this.workflows.set(workflowId, dbWorkflow);
            workflow = dbWorkflow;
        }

        const results = [];

        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];

            // Update job progress
            await job.progress((i / workflow.steps.length) * 100);

            // Execute step with retry
            const stepResult = await this.executeStepWithRetry(step, context, executionId, i);
            results.push(stepResult);

            // Log step completion
            await this.logExecution(executionId, {
                [`step_${i}_completed`]: new Date().toISOString(),
                [`step_${i}_result`]: stepResult
            });
        }

        return { success: true, steps: results };
    }

    /**
     * Execute single step with retry
     */
    async executeStepWithRetry(step, context, executionId, stepIndex, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Workflow] Executing step ${stepIndex} (${step.type}) - Attempt ${attempt}/${maxRetries}`);

                const result = await this.executeStep(step, context);

                console.log(`[Workflow] ✅ Step ${stepIndex} completed`);
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`[Workflow] ⚠️  Step ${stepIndex} failed (Attempt ${attempt}/${maxRetries}):`, error.message);

                if (attempt < maxRetries) {
                    const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`[Workflow] Retrying step ${stepIndex} in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries exhausted
        throw new Error(`Step ${stepIndex} (${step.type}) failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Execute a single workflow step
     */
    async executeStep(step, context) {
        console.log(`[Workflow] Step: ${step.type}`);

        switch (step.type) {
            case 'send-email':
                return await this.sendEmail(step.config, context);

            case 'send-notification':
                return await this.sendNotification(step.config, context);

            case 'create-invoice':
                return await this.createInvoice(step.config, context);

            case 'update-status':
                return await this.updateStatus(step.config, context);

            case 'assign-employee':
                return await this.assignEmployee(step.config, context);

            case 'wait':
                return await this.wait(step.config.duration);

            default:
                console.warn(`[Workflow] Unknown step type: ${step.type}`);
                return { skipped: true, reason: 'Unknown step type' };
        }
    }

    async sendEmail(config, context) {
        const { sendEmailWithRetry } = require(path.join(__dirname, '..', 'utils', 'emailQueue'));

        return await sendEmailWithRetry({
            to: config.to || context.customerEmail,
            subject: this.interpolate(config.subject, context),
            html: this.interpolate(config.body, context),
            priority: config.priority || 'normal'
        });
    }

    async sendNotification(config, context) {
        sendBusinessNotification(context.businessId, {
            type: config.notificationType || 'info',
            title: this.interpolate(config.title, context),
            message: this.interpolate(config.message, context),
            link: config.link
        });

        return { success: true };
    }

    async createInvoice(config, context) {
        const invoice = {
            id: Date.now().toString(),
            customerId: context.customerId,
            businessId: context.businessId,
            items: config.items,
            status: 'draft',
            createdAt: new Date().toISOString()
        };

        await setDoc('invoices', invoice.id, invoice);
        return { success: true, invoiceId: invoice.id };
    }

    async updateStatus(config, context) {
        const collection = config.collection || 'workOrders';
        const doc = await getDoc(collection, context.resourceId);

        if (doc) {
            doc.status = config.status;
            doc.updatedAt = new Date().toISOString();
            await setDoc(collection, context.resourceId, doc);
            return { success: true };
        }

        throw new Error(`Document not found: ${collection}/${context.resourceId}`);
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

            return { success: true };
        }

        throw new Error(`Work order not found: ${context.workOrderId}`);
    }

    async wait(duration) {
        await new Promise(resolve => setTimeout(resolve, duration));
        return { success: true, waited: duration };
    }

    interpolate(template, context) {
        if (!template) return '';

        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context[key] || match;
        });
    }

    /**
     * Log workflow execution
     */
    async logExecution(executionId, data) {
        try {
            const existing = await getDoc('workflowExecutions', executionId);
            const logData = {
                ...existing,
                ...data,
                executionId,
                updatedAt: new Date().toISOString()
            };

            if (!existing) {
                logData.createdAt = new Date().toISOString();
            }

            await setDoc('workflowExecutions', executionId, logData);
        } catch (error) {
            console.error('[Workflow] Failed to log execution:', error);
        }
    }

    /**
     * Get execution history
     */
    async getExecutionHistory(workflowId, limit = 50) {
        try {
            const snapshot = await getCollectionRef('workflowExecutions')
                .where('workflowId', '==', workflowId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const executions = [];
            snapshot.forEach(doc => {
                executions.push({ id: doc.id, ...doc.data() });
            });

            return executions;
        } catch (error) {
            console.error('[Workflow] Failed to get execution history:', error);
            return [];
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            workflowQueue.getWaitingCount(),
            workflowQueue.getActiveCount(),
            workflowQueue.getCompletedCount(),
            workflowQueue.getFailedCount(),
            workflowQueue.getDelayedCount()
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            delayed
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('[Workflow] Shutting down gracefully...');
        await workflowQueue.close();
        console.log('[Workflow] Shutdown complete');
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
                body: '<h1>Welcome!</h1><p>Thank you for choosing us.</p>',
                priority: 'high'
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
                body: '<p>Your work order has been completed. Invoice attached.</p>',
                priority: 'normal'
            }
        }
    ]
});

// Handle process termination
process.on('SIGTERM', () => workflowEngine.shutdown());
process.on('SIGINT', () => workflowEngine.shutdown());

module.exports = workflowEngine;
