/**
 * Business Admin Permissions System
 * 
 * Defines all available permissions that can be granted to business admins
 * Super admins can configure which permissions each business admin has
 */

// Available permissions for business admins
const BUSINESS_PERMISSIONS = {
  // Form Management
  'forms.create': {
    id: 'forms.create',
    name: 'Create Forms',
    description: 'Allow creating new forms',
    category: 'Forms'
  },
  'forms.edit': {
    id: 'forms.edit',
    name: 'Edit Forms',
    description: 'Allow editing existing forms',
    category: 'Forms'
  },
  'forms.delete': {
    id: 'forms.delete',
    name: 'Delete Forms',
    description: 'Allow deleting forms',
    category: 'Forms'
  },
  'forms.view': {
    id: 'forms.view',
    name: 'View Forms',
    description: 'Allow viewing forms',
    category: 'Forms'
  },

  // Submission Management
  'submissions.view': {
    id: 'submissions.view',
    name: 'View Submissions',
    description: 'Allow viewing form submissions',
    category: 'Submissions'
  },
  'submissions.delete': {
    id: 'submissions.delete',
    name: 'Delete Submissions',
    description: 'Allow deleting submissions',
    category: 'Submissions'
  },
  'submissions.export': {
    id: 'submissions.export',
    name: 'Export Submissions',
    description: 'Allow exporting submissions to PDF/CSV',
    category: 'Submissions'
  },

  // Customer Management
  'customers.create': {
    id: 'customers.create',
    name: 'Create Customers',
    description: 'Allow creating new customers',
    category: 'Customers'
  },
  'customers.edit': {
    id: 'customers.edit',
    name: 'Edit Customers',
    description: 'Allow editing customers',
    category: 'Customers'
  },
  'customers.delete': {
    id: 'customers.delete',
    name: 'Delete Customers',
    description: 'Allow deleting customers',
    category: 'Customers'
  },
  'customers.view': {
    id: 'customers.view',
    name: 'View Customers',
    description: 'Allow viewing customers',
    category: 'Customers'
  },

  // Property Management
  'properties.create': {
    id: 'properties.create',
    name: 'Create Properties',
    description: 'Allow creating new properties',
    category: 'Properties'
  },
  'properties.edit': {
    id: 'properties.edit',
    name: 'Edit Properties',
    description: 'Allow editing properties',
    category: 'Properties'
  },
  'properties.delete': {
    id: 'properties.delete',
    name: 'Delete Properties',
    description: 'Allow deleting properties',
    category: 'Properties'
  },
  'properties.view': {
    id: 'properties.view',
    name: 'View Properties',
    description: 'Allow viewing properties',
    category: 'Properties'
  },

  // Work Order Management
  'workOrders.create': {
    id: 'workOrders.create',
    name: 'Create Work Orders',
    description: 'Allow creating new work orders',
    category: 'Work Orders'
  },
  'workOrders.edit': {
    id: 'workOrders.edit',
    name: 'Edit Work Orders',
    description: 'Allow editing work orders',
    category: 'Work Orders'
  },
  'workOrders.delete': {
    id: 'workOrders.delete',
    name: 'Delete Work Orders',
    description: 'Allow deleting work orders',
    category: 'Work Orders'
  },
  'workOrders.view': {
    id: 'workOrders.view',
    name: 'View Work Orders',
    description: 'Allow viewing work orders',
    category: 'Work Orders'
  },

  // Service Management
  'services.create': {
    id: 'services.create',
    name: 'Create Services',
    description: 'Allow creating new services',
    category: 'Services'
  },
  'services.edit': {
    id: 'services.edit',
    name: 'Edit Services',
    description: 'Allow editing services',
    category: 'Services'
  },
  'services.delete': {
    id: 'services.delete',
    name: 'Delete Services',
    description: 'Allow deleting services',
    category: 'Services'
  },
  'services.view': {
    id: 'services.view',
    name: 'View Services',
    description: 'Allow viewing services',
    category: 'Services'
  },

  // Product Management
  'products.create': {
    id: 'products.create',
    name: 'Create Products',
    description: 'Allow creating new products',
    category: 'Products'
  },
  'products.edit': {
    id: 'products.edit',
    name: 'Edit Products',
    description: 'Allow editing products',
    category: 'Products'
  },
  'products.delete': {
    id: 'products.delete',
    name: 'Delete Products',
    description: 'Allow deleting products',
    category: 'Products'
  },
  'products.view': {
    id: 'products.view',
    name: 'View Products',
    description: 'Allow viewing products',
    category: 'Products'
  },

  // Contract Management
  'contracts.create': {
    id: 'contracts.create',
    name: 'Create Contracts',
    description: 'Allow creating new contracts',
    category: 'Contracts'
  },
  'contracts.edit': {
    id: 'contracts.edit',
    name: 'Edit Contracts',
    description: 'Allow editing contracts',
    category: 'Contracts'
  },
  'contracts.delete': {
    id: 'contracts.delete',
    name: 'Delete Contracts',
    description: 'Allow deleting contracts',
    category: 'Contracts'
  },
  'contracts.view': {
    id: 'contracts.view',
    name: 'View Contracts',
    description: 'Allow viewing contracts',
    category: 'Contracts'
  },

  // Estimate Management
  'estimates.create': {
    id: 'estimates.create',
    name: 'Create Estimates',
    description: 'Allow creating new estimates',
    category: 'Estimates'
  },
  'estimates.edit': {
    id: 'estimates.edit',
    name: 'Edit Estimates',
    description: 'Allow editing estimates',
    category: 'Estimates'
  },
  'estimates.delete': {
    id: 'estimates.delete',
    name: 'Delete Estimates',
    description: 'Allow deleting estimates',
    category: 'Estimates'
  },
  'estimates.view': {
    id: 'estimates.view',
    name: 'View Estimates',
    description: 'Allow viewing estimates',
    category: 'Estimates'
  },

  // Invoice Management
  'invoices.create': {
    id: 'invoices.create',
    name: 'Create Invoices',
    description: 'Allow creating new invoices',
    category: 'Invoices'
  },
  'invoices.edit': {
    id: 'invoices.edit',
    name: 'Edit Invoices',
    description: 'Allow editing invoices',
    category: 'Invoices'
  },
  'invoices.delete': {
    id: 'invoices.delete',
    name: 'Delete Invoices',
    description: 'Allow deleting invoices',
    category: 'Invoices'
  },
  'invoices.view': {
    id: 'invoices.view',
    name: 'View Invoices',
    description: 'Allow viewing invoices',
    category: 'Invoices'
  },
  'invoices.send': {
    id: 'invoices.send',
    name: 'Send Invoices',
    description: 'Allow sending invoices via email',
    category: 'Invoices'
  },

  // Scheduling Management
  'scheduling.create': {
    id: 'scheduling.create',
    name: 'Create Schedules',
    description: 'Allow creating new schedules',
    category: 'Scheduling'
  },
  'scheduling.edit': {
    id: 'scheduling.edit',
    name: 'Edit Schedules',
    description: 'Allow editing schedules',
    category: 'Scheduling'
  },
  'scheduling.delete': {
    id: 'scheduling.delete',
    name: 'Delete Schedules',
    description: 'Allow deleting schedules',
    category: 'Scheduling'
  },
  'scheduling.view': {
    id: 'scheduling.view',
    name: 'View Schedules',
    description: 'Allow viewing schedules',
    category: 'Scheduling'
  },

  // Reports & Analytics
  'reports.view': {
    id: 'reports.view',
    name: 'View Reports',
    description: 'Allow viewing business reports and analytics',
    category: 'Reports'
  },
  'reports.export': {
    id: 'reports.export',
    name: 'Export Reports',
    description: 'Allow exporting reports to PDF/CSV',
    category: 'Reports'
  },

  // Team Management
  'team.view': {
    id: 'team.view',
    name: 'View Team Members',
    description: 'Allow viewing team members',
    category: 'Team'
  },
  'team.invite': {
    id: 'team.invite',
    name: 'Invite Team Members',
    description: 'Allow inviting new team members',
    category: 'Team'
  },
  'team.edit': {
    id: 'team.edit',
    name: 'Edit Team Members',
    description: 'Allow editing team member roles',
    category: 'Team'
  },
  'team.remove': {
    id: 'team.remove',
    name: 'Remove Team Members',
    description: 'Allow removing team members',
    category: 'Team'
  },

  // Business Settings
  'business.settings': {
    id: 'business.settings',
    name: 'Manage Business Settings',
    description: 'Allow editing business information and settings',
    category: 'Business'
  },
  'business.customization': {
    id: 'business.customization',
    name: 'Customize App',
    description: 'Allow customizing app appearance and branding',
    category: 'Business'
  },

  // User Management (within business)
  'users.manage': {
    id: 'users.manage',
    name: 'Manage Users',
    description: 'Allow managing user accounts within the business',
    category: 'Users'
  },
  'users.resetPassword': {
    id: 'users.resetPassword',
    name: 'Reset User Passwords',
    description: 'Allow sending password reset emails to users',
    category: 'Users'
  }
};

// Get all permissions grouped by category
function getPermissionsByCategory() {
  const categories = {};
  Object.values(BUSINESS_PERMISSIONS).forEach(permission => {
    if (!categories[permission.category]) {
      categories[permission.category] = [];
    }
    categories[permission.category].push(permission);
  });
  return categories;
}

// Get all permission IDs
function getAllPermissionIds() {
  return Object.keys(BUSINESS_PERMISSIONS);
}

// Validate permission IDs
function validatePermissions(permissionIds) {
  if (!Array.isArray(permissionIds)) return false;
  return permissionIds.every(id => BUSINESS_PERMISSIONS[id] !== undefined);
}

// Get permission details
function getPermission(permissionId) {
  return BUSINESS_PERMISSIONS[permissionId];
}

// Check if user has a specific permission
function hasPermission(user, permissionId) {
  if (!user) return false;

  // Super admins have all permissions
  if (user.isSuperAdmin) return true;

  // IMPORTANT: If user has businessPermissions set (even if owner), use those permissions
  // This allows super admins to restrict owner permissions
  // Only check businessPermissions if it's explicitly set (not just empty array)
  if (user.businessPermissions && Array.isArray(user.businessPermissions)) {
    // If permissions array exists (even if empty), use it
    // Empty array means no permissions (restricted by super admin)
    // Non-empty array means specific permissions granted

    // 1) Exact match
    if (user.businessPermissions.includes(permissionId)) {
      return true;
    }

    // 2) Prefix matches for generic vs specific permissions
    //    - If *checked* permission is generic (e.g. 'forms'),
    //      treat it as "any permission in this group" and match
    //      stored specific permissions like 'forms.view', 'forms.create', etc.
    //    - If *stored* permission is generic (e.g. 'forms'),
    //      treat it as granting all specific permissions in that group
    const hasPrefixMatch = user.businessPermissions.some(perm => {
      // Checked permission is generic, stored permission is specific
      if (!permissionId.includes('.') && perm.includes('.')) {
        return perm.startsWith(permissionId + '.');
      }
      // Stored permission is generic, checked permission is specific
      if (!perm.includes('.') && permissionId.includes('.')) {
        return permissionId.startsWith(perm + '.');
      }
      return false;
    });

    if (hasPrefixMatch) return true;

    // No match found in explicit businessPermissions array
    return false;
  }

  // Business owners have all permissions by default (if no businessPermissions set)
  // This maintains backward compatibility for owners without restrictions
  if (user.isBusinessOwner) return true;

  // Check if user is admin (legacy support)
  if (user.isAdmin) return true;

  return false;
}

module.exports = {
  BUSINESS_PERMISSIONS,
  getPermissionsByCategory,
  getAllPermissionIds,
  validatePermissions,
  getPermission,
  hasPermission
};

