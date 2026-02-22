const express = require("express");
const path = require("path");
const businessService = require("../utils/BusinessService");
const { getAllPermissionIds, BUSINESS_PERMISSIONS, getPermissionsByCategory } = require("../utils/businessPermissions");
const { getDoc, getCollectionRef, deleteDoc } = require("../utils/db");

const router = express.Router();

async function requireSuperAdmin(req) {
  const userId = req.user?.uid || req.user?.id;
  const user = await getDoc('users', userId);
  if (!user?.isSuperAdmin) {
    const err = new Error("Super Admin required");
    err.status = 403;
    throw err;
  }
  return user;
}

// Get available permissions (for permission selector)
// Moved to top to avoid any route conflicts
router.get("/permissions/available", async (req, res) => {
  try {
    // Return all available permissions organized by category
    const byCategory = getPermissionsByCategory();
    const permissions = {};

    // Flatten permissions for easy lookup
    Object.values(byCategory).forEach(categoryPerms => {
      categoryPerms.forEach(perm => {
        permissions[perm.id] = perm;
      });
    });

    res.json({
      permissions,
      byCategory
    });
  } catch (error) {
    console.error('Error fetching available permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const business = await businessService.registerBusiness(userId, req.body);
    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/my-business", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const user = await getDoc('users', userId);
    let business = user?.businessId ? await businessService.getBusinessById(user.businessId) : null;
    if (!business) business = await businessService.getBusinessByOwnerId(userId);

    if (!business) return res.status(404).json({ error: "Business not found" });
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch business" });
  }
});

router.get("/my-membership", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    // For now, return the user's business membership details
    // This is a placeholder to prevent 404s in AuthContext
    const user = await getDoc('users', userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if they are part of a business
    if (user.businessId) {
      const business = await businessService.getBusinessById(user.businessId);
      return res.json({
        businessId: user.businessId,
        role: user.role || 'member',
        businessName: business?.name,
        status: 'active'
      });
    }

    res.json(null); // No membership
  } catch (error) {
    console.error("Error fetching membership:", error);
    res.status(500).json({ error: "Failed to fetch membership" });
  }
});

router.put("/update", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const user = await getDoc('users', userId);
    const businessId = user?.businessId || req.body.businessId;
    const updated = await businessService.updateBusiness(businessId, req.body, userId, user?.isSuperAdmin);
    res.json({ success: true, business: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/members", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const user = await getDoc('users', userId);
    const business = await businessService.getBusinessById(user?.businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });

    const members = [];
    const owner = await getDoc('users', business.ownerId);
    if (owner) members.push({ userId: business.ownerId, email: owner.email, name: owner.name, role: 'owner', isOwner: true });

    for (const m of (business.members || [])) {
      if (m.userId === business.ownerId) continue;
      const u = await getDoc('users', m.userId);
      members.push({ ...m, user: u ? { name: u.name, email: u.email } : null });
    }
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.post("/members/create", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const user = await getDoc('users', userId);
    const result = await businessService.createMember(user.businessId, userId, req.body);
    res.json({ success: true, member: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/members/:memberId", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const user = await getDoc('users', userId);
    await businessService.removeMember(user.businessId, req.params.memberId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Admin
router.get("/all", async (req, res) => {
  try {
    await requireSuperAdmin(req);
    const businesses = await businessService.getAllBusinesses();
    res.json(businesses);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get("/pending-approvals", async (req, res) => {
  try {
    await requireSuperAdmin(req);
    const snap = await getCollectionRef('businesses').where('status', '==', 'pending-review').get();
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post("/:businessId/approve", async (req, res) => {
  try {
    const adminUser = await requireSuperAdmin(req);
    const business = await businessService.approveBusiness(req.params.businessId, adminUser.id, req.body.permissions);
    res.json({ success: true, business });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get("/:businessId/permissions", async (req, res) => {
  try {
    await requireSuperAdmin(req);
    const admins = await businessService.getBusinessAdmins(req.params.businessId);
    res.json({ admins });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.put("/:businessId/permissions/:userId", async (req, res) => {
  try {
    await requireSuperAdmin(req);
    const updated = await businessService.updateUserPermissions(req.params.userId, req.body.permissions);
    res.json({ success: true, permissions: updated.businessPermissions });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.delete("/:businessId", async (req, res) => {
  try {
    await requireSuperAdmin(req);
    await businessService.deleteBusiness(req.params.businessId);
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post("/members/:userId/reset-password", async (req, res) => {
  try {
    await requireSuperAdmin(req);
    const result = await businessService.resetUserPassword(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
