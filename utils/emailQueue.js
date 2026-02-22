/**
 * Email Queue Service with Retry Mechanism
 * Ensures reliable email delivery with automatic retries
 */

const Queue = require('bull');
const { sendEmail: sendEmailDirect } = require('./emailService');

// Mock Queue for fallback (replicated from workflowEngine for reliability/independence)
class MockQueue {
    constructor(name) {
        this.name = name;
        this.jobs = [];
        this.processors = [];
        this.isMock = true;
        console.warn(`[MockQueue:${name}] Initialized in-memory fallback queue. Warning: Data will be lost on restart.`);
    }

    async add(data, options = {}) {
        const jobId = options.jobId || Date.now().toString();
        const job = {
            id: jobId,
            data,
            opts: options,
            timestamp: Date.now(),
            attemptsMade: 0,
            processedOn: null,
            finishedOn: null,
            failedReason: null,
            remove: () => {
                this.jobs = this.jobs.filter(j => j.id !== jobId);
                return Promise.resolve();
            }
        };
        this.jobs.push(job);

        // Simulate async processing
        setTimeout(() => this._processJob(job), 10);
        return job;
    }

    process(concurrency, handler) {
        if (typeof concurrency === 'function') {
            handler = concurrency;
        }
        this.processors.push(handler);
    }

    on(event, callback) { return this; }

    async _processJob(job) {
        if (this.processors.length === 0) return;
        const handler = this.processors[0];

        try {
            // console.log(`[MockQueue:${this.name}] Processing job ${job.id}`);
            await handler(job);
            job.finishedOn = Date.now();
        } catch (e) {
            job.failedReason = e.message;
            job.attemptsMade++;
            console.error(`[MockQueue:${this.name}] Job ${job.id} failed:`, e);
            // Simple mock retry logic could go here, but omitted for simplicity in fallback
        }
    }

    async getJob(jobId) { return this.jobs.find(j => j.id === jobId) || null; }
    async getWaitingCount() { return this.jobs.length; }
    async getActiveCount() { return 0; }
    async getCompletedCount() { return 0; }
    async getFailedCount() { return 0; }
    async getDelayedCount() { return 0; }
    async clean() { this.jobs = []; }
    async close() { }
}

let emailQueue;
const REDIS_CONFIG = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
};

try {
    emailQueue = new Queue('email-queue', REDIS_CONFIG);

    emailQueue.client.on('error', (err) => {
        console.error('Redis Email Queue Error:', err);
    });
} catch (error) {
    console.error('Failed to initialize Redis email queue:', error);
    emailQueue = new MockQueue('email-queue-fallback');
}

/**
 * Process email jobs
 */
emailQueue.process(async (job) => {
    const { to, subject, html, text, userSmtpConfig } = job.data;
    // Handle mock or real job attempt counts
    const attempts = job.opts ? job.opts.attempts : 3;
    const currentAttempt = job.attemptsMade ? job.attemptsMade + 1 : 1;

    console.log(`[Email Queue] Processing email to ${to} (Attempt ${currentAttempt}/${attempts})`);

    try {
        const result = await sendEmailDirect({
            to,
            subject,
            html,
            text,
            userSmtpConfig
        });

        if (!result.success) {
            throw new Error(result.error || 'Email sending failed');
        }

        console.log(`[Email Queue] ✅ Email sent successfully to ${to}`);
        return result;
    } catch (error) {
        console.error(`[Email Queue] ❌ Failed to send email to ${to}:`, error.message);
        throw error; // Will trigger retry in Bull
    }
});

/**
 * Handle completed jobs
 */
emailQueue.on('completed', (job, result) => {
    // console.log(`[Email Queue] Job ${job.id} completed`);
});

/**
 * Handle failed jobs 
 */
emailQueue.on('failed', (job, err) => {
    console.error(`[Email Queue] Job ${job.id} failed:`, err.message);
});

/**
 * Add email to queue
 * @param {Object} emailData - Email data
 * @returns {Promise<Object>} Job info
 */
async function queueEmail(emailData) {
    const { to, subject, html, text, userSmtpConfig, priority = 'normal' } = emailData;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
        throw new Error('Missing required email fields: to, subject, and html/text');
    }

    // Set priority (high priority emails sent first)
    const jobPriority = priority === 'high' ? 1 : priority === 'low' ? 3 : 2;

    const job = await emailQueue.add(
        {
            to,
            subject,
            html,
            text,
            userSmtpConfig
        },
        {
            priority: jobPriority,
            attempts: priority === 'high' ? 5 : 3
        }
    );

    console.log(`[Email Queue] Queued email to ${to} (Job ID: ${job.id}, Priority: ${priority})`);

    return {
        success: true,
        jobId: job.id,
        message: 'Email queued for delivery'
    };
}

/**
 * Send email with automatic retry (convenience wrapper)
 * @param {Object} emailData - Email data
 * @returns {Promise<Object>} Result
 */
async function sendEmailWithRetry(emailData) {
    try {
        return await queueEmail(emailData);
    } catch (error) {
        console.error('[Email Queue] Failed to queue email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
async function getQueueStats() {
    if (emailQueue.isMock) {
        return {
            waiting: await emailQueue.getWaitingCount(),
            active: 0, completed: 0, failed: 0, delayed: 0,
            total: await emailQueue.getWaitingCount()
        };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
        emailQueue.getWaitingCount(),
        emailQueue.getActiveCount(),
        emailQueue.getCompletedCount(),
        emailQueue.getFailedCount(),
        emailQueue.getDelayedCount()
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
    };
}

/**
 * Get failed jobs for manual review
 * @returns {Promise<Array>} Failed jobs
 */
async function getFailedJobs() {
    if (emailQueue.isMock) return []; // Mock doesn't persist failed list cleanly
    const failed = await emailQueue.getFailed();
    return failed.map(job => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp
    }));
}

/**
 * Retry a failed job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Result
 */
async function retryFailedJob(jobId) {
    const job = await emailQueue.getJob(jobId);

    if (!job) {
        return { success: false, error: 'Job not found' };
    }

    if (job.retry) await job.retry();

    return {
        success: true,
        message: 'Job queued for retry'
    };
}

/**
 * Clear completed jobs (cleanup)
 * @returns {Promise<void>}
 */
async function clearCompletedJobs() {
    await emailQueue.clean(24 * 60 * 60 * 1000); // Clear jobs older than 24 hours
    console.log('[Email Queue] Cleared completed jobs older than 24 hours');
}

/**
 * Graceful shutdown
 */
async function shutdown() {
    console.log('[Email Queue] Shutting down gracefully...');
    await emailQueue.close();
    console.log('[Email Queue] Shutdown complete');
}

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
    emailQueue,
    queueEmail,
    sendEmailWithRetry,
    getQueueStats,
    getFailedJobs,
    retryFailedJob,
    clearCompletedJobs,
    shutdown
};
