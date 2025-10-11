// tests/performance/bulkOperations.test.js
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from '@jest/globals';
import mongoose from 'mongoose';
import QualityControl from '../../models/QualityControl.js';
import WarehouseApproval from '../../models/WarehouseApproval.js';
import Inventory from '../../models/Inventory.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Warehouse from '../../models/Warehouse.js';
import { qcTestDataSeeder } from '../seeders/qcTestData.js';
import { warehouseApprovalTestDataSeeder } from '../seeders/warehouseApprovalTestData.js';
import { faker } from '@faker-js/faker';

/**
 * Performance Tests for Bulk Operations
 * Tests system performance under high load scenarios including:
 * - Bulk QC record operations
 * - Bulk warehouse approval operations
 * - Bulk inventory operations
 * - Concurrent user operations
 * - Memory usage and optimization
 * - Database query performance
 */

describe('Bulk Operations Performance Tests', () => {
  let testData = {};
  let performanceMetrics = {};

  beforeAll(async () => {
    // Seed test data for performance testing
    console.log('Seeding performance test data...');
    const qcData = await qcTestDataSeeder.seedAll();
    const warehouseData = await warehouseApprovalTestDataSeeder.seedAll();
    
    testData = {
      ...qcData,
      ...warehouseData
    };

    // Initialize performance metrics tracking
    performanceMetrics = {
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      operationTimes: []
    };
  });

  afterAll(async () => {
    // Cleanup test data
    await qcTestDataSeeder.cleanup();
    await warehouseApprovalTestDataSeeder.cleanup();
    
    // Log final performance metrics
    console.log('Performance Test Summary:', {
      totalDuration: Date.now() - performanceMetrics.startTime,
      finalMemoryUsage: process.memoryUsage(),
      averageOperationTime: performanceMetrics.operationTimes.reduce((a, b) => a + b, 0) / performanceMetrics.operationTimes.length
    });
  });

  beforeEach(() => {
    performanceMetrics.testStartTime = Date.now();
  });

  afterEach(() => {
    const testDuration = Date.now() - performanceMetrics.testStartTime;
    performanceMetrics.operationTimes.push(testDuration);
  });

  /**
   * Helper function to measure operation performance
   */
  const measurePerformance = async (operation, expectedMaxTime = 5000) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    const result = await operation();
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;
    
    const metrics = {
      duration,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      }
    };
    
    console.log(`Operation completed in ${duration}ms`, metrics);
    expect(duration).toBeLessThan(expectedMaxTime);
    
    return { result, metrics };
  };

  describe('Bulk QC Operations Performance', () => {
    it('should handle bulk QC record creation efficiently', async () => {
      const recordCount = 100;
      const qcInspectors = testData.users.filter(u => u.role === 'qc_inspector');
      const products = testData.products;
      const warehouses = testData.warehouses;

      const { result, metrics } = await measurePerformance(async () => {
        const qcRecords = [];
        
        for (let i = 0; i < recordCount; i++) {
          qcRecords.push({
            qcType: faker.helpers.arrayElement(['incoming', 'in_process', 'finished_goods']),
            status: 'pending',
            priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
            products: [{
              product: faker.helpers.arrayElement(products)._id,
              batchNumber: `BULK_BATCH_${i.toString().padStart(3, '0')}`,
              quantity: faker.number.int({ min: 50, max: 500 }),
              manufacturingDate: faker.date.past({ years: 1 }),
              expiryDate: faker.date.future({ years: 2 }),
              supplier: faker.company.name(),
              items: [{
                itemId: `BULK_ITEM_${i.toString().padStart(3, '0')}`,
                quantity: faker.number.int({ min: 25, max: 250 }),
                status: 'pending'
              }]
            }],
            warehouse: faker.helpers.arrayElement(warehouses)._id,
            assignedTo: faker.helpers.arrayElement(qcInspectors)._id,
            createdBy: faker.helpers.arrayElement(qcInspectors)._id,
            dueDate: faker.date.future({ days: 30 }),
            notes: `Bulk created QC record ${i}`
          });
        }

        return await QualityControl.insertMany(qcRecords);
      }, 10000); // Allow up to 10 seconds for bulk creation

      expect(result).toHaveLength(recordCount);
      expect(metrics.duration).toBeLessThan(10000);
      
      // Cleanup created records
      await QualityControl.deleteMany({ 
        'products.batchNumber': { $regex: /^BULK_BATCH_/ } 
      });
    });

    it('should handle bulk QC record updates efficiently', async () => {
      const qcRecords = testData.qcRecords.slice(0, 50);
      const updateData = {
        status: 'in_progress',
        priority: 'high',
        notes: 'Bulk updated for performance testing'
      };

      const { result, metrics } = await measurePerformance(async () => {
        const updatePromises = qcRecords.map(qc => 
          QualityControl.findByIdAndUpdate(qc._id, updateData, { new: true })
        );
        return await Promise.all(updatePromises);
      }, 5000);

      expect(result).toHaveLength(qcRecords.length);
      expect(result.every(qc => qc.status === 'in_progress')).toBe(true);
    });

    it('should handle bulk QC record queries with pagination efficiently', async () => {
      const pageSize = 20;
      const totalPages = 5;

      const { result, metrics } = await measurePerformance(async () => {
        const queries = [];
        
        for (let page = 1; page <= totalPages; page++) {
          queries.push(
            QualityControl.find({})
              .populate('assignedTo', 'name email')
              .populate('warehouse', 'name code')
              .populate('products.product', 'name code')
              .sort({ createdAt: -1 })
              .skip((page - 1) * pageSize)
              .limit(pageSize)
              .lean()
          );
        }
        
        return await Promise.all(queries);
      }, 3000);

      expect(result).toHaveLength(totalPages);
      expect(result.every(page => Array.isArray(page))).toBe(true);
    });

    it('should handle bulk QC assignment operations efficiently', async () => {
      const qcRecords = testData.qcRecords.filter(qc => qc.status === 'pending').slice(0, 30);
      const assignee = testData.users.find(u => u.role === 'qc_inspector');

      const { result, metrics } = await measurePerformance(async () => {
        return await QualityControl.updateMany(
          { _id: { $in: qcRecords.map(qc => qc._id) } },
          { 
            assignedTo: assignee._id,
            status: 'in_progress',
            updatedAt: new Date()
          }
        );
      }, 2000);

      expect(result.modifiedCount).toBe(qcRecords.length);
    });
  });

  describe('Bulk Warehouse Approval Operations Performance', () => {
    it('should handle bulk warehouse approval creation efficiently', async () => {
      const recordCount = 50;
      const warehouseStaff = testData.users.filter(u => u.role === 'warehouse_staff');
      const approvedQCRecords = testData.qcRecords.filter(qc => qc.status === 'approved').slice(0, recordCount);

      const { result, metrics } = await measurePerformance(async () => {
        const approvalRecords = approvedQCRecords.map((qc, i) => ({
          qcRecord: qc._id,
          status: 'pending',
          priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
          products: qc.products.map(product => ({
            ...product,
            storageLocation: `BULK_STORAGE_${i.toString().padStart(3, '0')}`,
            storageConditions: 'room_temperature'
          })),
          warehouse: qc.warehouse,
          assignedTo: faker.helpers.arrayElement(warehouseStaff)._id,
          createdBy: faker.helpers.arrayElement(warehouseStaff)._id,
          dueDate: faker.date.future({ days: 15 }),
          notes: `Bulk created warehouse approval ${i}`
        }));

        return await WarehouseApproval.insertMany(approvalRecords);
      }, 8000);

      expect(result).toHaveLength(recordCount);
      
      // Cleanup created records
      await WarehouseApproval.deleteMany({ 
        notes: { $regex: /^Bulk created warehouse approval/ } 
      });
    });

    it('should handle bulk warehouse approval status updates efficiently', async () => {
      const approvalRecords = testData.warehouseApprovals.filter(wa => wa.status === 'pending').slice(0, 25);
      const approver = testData.users.find(u => u.role === 'warehouse_manager');

      const { result, metrics } = await measurePerformance(async () => {
        const updatePromises = approvalRecords.map(wa => 
          WarehouseApproval.findByIdAndUpdate(wa._id, {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: approver._id,
            approvalResult: 'approved'
          }, { new: true })
        );
        return await Promise.all(updatePromises);
      }, 4000);

      expect(result).toHaveLength(approvalRecords.length);
      expect(result.every(wa => wa.status === 'approved')).toBe(true);
    });

    it('should handle complex warehouse approval queries efficiently', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        return await WarehouseApproval.aggregate([
          {
            $match: {
              status: { $in: ['pending', 'in_progress', 'submitted'] }
            }
          },
          {
            $lookup: {
              from: 'qualitycontrols',
              localField: 'qcRecord',
              foreignField: '_id',
              as: 'qcDetails'
            }
          },
          {
            $lookup: {
              from: 'warehouses',
              localField: 'warehouse',
              foreignField: '_id',
              as: 'warehouseDetails'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'assignedTo',
              foreignField: '_id',
              as: 'assigneeDetails'
            }
          },
          {
            $group: {
              _id: '$warehouse',
              totalRecords: { $sum: 1 },
              pendingCount: {
                $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
              },
              inProgressCount: {
                $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
              },
              submittedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
              },
              warehouseName: { $first: { $arrayElemAt: ['$warehouseDetails.name', 0] } }
            }
          },
          {
            $sort: { totalRecords: -1 }
          }
        ]);
      }, 3000);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Inventory Operations Performance', () => {
    it('should handle bulk inventory creation efficiently', async () => {
      const recordCount = 75;
      const products = testData.products;
      const warehouses = testData.warehouses;
      const inventoryManagers = testData.users.filter(u => u.role === 'inventory_manager');

      const { result, metrics } = await measurePerformance(async () => {
        const inventoryRecords = [];
        
        for (let i = 0; i < recordCount; i++) {
          inventoryRecords.push({
            product: faker.helpers.arrayElement(products)._id,
            warehouse: faker.helpers.arrayElement(warehouses)._id,
            batchNumber: `BULK_INV_BATCH_${i.toString().padStart(3, '0')}`,
            quantity: faker.number.int({ min: 100, max: 1000 }),
            availableQuantity: faker.number.int({ min: 50, max: 500 }),
            reservedQuantity: 0,
            unitCost: faker.number.float({ min: 10, max: 200, fractionDigits: 2 }),
            totalValue: faker.number.float({ min: 1000, max: 20000, fractionDigits: 2 }),
            manufacturingDate: faker.date.past({ years: 1 }),
            expiryDate: faker.date.future({ years: 2 }),
            supplier: faker.company.name(),
            storageLocation: `BULK_LOC_${i.toString().padStart(3, '0')}`,
            storageConditions: faker.helpers.arrayElement(['room_temperature', 'refrigerated', 'frozen']),
            status: 'available',
            createdBy: faker.helpers.arrayElement(inventoryManagers)._id,
            lastUpdatedBy: faker.helpers.arrayElement(inventoryManagers)._id,
            notes: `Bulk created inventory record ${i}`
          });
        }

        return await Inventory.insertMany(inventoryRecords);
      }, 12000);

      expect(result).toHaveLength(recordCount);
      
      // Cleanup created records
      await Inventory.deleteMany({ 
        batchNumber: { $regex: /^BULK_INV_BATCH_/ } 
      });
    });

    it('should handle bulk inventory quantity adjustments efficiently', async () => {
      const inventoryRecords = testData.inventoryRecords.slice(0, 40);
      const adjustmentUser = testData.users.find(u => u.role === 'inventory_manager');

      const { result, metrics } = await measurePerformance(async () => {
        const updatePromises = inventoryRecords.map(inv => {
          const adjustment = faker.number.int({ min: -50, max: 100 });
          const newQuantity = Math.max(0, inv.quantity + adjustment);
          
          return Inventory.findByIdAndUpdate(inv._id, {
            quantity: newQuantity,
            availableQuantity: Math.max(0, inv.availableQuantity + adjustment),
            lastUpdatedBy: adjustmentUser._id,
            updatedAt: new Date(),
            $push: {
              transactions: {
                type: adjustment > 0 ? 'adjustment_in' : 'adjustment_out',
                quantity: Math.abs(adjustment),
                reason: 'bulk_performance_test',
                performedBy: adjustmentUser._id,
                date: new Date(),
                notes: 'Bulk adjustment for performance testing'
              }
            }
          }, { new: true });
        });
        
        return await Promise.all(updatePromises);
      }, 6000);

      expect(result).toHaveLength(inventoryRecords.length);
      expect(result.every(inv => inv.lastUpdatedBy.equals(adjustmentUser._id))).toBe(true);
    });

    it('should handle bulk inventory reservation operations efficiently', async () => {
      const availableInventory = testData.inventoryRecords.filter(inv => 
        inv.status === 'available' && inv.availableQuantity > 50
      ).slice(0, 30);

      const { result, metrics } = await measurePerformance(async () => {
        const reservationPromises = availableInventory.map(inv => {
          const reserveQuantity = Math.min(inv.availableQuantity, faker.number.int({ min: 10, max: 50 }));
          
          return Inventory.findByIdAndUpdate(inv._id, {
            availableQuantity: inv.availableQuantity - reserveQuantity,
            reservedQuantity: inv.reservedQuantity + reserveQuantity,
            updatedAt: new Date(),
            $push: {
              transactions: {
                type: 'reservation',
                quantity: reserveQuantity,
                reason: 'bulk_reservation_test',
                performedBy: testData.users.find(u => u.role === 'inventory_manager')._id,
                date: new Date(),
                notes: 'Bulk reservation for performance testing'
              }
            }
          }, { new: true });
        });
        
        return await Promise.all(reservationPromises);
      }, 4000);

      expect(result).toHaveLength(availableInventory.length);
      expect(result.every(inv => inv.reservedQuantity > 0)).toBe(true);
    });

    it('should handle complex inventory aggregation queries efficiently', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        return await Inventory.aggregate([
          {
            $match: {
              status: { $in: ['available', 'reserved'] }
            }
          },
          {
            $lookup: {
              from: 'products',
              localField: 'product',
              foreignField: '_id',
              as: 'productDetails'
            }
          },
          {
            $lookup: {
              from: 'warehouses',
              localField: 'warehouse',
              foreignField: '_id',
              as: 'warehouseDetails'
            }
          },
          {
            $group: {
              _id: {
                warehouse: '$warehouse',
                category: { $arrayElemAt: ['$productDetails.category', 0] }
              },
              totalQuantity: { $sum: '$quantity' },
              availableQuantity: { $sum: '$availableQuantity' },
              reservedQuantity: { $sum: '$reservedQuantity' },
              totalValue: { $sum: '$totalValue' },
              recordCount: { $sum: 1 },
              warehouseName: { $first: { $arrayElemAt: ['$warehouseDetails.name', 0] } },
              avgUnitCost: { $avg: '$unitCost' },
              expiringItems: {
                $sum: {
                  $cond: [
                    { $lt: ['$expiryDate', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)] },
                    1,
                    0
                  ]
                }
              }
            }
          },
          {
            $sort: { totalValue: -1 }
          },
          {
            $limit: 50
          }
        ]);
      }, 4000);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent QC and warehouse approval operations', async () => {
      const concurrentOperations = 10;
      const qcInspectors = testData.users.filter(u => u.role === 'qc_inspector');
      const warehouseStaff = testData.users.filter(u => u.role === 'warehouse_staff');

      const { result, metrics } = await measurePerformance(async () => {
        const operations = [];
        
        // Create concurrent QC operations
        for (let i = 0; i < concurrentOperations; i++) {
          operations.push(
            QualityControl.find({ status: 'pending' })
              .populate('assignedTo')
              .limit(5)
              .lean()
          );
          
          operations.push(
            WarehouseApproval.find({ status: 'pending' })
              .populate('warehouse')
              .limit(5)
              .lean()
          );
        }
        
        return await Promise.all(operations);
      }, 5000);

      expect(result).toHaveLength(concurrentOperations * 2);
    });

    it('should handle concurrent user operations without conflicts', async () => {
      const users = testData.users.slice(0, 5);
      const qcRecords = testData.qcRecords.filter(qc => qc.status === 'pending').slice(0, 10);

      const { result, metrics } = await measurePerformance(async () => {
        const userOperations = users.map(async (user, index) => {
          const userQCRecords = qcRecords.slice(index * 2, (index + 1) * 2);
          
          return Promise.all([
            // Simulate user viewing QC records
            QualityControl.find({ assignedTo: user._id }).lean(),
            
            // Simulate user updating QC records
            ...userQCRecords.map(qc => 
              QualityControl.findByIdAndUpdate(qc._id, {
                notes: `Updated by ${user.name} at ${new Date().toISOString()}`,
                updatedAt: new Date()
              }, { new: true })
            )
          ]);
        });
        
        return await Promise.all(userOperations);
      }, 6000);

      expect(result).toHaveLength(users.length);
    });

    it('should maintain performance under high read load', async () => {
      const readOperations = 50;

      const { result, metrics } = await measurePerformance(async () => {
        const operations = [];
        
        for (let i = 0; i < readOperations; i++) {
          operations.push(
            QualityControl.findOne({ status: 'approved' })
              .populate('assignedTo', 'name email')
              .populate('warehouse', 'name code')
              .lean()
          );
        }
        
        return await Promise.all(operations);
      }, 3000);

      expect(result).toHaveLength(readOperations);
      expect(result.every(qc => qc !== null)).toBe(true);
    });
  });

  describe('Memory Usage and Optimization', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const largeDataSet = await QualityControl.find({})
        .populate('assignedTo')
        .populate('warehouse')
        .populate('products.product')
        .limit(100)
        .lean();

      const midMemory = process.memoryUsage();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      const memoryIncrease = midMemory.heapUsed - initialMemory.heapUsed;
      const memoryAfterGC = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log('Memory usage analysis:', {
        initialHeap: initialMemory.heapUsed,
        peakHeap: midMemory.heapUsed,
        finalHeap: finalMemory.heapUsed,
        memoryIncrease,
        memoryAfterGC
      });
      
      // Memory increase should be reasonable (less than 100MB for this operation)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      expect(largeDataSet).toHaveLength(100);
    });

    it('should efficiently handle large result sets with streaming', async () => {
      let processedCount = 0;
      const batchSize = 20;
      
      const { result, metrics } = await measurePerformance(async () => {
        const cursor = QualityControl.find({}).cursor({ batchSize });
        
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
          processedCount++;
          // Simulate processing
          if (processedCount >= 100) break; // Limit for test
        }
        
        return processedCount;
      }, 5000);

      expect(result).toBeGreaterThan(0);
      expect(processedCount).toBe(result);
    });
  });

  describe('Database Query Optimization', () => {
    it('should use indexes effectively for common queries', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        // Test indexed queries
        const queries = await Promise.all([
          QualityControl.find({ status: 'pending' }).explain('executionStats'),
          QualityControl.find({ assignedTo: testData.users[0]._id }).explain('executionStats'),
          WarehouseApproval.find({ warehouse: testData.warehouses[0]._id }).explain('executionStats'),
          Inventory.find({ 
            expiryDate: { $lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } 
          }).explain('executionStats')
        ]);
        
        return queries;
      }, 2000);

      // Check that queries are using indexes (executionTimeMillis should be low)
      result.forEach((queryExplanation, index) => {
        const executionStats = queryExplanation.executionStats;
        console.log(`Query ${index + 1} execution time:`, executionStats.executionTimeMillis);
        expect(executionStats.executionTimeMillis).toBeLessThan(100);
      });
    });

    it('should handle complex aggregation pipelines efficiently', async () => {
      const { result, metrics } = await measurePerformance(async () => {
        return await QualityControl.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
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
            $lookup: {
              from: 'warehouses',
              localField: 'warehouse',
              foreignField: '_id',
              as: 'warehouseInfo'
            }
          },
          {
            $unwind: '$products'
          },
          {
            $lookup: {
              from: 'products',
              localField: 'products.product',
              foreignField: '_id',
              as: 'productInfo'
            }
          },
          {
            $group: {
              _id: {
                status: '$status',
                qcType: '$qcType',
                warehouse: '$warehouse'
              },
              count: { $sum: 1 },
              totalQuantity: { $sum: '$products.quantity' },
              avgPriority: { $avg: { $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'low'] }, then: 1 },
                  { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                  { case: { $eq: ['$priority', 'high'] }, then: 3 },
                  { case: { $eq: ['$priority', 'urgent'] }, then: 4 }
                ],
                default: 0
              }}},
              warehouseName: { $first: { $arrayElemAt: ['$warehouseInfo.name', 0] } }
            }
          },
          {
            $sort: { count: -1 }
          }
        ]);
      }, 3000);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});