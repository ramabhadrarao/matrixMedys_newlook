import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface RoleBasedAccessProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  resource?: string;
  action?: string;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL permissions; if false, user needs ANY permission
}

const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  resource,
  action,
  fallback = null,
  requireAll = false
}) => {
  const { user, permissions, hasPermission } = useAuthStore();

  // Check if user is authenticated
  if (!user) {
    return <>{fallback}</>;
  }

  // Check role-based access
  if (requiredRoles.length > 0) {
    const userRole = user.role || 'user';
    if (!requiredRoles.includes(userRole)) {
      return <>{fallback}</>;
    }
  }

  // Check resource-action based permission
  if (resource && action) {
    if (!hasPermission(resource, action)) {
      return <>{fallback}</>;
    }
  }

  // Check specific permissions
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(permission => {
          const [permResource, permAction] = permission.split('.');
          return hasPermission(permResource, permAction);
        })
      : requiredPermissions.some(permission => {
          const [permResource, permAction] = permission.split('.');
          return hasPermission(permResource, permAction);
        });

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default RoleBasedAccess;