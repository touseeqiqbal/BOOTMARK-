const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { admin, db, useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { sendEmail } = require(path.join(__dirname, "..", "utils", "emailService"));
const { 
  BUSINESS_PERMISSIONS, 
  getPermissionsByCategory, 
  getAllPermissionIds,
  validatePermissions,
  hasPermission: checkPermission
} = require(path.join(__dirname, "..", "utils", "businessPermissions"));

const router = express.Router();

// Helper to get businesses file path
function getBusinessesFilePath() {
  return getDataFilePath("businesses.json");
}

// Helper to extract user ID from token
async function extractUserIdFromToken(token) {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.user_id || payload.sub || payload.uid || payload.id;
    }
  } catch (error) {
    console.error("Token decode failed:", error.message);
  }
  
  return null;
}

// Helper to get users
async function getUsers() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('users').get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return items
    } catch (e) {
      console.error('Error fetching users from Firestore:', e)
      return []
    }
  }
  const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
  const USERS_FILE = getDataFilePath("users.json");
  try {
    await fs.access(USERS_FILE);
    const data = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(data);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Helper to save users
async function saveUsers(users) {
  if (useFirestore) {
    try {
      for (const u of users) {
        const uid = u.uid || u.id
        if (!uid) continue
        const cleanUser = {};
        for (const key in u) {
          if (u[key] !== undefined) {
            cleanUser[key] = u[key];
          }
        }
        await setDoc('users', uid, cleanUser)
      }
      return
    } catch (e) {
      console.error('Error saving users to Firestore:', e)
      throw e
    }
  }
  const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
  const USERS_FILE = getDataFilePath("users.json");
  const dir = path.dirname(USERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Get all businesses
async function getBusinesses() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('businesses').get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return items
    } catch (e) {
      console.error('Error fetching businesses from Firestore:', e)
      return []
    }
  }
  const BUSINESSES_FILE = getBusinessesFilePath();
  try {
    await fs.access(BUSINESSES_FILE);
    const data = await fs.readFile(BUSINESSES_FILE, "utf8");
    const businesses = JSON.parse(data);
    return Array.isArray(businesses) ? businesses : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error("Error reading businesses file:", error);
    return [];
  }
}

// Save businesses
async function saveBusinesses(businesses) {
  if (useFirestore) {
    try {
      for (const business of businesses) {
        const bid = business.id || business.businessId
        if (!bid) continue
        const cleanBusiness = {};
        for (const key in business) {
          if (business[key] !== undefined) {
            cleanBusiness[key] = business[key];
          }
        }
        await setDoc('businesses', bid, cleanBusiness)
      }
      return
    } catch (e) {
      console.error('Error saving businesses to Firestore:', e)
      throw e
    }
  }
  const BUSINESSES_FILE = getBusinessesFilePath();
  const dir = path.dirname(BUSINESSES_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(BUSINESSES_FILE, JSON.stringify(businesses, null, 2), 'utf8');
}

async function deleteUserFromSystem(memberId) {
  if (!memberId) return;
  try {
    const users = await getUsers();
    const updatedUsers = users.filter(u => (u.uid || u.id) !== memberId);
    if (updatedUsers.length !== users.length) {
      await saveUsers(updatedUsers);
    }
  } catch (error) {
    console.warn("Failed to remove user from local storage:", error.message);
  }

  if (admin && admin.auth) {
    try {
      await admin.auth().deleteUser(memberId);
      console.log("Deleted Firebase auth user:", memberId);
    } catch (error) {
      console.warn("Failed to delete Firebase auth user:", memberId, error.message);
    }
  }

  if (useFirestore) {
    try {
      await deleteDoc('users', memberId);
      console.log("Deleted Firestore user document:", memberId);
    } catch (error) {
      console.warn("Failed to delete Firestore user document:", memberId, error.message);
    }
  }
}

async function getRequestUserContext(req) {
  const token = req.headers?.authorization?.replace("Bearer ", "");
  if (!token) {
    throw new Error("Not authenticated");
  }

  const userId = await extractUserIdFromToken(token);
  if (!userId) {
    throw new Error("Invalid token");
  }

  const users = await getUsers();
  const user = users.find((u) => (u.uid || u.id) === userId);
  if (!user) {
    throw new Error("User not found");
  }

  return { token, userId, users, user };
}

async function requireAdminAccess(req) {
  const context = await getRequestUserContext(req);
  if (!context.user.isAdmin) {
    const error = new Error("Requires admin privileges");
    error.status = 403;
    throw error;
  }
  return context;
}

async function requireSuperAdminAccess(req) {
  const context = await getRequestUserContext(req);
  if (!context.user.isSuperAdmin) {
    const error = new Error("Requires super admin privileges");
    error.status = 403;
    throw error;
  }
  return context;
}

// Register a new business
router.post("/register", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    
    // Check if user already has a business
    const existingBusiness = businesses.find(b => b.ownerId === userId);
    if (existingBusiness) {
      return res.status(400).json({ error: "You already have a registered business" });
    }

    // Create new business
    const businessId = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newBusiness = {
      id: businessId,
      businessId: businessId,
      ...req.body,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending-review'
    };

    businesses.push(newBusiness);
    await saveBusinesses(businesses);

    // Update user to mark as business owner
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.uid === userId);
    if (userIndex !== -1) {
      users[userIndex].businessId = businessId;
      users[userIndex].accountType = 'business';
      users[userIndex].role = 'owner';
      users[userIndex].isAdmin = false;
      users[userIndex].accountStatus = 'pending-approval';
      users[userIndex].businessPendingId = businessId;
      users[userIndex].updatedAt = new Date().toISOString();
      await saveUsers(users);
    }

    // Send notification email to admin
    if (process.env.APPROVAL_NOTIFY_EMAIL) {
      try {
        const appUrl = process.env.APP_URL || process.env.VERCEL_URL || 'http://localhost:4000'
        const approvalUrl = `${appUrl}/admin/approvals`
        
        await sendEmail({
          to: process.env.APPROVAL_NOTIFY_EMAIL,
          subject: `New business pending approval: ${newBusiness.businessName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>New Business Registration Pending Approval</h2>
                </div>
                <div class="content">
                  <p>A new business has submitted an application and is waiting for your review.</p>
                  <div class="info">
                    <p><strong>Business Name:</strong> ${newBusiness.businessName}</p>
                    <p><strong>Owner:</strong> ${(req.body.owner?.firstName || '')} ${(req.body.owner?.lastName || '')}</p>
                    <p><strong>Email:</strong> ${req.body.owner?.email || 'N/A'}</p>
                    <p><strong>Location:</strong> ${newBusiness.city || ''}, ${newBusiness.state || ''}, ${newBusiness.country || ''}</p>
                    <p><strong>Submitted:</strong> ${new Date(newBusiness.createdAt).toLocaleString()}</p>
                  </div>
                  <div style="text-align: center;">
                    <a href="${approvalUrl}" class="button">Review Application</a>
                  </div>
                  <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                    Or visit: <a href="${approvalUrl}">${approvalUrl}</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      } catch (emailError) {
        console.warn("Failed to send approval notification email:", emailError.message)
      }
    }

    res.json({
      success: true,
      business: newBusiness
    });
  } catch (error) {
    console.error("Business registration error:", error);
    res.status(500).json({ error: "Failed to register business", message: error.message });
  }
});

// Get current user's business
router.get("/my-business", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const business = businesses.find(b => b.ownerId === userId || (b.members && b.members.some(m => m.userId === userId)));

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(business);
  } catch (error) {
    console.error("Get business error:", error);
    res.status(500).json({ error: "Failed to fetch business" });
  }
});

// Update business
router.put("/update", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const business = businesses.find(b => 
      b.ownerId === userId || 
      (b.members && b.members.some(m => m.userId === userId))
    );

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Check if user has permission to update (owner or admin with settings permission)
    const isOwner = business.ownerId === userId;
    const isMember = business.members?.some(m => m.userId === userId);
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    // If member, check if they have settings permission
    if (!isOwner) {
      const member = business.members.find(m => m.userId === userId);
      const users = await getUsers();
      const user = users.find(u => (u.uid || u.id) === userId);
      
      // Check permissions from user document (businessPermissions) or member permissions
      const userPermissions = user?.businessPermissions || member?.permissions || [];
      const hasSettingsPermission = userPermissions.includes('business.settings') || 
                                    userPermissions.includes('settings') || 
                                    userPermissions.includes('settings:write') ||
                                    user?.isAdmin === true;
      
      if (!hasSettingsPermission) {
        return res.status(403).json({ error: "You don't have permission to update business settings. You need the 'Manage Business Settings' permission." });
      }
    }

    const businessIndex = businesses.findIndex(b => b.id === business.id || b.businessId === business.businessId);
    
    // Merge customization if provided
    if (req.body.customization) {
      businesses[businessIndex] = {
        ...businesses[businessIndex],
        customization: {
          ...(businesses[businessIndex].customization || {}),
          ...req.body.customization
        },
        updatedAt: new Date().toISOString()
      };
    } else {
      // Update other business fields
      businesses[businessIndex] = {
        ...businesses[businessIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
    }

    await saveBusinesses(businesses);

    res.json({
      success: true,
      message: "Business settings updated successfully. Changes will apply to all users in your business.",
      business: businesses[businessIndex]
    });
  } catch (error) {
    console.error("Update business error:", error);
    res.status(500).json({ error: "Failed to update business" });
  }
});

// Get current user's membership info
router.get("/my-membership", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const business = businesses.find(
      b =>
        b.ownerId === userId ||
        (b.members && b.members.some(m => m.userId === userId))
    );

    if (!business) {
      return res.status(404).json({ error: "Business membership not found" });
    }

    const isOwner = business.ownerId === userId || String(business.ownerId) === String(userId);
    
    // Get user document to retrieve saved businessPermissions (set by super admin)
    // This is the source of truth for permissions, not the member object
    const users = await getUsers();
    const user = users.find(u => {
      const uId = u.uid || u.id;
      return uId === userId || String(uId) === String(userId);
    });
    
    // Get permissions from user document (businessPermissions) - this is what super admin saves
    // If user has businessPermissions set, use those (even if empty - means restricted)
    // If not set, use default permissions based on role
    const { getAllPermissionIds } = require('../utils/businessPermissions');
    let finalPermissions = [];
    
    if (user && user.businessPermissions && Array.isArray(user.businessPermissions)) {
      // User has businessPermissions set by super admin - use those
      // This is the source of truth - even if empty array (means restricted)
      finalPermissions = user.businessPermissions;
    } else {
      // No businessPermissions set - use default based on role
      if (isOwner) {
        // Default permissions for owners (all available permissions)
        // Use the new permission system IDs (e.g., "forms.create", "forms.edit")
        finalPermissions = getAllPermissionIds();
      } else {
        // Get from member object (legacy support)
        const membership = business.members?.find(m => {
          const mId = m.userId;
          return mId === userId || String(mId) === String(userId);
        }) || {};
        // If member has old format permissions, we'll need to handle that
        // But for now, use what's in member.permissions
        finalPermissions = membership.permissions || [];
      }
    }
    
    const membership = isOwner
      ? {
          userId,
          role: "owner",
          permissions: finalPermissions
        }
      : business.members?.find(m => {
          const mId = m.userId;
          return mId === userId || String(mId) === String(userId);
        }) || {};

    res.json({
      businessId: business.id,
      businessName: business.businessName || business.companyName || "Business",
      isOwner,
      role: membership.role || (isOwner ? "owner" : "member"),
      permissions: finalPermissions, // Use permissions from user document (businessPermissions)
      membersCount: (business.members || []).length
    });
  } catch (error) {
    console.error("Get membership error:", error);
    res.status(500).json({ error: "Failed to fetch membership info" });
  }
});

// Get business members/users
router.get("/members", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const business = businesses.find(b => b.ownerId === userId);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Get all users to populate member info
    const users = await getUsers();
    
    // Get all members
    const members = (business.members || []).map(member => {
      const user = users.find(u => u.uid === member.userId);
      return {
        ...member,
        user: user ? {
          name: user.name,
          email: user.email,
          photoURL: user.photoURL
        } : null
      };
    });

    res.json(members);
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// ============================================
// SUPER ADMIN: Routes (must come BEFORE /:businessId routes)
// ============================================

// Get all businesses (Super Admin only)
router.get("/all", async (req, res) => {
  try {
    await requireSuperAdminAccess(req);
    const businesses = await getBusinesses();
    res.json(businesses);
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Get all businesses error:", error);
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

// Get available permissions (Super Admin only)
router.get("/permissions/available", async (req, res) => {
  try {
    await requireSuperAdminAccess(req);
    const permissionsByCategory = getPermissionsByCategory();
    res.json({
      permissions: BUSINESS_PERMISSIONS,
      byCategory: permissionsByCategory,
      allIds: getAllPermissionIds()
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Get available permissions error:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

router.get("/pending-approvals", async (req, res) => {
  try {
    await requireSuperAdminAccess(req);
    const businesses = await getBusinesses();
    const pending = businesses.filter((b) => b.status === 'pending-review');
    res.json(pending);
  } catch (error) {
    console.error("Pending approvals fetch error:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to fetch pending approvals" });
  }
});

router.post("/:businessId/approve", async (req, res) => {
  try {
    const { user: adminUser, users } = await requireSuperAdminAccess(req);
    const { permissions } = req.body; // Get permissions from request body
    
    const businesses = await getBusinesses();
    const businessIndex = businesses.findIndex((b) => b.id === req.params.businessId);
    if (businessIndex === -1) {
      return res.status(404).json({ error: "Business not found" });
    }

    const business = businesses[businessIndex];
    business.status = 'active';
    business.approvedAt = new Date().toISOString();
    business.approvedBy = adminUser.uid || adminUser.id;
    businesses[businessIndex] = business;
    await saveBusinesses(businesses);

    const ownerIndex = users.findIndex((u) => (u.uid || u.id) === business.ownerId);
    const owner = ownerIndex !== -1 ? users[ownerIndex] : null;
    
    if (owner) {
      users[ownerIndex].accountStatus = 'active';
      
      // Set business permissions if provided
      if (permissions && Array.isArray(permissions) && validatePermissions(permissions)) {
        users[ownerIndex].businessPermissions = permissions;
      }
      users[ownerIndex].accountType = 'business';
      users[ownerIndex].role = 'owner';
      users[ownerIndex].isAdmin = true;
      users[ownerIndex].businessId = business.id;
      users[ownerIndex].businessPendingId = null;
      users[ownerIndex].updatedAt = new Date().toISOString();
      await saveUsers(users);
    }

    // Send approval email to business owner
    if (owner?.email) {
      try {
        const appUrl = process.env.APP_URL || process.env.VERCEL_URL || 'http://localhost:4000'
        const loginUrl = `${appUrl}/login`
        
        await sendEmail({
          to: owner.email,
          subject: `Your business account has been approved!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>🎉 Your Account Has Been Approved!</h2>
                </div>
                <div class="content">
                  <p>Hello ${business.owner?.firstName || 'there'},</p>
                  <p>Great news! Your business registration for <strong>${business.businessName}</strong> has been approved.</p>
                  <p>You can now log in and start using BootMark to manage your forms, customers, and invoices.</p>
                  <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Log In Now</a>
                  </div>
                  <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                    Welcome to BootMark! If you have any questions, feel free to reach out to our support team.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      } catch (emailError) {
        console.warn("Failed to send approval email to owner:", emailError.message)
      }
    }

    res.json({ success: true, business });
  } catch (error) {
    console.error("Approve business error:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to approve business" });
  }
});

router.post("/:businessId/reject", async (req, res) => {
  try {
    const { user: adminUser, users } = await requireSuperAdminAccess(req);
    const { reason } = req.body || {};
    const businesses = await getBusinesses();
    const businessIndex = businesses.findIndex((b) => b.id === req.params.businessId);
    if (businessIndex === -1) {
      return res.status(404).json({ error: "Business not found" });
    }

    const business = businesses[businessIndex];
    business.status = 'rejected';
    business.rejectedAt = new Date().toISOString();
    business.rejectedBy = adminUser.uid || adminUser.id;
    business.rejectionReason = reason || 'Not specified';
    businesses[businessIndex] = business;
    await saveBusinesses(businesses);

    const ownerIndex = users.findIndex((u) => (u.uid || u.id) === business.ownerId);
    const owner = ownerIndex !== -1 ? users[ownerIndex] : null;
    
    if (owner) {
      users[ownerIndex].accountStatus = 'rejected';
      users[ownerIndex].businessPendingId = null;
      users[ownerIndex].updatedAt = new Date().toISOString();
      await saveUsers(users);
    }

    // Send rejection email to business owner
    if (owner?.email) {
      try {
        await sendEmail({
          to: owner.email,
          subject: `Update on your business registration`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                .reason-box { background: white; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>Application Update</h2>
                </div>
                <div class="content">
                  <p>Hello ${business.owner?.firstName || 'there'},</p>
                  <p>We've reviewed your business registration for <strong>${business.businessName}</strong>.</p>
                  <p>Unfortunately, we're unable to approve your application at this time.</p>
                  ${reason ? `
                    <div class="reason-box">
                      <p><strong>Reason:</strong></p>
                      <p>${reason}</p>
                    </div>
                  ` : ''}
                  <p>If you have questions or would like to discuss this further, please contact our support team.</p>
                  <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                    Thank you for your interest in BootMark.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      } catch (emailError) {
        console.warn("Failed to send rejection email to owner:", emailError.message)
      }
    }

    res.json({ success: true, business });
  } catch (error) {
    console.error("Reject business error:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to reject business" });
  }
});

// Create new user and add as member
router.post("/members/create", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const businessIndex = businesses.findIndex(b => b.ownerId === userId);

    if (businessIndex === -1) {
      return res.status(404).json({ error: "Business not found" });
    }

    const { email, name, password, role = 'member', permissions = [] } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Email, name, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const users = await getUsers();
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists. Use 'Add Existing User' instead." });
    }

    let newUserId;
    let firebaseUser = null;

    // Create user in Firebase if available
    if (admin && admin.auth) {
      try {
        firebaseUser = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: name,
          emailVerified: false
        });
        newUserId = firebaseUser.uid;
      } catch (firebaseError) {
        console.error("Firebase user creation error:", firebaseError);
        // If Firebase fails, create a local user ID
        newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    } else {
      // No Firebase, create local user ID
      newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create user in our database
    const newUser = {
      id: newUserId,
      uid: newUserId,
      email: email,
      name: name,
      photoURL: '',
      createdAt: new Date().toISOString(),
      accountType: 'personal',
      role: 'user',
      isAdmin: false
    };

    users.push(newUser);
    await saveUsers(users);

    // Add user as business member
    if (!businesses[businessIndex].members) {
      businesses[businessIndex].members = [];
    }

    businesses[businessIndex].members.push({
      userId: newUserId,
      email: email,
      role: role,
      permissions: permissions,
      addedAt: new Date().toISOString(),
      addedBy: userId
    });

    await saveBusinesses(businesses);

    res.json({
      success: true,
      message: "User created and added to business successfully",
      member: {
        userId: newUserId,
        email: email,
        name: name,
        role: role,
        permissions: permissions
      }
    });
  } catch (error) {
    console.error("Create user and add member error:", error);
    res.status(500).json({ error: "Failed to create user and add member", message: error.message });
  }
});

// Add member to business
router.post("/members", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const businessIndex = businesses.findIndex(b => b.ownerId === userId);

    if (businessIndex === -1) {
      return res.status(404).json({ error: "Business not found" });
    }

    const { email, role = 'member', permissions = [] } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Get users and find user by email
    const users = await getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: "User not found with this email" });
    }

    // Check if already a member
    const existingMember = businesses[businessIndex].members?.find(m => m.userId === user.uid);
    if (existingMember) {
      return res.status(400).json({ error: "User is already a member" });
    }

    // Add member
    if (!businesses[businessIndex].members) {
      businesses[businessIndex].members = [];
    }

    businesses[businessIndex].members.push({
      userId: user.uid,
      email: user.email,
      role: role,
      permissions: permissions,
      addedAt: new Date().toISOString(),
      addedBy: userId
    });

    await saveBusinesses(businesses);

    res.json({
      success: true,
      member: {
        userId: user.uid,
        email: user.email,
        role: role,
        permissions: permissions
      }
    });
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// Reset member password (sends reset link via email)
router.post("/members/:memberId/reset-password", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const requesterId = await extractUserIdFromToken(token);
    if (!requesterId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const requester = users.find(u => (u.uid || u.id) === requesterId);
    
    // Check if requester is super admin
    const isSuperAdmin = requester?.isSuperAdmin === true;
    
    // If not super admin, check if they're a business owner
    let business = null;
    if (!isSuperAdmin) {
      const businesses = await getBusinesses();
      business = businesses.find(b => b.ownerId === requesterId);
      if (!business) {
        return res.status(403).json({ error: "Only business owners or super admins can reset passwords" });
      }
    }

    const { memberId } = req.params;
    const member = users.find(u => u.uid === memberId || u.id === memberId);

    if (!member) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!member.email) {
      return res.status(400).json({ error: "User email is missing" });
    }

    if (!admin || !admin.auth) {
      return res.status(500).json({ error: "Password reset requires Firebase Admin configuration" });
    }

    // Generate password reset link
    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
      handleCodeInApp: true
    };

    const resetLink = await admin.auth().generatePasswordResetLink(member.email, actionCodeSettings);

    // Send email with reset link
    try {
      const requesterName = requester?.name || 'Administrator';
      // For super admin, use generic message; for business owner, use business name
      const businessName = isSuperAdmin 
        ? 'the system administrator' 
        : (business?.businessName || 'your organization');

      // Get requester's SMTP config if available, otherwise will use default SMTP
      const requesterSmtpConfig = requester?.smtpConfig || null;
      
      await sendEmail({
        to: member.email,
        subject: 'Password Reset Request',
        userSmtpConfig: requesterSmtpConfig,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Password Reset Request</h2>
            <p>Hello ${member.name || member.email},</p>
            <p>${requesterName} from ${businessName} has requested a password reset for your account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${resetLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Note:</strong> This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              This is an automated message from ${businessName}. Please do not reply to this email.
            </p>
          </div>
        `,
        text: `
Password Reset Request

Hello ${member.name || member.email},

${requesterName} from ${businessName} has requested a password reset for your account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.

This is an automated message from ${businessName}. Please do not reply to this email.
        `
      });

      res.json({
        success: true,
        message: `Password reset email sent successfully to ${member.email}`
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Still return success with the link if email fails (admin can manually share)
      res.json({
        success: true,
        message: "Password reset link generated, but email sending failed",
        resetLink: resetLink,
        warning: "You may need to manually share this link with the user"
      });
    }
  } catch (error) {
    console.error("Reset member password error:", error);
    res.status(500).json({ error: "Failed to generate password reset link", message: error.message });
  }
});

// Update member
router.put("/members/:memberId", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const businessIndex = businesses.findIndex(b => b.ownerId === userId);

    if (businessIndex === -1) {
      return res.status(404).json({ error: "Business not found" });
    }

    const { memberId } = req.params;
    const { role, permissions } = req.body;

    const memberIndex = businesses[businessIndex].members?.findIndex(m => m.userId === memberId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (role) businesses[businessIndex].members[memberIndex].role = role;
    if (permissions) businesses[businessIndex].members[memberIndex].permissions = permissions;
    businesses[businessIndex].members[memberIndex].updatedAt = new Date().toISOString();

    await saveBusinesses(businesses);

    res.json({
      success: true,
      member: businesses[businessIndex].members[memberIndex]
    });
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

// Remove member
router.delete("/members/:memberId", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const businesses = await getBusinesses();
    const businessIndex = businesses.findIndex(b => b.ownerId === userId);

    if (businessIndex === -1) {
      return res.status(404).json({ error: "Business not found" });
    }

    const { memberId } = req.params;

    // Don't allow removing owner
    if (businesses[businessIndex].ownerId === memberId) {
      return res.status(400).json({ error: "Cannot remove business owner" });
    }

    businesses[businessIndex].members = businesses[businessIndex].members?.filter(m => m.userId !== memberId) || [];
    await saveBusinesses(businesses);

    const memberExistsElsewhere = businesses.some((biz, idx) => {
      if (idx === businessIndex) return false;
      if (biz.ownerId === memberId) return true;
      return biz.members?.some(m => m.userId === memberId);
    });

    if (!memberExistsElsewhere) {
      await deleteUserFromSystem(memberId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// Get business admin permissions for a specific business (Super Admin only)
router.get("/:businessId/permissions", async (req, res) => {
  try {
    await requireSuperAdminAccess(req);
    const { businessId } = req.params;
    
    const businesses = await getBusinesses();
    const business = businesses.find(b => b.id === businessId || b.businessId === businessId);
    
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    
    // Get business owner
    // IMPORTANT: The owner is the person who OWNS the business (business.ownerId)
    // This is NOT the super admin who is viewing this page
    // Super admins can manage permissions for business owners and members
    const users = await getUsers();
    const owner = users.find(u => {
      const uId = u.uid || u.id;
      const oId = business.ownerId;
      return uId === oId || String(uId) === String(oId);
    });
    
    // Log for debugging if owner not found
    if (!owner && business.ownerId) {
      console.warn(`Business owner not found for business ${business.id}. Owner ID: ${business.ownerId}`);
    }
    
    // Get all business admins (owners and members with admin role)
    const businessAdmins = [];
    const addedUserIds = new Set(); // Track added user IDs to prevent duplicates
    
    // Always add owner FIRST - business owners should always be shown in permissions management
    // Note: Owners have all permissions and cannot be restricted, but they should appear in the list
    // The owner shown here is the ACTUAL business owner (business.ownerId), not the super admin viewing this page
    if (owner) {
      const ownerId = owner.uid || owner.id;
      businessAdmins.push({
        userId: ownerId,
        email: owner.email,
        name: owner.name || owner.email,
        role: 'owner',
        isAdmin: true,
        businessPermissions: owner.businessPermissions || [],
        isOwner: true
      });
      addedUserIds.add(String(ownerId)); // Mark owner as added
    }
    
    // Add all business members (not just admins) so super admin can manage permissions for any member
    // Super admins should be able to grant permissions to any member, not just those with admin role
    // IMPORTANT: Skip the owner if they're also in the members array to prevent duplicates
    if (business.members && Array.isArray(business.members)) {
      for (const member of business.members) {
        const memberId = String(member.userId);
        
        // Skip if this member is the owner (already added above)
        // Check both uid and id formats to handle different ID storage formats
        if (owner) {
          const ownerUid = owner.uid ? String(owner.uid) : null;
          const ownerId = owner.id ? String(owner.id) : null;
          const ownerIdStr = String(owner.uid || owner.id);
          
          // Skip if member matches owner by any ID format
          if ((ownerUid && memberId === ownerUid) || 
              (ownerId && memberId === ownerId) || 
              memberId === ownerIdStr) {
            continue;
          }
        }
        
        // Skip if already added (shouldn't happen, but safety check)
        if (addedUserIds.has(memberId)) {
          continue;
        }
        
        // Try to find user by both uid and id to handle different ID formats
        const memberUser = users.find(u => {
          const uId = u.uid || u.id;
          const mId = member.userId;
          return uId === mId || String(uId) === String(mId);
        });
        
        // Prioritize businessPermissions from user document, fallback to member.permissions
        const userPermissions = memberUser?.businessPermissions;
        const memberPermissions = member.permissions;
        const finalPermissions = (Array.isArray(userPermissions) && userPermissions.length > 0) 
          ? userPermissions 
          : (Array.isArray(memberPermissions) && memberPermissions.length > 0 ? memberPermissions : []);
        
        // Determine if member is considered an admin (has admin role OR has business permissions)
        const isAdminRole = member.role === 'admin';
        const hasPermissions = Array.isArray(finalPermissions) && finalPermissions.length > 0;
        
        businessAdmins.push({
          userId: member.userId,
          email: member.email || memberUser?.email || 'Unknown',
          name: member.name || memberUser?.name || 'Unknown',
          role: member.role || 'member',
          isAdmin: isAdminRole || hasPermissions, // Consider admin if has admin role or has permissions
          businessPermissions: finalPermissions,
          isOwner: false
        });
        addedUserIds.add(memberId); // Mark as added
      }
    }
    
    res.json({
      business: {
        id: business.id,
        businessId: business.businessId,
        businessName: business.businessName,
        status: business.status
      },
      admins: businessAdmins
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Get business permissions error:", error);
    res.status(500).json({ error: "Failed to fetch business permissions" });
  }
});

// Update business admin permissions (Super Admin only)
router.put("/:businessId/permissions/:userId", async (req, res) => {
  try {
    await requireSuperAdminAccess(req);
    const { businessId, userId } = req.params;
    const { permissions } = req.body;
    
    // Validate permissions
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "Permissions must be an array" });
    }
    
    if (!validatePermissions(permissions)) {
      return res.status(400).json({ error: "Invalid permission IDs provided" });
    }
    
    const businesses = await getBusinesses();
    const business = businesses.find(b => b.id === businessId || b.businessId === businessId);
    
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    
    // Check if user is owner or member
    // Super admins can manage permissions for both owners and members
    const isOwner = business.ownerId === userId || String(business.ownerId) === String(userId);
    const isMember = business.members?.some(m => {
      const mId = m.userId;
      return mId === userId || String(mId) === String(userId);
    });
    
    if (!isOwner && !isMember) {
      return res.status(404).json({ error: "User is not associated with this business" });
    }
    
    // Super admins can update permissions for both owners and members
    // No restriction - super admins have full control
    
    // Update user's business permissions
    const users = await getUsers();
    const userIndex = users.findIndex(u => (u.uid || u.id) === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update user permissions in users collection
    // Make sure we're updating the correct user object
    const userToUpdate = users[userIndex];
    if (!userToUpdate) {
      return res.status(404).json({ error: "User not found in users array" });
    }
    
    // Update the user's businessPermissions field
    userToUpdate.businessPermissions = permissions;
    userToUpdate.updatedAt = new Date().toISOString();
    
    // Save the updated user - use direct update for better reliability
    try {
      const userDocId = userToUpdate.uid || userToUpdate.id;
      if (!userDocId) {
        return res.status(400).json({ error: "User ID not found" });
      }
      
      if (useFirestore && db) {
        // For Firestore, use update() to merge with existing document
        // This preserves all other fields and only updates businessPermissions
        try {
          const userDocRef = db.collection('users').doc(userDocId);
          await userDocRef.update({
            businessPermissions: permissions,
            updatedAt: new Date().toISOString()
          });
          
          // Verify immediately by reading back
          const verifyDoc = await userDocRef.get();
          if (verifyDoc.exists) {
            const verifiedData = verifyDoc.data();
            // Update local array with verified data
            users[userIndex].businessPermissions = verifiedData.businessPermissions || permissions;
            users[userIndex].updatedAt = verifiedData.updatedAt || new Date().toISOString();
          } else {
            users[userIndex].businessPermissions = permissions;
            users[userIndex].updatedAt = new Date().toISOString();
          }
        } catch (updateError) {
          // If update fails (document might not exist or field doesn't exist), use set with merge
          if (updateError.code === 5 || updateError.message?.includes('No document')) {
            // Document doesn't exist, create it with merge
            const existingUser = await getDoc('users', userDocId);
            if (existingUser) {
              const updatedUserData = { ...existingUser };
              updatedUserData.businessPermissions = permissions;
              updatedUserData.updatedAt = new Date().toISOString();
              delete updatedUserData.id;
              await db.collection('users').doc(userDocId).set(updatedUserData, { merge: true });
              users[userIndex] = { ...userToUpdate, ...updatedUserData };
            } else {
              throw new Error(`User document ${userDocId} not found in Firestore`);
            }
          } else {
            // Other error, try set with merge as fallback
            const existingUser = await getDoc('users', userDocId);
            if (existingUser) {
              const updatedUserData = { ...existingUser };
              updatedUserData.businessPermissions = permissions;
              updatedUserData.updatedAt = new Date().toISOString();
              delete updatedUserData.id;
              await db.collection('users').doc(userDocId).set(updatedUserData, { merge: true });
              users[userIndex] = { ...userToUpdate, ...updatedUserData };
            } else {
              throw updateError;
            }
          }
        }
      } else {
        // For JSON files, save all users
        await saveUsers(users);
      }
    } catch (saveError) {
      console.error('Error saving user permissions:', saveError.message);
      return res.status(500).json({ error: "Failed to save user permissions", details: saveError.message });
    }
    
    // Update in business document (for both owners and members)
    const businessIndex = businesses.findIndex(b => b.id === business.id || b.businessId === business.businessId);
    if (businessIndex !== -1) {
      if (isOwner) {
        // For owners, update the business document timestamp
        businesses[businessIndex].updatedAt = new Date().toISOString();
      } else if (isMember && business.members) {
        // For members, update in the members array
        const memberIndex = business.members.findIndex(m => m.userId === userId);
        if (memberIndex !== -1) {
          business.members[memberIndex].permissions = permissions;
          business.members[memberIndex].updatedAt = new Date().toISOString();
          businesses[businessIndex] = business;
        }
      }
      
      try {
        await saveBusinesses(businesses);
        console.log(`✅ Updated business document for business ${businessId}`);
      } catch (saveError) {
        console.error('⚠️ Warning: Failed to save business document:', saveError);
        // Don't fail the request if business save fails, user update is more important
      }
    }
    
    // Verify the update by reading the user back from Firestore (if using Firestore)
    let verifiedUser = users[userIndex];
    if (useFirestore && db) {
      try {
        const userDocId = userToUpdate.uid || userToUpdate.id;
        const freshUser = await getDoc('users', userDocId);
        if (freshUser) {
          verifiedUser = freshUser;
          console.log(`✅ Verified permissions update for user ${userDocId}:`, freshUser.businessPermissions);
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify update from Firestore:', verifyError.message);
        // Continue with local user data
      }
    }
    
    res.json({
      success: true,
      message: "Permissions updated successfully",
      permissions: permissions,
      user: {
        userId: verifiedUser.uid || verifiedUser.id,
        email: verifiedUser.email,
        businessPermissions: verifiedUser.businessPermissions || permissions
      }
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Update business permissions error:", error);
    res.status(500).json({ error: "Failed to update permissions" });
  }
});

// Delete business (Super Admin only)
router.delete("/:businessId", async (req, res) => {
  try {
    await requireSuperAdminAccess(req);
    const { businessId } = req.params;
    
    const businesses = await getBusinesses();
    const businessIndex = businesses.findIndex(b => b.id === businessId || b.businessId === businessId);
    
    if (businessIndex === -1) {
      return res.status(404).json({ error: "Business not found" });
    }
    
    const business = businesses[businessIndex];
    const ownerId = business.ownerId;
    const memberIds = business.members?.map(m => m.userId) || [];
    
    // Get all users to update
    const users = await getUsers();
    
    // Update owner's account status
    if (ownerId) {
      const ownerIndex = users.findIndex(u => (u.uid || u.id) === ownerId);
      if (ownerIndex !== -1) {
        users[ownerIndex].accountStatus = 'inactive';
        users[ownerIndex].isAdmin = false;
        users[ownerIndex].businessId = null;
        users[ownerIndex].businessPendingId = null;
        users[ownerIndex].businessPermissions = [];
        users[ownerIndex].updatedAt = new Date().toISOString();
      }
    }
    
    // Update members' accounts
    for (const memberId of memberIds) {
      const memberIndex = users.findIndex(u => (u.uid || u.id) === memberId);
      if (memberIndex !== -1) {
        // Check if member is owner of another business
        const isOwnerElsewhere = businesses.some((biz, idx) => {
          if (idx === businessIndex) return false;
          return biz.ownerId === memberId;
        });
        
        // Check if member is in another business
        const isMemberElsewhere = businesses.some((biz, idx) => {
          if (idx === businessIndex) return false;
          return biz.members?.some(m => m.userId === memberId);
        });
        
        // Only update if not associated with another business
        if (!isOwnerElsewhere && !isMemberElsewhere) {
          users[memberIndex].accountStatus = 'inactive';
          users[memberIndex].businessId = null;
          users[memberIndex].businessPermissions = [];
          users[memberIndex].updatedAt = new Date().toISOString();
        }
      }
    }
    
    // Save updated users
    await saveUsers(users);
    
    // Delete business from businesses array
    businesses.splice(businessIndex, 1);
    await saveBusinesses(businesses);
    
    // Delete from Firestore if using Firestore
    if (useFirestore) {
      try {
        await deleteDoc('businesses', business.id || business.businessId);
      } catch (firestoreError) {
        console.error('Warning: Failed to delete business from Firestore:', firestoreError.message);
      }
    }
    
    // Note: We don't delete forms, submissions, invoices, or customers automatically
    // as they may contain important historical data. They can be cleaned up separately if needed.
    
    res.json({
      success: true,
      message: `Business "${business.businessName}" has been deleted successfully`,
      deletedBusiness: {
        id: business.id,
        businessId: business.businessId,
        businessName: business.businessName
      }
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Delete business error:", error);
    res.status(500).json({ error: "Failed to delete business", details: error.message });
  }
});

module.exports = router;

