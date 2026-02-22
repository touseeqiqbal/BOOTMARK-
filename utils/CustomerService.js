class CustomerService {
    constructor(database) {
        this.dbFunctions = database || require('./db');
    }

    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }
    get db() { return this.dbFunctions.db; }

    async getCustomerById(id) {
        return await this.getDoc('customers', id);
    }

    async getCustomersByBusinessId(businessId) {
        const snap = await this.getCollectionRef('customers').where('businessId', '==', businessId).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    }

    async createCustomer(businessId, customerData) {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        const newCustomer = {
            id,
            ...customerData,
            businessId,
            createdAt: new Date().toISOString()
        };
        await this.setDoc('customers', id, newCustomer);
        return newCustomer;
    }

    async updateCustomer(customerId, businessId, updateData) {
        const existing = await this.getCustomerById(customerId);
        if (!existing) throw new Error("Customer not found");
        if (existing.businessId !== businessId) throw new Error("Access denied");

        const updated = {
            ...existing,
            ...updateData,
            id: customerId,
            updatedAt: new Date().toISOString()
        };
        await this.setDoc('customers', customerId, updated);
        return updated;
    }

    async deleteCustomer(customerId, businessId) {
        const existing = await this.getCustomerById(customerId);
        if (!existing) throw new Error("Customer not found");
        if (existing.businessId !== businessId) throw new Error("Access denied");

        // Cascading delete for GDPR/Cleanliness
        // Note: In a massive scale system, this should be a background job.
        // For this scale, parallel promises are fine.

        const collections = ['invoices', 'workOrders', 'contracts', 'serviceRequests', 'messages'];
        const deletionPromises = [];

        for (const colName of collections) {
            // Find docs where customerId matches
            // We use getCollectionRef directly to avoid circular dependency if possible,
            // or just use the helper from this.dbFunctions
            const snap = await this.getCollectionRef(colName)
                .where('customerId', '==', customerId)
                .where('businessId', '==', businessId) // Double check business ownership
                .get();

            if (!snap.empty) {
                const batch = this.db.batch();
                snap.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                deletionPromises.push(batch.commit());
            }
        }

        // Wait for related data deletion
        await Promise.all(deletionPromises);

        // Finally delete the customer
        await this.deleteDoc('customers', customerId);
        return true;
    }

    async getCustomerByEmail(email) {
        if (!email) return null;

        // Optimization: Try exact match first
        const snap = await this.getCollectionRef('customers').where('email', '==', email).get();
        if (!snap.empty) {
            return { id: snap.docs[0].id, ...snap.docs[0].data() };
        }

        // Fallback: Scan for case-insensitive match (matches previous behavior)
        // Ideally, we should store a normalized email field for checking
        const allSnap = await this.getCollectionRef('customers').get();
        let found = null;
        allSnap.forEach(doc => {
            const data = doc.data();
            if (data.email && data.email.toLowerCase() === email.toLowerCase()) {
                found = { id: doc.id, ...data };
            }
        });
        return found;
    }

    extractCustomerInfo(form, submissionData) {
        const nameKeywords = ['name', 'full name'];
        const emailFields = ['email', 'e-mail', 'email address'];
        const excludeFromName = ['number', 'amount', 'price', 'total', 'invoice', 'order', 'quantity', 'hours', 'time', 'phone', 'mobile', 'contact'];

        let customerName = null;
        let customerEmail = null;

        for (const field of form.fields || []) {
            const fieldLabel = (field.label || '').toLowerCase();
            const fieldId = field.id;
            const fieldValue = submissionData[fieldId];
            if (!fieldValue || typeof fieldValue !== 'string' || !fieldValue.trim()) continue;

            const hasNameKeyword = nameKeywords.some(nk => fieldLabel.includes(nk));
            if (hasNameKeyword && !excludeFromName.some(ex => fieldLabel.includes(ex))) {
                customerName = fieldValue.trim();
            }
            if (emailFields.some(ef => fieldLabel.includes(ef))) {
                customerEmail = fieldValue.trim();
            }
        }
        return { customerName, customerEmail };
    }
}

module.exports = new CustomerService();
module.exports.CustomerService = CustomerService;
