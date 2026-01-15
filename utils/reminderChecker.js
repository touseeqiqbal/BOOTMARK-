/**
 * Contract Reminder Checker
 * Checks contracts for upcoming expirations, payments, and renewals
 */

const path = require('path');
const { useFirestore, getCollectionRef, getDoc } = require(path.join(__dirname, 'db'));
const fs = require('fs').promises;

/**
 * Get all active contracts
 */
async function getAllActiveContracts() {
    let contracts = [];

    if (useFirestore) {
        const snapshot = await getCollectionRef('contracts')
            .where('status', 'in', ['active', 'pending'])
            .get();
        snapshot.forEach(doc => contracts.push({ id: doc.id, ...doc.data() }));
    } else {
        const contractsPath = path.join(__dirname, '..', 'data', 'contracts.json');
        try {
            const data = await fs.readFile(contractsPath, 'utf8');
            const allContracts = JSON.parse(data);
            contracts = allContracts.filter(c => c.status === 'active' || c.status === 'pending');
        } catch (error) {
            console.error('Error reading contracts:', error);
        }
    }

    return contracts;
}

/**
 * Check for contracts expiring soon
 */
async function checkExpiringContracts() {
    const contracts = await getAllActiveContracts();
    const now = new Date();
    const alerts = {
        '90days': [],
        '60days': [],
        '30days': [],
        '7days': [],
        'today': []
    };

    for (const contract of contracts) {
        if (!contract.endDate) continue;

        const endDate = new Date(contract.endDate);
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Check if already sent reminder for this period
        const reminderKey = `expiration_${contract.id}_${daysUntilExpiry}days`;
        const alreadySent = await checkReminderSent(reminderKey);

        if (alreadySent) continue;

        if (daysUntilExpiry === 90) {
            alerts['90days'].push({ contract, daysRemaining: 90 });
        } else if (daysUntilExpiry === 60) {
            alerts['60days'].push({ contract, daysRemaining: 60 });
        } else if (daysUntilExpiry === 30) {
            alerts['30days'].push({ contract, daysRemaining: 30 });
        } else if (daysUntilExpiry === 7) {
            alerts['7days'].push({ contract, daysRemaining: 7 });
        } else if (daysUntilExpiry === 0) {
            alerts['today'].push({ contract, daysRemaining: 0 });
        }
    }

    return alerts;
}

/**
 * Check for upcoming payments
 */
async function checkUpcomingPayments() {
    const contracts = await getAllActiveContracts();
    const now = new Date();
    const reminders = {
        '7daysBefore': [],
        'dueToday': [],
        '3daysOverdue': []
    };

    for (const contract of contracts) {
        if (!contract.paymentSchedule || contract.paymentSchedule.length === 0) continue;

        for (const payment of contract.paymentSchedule) {
            if (payment.paid) continue; // Skip already paid

            const dueDate = new Date(payment.dueDate);
            const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            const reminderKey = `payment_${contract.id}_${payment.id}_${daysDiff}days`;
            const alreadySent = await checkReminderSent(reminderKey);

            if (alreadySent) continue;

            if (daysDiff === 7) {
                reminders['7daysBefore'].push({ contract, payment, daysDiff: 7 });
            } else if (daysDiff === 0) {
                reminders['dueToday'].push({ contract, payment, daysDiff: 0 });
            } else if (daysDiff === -3) {
                reminders['3daysOverdue'].push({ contract, payment, daysDiff: -3 });
            }
        }
    }

    return reminders;
}

/**
 * Check for contracts eligible for renewal
 */
async function checkRenewalEligible() {
    const contracts = await getAllActiveContracts();
    const now = new Date();
    const renewals = [];

    for (const contract of contracts) {
        if (!contract.endDate) continue;

        const endDate = new Date(contract.endDate);
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Send renewal prompt 45 days before expiration
        if (daysUntilExpiry === 45) {
            const reminderKey = `renewal_${contract.id}_45days`;
            const alreadySent = await checkReminderSent(reminderKey);

            if (!alreadySent) {
                renewals.push({ contract, daysRemaining: 45 });
            }
        }
    }

    return renewals;
}

/**
 * Check if reminder was already sent
 */
async function checkReminderSent(reminderKey) {
    if (useFirestore) {
        try {
            const doc = await getDoc('reminderHistory', reminderKey);
            return doc !== null;
        } catch (error) {
            return false;
        }
    } else {
        const historyPath = path.join(__dirname, '..', 'data', 'reminderHistory.json');
        try {
            const data = await fs.readFile(historyPath, 'utf8');
            const history = JSON.parse(data);
            return history.some(h => h.reminderKey === reminderKey);
        } catch (error) {
            return false;
        }
    }
}

/**
 * Mark reminder as sent
 */
async function markReminderSent(reminderKey, details) {
    const record = {
        reminderKey,
        sentAt: new Date().toISOString(),
        details
    };

    if (useFirestore) {
        const { setDoc } = require(path.join(__dirname, 'db'));
        await setDoc('reminderHistory', reminderKey, record);
    } else {
        const historyPath = path.join(__dirname, '..', 'data', 'reminderHistory.json');
        try {
            let history = [];
            try {
                const data = await fs.readFile(historyPath, 'utf8');
                history = JSON.parse(data);
            } catch (e) {
                // File doesn't exist yet
            }
            history.push(record);
            await fs.mkdir(path.dirname(historyPath), { recursive: true });
            await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error saving reminder history:', error);
        }
    }
}

/**
 * Get client for contract
 */
async function getClientForContract(contract) {
    if (!contract.clientId) return null;

    try {
        if (useFirestore) {
            return await getDoc('customers', contract.clientId);
        } else {
            const clientsPath = path.join(__dirname, '..', 'data', 'customers.json');
            const data = await fs.readFile(clientsPath, 'utf8');
            const clients = JSON.parse(data);
            return clients.find(c => c.id === contract.clientId);
        }
    } catch (error) {
        console.error('Error fetching client:', error);
        return null;
    }
}

/**
 * Get business for contract
 */
async function getBusinessForContract(contract) {
    if (!contract.businessId) return null;

    try {
        if (useFirestore) {
            return await getDoc('businesses', contract.businessId);
        } else {
            const businessPath = path.join(__dirname, '..', 'data', 'businesses.json');
            const data = await fs.readFile(businessPath, 'utf8');
            const businesses = JSON.parse(data);
            return businesses.find(b => b.id === contract.businessId);
        }
    } catch (error) {
        console.error('Error fetching business:', error);
        return null;
    }
}

module.exports = {
    getAllActiveContracts,
    checkExpiringContracts,
    checkUpcomingPayments,
    checkRenewalEligible,
    markReminderSent,
    getClientForContract,
    getBusinessForContract
};
