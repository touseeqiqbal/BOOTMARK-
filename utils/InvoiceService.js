const { generateNumber } = require('./numberGenerator');
const { sendEmail } = require('./emailService');
const crypto = require('crypto');

class InvoiceService {
    constructor(database, mailer) {
        this.dbFunctions = database || require('./db');
        this.mailerFunctions = mailer || { sendEmail };
    }

    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }
    get sendEmail() { return this.mailerFunctions.sendEmail; }

    async getInvoiceById(id) {
        return await this.getDoc('invoices', id);
    }

    async getInvoicesByBusinessId(businessId) {
        const snap = await this.getCollectionRef('invoices').where('businessId', '==', businessId).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    }

    async createInvoice(businessId, invoiceData) {
        const { customerId, items, notes, dueDate, invoiceNumber } = invoiceData;
        const creatorId = invoiceData.creatorId || businessId; // Track who created it

        let finalInvoiceNumber = invoiceNumber;
        if (!finalInvoiceNumber) {
            try {
                finalInvoiceNumber = await generateNumber(businessId, 'invoice');
            } catch (error) {
                finalInvoiceNumber = `INV-${Date.now()}`;
            }
        }

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const tax = invoiceData.tax || 0;
        const total = subtotal + tax;

        const invoice = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            businessId, customerId, creatorId,
            invoiceNumber: finalInvoiceNumber,
            items, subtotal, tax, total,
            notes: notes || "",
            dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: invoiceData.status || "pending",
            quickbooksId: null,
            quickbooksSyncAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await this.setDoc('invoices', invoice.id, invoice);
        return invoice;
    }

    async updateInvoice(invoiceId, businessId, updateData) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) throw new Error("Invoice not found");
        if (invoice.businessId !== businessId) throw new Error("Access denied");

        const subtotal = updateData.items ? updateData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0) : invoice.subtotal;
        const tax = updateData.tax ?? invoice.tax;
        const total = subtotal + tax;

        const updated = {
            ...invoice,
            ...updateData,
            subtotal, tax, total,
            updatedAt: new Date().toISOString()
        };

        await this.setDoc('invoices', invoiceId, updated);
        return updated;
    }

    async sendInvoiceEmail(invoiceId, businessId, emailOptions) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) throw new Error("Invoice not found");
        if (invoice.businessId !== businessId) throw new Error("Access denied");

        const businessInfo = await this.getDoc('businesses', businessId);
        const { to, includePaymentLink } = emailOptions;

        let paymentUrl = null;
        if (includePaymentLink) {
            const paymentToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const paymentLink = {
                id: paymentToken, invoiceId, businessId,
                amount: invoice.total, expiresAt, used: false,
                createdAt: new Date().toISOString()
            };
            await this.setDoc('paymentLinks', paymentToken, paymentLink);
            const appUrl = process.env.APP_URL || 'http://localhost:4000';
            paymentUrl = `${appUrl}/pay/${paymentToken}`;
        }

        const html = this.generateInvoiceHtml(invoice, businessInfo, paymentUrl);
        return await this.sendEmail({
            to,
            subject: `Invoice ${invoice.invoiceNumber} from ${businessInfo?.businessName || 'BOOTMARK'}`,
            html,
            userSmtpConfig: businessInfo?.smtpConfig
        });
    }

    generateInvoiceHtml(invoice, business, paymentUrl) {
        return `<html><body><h1>Invoice ${invoice.invoiceNumber}</h1><p>Total: $${invoice.total}</p>${paymentUrl ? `<a href="${paymentUrl}">Pay Now</a>` : ''}</body></html>`;
    }
}

module.exports = new InvoiceService();
module.exports.InvoiceService = InvoiceService;
