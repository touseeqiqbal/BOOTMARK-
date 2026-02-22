const { generateContractPDF } = require('./contractPDF');
const { notifyContractCreated } = require('./contractNotifications');
const { sendEmail } = require('./emailService');
const crypto = require('crypto');

class ContractService {
    constructor(database, mailer, notifications, pdfGen) {
        this.dbFunctions = database || require('./db');
        this.mailerFunctions = mailer || { sendEmail };
        this.notificationFunctions = notifications || { notifyContractCreated };
        this.pdfFunctions = pdfGen || { generateContractPDF };
    }

    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }
    get sendEmail() { return this.mailerFunctions.sendEmail; }
    get notifyContractCreated() { return this.notificationFunctions.notifyContractCreated; }
    get generateContractPDF() { return this.pdfFunctions.generateContractPDF; }

    async getContractById(id) {
        return await this.getDoc('contracts', id);
    }

    async getContractsByBusinessId(businessId) {
        const snap = await this.getCollectionRef('contracts').where('businessId', '==', businessId).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    }

    async createContract(businessId, creatorId, contractData) {
        const id = crypto.randomUUID();
        const newContract = {
            id, businessId,
            ...contractData,
            status: contractData.status || 'draft',
            signToken: crypto.randomBytes(32).toString('hex'), // Generate unique token
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: creatorId
        };

        await this.setDoc('contracts', id, newContract);

        try {
            await this.notifyContractCreated(newContract);
        } catch (e) {
            console.warn('[ContractService] Notification failed:', e.message);
        }

        return newContract;
    }

    async updateContract(contractId, businessId, updateData) {
        const existing = await this.getContractById(contractId);
        if (!existing) throw new Error("Contract not found");
        if (existing.businessId !== businessId) throw new Error("Access denied");

        const updated = {
            ...existing,
            ...updateData,
            id: contractId,
            updatedAt: new Date().toISOString()
        };
        await this.setDoc('contracts', contractId, updated);
        return updated;
    }

    async signContract(contractId, businessId, signatureData) {
        const contract = await this.getContractById(contractId);
        if (!contract) throw new Error("Contract not found");
        if (contract.businessId !== businessId) throw new Error("Access denied");

        const updateData = {
            status: 'signed',
            signedAt: new Date().toISOString(),
            signature: signatureData.signature, // Base64 or text representation
            signerIp: signatureData.ip || '0.0.0.0',
            signedBy: signatureData.signedBy || 'Unknown',
            updatedAt: new Date().toISOString()
        };

        const updated = { ...contract, ...updateData };
        await this.setDoc('contracts', contractId, updated);

        // Optional: Trigger notification or final PDF generation here
        return updated;
    }

    async generatePDF(contractId) {
        const contract = await this.getContractById(contractId);
        if (!contract) throw new Error("Contract not found");
        return await this.generateContractPDF(contract);
    }

    async sendContractEmail(contractId, businessId, emailData) {
        const contract = await this.getContractById(contractId);
        if (!contract) throw new Error("Contract not found");

        const { to, subject, html, userSmtpConfig } = emailData;

        const result = await this.sendEmail({
            to, subject, html, userSmtpConfig
        });

        if (result.success) {
            const emailRecord = {
                id: crypto.randomUUID(),
                contractId,
                to, subject,
                sentAt: new Date().toISOString(),
                status: 'sent'
            };
            await this.setDoc('contractEmails', emailRecord.id, emailRecord);
        }
        return result;
    }
}

module.exports = new ContractService();
module.exports.ContractService = ContractService;
