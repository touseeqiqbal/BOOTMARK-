class SubmissionService {
    constructor(database) {
        this.dbFunctions = database || require('./db');
    }

    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }

    async getSubmissionById(id) {
        return await this.getDoc('submissions', id);
    }

    async getSubmissionsByFormIds(formIds) {
        if (!formIds || formIds.length === 0) return [];
        const snap = await this.getCollectionRef('submissions').get();
        const items = [];
        snap.forEach(d => {
            const data = d.data();
            if (formIds.includes(data.formId)) items.push({ id: d.id, ...data });
        });
        return items;
    }

    async getSubmissionsByFormId(formId) {
        const snap = await this.getCollectionRef('submissions').where('formId', '==', formId).get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    }

    async createSubmission(submissionData) {
        const id = submissionData.id || Date.now().toString();
        const newSubmission = {
            ...submissionData,
            id,
            submittedAt: submissionData.submittedAt || new Date().toISOString()
        };
        await this.setDoc('submissions', id, newSubmission);
        return newSubmission;
    }

    async deleteSubmission(id) {
        await this.deleteDoc('submissions', id);
        return true;
    }
}

module.exports = new SubmissionService();
module.exports.SubmissionService = SubmissionService;
