import { useAuthStore } from '../store/authStore';

export interface PermissionCheck {
  resource: string;
  action: string;
}

export const usePermissions = () => {
  const { user, permissions, hasPermission } = useAuthStore();

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  // Check if user has all specified roles (useful for admin checks)
  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every(role => hasRole(role));
  };

  // Check multiple permissions with AND logic
  const hasAllPermissions = (permissionChecks: PermissionCheck[]): boolean => {
    return permissionChecks.every(({ resource, action }) => 
      hasPermission(resource, action)
    );
  };

  // Check multiple permissions with OR logic
  const hasAnyPermission = (permissionChecks: PermissionCheck[]): boolean => {
    return permissionChecks.some(({ resource, action }) => 
      hasPermission(resource, action)
    );
  };

  // Check if user can perform QC operations
  const canPerformQC = (): boolean => {
    return hasAnyPermission([
      { resource: 'quality_control', action: 'create' },
      { resource: 'quality_control', action: 'update' },
      { resource: 'quality_control', action: 'approve' },
      { resource: 'quality_control', action: 'reject' }
    ]);
  };

  // Check if user can manage warehouse approvals
  const canManageWarehouseApprovals = (): boolean => {
    return hasAnyPermission([
      { resource: 'warehouse_approval', action: 'approve' },
      { resource: 'warehouse_approval', action: 'reject' },
      { resource: 'warehouse_approval', action: 'update' }
    ]);
  };

  // Check if user can manage inventory
  const canManageInventory = (): boolean => {
    return hasAnyPermission([
      { resource: 'inventory', action: 'adjust' },
      { resource: 'inventory', action: 'transfer' },
      { resource: 'inventory', action: 'reserve' },
      { resource: 'inventory', action: 'utilize' }
    ]);
  };

  // Check if user is QC Manager
  const isQCManager = (): boolean => {
    return hasRole('qc_manager') || hasAllPermissions([
      { resource: 'quality_control', action: 'approve' },
      { resource: 'quality_control', action: 'reject' },
      { resource: 'quality_control', action: 'statistics' }
    ]);
  };

  // Check if user is Warehouse Manager
  const isWarehouseManager = (): boolean => {
    return hasRole('warehouse_manager') || hasAllPermissions([
      { resource: 'warehouse_approval', action: 'approve' },
      { resource: 'warehouse_approval', action: 'reject' },
      { resource: 'warehouses', action: 'update' }
    ]);
  };

  // Check if user is Inventory Manager
  const isInventoryManager = (): boolean => {
    return hasRole('inventory_manager') || hasAllPermissions([
      { resource: 'inventory', action: 'adjust' },
      { resource: 'inventory', action: 'transfer' },
      { resource: 'inventory', action: 'statistics' }
    ]);
  };

  // Check if user is Admin
  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('super_admin');
  };

  // Get user's role display name
  const getUserRoleDisplay = (): string => {
    if (!user?.role) return 'User';
    
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'super_admin': 'Super Administrator',
      'qc_manager': 'QC Manager',
      'warehouse_manager': 'Warehouse Manager',
      'inventory_manager': 'Inventory Manager',
      'purchase_manager': 'Purchase Manager',
      'approver_level1': 'Approver Level 1',
      'approver_level2': 'Approver Level 2',
      'user': 'User'
    };

    return roleMap[user.role] || user.role;
  };

  // Get user's permissions for a specific resource
  const getResourcePermissions = (resource: string): string[] => {
    return permissions
      .filter(permission => permission.resource === resource)
      .map(permission => permission.action);
  };

  // Check if user can access a specific module
  const canAccessModule = (module: string): boolean => {
    const modulePermissions: Record<string, PermissionCheck[]> = {
      'quality_control': [
        { resource: 'quality_control', action: 'view' }
      ],
      'warehouse_approval': [
        { resource: 'warehouse_approval', action: 'view' }
      ],
      'inventory': [
        { resource: 'inventory', action: 'view' }
      ],
      'warehouses': [
        { resource: 'warehouses', action: 'view' }
      ],
      'purchase_orders': [
        { resource: 'purchase_orders', action: 'view' }
      ],
      'invoice_receiving': [
        { resource: 'invoice_receiving', action: 'view' }
      ]
    };

    const requiredPermissions = modulePermissions[module];
    if (!requiredPermissions) return false;

    return hasAnyPermission(requiredPermissions);
  };

  return {
    // Basic permission checks
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasAllPermissions,
    hasAnyPermission,
    
    // Specific role checks
    isAdmin,
    isQCManager,
    isWarehouseManager,
    isInventoryManager,
    
    // Functional permission checks
    canPerformQC,
    canManageWarehouseApprovals,
    canManageInventory,
    canAccessModule,
    
    // Utility functions
    getUserRoleDisplay,
    getResourcePermissions,
    
    // User data
    user,
    permissions
  };
};

export default usePermissions;