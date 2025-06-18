// src/services/dashboardAPI.ts
import api from './api';

export interface DashboardCard {
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

export interface SystemStats {
  totalPermissions: number;
  totalResources: number;
  userPermissionsCount: number;
  accessibleResources: number;
}

export interface DashboardStats {
  cards: DashboardCard[];
  systemStats: SystemStats;
  userPermissions: { [resource: string]: string[] };
  totalCards: number;
}

export interface Activity {
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

export interface RecentActivity {
  activities: Activity[];
  total: number;
}

export const dashboardAPI = {
  // Get dashboard statistics based on user permissions
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      console.log('Fetching dashboard statistics...');
      const response = await api.get('/dashboard/stats');
      console.log('Dashboard stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get recent activity based on user permissions
  getRecentActivity: async (limit: number = 10): Promise<RecentActivity> => {
    try {
      console.log('Fetching recent activity...');
      const response = await api.get('/dashboard/activity', {
        params: { limit }
      });
      console.log('Recent activity response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }
};