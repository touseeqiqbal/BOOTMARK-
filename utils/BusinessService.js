const { sendEmail } = require('./emailService');
const { getAllPermissionIds, validatePermissions } = require('./businessPermissions');

class BusinessService {
    constructor(database) {
        this.dbFunctions = database || require('./db');
    }

    get admin() { return this.dbFunctions.admin; }
    get db() { return this.dbFunctions.db; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get deleteDoc() { return this.dbFunctions.deleteDoc; }

    async getBusinessById(id) {
        if (!id) return null;
        return await this.getDoc('businesses', id);
    }

    async getBusinessByOwnerId(ownerId) {
        const snap = await this.getCollectionRef('businesses').where('ownerId', '==', ownerId).limit(1).get();
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }

    async registerBusiness(userId, businessData) {
        const user = await this.getDoc('users', userId);
        if (user?.businessId) throw new Error("User already has a registered business");

        const businessId = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newBusiness = {
            id: businessId,
            businessId,
            ...businessData,
            ownerId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending-review'
        };

        await this.setDoc('businesses', businessId, newBusiness);

        const updatedUser = {
            ...user,
            businessId,
            accountType: 'business',
            role: 'owner',
            accountStatus: 'pending-approval',
            businessPendingId: businessId,
            updatedAt: new Date().toISOString()
        };
        await this.setDoc('users', userId, updatedUser);

        return newBusiness;
    }

    async updateBusiness(businessId, updateData, userId, isSuperAdmin = false) {
        const business = await this.getBusinessById(businessId);
        if (!business) throw new Error("Business not found");

        if (!isSuperAdmin && business.ownerId !== userId) {
            const user = await this.getDoc('users', userId);
            if (!user?.businessPermissions?.includes('business.settings')) {
                throw new Error("No permission to update business settings");
            }
        }

        const updatedBusiness = {
            ...business,
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        if (updateData.customization) {
            updatedBusiness.customization = { ...(business.customization || {}), ...updateData.customization };
        }

        await this.setDoc('businesses', businessId, updatedBusiness);
        return updatedBusiness;
    }

    async approveBusiness(businessId, adminUserId, permissions = null) {
        const business = await this.getBusinessById(businessId);
        if (!business) throw new Error("Business not found");

        business.status = 'active';
        business.approvedAt = new Date().toISOString();
        business.approvedBy = adminUserId;
        await this.setDoc('businesses', businessId, business);

        const owner = await this.getDoc('users', business.ownerId);
        if (owner) {
            owner.accountStatus = 'active';
            if (permissions && Array.isArray(permissions) && validatePermissions(permissions)) {
                owner.businessPermissions = permissions;
            }
            owner.accountType = 'business';
            owner.role = 'owner';
            owner.businessId = businessId;
            owner.businessPendingId = null;
            owner.updatedAt = new Date().toISOString();
            await this.setDoc('users', business.ownerId, owner);
        }
        return business;
    }

    async createMember(businessId, adminId, memberData) {
        const business = await this.getBusinessById(businessId);
        if (!business) throw new Error("Business not found");

        const { email, name, password, role = 'member', permissions = [] } = memberData;

        if (!this.admin || !this.admin.auth) throw new Error("Firebase Admin not initialized");

        const firebaseUser = await this.admin.auth().createUser({ email, password, displayName: name });
        const newUserId = firebaseUser.uid;

        const newUser = {
            id: newUserId,
            uid: newUserId,
            email,
            name,
            createdAt: new Date().toISOString(),
            accountType: 'personal',
            role: 'user',
            businessId: businessId,
            businessPermissions: permissions
        };
        await this.setDoc('users', newUserId, newUser);

        const members = business.members || [];
        members.push({ userId: newUserId, email, role, permissions, addedAt: new Date().toISOString(), addedBy: adminId });
        await this.setDoc('businesses', businessId, { ...business, members });

        return { userId: newUserId, email, name, role, permissions };
    }

    async removeMember(businessId, memberId) {
        const business = await this.getBusinessById(businessId);
        if (!business) throw new Error("Business not found");
        if (business.ownerId === memberId) throw new Error("Cannot remove owner");

        const members = (business.members || []).filter(m => m.userId !== memberId);
        await this.setDoc('businesses', businessId, { ...business, members });

        const targetUser = await this.getDoc('users', memberId);
        if (targetUser) {
            await this.setDoc('users', memberId, { ...targetUser, businessId: null, businessPermissions: [] });
        }
        return true;
    }

    // ============================================
    // SUPER ADMIN METHODS
    // ============================================

    async getAllBusinesses() {
        const snap = await this.getCollectionRef('businesses').get();
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return items;
    }

    async getBusinessAdmins(businessId) {
        const business = await this.getBusinessById(businessId);
        if (!business) throw new Error("Business not found");

        const admins = [];

        // Add owner
        const owner = await this.getDoc('users', business.ownerId);
        if (owner) {
            admins.push({
                userId: owner.uid || owner.id,
                name: owner.name,
                email: owner.email,
                role: owner.role,
                isOwner: true,
                businessPermissions: owner.businessPermissions || []
            });
        }

        // Add members with roles that could be admins
        for (const member of (business.members || [])) {
            const user = await this.getDoc('users', member.userId);
            if (user) {
                admins.push({
                    userId: user.uid || user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role || member.role,
                    isOwner: false,
                    businessPermissions: user.businessPermissions || []
                });
            }
        }

        return admins;
    }

    async updateUserPermissions(userId, permissions) {
        const user = await this.getDoc('users', userId);
        if (!user) throw new Error("User not found");

        if (!validatePermissions(permissions)) {
            throw new Error("Invalid permissions provided");
        }

        const updatedUser = {
            ...user,
            businessPermissions: permissions,
            updatedAt: new Date().toISOString()
        };

        await this.setDoc('users', userId, updatedUser);
        return updatedUser;
    }

    async deleteBusiness(businessId) {
        const business = await this.getBusinessById(businessId);
        if (!business) throw new Error("Business not found");

        // 1. Deactivate owner
        const owner = await this.getDoc('users', business.ownerId);
        if (owner) {
            await this.setDoc('users', business.ownerId, {
                ...owner,
                accountStatus: 'disabled',
                businessId: null,
                businessPermissions: [],
                updatedAt: new Date().toISOString()
            });
        }

        // 2. Deactivate members (if only in this business)
        for (const member of (business.members || [])) {
            const user = await this.getDoc('users', member.userId);
            if (user && user.businessId === businessId) {
                await this.setDoc('users', member.userId, {
                    ...user,
                    accountStatus: 'disabled',
                    businessId: null,
                    businessPermissions: [],
                    updatedAt: new Date().toISOString()
                });
            }
        }

        // 3. Delete the business record
        await this.deleteDoc('businesses', businessId);
        return true;
    }

    async resetUserPassword(userId) {
        const user = await this.getDoc('users', userId);
        if (!user || !user.email) throw new Error("User or email not found");

        if (!this.admin || !this.admin.auth) throw new Error("Firebase Admin not initialized");

        try {
            const link = await this.admin.auth().generatePasswordResetLink(user.email);

            // Try to send email if service available
            try {
                const { sendEmail } = require('./emailService');
                await sendEmail({
                    to: user.email,
                    subject: 'Password Reset',
                    html: `<p>A super admin has initiated a password reset for your account.</p>
                           <p>Please use the following link to reset your password:</p>
                           <a href="${link}">${link}</a>`
                });
                return { success: true, message: "Password reset email sent" };
            } catch (emailError) {
                console.error("Failed to send reset email, returning link:", emailError);
                return {
                    success: true,
                    message: "Password reset link generated (email failed)",
                    resetLink: link,
                    warning: "Email service failed. Please share this link with the user manually."
                };
            }
        } catch (authError) {
            throw new Error(`Firebase Auth error: ${authError.message}`);
        }
    }
}

module.exports = new BusinessService();
module.exports.BusinessService = BusinessService;
