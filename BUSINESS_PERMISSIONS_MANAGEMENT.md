# Business Permissions Management System

## Overview

Super admins can now manage permissions for business admin users across all businesses. This allows fine-grained control over what each business admin can do within their business account.

## Features

### 1. **Super Admin Access**
- Super admins can view all businesses
- Super admins can manage permissions for any business admin
- Access via Dashboard → "Manage Permissions" button (super admin only)

### 2. **Available Permissions**

The system includes permissions across multiple categories:

#### Forms
- `forms.create` - Create new forms
- `forms.edit` - Edit existing forms
- `forms.delete` - Delete forms
- `forms.view` - View forms

#### Submissions
- `submissions.view` - View form submissions
- `submissions.delete` - Delete submissions
- `submissions.export` - Export submissions to PDF/CSV

#### Invoices
- `invoices.create` - Create new invoices
- `invoices.edit` - Edit invoices
- `invoices.delete` - Delete invoices
- `invoices.view` - View invoices
- `invoices.send` - Send invoices via email

#### Customers
- `customers.create` - Create new customers
- `customers.edit` - Edit customers
- `customers.delete` - Delete customers
- `customers.view` - View customers

#### Team Management
- `team.view` - View team members
- `team.invite` - Invite new team members
- `team.edit` - Edit team member roles
- `team.remove` - Remove team members

#### Business Settings
- `business.settings` - Manage business information and settings

#### User Management
- `users.manage` - Manage user accounts within the business
- `users.resetPassword` - Send password reset emails to users

## How to Use

### For Super Admins

1. **Access the Permissions Page**
   - Log in as a super admin
   - Go to Dashboard
   - Click "Manage Permissions" button

2. **Select a Business**
   - Browse or search for a business in the left panel
   - Click on a business to view its admins

3. **Manage Admin Permissions**
   - See all business admins (owners and members with admin role)
   - For each admin, you'll see permissions organized by category
   - Check/uncheck permissions to grant/revoke access
   - Use "Select All" / "Deselect All" for quick category management
   - Click "Save Permissions" to apply changes

### Permission Hierarchy

1. **Super Admin** - Has all permissions automatically (cannot be restricted)
2. **Business Owner** - Has all permissions for their business (cannot be restricted)
3. **Business Admin** - Permissions are configurable by super admin

## Backend API Endpoints

### Get All Businesses (Super Admin Only)
```
GET /api/businesses/all
```

### Get Available Permissions
```
GET /api/businesses/permissions/available
```

### Get Business Admin Permissions
```
GET /api/businesses/:businessId/permissions
```

### Update Business Admin Permissions
```
PUT /api/businesses/:businessId/permissions/:userId
Body: {
  "permissions": ["forms.create", "forms.edit", "invoices.view", ...]
}
```

## Frontend Integration

### Permission Checking

The frontend uses the `hasPermission` utility function:

```javascript
import { hasPermission } from '../utils/permissionUtils'

// Check if user has a specific permission
if (hasPermission(user, 'forms.create')) {
  // Show create form button
}
```

### Permission Hierarchy in Code

```javascript
// Super admins always have access
if (user.isSuperAdmin) return true

// Business owners always have access
if (user.isBusinessOwner) return true

// Check configured permissions
if (user.businessPermissions?.includes(permission)) return true
```

## Data Structure

### User Object
```javascript
{
  uid: "user-id",
  email: "admin@business.com",
  name: "Admin Name",
  isAdmin: true,
  isSuperAdmin: false,
  isBusinessOwner: false,
  businessPermissions: [
    "forms.create",
    "forms.edit",
    "invoices.view",
    "customers.create"
  ]
}
```

### Business Object
```javascript
{
  id: "business-id",
  businessName: "My Business",
  ownerId: "owner-user-id",
  members: [
    {
      userId: "member-id",
      role: "admin",
      permissions: ["forms.create", "forms.edit"]
    }
  ]
}
```

## Security Notes

1. **Super Admin Protection**: Only super admins can access the permissions management page
2. **Backend Validation**: All endpoints check for super admin privileges
3. **Permission Validation**: Invalid permission IDs are rejected
4. **Owner Protection**: Business owners cannot have their permissions restricted (they always have full access)

## Migration Notes

- Existing business admins without `businessPermissions` array will have full access (backward compatibility)
- New permissions can be added to `utils/businessPermissions.js` without breaking existing functionality
- Permissions are stored in both the user document and business member document for redundancy

## Future Enhancements

Potential improvements:
- Permission templates (predefined permission sets)
- Permission inheritance (role-based default permissions)
- Permission audit log (track who changed what permissions)
- Bulk permission updates (update multiple admins at once)

