class EstimateService {
    constructor(database) {
        this.dbFunctions = database || require('./db');
    }

    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }

    async getEstimateById(id) {
        return await this.getDoc('estimates', id);
    }

    async getEstimatesByBusinessId(businessId) {
        const snap = await this.getCollectionRef('estimates').where('businessId', '==', businessId).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    }

    async createEstimate(businessId, estimateData) {
        const id = Date.now().toString();

        // SAFE CALCULATION
        const items = estimateData.items || [];
        const subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
        const tax = estimateData.tax || 0;
        const total = subtotal + tax;

        const newEstimate = {
            id,
            businessId, // Enforce business context
            userId: estimateData.userId, // Optional: keep creator reference
            ...estimateData,
            items, subtotal, tax, total, // Overwrite with calculated values
            status: estimateData.status || 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await this.setDoc('estimates', id, newEstimate);
        return newEstimate;
    }

    async updateEstimate(estimateId, businessId, updateData) {
        const existing = await this.getEstimateById(estimateId);
        if (!existing) throw new Error("Estimate not found");
        if (existing.businessId !== businessId) throw new Error("Access denied");

        let subtotal = existing.subtotal;
        let tax = existing.tax;
        let total = existing.total;
        let items = existing.items;

        // Recalculate if items or tax updated
        if (updateData.items || updateData.tax !== undefined) {
            items = updateData.items || existing.items || [];
            subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
            tax = updateData.tax !== undefined ? updateData.tax : (existing.tax || 0);
            total = subtotal + tax;
        }

        const updated = {
            ...existing,
            ...updateData,
            items, subtotal, tax, total,
            id: estimateId,
            updatedAt: new Date().toISOString()
        };
        await this.setDoc('estimates', estimateId, updated);
        return updated;
    }

    async deleteEstimate(estimateId, businessId) {
        const existing = await this.getEstimateById(estimateId);
        if (!existing) throw new Error("Estimate not found");
        if (existing.businessId !== businessId) throw new Error("Access denied");
        await this.deleteDoc('estimates', estimateId);
        return true;
    }
}

module.exports = new EstimateService();
module.exports.EstimateService = EstimateService;
