// server/controllers/dashboardController.js - Complete with PO System
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
import PurchaseOrder from '../models/PurchaseOrder.js';
import InvoiceReceiving from '../models/InvoiceReceiving.js';
import WorkflowStage from '../models/WorkflowStage.js';
import Branch from '../models/Branch.js';
import Warehouse from '../models/Warehouse.js';
import BranchContact from '../models/BranchContact.js';
import QualityControl from '../models/QualityControl.js';
import WarehouseApproval from '../models/WarehouseApproval.js';
import Inventory from '../models/Inventory.js';

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
    
    // ========== STATES STATISTICS ==========
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
    
    // ========== USERS STATISTICS ==========
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
    
    // ========== HOSPITALS STATISTICS ==========
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
          { $sort: { count: -1 } },
          { $limit: 5 }
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
        
        // Get doctors by portfolio
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
          { $sort: { count: -1 } },
          { $limit: 5 }
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
          { $sort: { count: -1 } },
          { $limit: 5 }
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
          { $sort: { totalUsage: -1 } },
          { $limit: 5 }
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
          { $sort: { count: -1 } },
          { $limit: 5 }
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
        
        // Get products with pricing info
        const pricingStats = await Product.aggregate([
          {
            $group: {
              _id: null,
              avgMRP: { $avg: '$mrp' },
              avgDealerPrice: { $avg: '$dealerPrice' },
              minMRP: { $min: '$mrp' },
              maxMRP: { $max: '$mrp' },
              productsWithDiscount: {
                $sum: {
                  $cond: [{ $gt: ['$defaultDiscount.value', 0] }, 1, 0]
                }
              }
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
            unitBreakdown: productsByUnit,
            avgMRP: pricingStats[0]?.avgMRP || 0,
            avgDealerPrice: pricingStats[0]?.avgDealerPrice || 0,
            priceRange: {
              min: pricingStats[0]?.minMRP || 0,
              max: pricingStats[0]?.maxMRP || 0
            },
            withDiscount: pricingStats[0]?.productsWithDiscount || 0
          },
          actions: resourcePermissions.products,
          route: '/products',
          description: 'Product catalog and inventory'
        });
      } catch (error) {
        console.error('Error fetching products stats:', error);
      }
    }
    
    // ========== PURCHASE ORDERS STATISTICS ==========
    if (resourcePermissions.purchase_orders && resourcePermissions.purchase_orders.includes('view')) {
      try {
        const totalPOs = await PurchaseOrder.countDocuments();
        
        // Status breakdown
        const statusBreakdown = await PurchaseOrder.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalValue: { $sum: '$grandTotal' }
            }
          }
        ]);
        
        // Convert to object for easy access
        const statusMap = {};
        let totalPOValue = 0;
        statusBreakdown.forEach(item => {
          statusMap[item._id] = {
            count: item.count,
            value: item.totalValue
          };
          totalPOValue += item.totalValue;
        });
        
        // Get current month POs
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const currentMonthPOs = await PurchaseOrder.countDocuments({
          createdAt: { $gte: currentMonth }
        });
        
        const currentMonthValue = await PurchaseOrder.aggregate([
          {
            $match: {
              createdAt: { $gte: currentMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalValue: { $sum: '$grandTotal' }
            }
          }
        ]);
        
        // Pending approvals count
        const pendingApprovals = await PurchaseOrder.countDocuments({
          status: { $in: ['pending_approval'] }
        });
        
        // Get POs by principal
        const posByPrincipal = await PurchaseOrder.aggregate([
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
              count: { $sum: 1 },
              totalValue: { $sum: '$grandTotal' }
            }
          },
          { $sort: { totalValue: -1 } },
          { $limit: 5 }
        ]);
        
        // Receiving statistics
        const receivingStats = await PurchaseOrder.aggregate([
          {
            $group: {
              _id: null,
              fullyReceived: {
                $sum: { $cond: ['$isFullyReceived', 1, 0] }
              },
              partiallyReceived: {
                $sum: { $cond: [{ $eq: ['$status', 'partial_received'] }, 1, 0] }
              },
              totalBacklog: { $sum: '$totalBacklogQty' }
            }
          }
        ]);
        
        // Average processing time (from creation to approval)
        const processingTimeStats = await PurchaseOrder.aggregate([
          {
            $match: {
              approvedDate: { $exists: true }
            }
          },
          {
            $project: {
              processingTime: {
                $subtract: ['$approvedDate', '$createdAt']
              }
            }
          },
          {
            $group: {
              _id: null,
              avgProcessingTime: { $avg: '$processingTime' }
            }
          }
        ]);
        
        const avgProcessingHours = processingTimeStats[0] 
          ? Math.round(processingTimeStats[0].avgProcessingTime / (1000 * 60 * 60))
          : 0;
        
        dashboardCards.push({
          id: 'purchaseOrders',
          title: 'Purchase Orders',
          resource: 'purchase_orders',
          icon: 'ShoppingCart',
          color: 'pink',
          stats: {
            total: totalPOs,
            draft: statusMap.draft?.count || 0,
            pending: statusMap.pending_approval?.count || 0,
            approved: statusMap.approved?.count || 0,
            ordered: statusMap.ordered?.count || 0,
            received: (statusMap.received?.count || 0) + (statusMap.partial_received?.count || 0),
            completed: statusMap.completed?.count || 0,
            cancelled: (statusMap.cancelled?.count || 0) + (statusMap.rejected?.count || 0),
            currentMonthPOs,
            currentMonthValue: currentMonthValue[0]?.totalValue || 0,
            totalValue: totalPOValue,
            pendingApprovals,
            fullyReceived: receivingStats[0]?.fullyReceived || 0,
            partiallyReceived: receivingStats[0]?.partiallyReceived || 0,
            totalBacklog: receivingStats[0]?.totalBacklog || 0,
            avgProcessingHours,
            topPrincipals: posByPrincipal
          },
          actions: resourcePermissions.purchase_orders,
          route: '/purchase-orders',
          description: 'Purchase order management'
        });
      } catch (error) {
        console.error('Error fetching purchase orders stats:', error);
      }
    }
    
    // ========== INVOICE RECEIVING STATISTICS ==========
    if (resourcePermissions.po_receiving && resourcePermissions.po_receiving.includes('receive')) {
      try {
        const totalInvoices = await InvoiceReceiving.countDocuments();
        
        // Status breakdown
        const statusBreakdown = await InvoiceReceiving.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);
        
        const statusMap = {};
        statusBreakdown.forEach(item => {
          statusMap[item._id] = item.count;
        });
        
        // QC Status breakdown
        const qcStatusBreakdown = await InvoiceReceiving.aggregate([
          {
            $group: {
              _id: '$qcStatus',
              count: { $sum: 1 }
            }
          }
        ]);
        
        const qcStatusMap = {};
        qcStatusBreakdown.forEach(item => {
          qcStatusMap[item._id] = item.count;
        });
        
        // Current month receivings
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const currentMonthReceivings = await InvoiceReceiving.countDocuments({
          createdAt: { $gte: currentMonth }
        });
        
        // Total invoice value
        const totalInvoiceValue = await InvoiceReceiving.aggregate([
          {
            $group: {
              _id: null,
              totalValue: { $sum: '$invoiceAmount' }
            }
          }
        ]);
        
        // Average QC turnaround time
        const qcTurnaround = await InvoiceReceiving.aggregate([
          {
            $match: {
              qcDate: { $exists: true }
            }
          },
          {
            $project: {
              turnaround: {
                $subtract: ['$qcDate', '$receivedDate']
              }
            }
          },
          {
            $group: {
              _id: null,
              avgTurnaround: { $avg: '$turnaround' }
            }
          }
        ]);
        
        const avgQCHours = qcTurnaround[0] 
          ? Math.round(qcTurnaround[0].avgTurnaround / (1000 * 60 * 60))
          : 0;
        
        // Damaged/Rejected products count
        const damageStats = await InvoiceReceiving.aggregate([
          { $unwind: '$products' },
          {
            $group: {
              _id: '$products.status',
              count: { $sum: 1 },
              quantity: { $sum: '$products.receivedQty' }
            }
          }
        ]);
        
        const damageMap = {};
        damageStats.forEach(item => {
          damageMap[item._id] = {
            count: item.count,
            quantity: item.quantity
          };
        });
        
        dashboardCards.push({
          id: 'invoiceReceiving',
          title: 'Invoice & Receiving',
          resource: 'po_receiving',
          icon: 'FileText',
          color: 'teal',
          stats: {
            total: totalInvoices,
            draft: statusMap.draft || 0,
            submitted: statusMap.submitted || 0,
            qcPending: statusMap.qc_pending || 0,
            completed: statusMap.completed || 0,
            rejected: statusMap.rejected || 0,
            currentMonthReceivings,
            totalInvoiceValue: totalInvoiceValue[0]?.totalValue || 0,
            qcPassed: qcStatusMap.passed || 0,
            qcFailed: qcStatusMap.failed || 0,
            qcPartialPass: qcStatusMap.partial_pass || 0,
            avgQCHours,
            damagedProducts: damageMap.damaged?.quantity || 0,
            rejectedProducts: damageMap.rejected?.quantity || 0
          },
          actions: resourcePermissions.po_receiving,
          route: '/invoice-receiving',
          description: 'Invoice and product receiving'
        });
      } catch (error) {
        console.error('Error fetching invoice receiving stats:', error);
      }
    }
    
    // ========== WORKFLOW STATISTICS ==========
    if (resourcePermissions.workflow && resourcePermissions.workflow.includes('view')) {
      try {
        const totalStages = await WorkflowStage.countDocuments();
        const activeStages = await WorkflowStage.countDocuments({ isActive: true });
        
        // Get POs by current stage
        const posByStage = await PurchaseOrder.aggregate([
          {
            $lookup: {
              from: 'workflowstages',
              localField: 'currentStage',
              foreignField: '_id',
              as: 'stageInfo'
            }
          },
          { $unwind: '$stageInfo' },
          {
            $group: {
              _id: '$stageInfo.name',
              code: { $first: '$stageInfo.code' },
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]);
        
        // Workflow bottlenecks (stages with most POs waiting)
        const bottlenecks = posByStage
          .filter(stage => ['PENDING_APPROVAL', 'APPROVED_L1', 'QC_PENDING'].includes(stage.code))
          .slice(0, 3);
        
        // Average time spent in each stage
        const stageTimeAnalysis = await PurchaseOrder.aggregate([
          { $unwind: '$workflowHistory' },
          {
            $group: {
              _id: '$workflowHistory.stage',
              avgTime: {
                $avg: {
                  $subtract: [
                    { $ifNull: ['$workflowHistory.actionDate', new Date()] },
                    '$workflowHistory.actionDate'
                  ]
                }
              },
              count: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'workflowstages',
              localField: '_id',
              foreignField: '_id',
              as: 'stageInfo'
            }
          },
          { $unwind: '$stageInfo' },
          {
            $project: {
              stageName: '$stageInfo.name',
              avgTimeHours: { $divide: ['$avgTime', 3600000] },
              count: 1
            }
          },
          { $sort: { avgTimeHours: -1 } },
          { $limit: 5 }
        ]);
        
        dashboardCards.push({
          id: 'workflow',
          title: 'Workflow Management',
          resource: 'workflow',
          icon: 'GitBranch',
          color: 'amber',
          stats: {
            totalStages,
            activeStages,
            inactiveStages: totalStages - activeStages,
            posByStage,
            bottlenecks,
            stageTimeAnalysis
          },
          actions: resourcePermissions.workflow,
          route: '/workflow',
          description: 'Workflow stages and transitions'
        });
      } catch (error) {
        console.error('Error fetching workflow stats:', error);
      }
    }
    
    // ========== BRANCHES STATISTICS ==========
    if (resourcePermissions.branches && resourcePermissions.branches.includes('view')) {
      try {
        const totalBranches = await Branch.countDocuments();
        const activeBranches = await Branch.countDocuments({ isActive: true });
        const inactiveBranches = totalBranches - activeBranches;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentBranches = await Branch.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Branches by state
        const branchesByState = await Branch.aggregate([
          {
            $lookup: {
              from: 'states',
              localField: 'state',
              foreignField: '_id',
              as: 'stateInfo'
            }
          },
          { $unwind: '$stateInfo' },
          {
            $group: {
              _id: '$stateInfo.name',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        
        // Branches with warehouses count
        const branchesWithWarehouses = await Branch.aggregate([
          {
            $lookup: {
              from: 'warehouses',
              localField: '_id',
              foreignField: 'branch',
              as: 'warehouses'
            }
          },
          {
            $project: {
              name: 1,
              branchCode: 1,
              warehouseCount: { $size: '$warehouses' }
            }
          },
          { $sort: { warehouseCount: -1 } },
          { $limit: 5 }
        ]);
        
        // Total contacts across all branches
        const totalBranchContacts = await BranchContact.countDocuments({ warehouse: null });
        
        dashboardCards.push({
          id: 'branches',
          title: 'Branches',
          resource: 'branches',
          icon: 'Building2',
          color: 'green',
          stats: {
            total: totalBranches,
            active: activeBranches,
            inactive: inactiveBranches,
            recent: recentBranches,
            branchesByState,
            branchesWithWarehouses,
            totalContacts: totalBranchContacts
          },
          actions: resourcePermissions.branches,
          route: '/branches',
          description: 'Branch locations and management'
        });
      } catch (error) {
        console.error('Error fetching branches stats:', error);
      }
    }
    
    // ========== WAREHOUSES STATISTICS ==========
    if (resourcePermissions.warehouses && resourcePermissions.warehouses.includes('view')) {
      try {
        const totalWarehouses = await Warehouse.countDocuments();
        const activeWarehouses = await Warehouse.countDocuments({ isActive: true });
        const inactiveWarehouses = totalWarehouses - activeWarehouses;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentWarehouses = await Warehouse.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Warehouses by status
        const warehousesByStatus = await Warehouse.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]);
        
        // Warehouses by branch
        const warehousesByBranch = await Warehouse.aggregate([
          {
            $lookup: {
              from: 'branches',
              localField: 'branch',
              foreignField: '_id',
              as: 'branchInfo'
            }
          },
          { $unwind: '$branchInfo' },
          {
            $group: {
              _id: '$branchInfo.name',
              branchCode: { $first: '$branchInfo.branchCode' },
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        
        // Warehouses by state
        const warehousesByState = await Warehouse.aggregate([
          {
            $lookup: {
              from: 'states',
              localField: 'state',
              foreignField: '_id',
              as: 'stateInfo'
            }
          },
          { $unwind: '$stateInfo' },
          {
            $group: {
              _id: '$stateInfo.name',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        
        // Total warehouse contacts
        const totalWarehouseContacts = await BranchContact.countDocuments({ warehouse: { $ne: null } });
        
        dashboardCards.push({
          id: 'warehouses',
          title: 'Warehouses',
          resource: 'warehouses',
          icon: 'Warehouse',
          color: 'purple',
          stats: {
            total: totalWarehouses,
            active: activeWarehouses,
            inactive: inactiveWarehouses,
            recent: recentWarehouses,
            warehousesByStatus,
            warehousesByBranch,
            warehousesByState,
            totalContacts: totalWarehouseContacts
          },
          actions: resourcePermissions.warehouses,
          route: '/warehouses',
          description: 'Warehouse facilities and inventory'
        });
      } catch (error) {
        console.error('Error fetching warehouses stats:', error);
      }
    }
    
    // ========== QUALITY CONTROL STATISTICS ==========
    if (resourcePermissions.qualityControl && resourcePermissions.qualityControl.includes('view')) {
      try {
        const totalQC = await QualityControl.countDocuments();
        const pendingQC = await QualityControl.countDocuments({ status: 'pending' });
        const approvedQC = await QualityControl.countDocuments({ status: 'approved' });
        const rejectedQC = await QualityControl.countDocuments({ status: 'rejected' });
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentQC = await QualityControl.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // QC by status breakdown
        const qcByStatus = await QualityControl.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]);
        
        // QC pass rate
        const totalProcessed = approvedQC + rejectedQC;
        const passRate = totalProcessed > 0 ? Math.round((approvedQC / totalProcessed) * 100) : 0;
        
        dashboardCards.push({
          id: 'qualityControl',
          title: 'Quality Control',
          resource: 'qualityControl',
          icon: 'CheckCircle',
          color: 'green',
          stats: {
            total: totalQC,
            pending: pendingQC,
            approved: approvedQC,
            rejected: rejectedQC,
            recent: recentQC,
            qcByStatus,
            passRate
          },
          actions: resourcePermissions.qualityControl,
          route: '/quality-control',
          description: 'Product quality control and testing'
        });
      } catch (error) {
        console.error('Error fetching quality control stats:', error);
      }
    }
    
    // ========== WAREHOUSE APPROVAL STATISTICS ==========
    if (resourcePermissions.warehouseApproval && resourcePermissions.warehouseApproval.includes('view')) {
      try {
        const totalWA = await WarehouseApproval.countDocuments();
        const pendingWA = await WarehouseApproval.countDocuments({ status: 'pending' });
        const approvedWA = await WarehouseApproval.countDocuments({ status: 'approved' });
        const rejectedWA = await WarehouseApproval.countDocuments({ status: 'rejected' });
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentWA = await WarehouseApproval.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Warehouse approval by status
        const waByStatus = await WarehouseApproval.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]);
        
        // Approval rate
        const totalProcessedWA = approvedWA + rejectedWA;
        const approvalRate = totalProcessedWA > 0 ? Math.round((approvedWA / totalProcessedWA) * 100) : 0;
        
        dashboardCards.push({
          id: 'warehouseApproval',
          title: 'Warehouse Approval',
          resource: 'warehouseApproval',
          icon: 'ClipboardCheck',
          color: 'orange',
          stats: {
            total: totalWA,
            pending: pendingWA,
            approved: approvedWA,
            rejected: rejectedWA,
            recent: recentWA,
            waByStatus,
            approvalRate
          },
          actions: resourcePermissions.warehouseApproval,
          route: '/warehouse-approval',
          description: 'Warehouse storage and approval management'
        });
      } catch (error) {
        console.error('Error fetching warehouse approval stats:', error);
      }
    }
    
    // ========== INVENTORY STATISTICS ==========
    if (resourcePermissions.inventory && resourcePermissions.inventory.includes('view')) {
      try {
        const totalInventory = await Inventory.countDocuments({ isActive: true });
        const lowStockItems = await Inventory.countDocuments({
          isActive: true,
          $expr: { $lte: ['$availableStock', '$minimumStock'] }
        });
        const outOfStockItems = await Inventory.countDocuments({
          isActive: true,
          availableStock: 0
        });
        
        // Near expiry items (next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const nearExpiryItems = await Inventory.countDocuments({
          isActive: true,
          expDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
        });
        
        // Total inventory value
        const inventoryValue = await Inventory.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              totalValue: { $sum: '$totalValue' },
              totalStock: { $sum: '$currentStock' }
            }
          }
        ]);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentInventory = await Inventory.countDocuments({
          isActive: true,
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        dashboardCards.push({
          id: 'inventory',
          title: 'Inventory',
          resource: 'inventory',
          icon: 'Archive',
          color: 'indigo',
          stats: {
            total: totalInventory,
            lowStock: lowStockItems,
            outOfStock: outOfStockItems,
            nearExpiry: nearExpiryItems,
            recent: recentInventory,
            totalValue: inventoryValue[0]?.totalValue || 0,
            totalStock: inventoryValue[0]?.totalStock || 0
          },
          actions: resourcePermissions.inventory,
          route: '/inventory',
          description: 'Stock levels and inventory management'
        });
      } catch (error) {
        console.error('Error fetching inventory stats:', error);
      }
    }
    
    // ========== PERMISSIONS STATISTICS ==========
    if (resourcePermissions.permissions && resourcePermissions.permissions.includes('view')) {
      try {
        const totalPermissions = await Permission.countDocuments();
        const activePermissions = await Permission.countDocuments({ isActive: { $ne: false } });
        const inactivePermissions = totalPermissions - activePermissions;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPermissions = await Permission.countDocuments({
          createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get permissions by resource
        const permissionsByResource = await Permission.aggregate([
          {
            $group: {
              _id: '$resource',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);
        
        // Get permissions by action
        const permissionsByAction = await Permission.aggregate([
          {
            $group: {
              _id: '$action',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]);
        
        // Get total unique resources
        const totalResources = await Permission.distinct('resource').then(resources => resources.length);
        
        // Get user permissions count
        const totalUserPermissions = await UserPermission.countDocuments();
        const usersWithPermissions = await UserPermission.distinct('user').then(users => users.length);
        
        // Get most assigned permissions
        const mostAssignedPermissions = await UserPermission.aggregate([
          {
            $group: {
              _id: '$permission',
              assignedCount: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'permissions',
              localField: '_id',
              foreignField: '_id',
              as: 'permissionInfo'
            }
          },
          { $unwind: '$permissionInfo' },
          {
            $project: {
              name: '$permissionInfo.name',
              resource: '$permissionInfo.resource',
              action: '$permissionInfo.action',
              assignedCount: 1
            }
          },
          { $sort: { assignedCount: -1 } },
          { $limit: 5 }
        ]);
        
        dashboardCards.push({
          id: 'permissions',
          title: 'Permissions',
          resource: 'permissions',
          icon: 'Shield',
          color: 'orange',
          stats: {
            total: totalPermissions,
            active: activePermissions,
            inactive: inactivePermissions,
            recent: recentPermissions,
            totalResources,
            totalUserPermissions,
            usersWithPermissions,
            resourceBreakdown: permissionsByResource,
            actionBreakdown: permissionsByAction,
            mostAssigned: mostAssignedPermissions
          },
          actions: resourcePermissions.permissions,
          route: '/permissions',
          description: 'System permissions and access control'
        });
      } catch (error) {
        console.error('Error fetching permissions stats:', error);
      }
    }
    
    // ========== SYSTEM OVERVIEW ==========
    const systemStats = {
      totalPermissions: await Permission.countDocuments(),
      totalResources: await Permission.distinct('resource').then(resources => resources.length),
      userPermissionsCount: permissions.length,
      accessibleResources: Object.keys(resourcePermissions).length,
      
      // Overall business metrics
      businessMetrics: {
        totalBusinessValue: 0,
        pendingApprovals: 0,
        criticalAlerts: 0,
        complianceScore: 0
      }
    };
    
    // Calculate overall business metrics
    try {
      // Total business value (sum of all PO values)
      const businessValue = await PurchaseOrder.aggregate([
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$grandTotal' }
          }
        }
      ]);
      systemStats.businessMetrics.totalBusinessValue = businessValue[0]?.totalValue || 0;
      
      // Total pending approvals across system
      systemStats.businessMetrics.pendingApprovals = await PurchaseOrder.countDocuments({
        status: { $in: ['pending_approval', 'qc_pending'] }
      });
      
      // Critical alerts (expired documents + QC failures + backlogs)
      const expiredDocs = await Principal.aggregate([
        { $unwind: '$documents' },
        {
          $match: {
            'documents.hasValidity': true,
            'documents.endDate': { $lt: new Date() }
          }
        },
        { $count: 'total' }
      ]);
      
      const qcFailures = await InvoiceReceiving.countDocuments({ qcStatus: 'failed' });
      const criticalBacklogs = await PurchaseOrder.countDocuments({
        totalBacklogQty: { $gt: 0 },
        status: { $ne: 'completed' }
      });
      
      systemStats.businessMetrics.criticalAlerts = 
        (expiredDocs[0]?.total || 0) + qcFailures + criticalBacklogs;
      
      // Compliance score (percentage of documents valid and QC passed)
      const totalDocsWithValidity = await Principal.aggregate([
        { $unwind: '$documents' },
        { $match: { 'documents.hasValidity': true } },
        { $count: 'total' }
      ]);
      
      const validDocs = await Principal.aggregate([
        { $unwind: '$documents' },
        {
          $match: {
            'documents.hasValidity': true,
            'documents.endDate': { $gte: new Date() }
          }
        },
        { $count: 'total' }
      ]);
      
      const totalQC = await InvoiceReceiving.countDocuments({
        qcStatus: { $exists: true, $ne: 'pending' }
      });
      
      const passedQC = await InvoiceReceiving.countDocuments({
        qcStatus: { $in: ['passed', 'partial_pass'] }
      });
      
      const docCompliance = totalDocsWithValidity[0]?.total > 0
        ? (validDocs[0]?.total || 0) / totalDocsWithValidity[0].total * 100
        : 100;
      
      const qcCompliance = totalQC > 0 ? (passedQC / totalQC) * 100 : 100;
      
      systemStats.businessMetrics.complianceScore = Math.round((docCompliance + qcCompliance) / 2);
      
    } catch (error) {
      console.error('Error calculating business metrics:', error);
    }
    
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
    
    // Recent Doctors
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
    
    // Recent Portfolios
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
    
    // Recent Principals
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
    
    // Recent Categories
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
    
    // Recent Products
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
    
    // ========== PURCHASE ORDER ACTIVITIES ==========
    if (viewableResources.includes('purchase_orders')) {
      const recentPOs = await PurchaseOrder.find()
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .populate('principal', 'name')
        .populate('currentStage', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentPOs.forEach(po => {
        activities.push({
          id: po._id,
          type: 'purchase_order',
          action: po.createdAt.getTime() === po.updatedAt.getTime() ? 'created' : 'updated',
          title: po.poNumber,
          description: `PO ${po.poNumber} - ${po.principal?.name || 'Unknown'} (${po.currentStage?.name || po.status})`,
          user: po.updatedBy || po.createdBy,
          timestamp: po.updatedAt,
          resource: 'purchase_orders',
          icon: 'ShoppingCart',
          metadata: {
            status: po.status,
            value: po.grandTotal,
            stage: po.currentStage?.name
          }
        });
      });
    }
    
    // ========== INVOICE RECEIVING ACTIVITIES ==========
    if (viewableResources.includes('po_receiving')) {
      const recentReceivings = await InvoiceReceiving.find()
        .populate('createdBy', 'name')
        .populate('receivedBy', 'name')
        .populate('purchaseOrder', 'poNumber')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      
      recentReceivings.forEach(receiving => {
        activities.push({
          id: receiving._id,
          type: 'invoice_receiving',
          action: receiving.status === 'completed' ? 'completed' : 'received',
          title: receiving.invoiceNumber,
          description: `Invoice ${receiving.invoiceNumber} for PO ${receiving.purchaseOrder?.poNumber || 'Unknown'}`,
          user: receiving.receivedBy || receiving.createdBy,
          timestamp: receiving.updatedAt,
          resource: 'invoice_receiving',
          icon: 'FileText',
          metadata: {
            status: receiving.status,
            qcStatus: receiving.qcStatus,
            invoiceAmount: receiving.invoiceAmount
          }
        });
      });
    }
    
    // ========== WORKFLOW ACTIVITIES ==========
    if (viewableResources.includes('purchase_orders')) {
      // Get recent workflow transitions
      const recentWorkflows = await PurchaseOrder.aggregate([
        { $unwind: '$workflowHistory' },
        { $sort: { 'workflowHistory.actionDate': -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: 'workflowHistory.actionBy',
            foreignField: '_id',
            as: 'actionUser'
          }
        },
        { $unwind: '$actionUser' },
        {
          $lookup: {
            from: 'workflowstages',
            localField: 'workflowHistory.stage',
            foreignField: '_id',
            as: 'stage'
          }
        },
        { $unwind: '$stage' },
        {
          $project: {
            poNumber: 1,
            action: '$workflowHistory.action',
            stage: '$stage.name',
            user: '$actionUser',
            timestamp: '$workflowHistory.actionDate',
            remarks: '$workflowHistory.remarks'
          }
        }
      ]);
      
      recentWorkflows.forEach(workflow => {
        activities.push({
          id: workflow._id,
          type: 'workflow',
          action: workflow.action,
          title: `${workflow.poNumber} - ${workflow.action}`,
          description: workflow.remarks || `PO ${workflow.action} at ${workflow.stage}`,
          user: workflow.user,
          timestamp: workflow.timestamp,
          resource: 'workflow',
          icon: 'GitBranch'
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

// New endpoint for PO-specific dashboard metrics
export const getPODashboardMetrics = async (req, res) => {
  try {
    const { dateRange = '30d', principalId, portfolioId } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'ytd':
        startDate = new Date(new Date().getFullYear(), 0, 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    let matchQuery = {
      createdAt: { $gte: startDate }
    };
    
    if (principalId) matchQuery.principal = principalId;
    
    // Purchase Order Trends
    const poTrends = await PurchaseOrder.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Top Products Ordered
    const topProducts = await PurchaseOrder.aggregate([
      { $match: matchQuery },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product',
          totalQuantity: { $sum: '$products.quantity' },
          totalValue: { $sum: '$products.totalCost' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $project: {
          productName: '$productInfo.name',
          productCode: '$productInfo.code',
          totalQuantity: 1,
          totalValue: 1,
          orderCount: 1
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 }
    ]);
    
    // Supplier Performance
    const supplierPerformance = await PurchaseOrder.aggregate([
      { $match: { ...matchQuery, status: { $in: ['received', 'completed'] } } },
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
          _id: '$principal',
          principalName: { $first: '$principalInfo.name' },
          totalOrders: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' },
          fullyReceived: {
            $sum: { $cond: ['$isFullyReceived', 1, 0] }
          },
          avgDeliveryTime: {
            $avg: {
              $subtract: [
                { $ifNull: ['$receivedDate', new Date()] },
                '$orderedDate'
              ]
            }
          }
        }
      },
      {
        $project: {
          principalName: 1,
          totalOrders: 1,
          totalValue: 1,
          fulfillmentRate: {
            $multiply: [
              { $divide: ['$fullyReceived', '$totalOrders'] },
              100
            ]
          },
          avgDeliveryDays: {
            $divide: ['$avgDeliveryTime', 86400000]
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);
    
    res.json({
      dateRange,
      poTrends,
      topProducts,
      supplierPerformance
    });
    
  } catch (error) {
    console.error('PO dashboard metrics error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch PO dashboard metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getDashboardStats,
  getRecentActivity,
  getPODashboardMetrics
};