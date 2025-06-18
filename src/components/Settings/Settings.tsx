// src/components/Settings/Settings.tsx
import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Database, 
  Shield, 
  Bell, 
  Globe, 
  Palette,
  MapPin,
  Building2,
  Users,
  ChevronRight,
  Key,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  route?: string;
  action?: () => void;
  permission?: { resource: string; action: string };
  badge?: string;
}

const Settings: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const [activeSection, setActiveSection] = useState<string>('account');

  const settingsSections: SettingsSection[] = [
    {
      id: 'account',
      title: 'Account Settings',
      description: 'Manage your personal account settings',
      icon: User,
      items: [
        {
          id: 'profile',
          title: 'Profile Information',
          description: 'Update your personal information and contact details',
          icon: User,
          route: '/settings/profile'
        },
        {
          id: 'password',
          title: 'Change Password',
          description: 'Update your password and security settings',
          icon: Lock,
          route: '/settings/change-password'
        },
        {
          id: 'notifications',
          title: 'Notifications',
          description: 'Manage your notification preferences',
          icon: Bell,
          route: '/settings/notifications'
        }
      ]
    },
    {
      id: 'masters',
      title: 'Master Data',
      description: 'Manage system master data and configurations',
      icon: Database,
      items: [
        {
          id: 'states',
          title: 'States & Regions',
          description: 'Manage geographical states and regions',
          icon: MapPin,
          route: '/states',
          permission: { resource: 'states', action: 'view' }
        },
        {
          id: 'hospitals',
          title: 'Hospitals',
          description: 'Manage hospital master data',
          icon: Building2,
          route: '/hospitals',
          permission: { resource: 'hospitals', action: 'view' }
        }
      ]
    },
    {
      id: 'administration',
      title: 'Administration',
      description: 'User management and system administration',
      icon: Shield,
      items: [
        {
          id: 'users',
          title: 'User Management',
          description: 'Manage system users and permissions',
          icon: Users,
          route: '/users',
          permission: { resource: 'users', action: 'view' }
        },
        {
          id: 'permissions',
          title: 'Permissions',
          description: 'View and manage system permissions',
          icon: Key,
          route: '/settings/permissions',
          permission: { resource: 'users', action: 'view' }
        }
      ]
    },
    {
      id: 'system',
      title: 'System Settings',
      description: 'Application settings and preferences',
      icon: SettingsIcon,
      items: [
        {
          id: 'appearance',
          title: 'Appearance',
          description: 'Customize the look and feel of the application',
          icon: Palette,
          route: '/settings/appearance'
        },
        {
          id: 'language',
          title: 'Language & Region',
          description: 'Set your preferred language and regional settings',
          icon: Globe,
          route: '/settings/language'
        }
      ]
    }
  ];

  // Filter sections and items based on permissions
  const filteredSections = settingsSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      !item.permission || hasPermission(item.permission.resource, item.permission.action)
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account, preferences, and system settings
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white"
      >
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-blue-100">{user?.email}</p>
            <p className="text-blue-200 text-sm mt-1">
              Account Status: <span className="text-green-200 font-medium">Active</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSections.map((section, sectionIndex) => {
          const SectionIcon = section.icon;
          
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: sectionIndex * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {/* Section Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <SectionIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>
              </div>

              {/* Section Items */}
              <div className="p-6">
                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => {
                    const ItemIcon = item.icon;
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: (sectionIndex * 0.1) + (itemIndex * 0.05) }}
                      >
                        {item.route ? (
                          <Link
                            to={item.route}
                            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors duration-200">
                                <ItemIcon className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-gray-500 group-hover:text-blue-600">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {item.badge && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            </div>
                          </Link>
                        ) : (
                          <button
                            onClick={item.action}
                            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors duration-200">
                                <ItemIcon className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                              </div>
                              <div className="text-left">
                                <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-gray-500 group-hover:text-blue-600">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {item.badge && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            </div>
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/settings/change-password"
            className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
          >
            <Lock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Change Password</span>
          </Link>
          
          <Link
            to="/settings/profile"
            className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
          >
            <User className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Update Profile</span>
          </Link>
          
          <Link
            to="/settings/notifications"
            className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
          >
            <Bell className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Notifications</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;