import React, { useState, useEffect } from 'react';
import { MapPin, Users, Activity, TrendingUp, Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { statesAPI } from '../../services/api';

interface DashboardStats {
  totalStates: number;
  activeStates: number;
  totalPopulation: number;
  totalArea: number;
}

const Dashboard: React.FC = () => {
  const { user, permissions } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch states data for statistics
      const response = await statesAPI.getStates({ limit: 1000 });
      const states = response.data.states;
      
      const stats = {
        totalStates: states.length,
        activeStates: states.filter((s: any) => s.isActive).length,
        totalPopulation: states.reduce((sum: number, s: any) => sum + (s.population || 0), 0),
        totalArea: states.reduce((sum: number, s: any) => sum + (s.area || 0), 0),
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const statCards = [
    {
      title: 'Total States',
      value: stats?.totalStates || 0,
      icon: MapPin,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Active States',
      value: stats?.activeStates || 0,
      icon: Activity,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Population',
      value: formatNumber(stats?.totalPopulation || 0),
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Total Area (km²)',
      value: formatNumber(stats?.totalArea || 0),
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
            <div className="mt-2 opacity-90">
              Here's what's happening with your application today.
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm opacity-75">Today</div>
              <div className="text-lg font-semibold">
                {new Date().toLocaleDateString()}
              </div>
            </div>
            <Calendar className="w-8 h-8 opacity-75" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`${card.bgColor} rounded-lg p-6 border border-gray-100`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">{card.title}</div>
                  <div className={`text-2xl font-bold ${card.textColor} mt-2`}>
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                    ) : (
                      card.value
                    )}
                  </div>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Permissions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Permissions</h3>
          <div className="space-y-3">
            {permissions.length === 0 ? (
              <div className="text-gray-500 text-sm">No permissions assigned</div>
            ) : (
              permissions.slice(0, 6).map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                    <div className="text-xs text-gray-500">
                      {permission.resource} • {permission.action}
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              ))
            )}
            {permissions.length > 6 && (
              <div className="text-xs text-gray-500 text-center">
                +{permissions.length - 6} more permissions
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Last login</div>
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Account Status</div>
                <div className="text-xs text-green-600">Active</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">User Role</div>
                <div className="text-xs text-purple-600">Administrator</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Company Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Company</h4>
            <div className="text-gray-900">Matryx Medizys</div>
            <div className="text-sm text-gray-500">Technology Solutions Provider</div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Contact</h4>
            <div className="text-gray-900">+1 (555) 123-4567</div>
            <div className="text-sm text-gray-500">contact@techcorp.com</div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Address</h4>
            <div className="text-gray-900">123 Business Ave</div>
            <div className="text-sm text-gray-500">Tech City, TC 12345</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;