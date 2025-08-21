// src/components/Dashboard/Dashboard.tsx - Enhanced with Doctor & Portfolio Cards
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Users, 
  Building2, 
  Activity, 
  TrendingUp, 
  Calendar, 
  Clock,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Briefcase,
  Target,
  FileText,
  Award,
  TrendingDown,
  FolderTree, // Add this
  Package     // Add this
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { dashboardAPI } from '../../services/api';
import { handleApiError } from '../../services/api';

// Icon mapping for dynamic icons
const iconMap = {
  MapPin,
  Users,
  Building2,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  UserCheck,
  Briefcase,
  Target,
  FileText,
  Award,
  FolderTree, // Add this
  Package     // Add this
};

interface DashboardCard {
  id: string;
  title: string;
  resource: string;
  icon: string;
  color: string;
  stats: {
    total: number;
    active: number;
    inactive: number;
    recent: number;
    [key: string]: any;
  };
  actions: string[];
  route: string;
  description: string;
}

interface Activity {
  id: string;
  type: string;
  action: string;
  title: string;
  description: string;
  user: {
    _id: string;
    name: string;
  };
  timestamp: string;
  resource: string;
  icon: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [systemStats, setSystemStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivity();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getDashboardStats();
      setCards(data.cards || []);
      setSystemStats(data.systemStats || {});
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setActivitiesLoading(true);
      const data = await dashboardAPI.getRecentActivity(8);
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      handleApiError(error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getSafeStatValue = (stats: any, key: string, defaultValue: number | string = 0) => {
    return stats && stats[key] !== undefined && stats[key] !== null ? stats[key] : defaultValue;
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        icon: 'bg-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        icon: 'bg-green-500',
        button: 'bg-green-600 hover:bg-green-700'
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        icon: 'bg-purple-500',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        icon: 'bg-orange-500',
        button: 'bg-orange-600 hover:bg-orange-700'
      },
      emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        icon: 'bg-emerald-500',
        button: 'bg-emerald-600 hover:bg-emerald-700'
      },
      red: {
        bg: 'bg-red-50',
        text: 'text-red-600',
        icon: 'bg-red-500',
        button: 'bg-red-600 hover:bg-red-700'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Enhanced card rendering for different resource types
  const renderCardStats = (card: DashboardCard) => {
    const colors = getColorClasses(card.color);
    
    switch (card.resource) {
      case 'doctors':
        return (
          <div className="space-y-3">
            {/* Basic Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active:</span>
                <span className="font-medium text-green-600">{getSafeStatValue(card.stats, 'active')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Inactive:</span>
                <span className="font-medium text-red-600">{getSafeStatValue(card.stats, 'inactive')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Recent:</span>
                <span className="font-medium text-blue-600 flex items-center">
                  {getSafeStatValue(card.stats, 'recent')}
                  {getSafeStatValue(card.stats, 'recent') > 0 && <ArrowUpRight className="w-3 h-3 ml-1" />}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Files:</span>
                <span className="font-medium text-purple-600">{card.stats.totalAttachments || 0}</span>
              </div>
            </div>

            {/* Doctor-specific stats */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Annual Targets:</span>
                <span className="font-medium text-emerald-600">
                  {formatNumber(card.stats.currentYearTargets || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Avg per Doctor:</span>
                <span className="font-medium text-emerald-600">
                  {formatNumber(card.stats.averageTargetPerDoctor || 0)}
                </span>
              </div>
            </div>

            {/* Top specializations */}
            {card.stats.topSpecializations && card.stats.topSpecializations.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Top Specializations:</div>
                <div className="space-y-1">
                  {card.stats.topSpecializations.slice(0, 2).map((spec: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 truncate">{spec._id}</span>
                      <span className="font-medium text-blue-600">{spec.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'portfolios':
        return (
          <div className="space-y-3">
            {/* Basic Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active:</span>
                <span className="font-medium text-green-600">{card.stats.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Inactive:</span>
                <span className="font-medium text-red-600">{card.stats.inactive}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Used:</span>
                <span className="font-medium text-blue-600">{card.stats.used || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Unused:</span>
                <span className="font-medium text-gray-600">{card.stats.unused || 0}</span>
              </div>
            </div>

            {/* Portfolio-specific stats */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Total Assignments:</span>
                <span className="font-medium text-orange-600">{card.stats.totalAssignments || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Utilization Rate:</span>
                <span className="font-medium text-orange-600">{card.stats.utilizationRate || 0}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Avg Doctors/Portfolio:</span>
                <span className="font-medium text-orange-600">{card.stats.avgDoctorsPerPortfolio || 0}</span>
              </div>
            </div>

            {/* Utilization bar */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Portfolio Utilization</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${card.stats.utilizationRate || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        );

      default:
        // Default stats for other cards (hospitals, states, users)
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active:</span>
                <span className="font-medium text-green-600">{getSafeStatValue(card.stats, 'active')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Inactive:</span>
                <span className="font-medium text-red-600">{getSafeStatValue(card.stats, 'inactive')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Recent:</span>
                <span className="font-medium text-blue-600 flex items-center">
                  {getSafeStatValue(card.stats, 'recent')}
                  {getSafeStatValue(card.stats, 'recent') > 0 && <ArrowUpRight className="w-3 h-3 ml-1" />}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Recent Change:</span>
                <span className={`font-medium flex items-center ${
                  getSafeStatValue(card.stats, 'recent') > 0 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {getSafeStatValue(card.stats, 'recent') > 0 ? '+' : ''}{getSafeStatValue(card.stats, 'recent')}
                </span>
              </div>
            </div>

            {/* Resource-specific additional stats */}
            {card.resource === 'hospitals' && card.stats.totalContacts && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Contacts:</span>
                  <span className="font-medium text-purple-600">{card.stats.totalContacts}</span>
                </div>
              </div>
            )}

            {card.resource === 'states' && card.stats.totalPopulation && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Population:</span>
                  <span className="font-medium text-blue-600">{formatNumber(card.stats.totalPopulation)}</span>
                </div>
              </div>
            )}

            {card.resource === 'users' && card.stats.withPermissions !== undefined && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">With Permissions:</span>
                  <span className="font-medium text-green-600">{card.stats.withPermissions}</span>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
            <div className="mt-2 opacity-90">
              You have access to {cards.length} module{cards.length !== 1 ? 's' : ''} with {systemStats.userPermissionsCount || 0} permissions.
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

      {/* Dynamic Stats Grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card, index) => {
            const IconComponent = iconMap[card.icon as keyof typeof iconMap] || Activity;
            const colors = getColorClasses(card.color);
            
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`${colors.bg} rounded-lg p-6 border border-gray-100 hover:shadow-lg transition-all duration-200`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${colors.icon} p-3 rounded-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className={`text-2xl font-bold ${colors.text}`}>
                      {formatNumber(getSafeStatValue(card.stats, 'total'))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                    <p className="text-sm text-gray-600">{card.description}</p>
                  </div>

                  {/* Render appropriate stats based on card type */}
                  {renderCardStats(card)}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      {card.actions.includes('view') && (
                        <Link 
                          to={card.route}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}
                      {card.actions.includes('create') && (
                        <Link 
                          to={`${card.route}/new`}
                          className={`text-white p-1 rounded ${colors.button} transition-colors duration-200`}
                          title="Create New"
                        >
                          <Plus className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                    
                    <Link 
                      to={card.route}
                      className={`text-sm font-medium ${colors.text} hover:opacity-80 transition-opacity duration-200`}
                    >
                      View All →
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* No Access Message */}
      {cards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-8 text-center"
        >
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Limited Access</h3>
          <p className="text-gray-600">
            You don't have view permissions for any modules yet. Contact your administrator to get access.
          </p>
        </motion.div>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {activitiesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">No recent activity</div>
            ) : (
              activities.slice(0, 6).map((activity) => {
                const ActivityIcon = iconMap[activity.icon as keyof typeof iconMap] || Activity;
                return (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ActivityIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                      <div className="text-xs text-gray-500">{activity.description}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatRelativeTime(activity.timestamp)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* System Information */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Total Permissions</div>
                  <div className="text-xs text-gray-500">System-wide permissions</div>
                </div>
              </div>
              <div className="text-lg font-bold text-blue-600">{systemStats.totalPermissions || 0}</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Your Permissions</div>
                  <div className="text-xs text-gray-500">Assigned to your account</div>
                </div>
              </div>
              <div className="text-lg font-bold text-green-600">{systemStats.userPermissionsCount || 0}</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Accessible Modules</div>
                  <div className="text-xs text-gray-500">Modules you can access</div>
                </div>
              </div>
              <div className="text-lg font-bold text-purple-600">{systemStats.accessibleResources || 0}</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Account Status</div>
                  <div className="text-xs text-gray-500">Your account status</div>
                </div>
              </div>
              <div className="text-sm font-bold text-green-600">Active</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;