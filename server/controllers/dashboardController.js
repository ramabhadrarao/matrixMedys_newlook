// server/controllers/dashboardController.js - Updated with Doctor information
import State from '../models/State.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import HospitalContact from '../models/HospitalContact.js';
import Doctor from '../models/Doctor.js';
import Portfolio from '../models/Portfolio.js';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's permissions
    const userPermissions = await UserPermission.find({ userId })
      .populate('permissionId');
    
    const permissions = userPermissions.map(up => ({
      resource: up.permissionId.resource,
      action: up.permissionId.action,
      name: up.permissionId.name
    }));
    
    // Group permissions by resource
    const resourcePermissions = {};
    permissions.forEach(perm => {
      if (!resourcePermissions[perm.resource]) {
        resourcePermissions[perm.resource] = [];
      }
      resourcePermissions[perm.resource].push(perm.action);
    });
    
    const dashboardCards = [];
    
    // States Statistics
    if (resourcePermissions.states && resourcePermissions.states.includes('view')) {
      try {
        const totalStates = await State.countDocuments();
        const activeStates = await State.countDocuments({ isActive: true });
        const inactiveStates = totalStates - activeStates;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentStates = await State.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        const statesData = await State.find({}, 'population area');
        const totalPopulation = statesData.reduce((sum, state) => sum + (state.population || 0), 0);
        const totalArea = statesData.reduce((sum, state) => sum + (state.area || 0), 0);
        
        dashboardCards.push({
          id: 'states',
          title: 'States',
          resource: 'states',
          icon: 'MapPin',
          color: 'blue',
          stats: {
            total: totalStates,
            active: activeStates,
            inactive: inactiveStates,
            recent: recentStates,
            totalPopulation,
            totalArea
          },
          actions: resourcePermissions.states,
          route: '/states',
          description: 'Geographical states and regions'
        });
      } catch (error) {
        console.error('Error fetching states stats:', error);
      }
    }
    
    // Users Statistics
    if (resourcePermissions.users && resourcePermissions.users.includes('view')) {
      try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = totalUsers - activeUsers;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsers = await User.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        const usersWithPermissions = await UserPermission.distinct('userId');
        const usersWithoutPermissions = totalUsers - usersWithPermissions.length;
        
        dashboardCards.push({
          id: 'users',
          title: 'Users',
          resource: 'users',
          icon: 'Users',
          color: 'green',
          stats: {
            total: totalUsers,
            active: activeUsers,
            inactive: inactiveUsers,
            recent: recentUsers,
            withPermissions: usersWithPermissions.length,
            withoutPermissions: usersWithoutPermissions
          },
          actions: resourcePermissions.users,
          route: '/users',
          description: 'System users and administrators'
        });
      } catch (error) {
        console.error('Error fetching users stats:', error);
      }
    }
    
    // Hospitals Statistics
    if (resourcePermissions.hospitals && resourcePermissions.hospitals.includes('view')) {
      try {
        const totalHospitals = await Hospital.countDocuments();
        const activeHospitals = await Hospital.countDocuments({ isActive: true });
        const inactiveHospitals = totalHospitals - activeHospitals;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentHospitals = await Hospital.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        const totalContacts = await HospitalContact.countDocuments();
        const activeContacts = await HospitalContact.countDocuments({ isActive: true });
        
        const hospitalsByState = await Hospital.aggregate([
          {
            $lookup: {
              from: 'states',
              localField: 'state',
              foreignField: '_id',
              as: 'stateInfo'
            }
          },
          {
            $group: {
              _id: '$stateInfo.name',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 5
          }
        ]);
        
        dashboardCards.push({
          id: 'hospitals',
          title: 'Hospitals',
          resource: 'hospitals',
          icon: 'Building2',
          color: 'purple',
          stats: {
            total: totalHospitals,
            active: activeHospitals,
            inactive: inactiveHospitals,
            recent: recentHospitals,
            totalContacts,
            activeContacts,
            topStates: hospitalsByState
          },
          actions: resourcePermissions.hospitals,
          route: '/hospitals',
          description: 'Healthcare facilities and contacts'
        });
      } catch (error) {
        console.error('Error fetching hospitals stats:', error);
      }
    }
    
    // Doctors Statistics
    if (resourcePermissions.doctors && resourcePermissions.doctors.includes('view')) {
      try {
        const totalDoctors = await Doctor.countDocuments();
        const activeDoctors = await Doctor.countDocuments({ isActive: true });
        const inactiveDoctors = totalDoctors - activeDoctors;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentDoctors = await Doctor.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get total attachments count
        const doctorsWithAttachments = await Doctor.aggregate([
          {
            $project: {
              attachmentsCount: { $size: '$attachments' }
            }
          },
          {
            $group: {
              _id: null,
              totalAttachments: { $sum: '$attachmentsCount' }
            }
          }
        ]);
        
        const totalAttachments = doctorsWithAttachments[0]?.totalAttachments || 0;
        
        // Get doctors by specialization
        const doctorsBySpecialization = await Doctor.aggregate([
          { $unwind: '$specialization' },
          {
            $lookup: {
              from: 'portfolios',
              localField: 'specialization',
              foreignField: '_id',
              as: 'portfolioInfo'
            }
          },
          { $unwind: '$portfolioInfo' },
          {
            $group: {
              _id: '$portfolioInfo.name',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 5
          }
        ]);
        
        // Calculate total targets for current year
        const currentYear = new Date().getFullYear();
        const totalTargets = await Doctor.aggregate([
          { $unwind: '$targets' },
          { $match: { 'targets.year': currentYear } },
          {
            $group: {
              _id: null,
              totalTargets: { $sum: '$targets.target' }
            }
          }
        ]);
        
        const currentYearTargets = totalTargets[0]?.totalTargets || 0;
        
        dashboardCards.push({
          id: 'doctors',
          title: 'Doctors',
          resource: 'doctors',
          icon: 'UserCheck',
          color: 'emerald',
          stats: {
            total: totalDoctors,
            active: activeDoctors,
            inactive: inactiveDoctors,
            recent: recentDoctors,
            totalAttachments,
            currentYearTargets,
            topSpecializations: doctorsBySpecialization
          },
          actions: resourcePermissions.doctors,
          route: '/doctors',
          description: 'Medical professionals and specialists'
        });
      } catch (error) {
        console.error('Error fetching doctors stats:', error);
      }
    }
    
    // Portfolios Statistics
    if (resourcePermissions.portfolios && resourcePermissions.portfolios.includes('view')) {
      try {
        const totalPortfolios = await Portfolio.countDocuments();
        const activePortfolios = await Portfolio.countDocuments({ isActive: true });
        const inactivePortfolios = totalPortfolios - activePortfolios;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPortfolios = await Portfolio.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get portfolios usage
        const portfolioUsage = await Doctor.aggregate([
          { $unwind: '$specialization' },
          {
            $group: {
              _id: '$specialization',
              doctorCount: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: null,
              usedPortfolios: { $sum: 1 },
              totalDoctorAssignments: { $sum: '$doctorCount' }
            }
          }
        ]);
        
        const usage = portfolioUsage[0] || { usedPortfolios: 0, totalDoctorAssignments: 0 };
        const unusedPortfolios = totalPortfolios - usage.usedPortfolios;
        
        dashboardCards.push({
          id: 'portfolios',
          title: 'Portfolios',
          resource: 'portfolios',
          icon: 'Briefcase',
          color: 'orange',
          stats: {
            total: totalPortfolios,
            active: activePortfolios,
            inactive: inactivePortfolios,
            recent: recentPortfolios,
            used: usage.usedPortfolios,
            unused: unusedPortfolios,
            totalAssignments: usage.totalDoctorAssignments
          },
          actions: resourcePermissions.portfolios,
          route: '/portfolios',
          description: 'Medical specializations and portfolios'
        });
      } catch (error) {
        console.error('Error fetching portfolios stats:', error);
      }
    }
    
    // System Overview
    const systemStats = {
      totalPermissions: await Permission.countDocuments(),
      totalResources: await Permission.distinct('resource').then(resources => resources.length),
      userPermissionsCount: permissions.length,
      accessibleResources: Object.keys(resourcePermissions).length
    };
    
    res.json({
      cards: dashboardCards,
      systemStats,
      userPermissions: resourcePermissions,
      totalCards: dashboardCards.length
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;
    
    // Get user's permissions to determine what activities they can see
    const userPermissions = await UserPermission.find({ userId })
      .populate('permissionId');
    
    const viewableResources = userPermissions
      .filter(up => up.permissionId.action === 'view')
      .map(up => up.permissionId.resource);
    
    const activities = [];
    
    // Recent States
    if (viewableResources.includes('states')) {
      const recentStates = await State.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentStates.forEach(state => {
        activities.push({
          id: state._id,
          type: 'state',
          action: state.createdAt.getTime() === state.updatedAt.getTime() ? 'created' : 'updated',
          title: state.name,
          description: `State ${state.name} (${state.code})`,
          user: state.updatedBy || state.createdBy,
          timestamp: state.updatedAt,
          resource: 'states',
          icon: 'MapPin'
        });
      });
    }
    
    // Recent Users
    if (viewableResources.includes('users')) {
      const recentUsers = await User.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentUsers.forEach(user => {
        activities.push({
          id: user._id,
          type: 'user',
          action: user.createdAt.getTime() === user.updatedAt.getTime() ? 'created' : 'updated',
          title: user.name,
          description: `User ${user.name} (${user.email})`,
          user: { name: user.name, _id: user._id },
          timestamp: user.updatedAt,
          resource: 'users',
          icon: 'User'
        });
      });
    }
    
    // Recent Hospitals
    if (viewableResources.includes('hospitals')) {
      const recentHospitals = await Hospital.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('state', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentHospitals.forEach(hospital => {
        activities.push({
          id: hospital._id,
          type: 'hospital',
          action: hospital.createdAt.getTime() === hospital.updatedAt.getTime() ? 'created' : 'updated',
          title: hospital.name,
          description: `Hospital in ${hospital.state?.name || 'Unknown State'}`,
          user: hospital.updatedBy || hospital.createdBy,
          timestamp: hospital.updatedAt,
          resource: 'hospitals',
          icon: 'Building2'
        });
      });
    }
    
    // Recent Doctors
    if (viewableResources.includes('doctors')) {
      const recentDoctors = await Doctor.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('specialization', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentDoctors.forEach(doctor => {
        const specializations = doctor.specialization?.map(s => s.name).join(', ') || 'General';
        activities.push({
          id: doctor._id,
          type: 'doctor',
          action: doctor.createdAt.getTime() === doctor.updatedAt.getTime() ? 'created' : 'updated',
          title: doctor.name,
          description: `Doctor specializing in ${specializations}`,
          user: doctor.updatedBy || doctor.createdBy,
          timestamp: doctor.updatedAt,
          resource: 'doctors',
          icon: 'UserCheck'
        });
      });
    }
    
    // Recent Portfolios
    if (viewableResources.includes('portfolios')) {
      const recentPortfolios = await Portfolio.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentPortfolios.forEach(portfolio => {
        activities.push({
          id: portfolio._id,
          type: 'portfolio',
          action: portfolio.createdAt.getTime() === portfolio.updatedAt.getTime() ? 'created' : 'updated',
          title: portfolio.name,
          description: `Portfolio: ${portfolio.description}`,
          user: portfolio.updatedBy || portfolio.createdBy,
          timestamp: portfolio.updatedAt,
          resource: 'portfolios',
          icon: 'Briefcase'
        });
      });
    }
    
    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      activities: sortedActivities,
      total: activities.length
    });
    
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};