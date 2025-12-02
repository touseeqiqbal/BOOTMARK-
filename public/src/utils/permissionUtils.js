export function hasPermission(user, permission) {
  if (!user) return false
  
  // Super admins have all permissions
  if (user.isSuperAdmin) return true
  
  // IMPORTANT: If user has businessPermissions set (even if owner), use those permissions
  // This allows super admins to restrict owner permissions
  // Only check businessPermissions if it's explicitly set (not just empty array)
  if (user.businessPermissions && Array.isArray(user.businessPermissions)) {
    // If permissions array exists (even if empty), use it
    // Empty array means no permissions (restricted by super admin)
    // Non-empty array means specific permissions granted
    
    // 1) Exact match
    if (user.businessPermissions.includes(permission)) {
      return true
    }
    
    // 2) Prefix matches for generic vs specific permissions
    //    - If *checked* permission is generic (e.g. 'forms'),
    //      treat it as "any permission in this group" and match
    //      stored specific permissions like 'forms.view', 'forms.create', etc.
    //    - If *stored* permission is generic (e.g. 'forms'),
    //      treat it as granting all specific permissions in that group
    const hasPrefixMatch = user.businessPermissions.some(perm => {
      // Checked permission is generic, stored permission is specific
      if (!permission.includes('.') && perm.includes('.')) {
        return perm.startsWith(permission + '.')
      }
      // Stored permission is generic, checked permission is specific
      if (!perm.includes('.') && permission.includes('.')) {
        return permission.startsWith(perm + '.')
      }
      return false
    })
    
    if (hasPrefixMatch) return true
    
    // No match found in explicit businessPermissions array
    return false
  }
  
  // Business owners have all permissions by default (if no businessPermissions set)
  // This maintains backward compatibility for owners without restrictions
  if (user.isBusinessOwner) return true
  
  // Legacy: if user is admin but no permissions array, grant access (backward compatibility)
  if (user.isAdmin && !user.businessPermissions) {
    return true
  }
  
  return false
}

export function requirePermission(user, permission) {
  return hasPermission(user, permission)
}

