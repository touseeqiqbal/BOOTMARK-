/**
 * Contract Reminder Scheduler
 * Sends automated reminders for expirations, payments, and renewals
 */

const cron = require('node-cron');
const path = require('path');
const {
    checkExpiringContracts,
    checkUpcomingPayments,
    checkRenewalEligible,
    markReminderSent,
    getClientForContract,
    getBusinessForContract
} = require('./reminderChecker');

const { sendEmail } = require('./emailService');
const { getTemplateById, replaceTemplateVariables } = require('./contractEmailTemplates');

/**
 * Send expiration alert email
 */
async function sendExpirationAlert(contract, client, business, daysRemaining) {
    if (!client || !client.email) {
        console.log(`No client email for contract ${contract.id}`);
        return;
    }

    const template = getTemplateById('expiration-warning');
    if (!template) {
        console.error('Expiration warning template not found');
        return;
    }

    const appUrl = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:4000';
    const templateData = {
        clientName: client.name || 'Valued Client',
        contractTitle: contract.title || 'Contract',
        endDate: contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'TBD',
        amount: parseFloat(contract.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        daysRemaining: daysRemaining.toString(),
        renewalLink: `${appUrl}/contracts/${contract.id}/renew`,
        businessName: business?.businessName || business?.name || 'Our Company'
    };

    const { subject, body } = replaceTemplateVariables(template, templateData);

    try {
        await sendEmail({
            to: client.email,
            subject,
            html: body
        });

        console.log(`✅ Sent expiration alert for contract ${contract.id} (${daysRemaining} days)`);

        // Mark as sent
        await markReminderSent(`expiration_${contract.id}_${daysRemaining}days`, {
            contractId: contract.id,
            clientEmail: client.email,
            daysRemaining,
            type: 'expiration'
        });
    } catch (error) {
        console.error(`Failed to send expiration alert for contract ${contract.id}:`, error);
    }
}

/**
 * Send payment reminder email
 */
async function sendPaymentReminder(contract, payment, client, business, daysDiff) {
    if (!client || !client.email) {
        console.log(`No client email for contract ${contract.id}`);
        return;
    }

    const template = getTemplateById('payment-reminder');
    if (!template) {
        console.error('Payment reminder template not found');
        return;
    }

    const appUrl = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:4000';
    const templateData = {
        clientName: client.name || 'Valued Client',
        contractTitle: contract.title || 'Contract',
        paymentAmount: parseFloat(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        dueDate: payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'TBD',
        paymentLink: `${appUrl}/contracts/${contract.id}/payment`,
        businessName: business?.businessName || business?.name || 'Our Company'
    };

    const { subject, body } = replaceTemplateVariables(template, templateData);

    try {
        await sendEmail({
            to: client.email,
            subject,
            html: body
        });

        const status = daysDiff > 0 ? 'upcoming' : daysDiff === 0 ? 'due today' : 'overdue';
        console.log(`✅ Sent payment reminder for contract ${contract.id} (${status})`);

        // Mark as sent
        await markReminderSent(`payment_${contract.id}_${payment.id}_${daysDiff}days`, {
            contractId: contract.id,
            paymentId: payment.id,
            clientEmail: client.email,
            daysDiff,
            type: 'payment'
        });
    } catch (error) {
        console.error(`Failed to send payment reminder for contract ${contract.id}:`, error);
    }
}

/**
 * Send renewal prompt email
 */
async function sendRenewalPrompt(contract, client, business, daysRemaining) {
    if (!client || !client.email) {
        console.log(`No client email for contract ${contract.id}`);
        return;
    }

    const template = getTemplateById('renewal-reminder');
    if (!template) {
        console.error('Renewal reminder template not found');
        return;
    }

    const appUrl = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:4000';
    const templateData = {
        clientName: client.name || 'Valued Client',
        contractTitle: contract.title || 'Contract',
        amount: parseFloat(contract.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        renewalPeriod: '1 Year',
        renewalLink: `${appUrl}/contracts/${contract.id}/renew`,
        businessName: business?.businessName || business?.name || 'Our Company'
    };

    const { subject, body } = replaceTemplateVariables(template, templateData);

    try {
        await sendEmail({
            to: client.email,
            subject,
            html: body
        });

        console.log(`✅ Sent renewal prompt for contract ${contract.id} (${daysRemaining} days)`);

        // Mark as sent
        await markReminderSent(`renewal_${contract.id}_${daysRemaining}days`, {
            contractId: contract.id,
            clientEmail: client.email,
            daysRemaining,
            type: 'renewal'
        });
    } catch (error) {
        console.error(`Failed to send renewal prompt for contract ${contract.id}:`, error);
    }
}

/**
 * Process all reminders
 */
async function processReminders() {
    console.log('🔔 Running contract reminder check...');

    try {
        // Check expiring contracts
        const expiringAlerts = await checkExpiringContracts();
        for (const [period, contracts] of Object.entries(expiringAlerts)) {
            for (const { contract, daysRemaining } of contracts) {
                const client = await getClientForContract(contract);
                const business = await getBusinessForContract(contract);
                await sendExpirationAlert(contract, client, business, daysRemaining);
            }
        }

        // Check upcoming payments
        const paymentReminders = await checkUpcomingPayments();
        for (const [period, items] of Object.entries(paymentReminders)) {
            for (const { contract, payment, daysDiff } of items) {
                const client = await getClientForContract(contract);
                const business = await getBusinessForContract(contract);
                await sendPaymentReminder(contract, payment, client, business, daysDiff);
            }
        }

        // Check renewal eligible
        const renewalPrompts = await checkRenewalEligible();
        for (const { contract, daysRemaining } of renewalPrompts) {
            const client = await getClientForContract(contract);
            const business = await getBusinessForContract(contract);
            await sendRenewalPrompt(contract, client, business, daysRemaining);
        }

        console.log('✅ Reminder check complete');
    } catch (error) {
        console.error('❌ Error processing reminders:', error);
    }
}

/**
 * Initialize reminder scheduler
 * Runs daily at 9:00 AM
 */
function initializeReminderScheduler() {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Daily reminder check triggered');
        await processReminders();
    });

    console.log('📅 Reminder scheduler initialized (runs daily at 9:00 AM)');

    // Optional: Run immediately on startup for testing
    if (process.env.RUN_REMINDERS_ON_STARTUP === 'true') {
        console.log('🚀 Running initial reminder check...');
        setTimeout(() => processReminders(), 5000); // Wait 5 seconds after startup
    }
}

/**
 * Manual trigger for testing
 */
async function triggerRemindersManually() {
    console.log('🔧 Manual reminder trigger');
    await processReminders();
}

module.exports = {
    initializeReminderScheduler,
    processReminders,
    triggerRemindersManually
};
