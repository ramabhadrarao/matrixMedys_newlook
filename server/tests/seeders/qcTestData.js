// tests/seeders/qcTestData.js
import mongoose from 'mongoose';
import QualityControl from '../../models/QualityControl.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Warehouse from '../../models/Warehouse.js';
import { faker } from '@faker-js/faker';

/**
 * QC Test Data Seeder
 * Creates comprehensive test data for QC scenarios including:
 * - Various QC types and statuses
 * - Different product configurations
 * - Multiple user roles and assignments
 * - Complex workflow scenarios
 */

export class QCTestDataSeeder {
  constructor() {
    this.createdData = {
      users: [],
      products: [],
      warehouses: [],
      qcRecords: []
    };
  }

  /**
   * Create test users with different roles
   */
  async createTestUsers() {
    const userRoles = [
      { role: 'qc_inspector', permissions: ['read_qc', 'create_qc', 'update_qc'] },
      { role: 'qc_manager', permissions: ['read_qc', 'create_qc', 'update_qc', 'approve_qc', 'assign_qc'] },
      { role: 'admin', permissions: ['*'] },
      { role: 'warehouse_staff', permissions: ['read_qc'] }
    ];

    for (const userRole of userRoles) {
      for (let i = 0; i < 3; i++) {
        const user = new User({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: 'hashedPassword123',
          role: userRole.role,
          permissions: userRole.permissions,
          isActive: true,
          department: userRole.role.includes('qc') ? 'Quality Control' : 'Warehouse',
          employeeId: faker.string.alphanumeric(8).toUpperCase()
        });

        await user.save();
        this.createdData.users.push(user);
      }
    }

    console.log(`Created ${this.createdData.users.length} test users`);
    return this.createdData.users;
  }

  /**
   * Create test products with various categories
   */
  async createTestProducts() {
    const productCategories = [
      { category: 'Pharmaceuticals', subcategory: 'Tablets' },
      { category: 'Pharmaceuticals', subcategory: 'Injections' },
      { category: 'Medical Devices', subcategory: 'Surgical Instruments' },
      { category: 'Medical Devices', subcategory: 'Diagnostic Equipment' },
      { category: 'Consumables', subcategory: 'Disposables' }
    ];

    for (const productCat of productCategories) {
      for (let i = 0; i < 5; i++) {
        const product = new Product({
          name: `${productCat.subcategory} ${faker.commerce.productName()}`,
          code: faker.string.alphanumeric(10).toUpperCase(),
          category: productCat.category,
          subcategory: productCat.subcategory,
          description: faker.commerce.productDescription(),
          manufacturer: faker.company.name(),
          unitOfMeasure: faker.helpers.arrayElement(['pieces', 'boxes', 'vials', 'bottles']),
          reorderLevel: faker.number.int({ min: 10, max: 100 }),
          maxStockLevel: faker.number.int({ min: 500, max: 2000 }),
          isActive: true,
          requiresQC: true,
          qcParameters: [
            'visual_inspection',
            'packaging_integrity',
            'labeling_accuracy',
            'expiry_date_verification'
          ],
          storageConditions: faker.helpers.arrayElement([
            'room_temperature',
            'refrigerated',
            'frozen',
            'controlled_temperature'
          ])
        });

        await product.save();
        this.createdData.products.push(product);
      }
    }

    console.log(`Created ${this.createdData.products.length} test products`);
    return this.createdData.products;
  }

  /**
   * Create test warehouses
   */
  async createTestWarehouses() {
    const warehouseTypes = ['main', 'satellite', 'cold_storage', 'quarantine'];

    for (const type of warehouseTypes) {
      for (let i = 0; i < 2; i++) {
        const warehouse = new Warehouse({
          name: `${type.replace('_', ' ').toUpperCase()} Warehouse ${i + 1}`,
          code: `${type.substring(0, 3).toUpperCase()}${i + 1}`,
          type: type,
          address: {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zipCode: faker.location.zipCode(),
            country: 'USA'
          },
          capacity: faker.number.int({ min: 1000, max: 10000 }),
          isActive: true,
          hasQCFacility: faker.datatype.boolean(),
          storageZones: [
            { zone: 'A', capacity: 1000, temperature: 'room' },
            { zone: 'B', capacity: 1000, temperature: 'cold' },
            { zone: 'C', capacity: 500, temperature: 'frozen' }
          ]
        });

        await warehouse.save();
        this.createdData.warehouses.push(warehouse);
      }
    }

    console.log(`Created ${this.createdData.warehouses.length} test warehouses`);
    return this.createdData.warehouses;
  }

  /**
   * Create QC records with various scenarios
   */
  async createQCRecords() {
    const qcTypes = ['incoming', 'in_process', 'finished_goods', 'stability', 'complaint'];
    const statuses = ['pending', 'in_progress', 'submitted', 'approved', 'rejected'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const qcResults = ['pass', 'fail', 'conditional_pass'];

    // Get users by role for assignment
    const qcInspectors = this.createdData.users.filter(u => u.role === 'qc_inspector');
    const qcManagers = this.createdData.users.filter(u => u.role === 'qc_manager');

    for (let i = 0; i < 50; i++) {
      const qcType = faker.helpers.arrayElement(qcTypes);
      const status = faker.helpers.arrayElement(statuses);
      const priority = faker.helpers.arrayElement(priorities);
      const product = faker.helpers.arrayElement(this.createdData.products);
      const warehouse = faker.helpers.arrayElement(this.createdData.warehouses);
      const inspector = faker.helpers.arrayElement(qcInspectors);
      const manager = faker.helpers.arrayElement(qcManagers);

      // Create products array with multiple items
      const products = [{
        product: product._id,
        batchNumber: `BATCH${faker.string.alphanumeric(8).toUpperCase()}`,
        quantity: faker.number.int({ min: 50, max: 1000 }),
        manufacturingDate: faker.date.past({ years: 1 }),
        expiryDate: faker.date.future({ years: 2 }),
        supplier: faker.company.name(),
        items: []
      }];

      // Add items to the product
      const itemCount = faker.number.int({ min: 1, max: 5 });
      for (let j = 0; j < itemCount; j++) {
        const itemStatus = status === 'pending' ? 'pending' : 
                          status === 'approved' ? 'approved' : 
                          faker.helpers.arrayElement(['pending', 'approved', 'rejected']);
        
        products[0].items.push({
          itemId: `ITEM${faker.string.alphanumeric(6).toUpperCase()}`,
          quantity: faker.number.int({ min: 10, max: 100 }),
          status: itemStatus,
          qcResult: itemStatus === 'approved' ? 'pass' : 
                   itemStatus === 'rejected' ? 'fail' : null,
          notes: itemStatus !== 'pending' ? faker.lorem.sentence() : null,
          inspectedBy: itemStatus !== 'pending' ? inspector._id : null,
          inspectionDate: itemStatus !== 'pending' ? faker.date.recent() : null
        });
      }

      const qcRecord = new QualityControl({
        qcType: qcType,
        status: status,
        priority: priority,
        products: products,
        warehouse: warehouse._id,
        assignedTo: inspector._id,
        createdBy: manager._id,
        dueDate: faker.date.future({ days: 30 }),
        notes: faker.lorem.paragraph(),
        
        // Add workflow fields based on status
        ...(status === 'submitted' && {
          submittedAt: faker.date.recent(),
          submittedBy: inspector._id
        }),
        
        ...(status === 'approved' && {
          submittedAt: faker.date.recent({ days: 5 }),
          submittedBy: inspector._id,
          approvedAt: faker.date.recent({ days: 2 }),
          approvedBy: manager._id,
          qcResult: 'pass',
          overallResult: 'pass'
        }),
        
        ...(status === 'rejected' && {
          submittedAt: faker.date.recent({ days: 5 }),
          submittedBy: inspector._id,
          rejectedAt: faker.date.recent({ days: 2 }),
          rejectedBy: manager._id,
          rejectionReason: faker.helpers.arrayElement([
            'incomplete_documentation',
            'failed_inspection',
            'missing_samples',
            'incorrect_procedures'
          ]),
          qcResult: 'fail',
          overallResult: 'fail'
        }),

        // Add inspection results for completed records
        ...((['approved', 'rejected'].includes(status)) && {
          inspectionResults: {
            visualInspection: {
              result: faker.helpers.arrayElement(['pass', 'fail']),
              notes: faker.lorem.sentence(),
              inspectedBy: inspector._id,
              inspectionDate: faker.date.recent()
            },
            packagingIntegrity: {
              result: faker.helpers.arrayElement(['pass', 'fail']),
              notes: faker.lorem.sentence(),
              inspectedBy: inspector._id,
              inspectionDate: faker.date.recent()
            },
            labelingAccuracy: {
              result: faker.helpers.arrayElement(['pass', 'fail']),
              notes: faker.lorem.sentence(),
              inspectedBy: inspector._id,
              inspectionDate: faker.date.recent()
            },
            overallResult: status === 'approved' ? 'pass' : 'fail',
            notes: faker.lorem.paragraph(),
            inspectedBy: inspector._id,
            inspectionDate: faker.date.recent()
          }
        })
      });

      await qcRecord.save();
      this.createdData.qcRecords.push(qcRecord);
    }

    console.log(`Created ${this.createdData.qcRecords.length} QC records`);
    return this.createdData.qcRecords;
  }

  /**
   * Create specific scenario-based QC records
   */
  async createScenarioBasedQCRecords() {
    const scenarios = [
      {
        name: 'urgent_incoming_inspection',
        qcType: 'incoming',
        status: 'pending',
        priority: 'urgent',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
        notes: 'Urgent incoming inspection for critical medication'
      },
      {
        name: 'failed_stability_test',
        qcType: 'stability',
        status: 'rejected',
        priority: 'high',
        qcResult: 'fail',
        rejectionReason: 'failed_stability_parameters',
        notes: 'Stability test failed - temperature excursion detected'
      },
      {
        name: 'complaint_investigation',
        qcType: 'complaint',
        status: 'in_progress',
        priority: 'high',
        notes: 'Customer complaint investigation - packaging defect reported'
      },
      {
        name: 'batch_recall_qc',
        qcType: 'finished_goods',
        status: 'submitted',
        priority: 'urgent',
        notes: 'QC for potential batch recall - contamination suspected'
      },
      {
        name: 'routine_in_process',
        qcType: 'in_process',
        status: 'approved',
        priority: 'medium',
        qcResult: 'pass',
        notes: 'Routine in-process QC check - all parameters within limits'
      }
    ];

    const qcInspectors = this.createdData.users.filter(u => u.role === 'qc_inspector');
    const qcManagers = this.createdData.users.filter(u => u.role === 'qc_manager');

    for (const scenario of scenarios) {
      const product = faker.helpers.arrayElement(this.createdData.products);
      const warehouse = faker.helpers.arrayElement(this.createdData.warehouses);
      const inspector = faker.helpers.arrayElement(qcInspectors);
      const manager = faker.helpers.arrayElement(qcManagers);

      const qcRecord = new QualityControl({
        qcType: scenario.qcType,
        status: scenario.status,
        priority: scenario.priority,
        products: [{
          product: product._id,
          batchNumber: `${scenario.name.toUpperCase()}_BATCH`,
          quantity: faker.number.int({ min: 100, max: 500 }),
          manufacturingDate: faker.date.past({ years: 1 }),
          expiryDate: faker.date.future({ years: 2 }),
          supplier: faker.company.name(),
          items: [{
            itemId: `${scenario.name.toUpperCase()}_ITEM001`,
            quantity: faker.number.int({ min: 50, max: 200 }),
            status: scenario.status === 'approved' ? 'approved' : 
                   scenario.status === 'rejected' ? 'rejected' : 'pending',
            qcResult: scenario.qcResult || null,
            notes: scenario.notes
          }]
        }],
        warehouse: warehouse._id,
        assignedTo: inspector._id,
        createdBy: manager._id,
        dueDate: scenario.dueDate || faker.date.future({ days: 7 }),
        notes: scenario.notes,
        qcResult: scenario.qcResult || null,
        rejectionReason: scenario.rejectionReason || null,
        
        // Add timestamps based on status
        ...(scenario.status === 'submitted' && {
          submittedAt: faker.date.recent(),
          submittedBy: inspector._id
        }),
        
        ...(scenario.status === 'approved' && {
          submittedAt: faker.date.recent({ days: 3 }),
          submittedBy: inspector._id,
          approvedAt: faker.date.recent(),
          approvedBy: manager._id
        }),
        
        ...(scenario.status === 'rejected' && {
          submittedAt: faker.date.recent({ days: 3 }),
          submittedBy: inspector._id,
          rejectedAt: faker.date.recent(),
          rejectedBy: manager._id
        })
      });

      await qcRecord.save();
      this.createdData.qcRecords.push(qcRecord);
    }

    console.log(`Created ${scenarios.length} scenario-based QC records`);
  }

  /**
   * Create QC records with complex product structures
   */
  async createComplexQCRecords() {
    const qcInspectors = this.createdData.users.filter(u => u.role === 'qc_inspector');
    const qcManagers = this.createdData.users.filter(u => u.role === 'qc_manager');

    // Multi-product QC record
    const multiProductQC = new QualityControl({
      qcType: 'incoming',
      status: 'in_progress',
      priority: 'high',
      products: [
        {
          product: this.createdData.products[0]._id,
          batchNumber: 'MULTI_BATCH_001',
          quantity: 500,
          manufacturingDate: faker.date.past({ months: 6 }),
          expiryDate: faker.date.future({ years: 2 }),
          supplier: 'Multi Product Supplier A',
          items: [
            {
              itemId: 'MULTI_ITEM_001',
              quantity: 250,
              status: 'approved',
              qcResult: 'pass',
              notes: 'First batch items approved'
            },
            {
              itemId: 'MULTI_ITEM_002',
              quantity: 250,
              status: 'pending',
              notes: 'Second batch items under inspection'
            }
          ]
        },
        {
          product: this.createdData.products[1]._id,
          batchNumber: 'MULTI_BATCH_002',
          quantity: 300,
          manufacturingDate: faker.date.past({ months: 3 }),
          expiryDate: faker.date.future({ years: 1 }),
          supplier: 'Multi Product Supplier B',
          items: [
            {
              itemId: 'MULTI_ITEM_003',
              quantity: 300,
              status: 'rejected',
              qcResult: 'fail',
              notes: 'Failed visual inspection - packaging damage'
            }
          ]
        }
      ],
      warehouse: this.createdData.warehouses[0]._id,
      assignedTo: qcInspectors[0]._id,
      createdBy: qcManagers[0]._id,
      dueDate: faker.date.future({ days: 5 }),
      notes: 'Complex multi-product QC inspection with mixed results'
    });

    await multiProductQC.save();
    this.createdData.qcRecords.push(multiProductQC);

    // Large batch QC record
    const largeBatchQC = new QualityControl({
      qcType: 'finished_goods',
      status: 'submitted',
      priority: 'medium',
      products: [{
        product: this.createdData.products[2]._id,
        batchNumber: 'LARGE_BATCH_001',
        quantity: 2000,
        manufacturingDate: faker.date.past({ months: 2 }),
        expiryDate: faker.date.future({ years: 3 }),
        supplier: 'Large Batch Manufacturer',
        items: Array.from({ length: 10 }, (_, i) => ({
          itemId: `LARGE_ITEM_${String(i + 1).padStart(3, '0')}`,
          quantity: 200,
          status: 'approved',
          qcResult: 'pass',
          notes: `Large batch item ${i + 1} approved`,
          inspectedBy: qcInspectors[1]._id,
          inspectionDate: faker.date.recent()
        }))
      }],
      warehouse: this.createdData.warehouses[1]._id,
      assignedTo: qcInspectors[1]._id,
      createdBy: qcManagers[1]._id,
      submittedAt: faker.date.recent(),
      submittedBy: qcInspectors[1]._id,
      dueDate: faker.date.future({ days: 10 }),
      notes: 'Large batch QC with multiple items - ready for approval'
    });

    await largeBatchQC.save();
    this.createdData.qcRecords.push(largeBatchQC);

    console.log('Created complex QC records with multi-product and large batch scenarios');
  }

  /**
   * Seed all QC test data
   */
  async seedAll() {
    try {
      console.log('Starting QC test data seeding...');
      
      await this.createTestUsers();
      await this.createTestProducts();
      await this.createTestWarehouses();
      await this.createQCRecords();
      await this.createScenarioBasedQCRecords();
      await this.createComplexQCRecords();
      
      console.log('QC test data seeding completed successfully!');
      console.log(`Total created: ${this.createdData.users.length} users, ${this.createdData.products.length} products, ${this.createdData.warehouses.length} warehouses, ${this.createdData.qcRecords.length} QC records`);
      
      return this.createdData;
    } catch (error) {
      console.error('Error seeding QC test data:', error);
      throw error;
    }
  }

  /**
   * Clean up all created test data
   */
  async cleanup() {
    try {
      console.log('Cleaning up QC test data...');
      
      await QualityControl.deleteMany({ _id: { $in: this.createdData.qcRecords.map(qc => qc._id) } });
      await Product.deleteMany({ _id: { $in: this.createdData.products.map(p => p._id) } });
      await Warehouse.deleteMany({ _id: { $in: this.createdData.warehouses.map(w => w._id) } });
      await User.deleteMany({ _id: { $in: this.createdData.users.map(u => u._id) } });
      
      console.log('QC test data cleanup completed');
    } catch (error) {
      console.error('Error cleaning up QC test data:', error);
      throw error;
    }
  }

  /**
   * Get specific test data by type
   */
  getTestData(type) {
    return this.createdData[type] || [];
  }

  /**
   * Get QC records by status
   */
  getQCRecordsByStatus(status) {
    return this.createdData.qcRecords.filter(qc => qc.status === status);
  }

  /**
   * Get QC records by type
   */
  getQCRecordsByType(qcType) {
    return this.createdData.qcRecords.filter(qc => qc.qcType === qcType);
  }

  /**
   * Get users by role
   */
  getUsersByRole(role) {
    return this.createdData.users.filter(u => u.role === role);
  }
}

// Export singleton instance
export const qcTestDataSeeder = new QCTestDataSeeder();

// Export individual functions for direct use
export const {
  seedAll: seedQCTestData,
  cleanup: cleanupQCTestData,
  getTestData: getQCTestData,
  getQCRecordsByStatus,
  getQCRecordsByType,
  getUsersByRole: getQCUsersByRole
} = qcTestDataSeeder;