// tests/performance/dashboardQueries.test.js
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from '@jest/globals';
import mongoose from 'mongoose';
import QualityControl from '../../models/QualityControl.js';
import WarehouseApproval from '../../models/WarehouseApproval.js';
import Inventory from '../../models/Inventory.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Warehouse from '../../models/Warehouse.js';
import Notification from '../../models/Notification.js';
import AuditLog from '../../models/AuditLog.js';
import { qcTestDataSeeder } from '../seeders/qcTestData.js';
import { warehouseApprovalTestDataSeeder } from '../seeders/warehouseApprovalTestData.js';

/**
 * Performance Tests for Dashboard Queries
 * Tests dashboard performance under realistic load scenarios including:
 * - QC dashboard statistics and charts
 * - Warehouse approval dashboard metrics
 * - Inventory dashboard analytics
 * - Real-time notifications and alerts
 * - User workload and assignment dashboards
 * - Executive summary dashboards
 * - Performance monitoring and optimization
 */

describe('Dashboard Queries Performance Tests', () => {
  let testData = {};
  let performanceMetrics = {};

  beforeAll(async () => {
    // Seed comprehensive test data for dashboard testing
    console.log('Seeding dashboard performance test data...');
    const qcData = await qcTestDataSeeder.seedAll();
    const warehouseData = await warehouseApprovalTestDataSeeder.seedAll();
    
    testData = {
      ...qcData,
      ...warehouseData
    };

    // Create additional test notifications and audit logs
    await createTestNotifications();
    await createTestAuditLogs();

    performanceMetrics = {
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      queryTimes: []
    };
  });

  afterAll(async () => {
    // Cleanup test data
    await qcTestDataSeeder.cleanup();
    await warehouseApprovalTestDataSeeder.cleanup();
    await Notification.deleteMany({ type: { $regex: /^test_/ } });
    await AuditLog.deleteMany({ action: { $regex: /^test_/ } });
    
    // Log performance summary
    console.log('Dashboard Performance Test Summary:', {
      totalDuration: Date.now() - performanceMetrics.startTime,
      averageQueryTime: performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / performanceMetrics.queryTimes.length,
      slowestQuery: Math.max(...performanceMetrics.queryTimes),
      fastestQuery: Math.min(...performanceMetrics.queryTimes)
    });
  });

  beforeEach(() => {
    performanceMetrics.queryStartTime = Date.now();
  });

  afterEach(() => {
    const queryDuration = Date.now() - performanceMetrics.queryStartTime;
    performanceMetrics.queryTimes.push(queryDuration);
  });

  /**
   * Helper function to create test notifications
   */
  const createTestNotifications = async () => {
    const notifications = [];
    const users = testData.users;
    const qcRecords = testData.qcRecords;
    const warehouseApprovals = testData.warehouseApprovals;

    for (let i = 0; i < 100; i++) {
      notifications.push({
        recipient: users[i % users.length]._id,
        sender: users[(i + 1) % users.length]._id,
        type: ['test_qc_assignment', 'test_warehouse_approval', 'test_inventory_alert', 'test_system_notification'][i % 4],
        title: `Test Notification ${i + 1}`,
        message: `This is a test notification for performance testing - ${i + 1}`,
        priority: ['low', 'medium', 'high', 'urgent'][i % 4],
        read: i % 3 === 0,
        relatedModel: i % 2 === 0 ? 'QualityControl' : 'WarehouseApproval',
        relatedId: i % 2 === 0 ? qcRecords[i % qcRecords.length]._id : warehouseApprovals[i % warehouseApprovals.length]._id,
        channels: ['email', 'in_app'],
        metadata: {
          category: 'performance_test',
          testIndex: i
        }
      });
    }

    await Notification.insertMany(notifications);
  };

  /**
   * Helper function to create test audit logs
   */
  const createTestAuditLogs = async () => {
    const auditLogs = [];
    const users = testData.users;
    const actions = ['test_create', 'test_update', 'test_delete', 'test_approve', 'test_reject'];
    const resources = ['test_qc', 'test_warehouse_approval', 'test_inventory', 'test_user'];

    for (let i = 0; i < 200; i++) {
      auditLogs.push({
        user: users[i % users.length]._id,
        action: actions[i % actions.length],
        resource: resources[i % resources.length],
        resourceId: new mongoose.Types.ObjectId(),
        details: `Test audit log entry ${i + 1} for performance testing`,
        ipAddress: `192.168.1.${(i % 254) + 1}`,
        userAgent: 'Performance Test Agent',
        severity: ['info', 'warning', 'error'][i % 3],
        metadata: {
          testIndex: i,
          category: 'performance_test'
        }
      });
    }

    await AuditLog.insertMany(auditLogs);
  };

  /**
   * Helper function to measure dashboard query performance
   */
  const measureDashboardQuery = async (queryName, queryFunction, maxTime = 2000) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    const result = await queryFunction();
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;
    
    const metrics = {
      queryName,
      duration,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      resultSize: JSON.stringify(result).length
    };
    
    console.log(`Dashboard Query "${queryName}" completed in ${duration}ms`, metrics);
    expect(duration).toBeLessThan(maxTime);
    
    return { result, metrics };
  };

  describe('QC Dashboard Performance', () => {
    it('should load QC overview statistics quickly', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'QC Overview Statistics',
        async () => {
          return await QualityControl.aggregate([
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                inProgressCount: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                submittedCount: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
                highPriorityCount: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
                overdueCount: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $lt: ['$dueDate', new Date()] },
                        { $in: ['$status', ['pending', 'in_progress']] }
                      ]},
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]);
        },
        1500
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('totalRecords');
      expect(result[0]).toHaveProperty('pendingCount');
      expect(result[0]).toHaveProperty('approvedCount');
    });

    it('should generate QC status distribution chart data efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'QC Status Distribution',
        async () => {
          return await QualityControl.aggregate([
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgProcessingTime: {
                  $avg: {
                    $cond: [
                      { $ne: ['$approvedAt', null] },
                      { $subtract: ['$approvedAt', '$createdAt'] },
                      null
                    ]
                  }
                }
              }
            },
            {
              $project: {
                status: '$_id',
                count: 1,
                avgProcessingTimeHours: { $divide: ['$avgProcessingTime', 1000 * 60 * 60] }
              }
            },
            {
              $sort: { count: -1 }
            }
          ]);
        },
        1000
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('count');
    });

    it('should load QC workload by assignee efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'QC Workload by Assignee',
        async () => {
          return await QualityControl.aggregate([
            {
              $match: {
                status: { $in: ['pending', 'in_progress'] }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'assignedTo',
                foreignField: '_id',
                as: 'assignee'
              }
            },
            {
              $unwind: '$assignee'
            },
            {
              $group: {
                _id: '$assignedTo',
                assigneeName: { $first: '$assignee.name' },
                assigneeEmail: { $first: '$assignee.email' },
                totalAssigned: { $sum: 1 },
                urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
                highPriorityCount: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
                overdueCount: {
                  $sum: {
                    $cond: [{ $lt: ['$dueDate', new Date()] }, 1, 0]
                  }
                },
                avgDaysToComplete: {
                  $avg: {
                    $divide: [
                      { $subtract: [new Date(), '$createdAt'] },
                      1000 * 60 * 60 * 24
                    ]
                  }
                }
              }
            },
            {
              $sort: { totalAssigned: -1 }
            },
            {
              $limit: 20
            }
          ]);
        },
        1500
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item.assigneeName)).toBe(true);
    });

    it('should generate QC trend analysis quickly', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'QC Trend Analysis',
        async () => {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          
          return await QualityControl.aggregate([
            {
              $match: {
                createdAt: { $gte: thirtyDaysAgo }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
                totalCreated: { $sum: 1 },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                avgPriority: {
                  $avg: {
                    $switch: {
                      branches: [
                        { case: { $eq: ['$priority', 'low'] }, then: 1 },
                        { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                        { case: { $eq: ['$priority', 'high'] }, then: 3 },
                        { case: { $eq: ['$priority', 'urgent'] }, then: 4 }
                      ],
                      default: 0
                    }
                  }
                }
              }
            },
            {
              $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
          ]);
        },
        2000
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item.date)).toBe(true);
    });
  });

  describe('Warehouse Approval Dashboard Performance', () => {
    it('should load warehouse approval overview quickly', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Warehouse Approval Overview',
        async () => {
          return await WarehouseApproval.aggregate([
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                inProgressCount: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                submittedCount: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                inventoryCreatedCount: { $sum: { $cond: ['$inventoryCreated', 1, 0] } },
                avgProcessingTime: {
                  $avg: {
                    $cond: [
                      { $ne: ['$approvedAt', null] },
                      { $subtract: ['$approvedAt', '$createdAt'] },
                      null
                    ]
                  }
                }
              }
            }
          ]);
        },
        1500
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('totalRecords');
      expect(result[0]).toHaveProperty('approvedCount');
    });

    it('should generate warehouse capacity utilization efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Warehouse Capacity Utilization',
        async () => {
          return await WarehouseApproval.aggregate([
            {
              $match: {
                status: 'approved',
                inventoryCreated: true
              }
            },
            {
              $lookup: {
                from: 'warehouses',
                localField: 'warehouse',
                foreignField: '_id',
                as: 'warehouseInfo'
              }
            },
            {
              $unwind: '$warehouseInfo'
            },
            {
              $unwind: '$products'
            },
            {
              $group: {
                _id: '$warehouse',
                warehouseName: { $first: '$warehouseInfo.name' },
                warehouseCode: { $first: '$warehouseInfo.code' },
                totalCapacity: { $first: '$warehouseInfo.capacity' },
                totalStoredQuantity: { $sum: '$products.quantity' },
                recordCount: { $sum: 1 },
                avgStorageTime: {
                  $avg: {
                    $divide: [
                      { $subtract: [new Date(), '$approvedAt'] },
                      1000 * 60 * 60 * 24
                    ]
                  }
                }
              }
            },
            {
              $project: {
                warehouseName: 1,
                warehouseCode: 1,
                totalCapacity: 1,
                totalStoredQuantity: 1,
                utilizationPercentage: {
                  $multiply: [
                    { $divide: ['$totalStoredQuantity', '$totalCapacity'] },
                    100
                  ]
                },
                recordCount: 1,
                avgStorageTime: 1
              }
            },
            {
              $sort: { utilizationPercentage: -1 }
            }
          ]);
        },
        2000
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item.warehouseName)).toBe(true);
    });

    it('should load storage location analytics efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Storage Location Analytics',
        async () => {
          return await WarehouseApproval.aggregate([
            {
              $match: {
                status: 'approved'
              }
            },
            {
              $unwind: '$products'
            },
            {
              $group: {
                _id: '$products.storageConditions',
                storageType: { $first: '$products.storageConditions' },
                totalItems: { $sum: 1 },
                totalQuantity: { $sum: '$products.quantity' },
                avgQuantityPerItem: { $avg: '$products.quantity' },
                warehouseCount: { $addToSet: '$warehouse' }
              }
            },
            {
              $project: {
                storageType: 1,
                totalItems: 1,
                totalQuantity: 1,
                avgQuantityPerItem: 1,
                warehouseCount: { $size: '$warehouseCount' }
              }
            },
            {
              $sort: { totalQuantity: -1 }
            }
          ]);
        },
        1500
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item.storageType)).toBe(true);
    });
  });

  describe('Inventory Dashboard Performance', () => {
    it('should load inventory overview statistics quickly', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Inventory Overview Statistics',
        async () => {
          return await Inventory.aggregate([
            {
              $group: {
                _id: null,
                totalItems: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalAvailableQuantity: { $sum: '$availableQuantity' },
                totalReservedQuantity: { $sum: '$reservedQuantity' },
                totalValue: { $sum: '$totalValue' },
                avgUnitCost: { $avg: '$unitCost' },
                expiringItems: {
                  $sum: {
                    $cond: [
                      { $lt: ['$expiryDate', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] },
                      1,
                      0
                    ]
                  }
                },
                expiredItems: {
                  $sum: {
                    $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0]
                  }
                },
                lowStockItems: {
                  $sum: {
                    $cond: [{ $lt: ['$availableQuantity', 50] }, 1, 0]
                  }
                }
              }
            }
          ]);
        },
        1500
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('totalItems');
      expect(result[0]).toHaveProperty('totalValue');
    });

    it('should generate inventory valuation by category efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Inventory Valuation by Category',
        async () => {
          return await Inventory.aggregate([
            {
              $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
              }
            },
            {
              $unwind: '$productInfo'
            },
            {
              $group: {
                _id: '$productInfo.category',
                category: { $first: '$productInfo.category' },
                totalItems: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalValue: { $sum: '$totalValue' },
                avgUnitCost: { $avg: '$unitCost' },
                availableQuantity: { $sum: '$availableQuantity' },
                reservedQuantity: { $sum: '$reservedQuantity' },
                expiringItems: {
                  $sum: {
                    $cond: [
                      { $lt: ['$expiryDate', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)] },
                      1,
                      0
                    ]
                  }
                }
              }
            },
            {
              $sort: { totalValue: -1 }
            }
          ]);
        },
        2000
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item.category)).toBe(true);
    });

    it('should load inventory alerts and notifications efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Inventory Alerts and Notifications',
        async () => {
          const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
          
          return await Inventory.aggregate([
            {
              $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
              }
            },
            {
              $lookup: {
                from: 'warehouses',
                localField: 'warehouse',
                foreignField: '_id',
                as: 'warehouseInfo'
              }
            },
            {
              $unwind: '$productInfo'
            },
            {
              $unwind: '$warehouseInfo'
            },
            {
              $project: {
                productName: '$productInfo.name',
                productCode: '$productInfo.code',
                warehouseName: '$warehouseInfo.name',
                batchNumber: 1,
                quantity: 1,
                availableQuantity: 1,
                expiryDate: 1,
                reorderLevel: '$productInfo.reorderLevel',
                alertType: {
                  $switch: {
                    branches: [
                      { 
                        case: { $lt: ['$expiryDate', new Date()] },
                        then: 'expired'
                      },
                      { 
                        case: { $lt: ['$expiryDate', thirtyDaysFromNow] },
                        then: 'expiring_soon'
                      },
                      { 
                        case: { $lt: ['$expiryDate', sixtyDaysFromNow] },
                        then: 'expiring_warning'
                      },
                      { 
                        case: { $lt: ['$availableQuantity', '$productInfo.reorderLevel'] },
                        then: 'low_stock'
                      }
                    ],
                    default: null
                  }
                }
              }
            },
            {
              $match: {
                alertType: { $ne: null }
              }
            },
            {
              $group: {
                _id: '$alertType',
                alertType: { $first: '$alertType' },
                count: { $sum: 1 },
                items: {
                  $push: {
                    productName: '$productName',
                    productCode: '$productCode',
                    warehouseName: '$warehouseName',
                    batchNumber: '$batchNumber',
                    quantity: '$quantity',
                    availableQuantity: '$availableQuantity',
                    expiryDate: '$expiryDate'
                  }
                }
              }
            },
            {
              $sort: { count: -1 }
            }
          ]);
        },
        2500
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(item => item.alertType)).toBe(true);
    });

    it('should generate inventory movement trends efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Inventory Movement Trends',
        async () => {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          
          return await Inventory.aggregate([
            {
              $match: {
                'transactions.date': { $gte: sevenDaysAgo }
              }
            },
            {
              $unwind: '$transactions'
            },
            {
              $match: {
                'transactions.date': { $gte: sevenDaysAgo }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$transactions.date' },
                  month: { $month: '$transactions.date' },
                  day: { $dayOfMonth: '$transactions.date' },
                  type: '$transactions.type'
                },
                date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$transactions.date' } } },
                transactionType: { $first: '$transactions.type' },
                totalQuantity: { $sum: '$transactions.quantity' },
                transactionCount: { $sum: 1 }
              }
            },
            {
              $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.type': 1 }
            }
          ]);
        },
        2000
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Real-time Dashboard Performance', () => {
    it('should load recent notifications efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Recent Notifications',
        async () => {
          return await Notification.aggregate([
            {
              $match: {
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'recipient',
                foreignField: '_id',
                as: 'recipientInfo'
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'sender',
                foreignField: '_id',
                as: 'senderInfo'
              }
            },
            {
              $group: {
                _id: '$type',
                notificationType: { $first: '$type' },
                totalCount: { $sum: 1 },
                unreadCount: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
                urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
                recentNotifications: {
                  $push: {
                    title: '$title',
                    message: '$message',
                    priority: '$priority',
                    read: '$read',
                    createdAt: '$createdAt',
                    recipientName: { $arrayElemAt: ['$recipientInfo.name', 0] }
                  }
                }
              }
            },
            {
              $project: {
                notificationType: 1,
                totalCount: 1,
                unreadCount: 1,
                urgentCount: 1,
                recentNotifications: { $slice: ['$recentNotifications', 5] }
              }
            },
            {
              $sort: { totalCount: -1 }
            }
          ]);
        },
        1500
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should load system activity feed efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'System Activity Feed',
        async () => {
          return await AuditLog.aggregate([
            {
              $match: {
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userInfo'
              }
            },
            {
              $unwind: '$userInfo'
            },
            {
              $group: {
                _id: {
                  hour: { $hour: '$timestamp' },
                  action: '$action'
                },
                actionType: { $first: '$action' },
                hour: { $first: { $hour: '$timestamp' } },
                count: { $sum: 1 },
                users: { $addToSet: '$user' },
                resources: { $addToSet: '$resource' },
                recentActivities: {
                  $push: {
                    userName: '$userInfo.name',
                    action: '$action',
                    resource: '$resource',
                    details: '$details',
                    timestamp: '$timestamp',
                    severity: '$severity'
                  }
                }
              }
            },
            {
              $project: {
                actionType: 1,
                hour: 1,
                count: 1,
                uniqueUsers: { $size: '$users' },
                uniqueResources: { $size: '$resources' },
                recentActivities: { $slice: ['$recentActivities', 3] }
              }
            },
            {
              $sort: { hour: 1, count: -1 }
            }
          ]);
        },
        2000
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should generate user activity summary efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'User Activity Summary',
        async () => {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          return await Promise.all([
            // Active QC assignments
            QualityControl.aggregate([
              {
                $match: {
                  status: { $in: ['pending', 'in_progress'] }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'assignedTo',
                  foreignField: '_id',
                  as: 'assignee'
                }
              },
              {
                $unwind: '$assignee'
              },
              {
                $group: {
                  _id: '$assignedTo',
                  userName: { $first: '$assignee.name' },
                  userRole: { $first: '$assignee.role' },
                  activeQCCount: { $sum: 1 },
                  urgentQCCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
                }
              }
            ]),
            
            // Active warehouse assignments
            WarehouseApproval.aggregate([
              {
                $match: {
                  status: { $in: ['pending', 'in_progress'] }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'assignedTo',
                  foreignField: '_id',
                  as: 'assignee'
                }
              },
              {
                $unwind: '$assignee'
              },
              {
                $group: {
                  _id: '$assignedTo',
                  userName: { $first: '$assignee.name' },
                  userRole: { $first: '$assignee.role' },
                  activeWarehouseCount: { $sum: 1 },
                  urgentWarehouseCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
                }
              }
            ]),
            
            // Recent user activities
            AuditLog.aggregate([
              {
                $match: {
                  timestamp: { $gte: oneDayAgo }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'user',
                  foreignField: '_id',
                  as: 'userInfo'
                }
              },
              {
                $unwind: '$userInfo'
              },
              {
                $group: {
                  _id: '$user',
                  userName: { $first: '$userInfo.name' },
                  userRole: { $first: '$userInfo.role' },
                  activityCount: { $sum: 1 },
                  lastActivity: { $max: '$timestamp' }
                }
              },
              {
                $sort: { activityCount: -1 }
              },
              {
                $limit: 20
              }
            ])
          ]);
        },
        2500
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3); // Three separate aggregations
    });
  });

  describe('Executive Dashboard Performance', () => {
    it('should generate executive summary efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Executive Summary',
        async () => {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          
          return await Promise.all([
            // QC Performance Metrics
            QualityControl.aggregate([
              {
                $match: {
                  createdAt: { $gte: thirtyDaysAgo }
                }
              },
              {
                $group: {
                  _id: null,
                  totalQCRecords: { $sum: 1 },
                  approvedRecords: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                  rejectedRecords: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                  avgProcessingTime: {
                    $avg: {
                      $cond: [
                        { $ne: ['$approvedAt', null] },
                        { $subtract: ['$approvedAt', '$createdAt'] },
                        null
                      ]
                    }
                  },
                  qualityRate: {
                    $avg: {
                      $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
                    }
                  }
                }
              }
            ]),
            
            // Warehouse Performance Metrics
            WarehouseApproval.aggregate([
              {
                $match: {
                  createdAt: { $gte: thirtyDaysAgo }
                }
              },
              {
                $group: {
                  _id: null,
                  totalWarehouseApprovals: { $sum: 1 },
                  approvedApprovals: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                  inventoryCreated: { $sum: { $cond: ['$inventoryCreated', 1, 0] } },
                  avgApprovalTime: {
                    $avg: {
                      $cond: [
                        { $ne: ['$approvedAt', null] },
                        { $subtract: ['$approvedAt', '$createdAt'] },
                        null
                      ]
                    }
                  }
                }
              }
            ]),
            
            // Inventory Value Metrics
            Inventory.aggregate([
              {
                $group: {
                  _id: null,
                  totalInventoryValue: { $sum: '$totalValue' },
                  totalItems: { $sum: 1 },
                  totalQuantity: { $sum: '$quantity' },
                  avgUnitCost: { $avg: '$unitCost' },
                  expiringValue: {
                    $sum: {
                      $cond: [
                        { $lt: ['$expiryDate', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)] },
                        '$totalValue',
                        0
                      ]
                    }
                  }
                }
              }
            ])
          ]);
        },
        3000
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('should generate KPI trends efficiently', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'KPI Trends',
        async () => {
          const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          
          return await QualityControl.aggregate([
            {
              $match: {
                createdAt: { $gte: ninetyDaysAgo }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  week: { $week: '$createdAt' }
                },
                weekStart: {
                  $first: {
                    $dateFromParts: {
                      isoWeekYear: { $year: '$createdAt' },
                      isoWeek: { $week: '$createdAt' }
                    }
                  }
                },
                totalRecords: { $sum: 1 },
                approvedRecords: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejectedRecords: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                avgProcessingTime: {
                  $avg: {
                    $cond: [
                      { $and: [{ $ne: ['$approvedAt', null] }, { $ne: ['$createdAt', null] }] },
                      { $subtract: ['$approvedAt', '$createdAt'] },
                      null
                    ]
                  }
                },
                qualityRate: {
                  $avg: {
                    $cond: [{ $eq: ['$status', 'approved'] }, 100, 0]
                  }
                }
              }
            },
            {
              $project: {
                weekStart: 1,
                totalRecords: 1,
                approvedRecords: 1,
                rejectedRecords: 1,
                avgProcessingTimeHours: { $divide: ['$avgProcessingTime', 1000 * 60 * 60] },
                qualityRate: 1,
                approvalRate: {
                  $cond: [
                    { $gt: ['$totalRecords', 0] },
                    { $multiply: [{ $divide: ['$approvedRecords', '$totalRecords'] }, 100] },
                    0
                  ]
                }
              }
            },
            {
              $sort: { weekStart: 1 }
            }
          ]);
        },
        2500
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Dashboard Query Optimization', () => {
    it('should use indexes effectively for dashboard queries', async () => {
      const { result, metrics } = await measureDashboardQuery(
        'Index Usage Analysis',
        async () => {
          const queries = await Promise.all([
            QualityControl.find({ status: 'pending' }).explain('executionStats'),
            WarehouseApproval.find({ status: 'approved' }).explain('executionStats'),
            Inventory.find({ 
              expiryDate: { $lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } 
            }).explain('executionStats'),
            Notification.find({ 
              recipient: testData.users[0]._id,
              read: false 
            }).explain('executionStats')
          ]);
          
          return queries.map(query => ({
            executionTimeMillis: query.executionStats.executionTimeMillis,
            totalDocsExamined: query.executionStats.totalDocsExamined,
            totalDocsReturned: query.executionStats.totalDocsReturned,
            indexesUsed: query.executionStats.executionStages
          }));
        },
        1500
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
      
      // Verify that queries are performing well
      result.forEach((queryStats, index) => {
        console.log(`Query ${index + 1} performance:`, queryStats);
        expect(queryStats.executionTimeMillis).toBeLessThan(100);
      });
    });

    it('should handle concurrent dashboard loads efficiently', async () => {
      const concurrentUsers = 5;
      
      const { result, metrics } = await measureDashboardQuery(
        'Concurrent Dashboard Loads',
        async () => {
          const dashboardPromises = Array.from({ length: concurrentUsers }, async (_, index) => {
            return Promise.all([
              // QC Overview
              QualityControl.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
              ]),
              
              // Warehouse Overview
              WarehouseApproval.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
              ]),
              
              // Inventory Summary
              Inventory.aggregate([
                { $group: { _id: null, totalValue: { $sum: '$totalValue' } } }
              ]),
              
              // Recent Notifications
              Notification.find({ 
                recipient: testData.users[index % testData.users.length]._id 
              }).limit(10).lean()
            ]);
          });
          
          return await Promise.all(dashboardPromises);
        },
        4000
      );

      expect(result).toHaveLength(concurrentUsers);
      expect(result.every(userDashboard => Array.isArray(userDashboard))).toBe(true);
    });
  });
});