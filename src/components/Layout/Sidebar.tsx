// src/components/Layout/Sidebar.tsx - Updated with Doctor and Principal navigation
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MapPin, 
  Users, 
  Building2,
  UserCheck,
  Briefcase,
  Settings, 
  LogOut,
  ChevronRight,
  FolderTree,
  Package,
  ShoppingCart,
  Truck,
  GitBranch,
  Warehouse,
  Workflow,
  Shield,
  CheckCircle,
  ClipboardCheck,
  Archive
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, hasPermission, logout } = useAuthStore();
  const location = useLocation();

  const menuItems = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      icon: Home,
      permission: null, // Always visible for authenticated users
    },
    
    {
      path: '/hospitals',
      name: 'Hospitals',
      icon: Building2,
      permission: { resource: 'hospitals', action: 'view' },
    },
    {
      path: '/doctors',
      name: 'Doctors',
      icon: UserCheck,
      permission: { resource: 'doctors', action: 'view' },
    },
    {
      path: '/principals',
      name: 'Principals',
      icon: Building2,
      permission: { resource: 'principals', action: 'view' },
    },
    {
      path: '/portfolios',
      name: 'Portfolios',
      icon: Briefcase,
      permission: { resource: 'portfolios', action: 'view' },
    },
    {
      path: '/branches',
      name: 'Branches',
      icon: GitBranch,
      permission: { resource: 'branches', action: 'view' },
    },
    {
      path: '/warehouses',
      name: 'Warehouses',
      icon: Warehouse,
      permission: { resource: 'warehouses', action: 'view' },
    },
    {
  path: '/categories',
  name: 'Categories',
  icon: FolderTree,
  permission: { resource: 'categories', action: 'view' },
},
{
  path: '/products',
  name: 'Products',
  icon: Package,
  permission: { resource: 'products', action: 'view' },
},
    {
      path: '/purchase-orders',
      name: 'Purchase Orders',
      icon: ShoppingCart,
      permission: { resource: 'purchase_orders', action: 'view' },
    },
    {
      path: '/invoice-receiving',
      name: 'Invoice Receiving',
      icon: Truck,
      permission: { resource: 'invoice_receiving', action: 'view' },
    },
    {
      path: '/workflow/stages',
      name: 'Workflow',
      icon: Workflow,
      permission: { resource: 'workflow', action: 'view' },
    },
    {
      path: '/quality-control',
      name: 'Quality Control',
      icon: CheckCircle,
      permission: { resource: 'quality_control', action: 'view' },
    },
    {
      path: '/warehouse-approvals',
      name: 'Warehouse Approval',
      icon: ClipboardCheck,
      permission: { resource: 'warehouse_approval', action: 'view' },
    },
    {
      path: '/inventory',
      name: 'Inventory',
      icon: Archive,
      permission: { resource: 'inventory', action: 'view' },
    },
    {
      path: '/users',
      name: 'Users',
      icon: Users,
      permission: { resource: 'users', action: 'view' },
    },
    {
      path: '/permissions',
      name: 'Permissions',
      icon: Shield,
      permission: { resource: 'permissions', action: 'view' },
    },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(item.permission.resource, item.permission.action)
  );

  const handleLogout = async () => {
    try {
      logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold">M</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Matryx</h2>
            <p className="text-sm text-slate-400">Medizys</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Additional Menu Items */}
        <div className="mt-8 pt-4 border-t border-slate-700">
          <ul className="space-y-2">
            <li>
              <Link
                to="/settings"
                onClick={onClose}
                className="flex items-center px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all duration-200"
              >
                <Settings className="w-5 h-5 mr-3" />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-slate-300 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;