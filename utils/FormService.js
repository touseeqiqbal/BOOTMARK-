const crypto = require('crypto');
const path = require('path');
const defaultTemplates = require('../data/defaultFormTemplates');

class FormService {
    constructor(database) {
        this.dbFunctions = database || require('./db');
    }

    get db() { return this.dbFunctions.db; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }

    /**
     * Helper to load a single user by id
     */
    async getUserById(userId) {
        if (!userId) return null;
        try {
            return await this.getDoc('users', userId);
        } catch (error) {
            console.warn(`[FormService] Could not load user ${userId}:`, error.message);
            return null;
        }
    }

    /**
     * Templates Management
     */
    async getCustomTemplates(businessId) {
        try {
            const snap = await this.getCollectionRef('formTemplates')
                .where('businessId', '==', businessId)
                .get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('[FormService] Error fetching templates:', e);
            return [];
        }
    }

    async saveCustomTemplate(businessId, template) {
        try {
            const id = template.id || crypto.randomUUID();
            const newTemplate = {
                ...template,
                id,
                businessId,
                createdAt: template.createdAt || new Date().toISOString()
            };
            await this.setDoc('formTemplates', id, newTemplate);
            return newTemplate;
        } catch (e) {
            console.error('[FormService] Error saving template:', e);
            throw e;
        }
    }

    async deleteTemplate(templateId, businessId) {
        const template = await this.getDoc('formTemplates', templateId);
        if (!template) throw new Error('Template not found');
        if (template.businessId !== businessId) throw new Error('Permission denied');
        await this.deleteDoc('formTemplates', templateId);
        return true;
    }

    /**
     * Form CRUD Operations
     */
    async getForms(businessId) {
        try {
            const snap = await this.getCollectionRef('forms')
                .where('businessId', '==', businessId)
                .get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('[FormService] Error fetching forms:', e);
            return [];
        }
    }

    async getFormById(id) {
        try {
            return await this.getDoc('forms', id);
        } catch (e) {
            console.error(`[FormService] Error fetching form ${id}:`, e);
            return null;
        }
    }

    async createForm(formData, creatorId, ownerId, businessId = null) {
        const newForm = {
            id: crypto.randomBytes(16).toString("hex"),
            userId: ownerId,
            ownerId,
            createdBy: creatorId,
            businessId,
            title: formData.title || "Untitled Form",
            fields: formData.fields || [],
            settings: formData.settings || {
                theme: "default",
                allowMultipleSubmissions: true,
                showProgressBar: true,
                confirmationMessage: "Thank you for your submission!",
            },
            shareKey: crypto.randomBytes(8).toString("hex"),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: 0
        };

        await this.setDoc('forms', newForm.id, newForm);
        return newForm;
    }

    async updateForm(id, businessId, updateData) {
        const existing = await this.getFormById(id);
        if (!existing) throw new Error('Form not found');
        if (existing.businessId !== businessId) throw new Error('Access denied');

        const updatedForm = {
            ...existing,
            ...updateData,
            id: existing.id,
            businessId: existing.businessId,
            updatedAt: new Date().toISOString()
        };

        await this.setDoc('forms', id, updatedForm);
        return updatedForm;
    }

    async deleteForm(id, businessId) {
        const existing = await this.getFormById(id);
        if (!existing) throw new Error('Form not found');
        if (existing.businessId !== businessId) throw new Error('Access denied');
        await this.deleteDoc('forms', id);
        return true;
    }

    /**
     * Business & Access Context
     */
    async getBusinessesData() {
        try {
            const snap = await this.getCollectionRef('businesses').get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('[FormService] Error fetching businesses:', e);
            return [];
        }
    }

    async findBusinessContextForUser(userId) {
        if (!userId) return { business: null, membership: null };
        const businesses = await this.getBusinessesData();
        const DEFAULT_BUSINESS_PERMISSIONS = ['forms', 'submissions', 'customers', 'invoices', 'analytics', 'settings'];

        for (const business of businesses) {
            if (business.ownerId === userId) {
                return {
                    business,
                    membership: { userId, role: 'owner', permissions: DEFAULT_BUSINESS_PERMISSIONS }
                };
            }
            const member = (business.members || []).find(m => m.userId === userId);
            if (member) return { business, membership: member };
        }
        return { business: null, membership: null };
    }

    async getFormAccessContext(userId) {
        const { business, membership } = await this.findBusinessContextForUser(userId);
        const allowedUserIds = new Set();
        let formsOwnerId = userId;
        let hasFormsPermission = true;
        let isBusinessOwner = false;

        if (business) {
            if (business.ownerId === userId) {
                isBusinessOwner = true;
                formsOwnerId = userId;
                allowedUserIds.add(userId);
                (business.members || []).forEach(member => {
                    if (this.hasFormsAccess(member) && member.userId) allowedUserIds.add(member.userId);
                });
            } else {
                if (!this.hasFormsAccess(membership)) {
                    hasFormsPermission = false;
                } else {
                    formsOwnerId = business.ownerId;
                    allowedUserIds.add(business.ownerId);
                    allowedUserIds.add(userId);
                }
            }
        } else {
            allowedUserIds.add(userId);
        }

        return { userId, business, membership, isBusinessOwner, allowedUserIds, formsOwnerId, hasFormsPermission };
    }

    hasFormsAccess(member) {
        if (!member) return false;
        if (member.role === 'owner' || member.role === 'admin' || member.role === 'manager') return true;
        return Array.isArray(member.permissions) && member.permissions.includes('forms');
    }

    /**
     * Invitations & Members
     */
    async getFormMembers(formId) {
        const snap = await this.getCollectionRef('members').where('formId', '==', formId).get();
        const members = [];
        snap.forEach(d => members.push({ id: d.id, ...d.data() }));
        return members;
    }

    async getFormInvites(formId) {
        const snap = await this.getCollectionRef('invites').where('formId', '==', formId).get();
        const invites = [];
        snap.forEach(d => invites.push({ id: d.id, ...d.data() }));
        return invites;
    }

    async createInvite(formId, inviteData) {
        const invite = {
            id: crypto.randomBytes(8).toString("hex"),
            email: inviteData.email.toLowerCase().trim(),
            role: inviteData.role || 'editor',
            formId: formId,
            token: crypto.randomBytes(32).toString("hex"),
            createdAt: new Date().toISOString()
        };
        await this.setDoc('invites', invite.id, invite);
        return invite;
    }

    async acceptInvite(inviteId, userId, userEmail) {
        const invite = await this.getDoc('invites', inviteId);
        if (!invite) throw new Error('Invitation not found or expired');
        if (invite.email?.toLowerCase().trim() !== userEmail.toLowerCase().trim()) throw new Error('Email mismatch');

        const memberId = crypto.randomBytes(8).toString("hex");
        const member = {
            id: memberId,
            email: userEmail,
            role: invite.role,
            formId: invite.formId,
            userId: userId,
            joinedAt: new Date().toISOString()
        };
        await this.setDoc('members', memberId, member);
        await this.deleteDoc('invites', inviteId);
        return { member, formId: invite.formId };
    }
}

module.exports = new FormService();
module.exports.FormService = FormService;

