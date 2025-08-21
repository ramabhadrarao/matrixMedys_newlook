// server/controllers/dashboardController.js -  Enhanced with Principals
import State from '../models/State.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import HospitalContact from '../models/HospitalContact.js';
import Doctor from '../models/Doctor.js';
import Portfolio from '../models/Portfolio.js';
import Principal from '../models/Principal.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
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
    
    // ========== DOCTORS STATISTICS ==========
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
        
        // Get doctors by portfolio (updated from specialization)
        const doctorsByPortfolio = await Doctor.aggregate([
          { $unwind: '$portfolio' },
          {
            $lookup: {
              from: 'portfolios',
              localField: 'portfolio',
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
              totalTargets: { $sum: '$targets.target' },
              doctorsWithTargets: { $addToSet: '$_id' }
            }
          }
        ]);
        
        const currentYearTargets = totalTargets[0]?.totalTargets || 0;
        const doctorsWithTargetsCount = totalTargets[0]?.doctorsWithTargets?.length || 0;
        
        // Get doctors by hospital distribution
        const doctorsByHospital = await Doctor.aggregate([
          { $unwind: '$hospitals' },
          {
            $lookup: {
              from: 'hospitals',
              localField: 'hospitals',
              foreignField: '_id',
              as: 'hospitalInfo'
            }
          },
          { $unwind: '$hospitalInfo' },
          {
            $group: {
              _id: '$hospitalInfo.name',
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
            doctorsWithTargets: doctorsWithTargetsCount,
            averageTargetPerDoctor: doctorsWithTargetsCount > 0 ? Math.round(currentYearTargets / doctorsWithTargetsCount) : 0,
            topPortfolios: doctorsByPortfolio,
            topHospitals: doctorsByHospital
          },
          actions: resourcePermissions.doctors,
          route: '/doctors',
          description: 'Medical professionals and specialists'
        });
      } catch (error) {
        console.error('Error fetching doctors stats:', error);
      }
    }
    
    // ========== PORTFOLIOS STATISTICS ==========
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
        
        // Get portfolios usage by doctors and principals
        const doctorUsage = await Doctor.aggregate([
          { $unwind: '$portfolio' },
          {
            $group: {
              _id: '$portfolio',
              doctorCount: { $sum: 1 }
            }
          }
        ]);
        
        const principalUsage = await Principal.aggregate([
          { $unwind: '$portfolio' },
          {
            $group: {
              _id: '$portfolio',
              principalCount: { $sum: 1 }
            }
          }
        ]);
        
        // Merge usage data
        const usageMap = new Map();
        doctorUsage.forEach(item => {
          usageMap.set(item._id.toString(), { doctors: item.doctorCount, principals: 0 });
        });
        principalUsage.forEach(item => {
          const key = item._id.toString();
          if (usageMap.has(key)) {
            usageMap.get(key).principals = item.principalCount;
          } else {
            usageMap.set(key, { doctors: 0, principals: item.principalCount });
          }
        });
        
        const usedPortfolios = usageMap.size;
        const unusedPortfolios = totalPortfolios - usedPortfolios;
        
        // Get most used portfolios
        const mostUsedPortfolios = await Portfolio.aggregate([
          {
            $lookup: {
              from: 'doctors',
              localField: '_id',
              foreignField: 'portfolio',
              as: 'doctors'
            }
          },
          {
            $lookup: {
              from: 'principals',
              localField: '_id',
              foreignField: 'portfolio',
              as: 'principals'
            }
          },
          {
            $project: {
              name: 1,
              doctorCount: { $size: '$doctors' },
              principalCount: { $size: '$principals' },
              totalUsage: { $add: [{ $size: '$doctors' }, { $size: '$principals' }] }
            }
          },
          {
            $sort: { totalUsage: -1 }
          },
          {
            $limit: 5
          }
        ]);
        
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
            used: usedPortfolios,
            unused: unusedPortfolios,
            utilizationRate: totalPortfolios > 0 ? Math.round((usedPortfolios / totalPortfolios) * 100) : 0,
            mostUsedPortfolios: mostUsedPortfolios
          },
          actions: resourcePermissions.portfolios,
          route: '/portfolios',
          description: 'Medical specializations and portfolios'
        });
      } catch (error) {
        console.error('Error fetching portfolios stats:', error);
      }
    }
    
    // ========== PRINCIPALS STATISTICS ==========
    if (resourcePermissions.principals && resourcePermissions.principals.includes('view')) {
      try {
        const totalPrincipals = await Principal.countDocuments();
        const activePrincipals = await Principal.countDocuments({ isActive: true });
        const inactivePrincipals = totalPrincipals - activePrincipals;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPrincipals = await Principal.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get document statistics
        const documentStats = await Principal.aggregate([
          {
            $project: {
              documentsCount: { $size: '$documents' },
              contactsCount: { $size: '$contactPersons' },
              addressesCount: { $size: '$addresses' },
              expiredDocs: {
                $size: {
                  $filter: {
                    input: '$documents',
                    cond: {
                      $and: [
                        { $eq: ['$$this.hasValidity', true] },
                        { $lt: ['$$this.endDate', new Date()] }
                      ]
                    }
                  }
                }
              },
              expiringDocs: {
                $size: {
                  $filter: {
                    input: '$documents',
                    cond: {
                      $and: [
                        { $eq: ['$$this.hasValidity', true] },
                        { $gt: ['$$this.endDate', new Date()] },
                        { $lte: ['$$this.endDate', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] }
                      ]
                    }
                  }
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              totalDocuments: { $sum: '$documentsCount' },
              totalContacts: { $sum: '$contactsCount' },
              totalAddresses: { $sum: '$addressesCount' },
              expiredDocuments: { $sum: '$expiredDocs' },
              expiringDocuments: { $sum: '$expiringDocs' }
            }
          }
        ]);
        
        const stats = documentStats[0] || {
          totalDocuments: 0,
          totalContacts: 0,
          totalAddresses: 0,
          expiredDocuments: 0,
          expiringDocuments: 0
        };
        
        // Get principals by portfolio
        const principalsByPortfolio = await Principal.aggregate([
          { $unwind: '$portfolio' },
          {
            $lookup: {
              from: 'portfolios',
              localField: 'portfolio',
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
        
        dashboardCards.push({
          id: 'principals',
          title: 'Principals',
          resource: 'principals',
          icon: 'Building',
          color: 'indigo',
          stats: {
            total: totalPrincipals,
            active: activePrincipals,
            inactive: inactivePrincipals,
            recent: recentPrincipals,
            totalDocuments: stats.totalDocuments,
            totalContacts: stats.totalContacts,
            totalAddresses: stats.totalAddresses,
            expiredDocuments: stats.expiredDocuments,
            expiringDocuments: stats.expiringDocuments,
            topPortfolios: principalsByPortfolio
          },
          actions: resourcePermissions.principals,
          route: '/principals',
          description: 'Principal companies and distributors'
        });
      } catch (error) {
        console.error('Error fetching principals stats:', error);
      }
    }
     // ========== CATEGORIES STATISTICS ==========
    if (resourcePermissions.categories && resourcePermissions.categories.includes('view')) {
      try {
        const totalCategories = await Category.countDocuments();
        const activeCategories = await Category.countDocuments({ isActive: true });
        const inactiveCategories = totalCategories - activeCategories;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCategories = await Category.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get categories with products
        const categoriesWithProducts = await Category.countDocuments({ productsCount: { $gt: 0 } });
        const rootCategories = await Category.countDocuments({ parent: null });
        
        // Get categories by principal
        const categoriesByPrincipal = await Category.aggregate([
          {
            $lookup: {
              from: 'principals',
              localField: 'principal',
              foreignField: '_id',
              as: 'principalInfo'
            }
          },
          { $unwind: '$principalInfo' },
          {
            $group: {
              _id: '$principalInfo.name',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        
        // Get categories by portfolio
        const categoriesByPortfolio = await Category.aggregate([
          {
            $lookup: {
              from: 'portfolios',
              localField: 'portfolio',
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
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        
        // Calculate total products in all categories
        const totalProductsInCategories = await Category.aggregate([
          {
            $group: {
              _id: null,
              totalProducts: { $sum: '$productsCount' }
            }
          }
        ]);
        
        dashboardCards.push({
          id: 'categories',
          title: 'Categories',
          resource: 'categories',
          icon: 'FolderTree',
          color: 'cyan',
          stats: {
            total: totalCategories,
            active: activeCategories,
            inactive: inactiveCategories,
            recent: recentCategories,
            withProducts: categoriesWithProducts,
            rootCategories,
            totalProducts: totalProductsInCategories[0]?.totalProducts || 0,
            topPrincipals: categoriesByPrincipal,
            topPortfolios: categoriesByPortfolio
          },
          actions: resourcePermissions.categories,
          route: '/categories',
          description: 'Product categories and hierarchy'
        });
      } catch (error) {
        console.error('Error fetching categories stats:', error);
      }
    }
    
    // ========== PRODUCTS STATISTICS ==========
    if (resourcePermissions.products && resourcePermissions.products.includes('view')) {
      try {
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ isActive: true });
        const inactiveProducts = totalProducts - activeProducts;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentProducts = await Product.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get products with documents
        const productsWithDocuments = await Product.countDocuments({ 
          'documents.0': { $exists: true } 
        });
        
        // Get products by GST percentage
        const productsByGST = await Product.aggregate([
          {
            $group: {
              _id: '$gstPercentage',
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        
        // Get products by category
        const productsByCategory = await Product.aggregate([
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'categoryInfo'
            }
          },
          { $unwind: '$categoryInfo' },
          {
            $group: {
              _id: '$categoryInfo.name',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        
        // Get products by unit
        const productsByUnit = await Product.aggregate([
          {
            $group: {
              _id: '$unit',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]);
        
        // Get total documents across all products
        const totalDocuments = await Product.aggregate([
          {
            $project: {
              documentsCount: { $size: '$documents' }
            }
          },
          {
            $group: {
              _id: null,
              totalDocuments: { $sum: '$documentsCount' }
            }
          }
        ]);
        
        dashboardCards.push({
          id: 'products',
          title: 'Products',
          resource: 'products',
          icon: 'Package',
          color: 'violet',
          stats: {
            total: totalProducts,
            active: activeProducts,
            inactive: inactiveProducts,
            recent: recentProducts,
            withDocuments: productsWithDocuments,
            totalDocuments: totalDocuments[0]?.totalDocuments || 0,
            gstBreakdown: productsByGST,
            topCategories: productsByCategory,
            unitBreakdown: productsByUnit
          },
          actions: resourcePermissions.products,
          route: '/products',
          description: 'Product catalog and inventory'
        });
      } catch (error) {
        console.error('Error fetching products stats:', error);
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
        .limit(3)
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
        .limit(3)
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
        .limit(3)
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
    
    // ========== RECENT DOCTORS ==========
    if (viewableResources.includes('doctors')) {
      const recentDoctors = await Doctor.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('portfolio', 'name')
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();
      
      recentDoctors.forEach(doctor => {
        const portfolios = doctor.portfolio?.map(p => p.name).join(', ') || 'General';
        activities.push({
          id: doctor._id,
          type: 'doctor',
          action: doctor.createdAt.getTime() === doctor.updatedAt.getTime() ? 'created' : 'updated',
          title: doctor.name,
          description: `Dr. ${doctor.name} - ${portfolios}`,
          user: doctor.updatedBy || doctor.createdBy,
          timestamp: doctor.updatedAt,
          resource: 'doctors',
          icon: 'UserCheck'
        });
      });
    }
    
    // ========== RECENT PORTFOLIOS ==========
    if (viewableResources.includes('portfolios')) {
      const recentPortfolios = await Portfolio.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ updatedAt: -1 })
        .limit(3)
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
    
    // ========== RECENT PRINCIPALS ==========
    if (viewableResources.includes('principals')) {
      const recentPrincipals = await Principal.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('portfolio', 'name')
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();
      
      recentPrincipals.forEach(principal => {
        const portfolios = principal.portfolio?.map(p => p.name).join(', ') || 'None';
        activities.push({
          id: principal._id,
          type: 'principal',
          action: principal.createdAt.getTime() === principal.updatedAt.getTime() ? 'created' : 'updated',
          title: principal.name,
          description: `Principal - ${portfolios} (GST: ${principal.gstNumber})`,
          user: principal.updatedBy || principal.createdBy,
          timestamp: principal.updatedAt,
          resource: 'principals',
          icon: 'Building'
        });
      });
    }
    // ========== RECENT CATEGORIES ==========
    if (viewableResources.includes('categories')) {
      const recentCategories = await Category.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('principal', 'name')
        .populate('portfolio', 'name')
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();
      
      recentCategories.forEach(category => {
        activities.push({
          id: category._id,
          type: 'category',
          action: category.createdAt.getTime() === category.updatedAt.getTime() ? 'created' : 'updated',
          title: category.name,
          description: `Category in ${category.principal?.name || 'Unknown'} - ${category.portfolio?.name || 'Unknown'}`,
          user: category.updatedBy || category.createdBy,
          timestamp: category.updatedAt,
          resource: 'categories',
          icon: 'FolderTree'
        });
      });
    }
    
    // ========== RECENT PRODUCTS ==========
    if (viewableResources.includes('products')) {
      const recentProducts = await Product.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('category', 'name')
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();
      
      recentProducts.forEach(product => {
        activities.push({
          id: product._id,
          type: 'product',
          action: product.createdAt.getTime() === product.updatedAt.getTime() ? 'created' : 'updated',
          title: `${product.name} (${product.code})`,
          description: `Product in ${product.category?.name || 'Unknown Category'}`,
          user: product.updatedBy || product.createdBy,
          timestamp: product.updatedAt,
          resource: 'products',
          icon: 'Package'
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