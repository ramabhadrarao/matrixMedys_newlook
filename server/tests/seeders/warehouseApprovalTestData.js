// tests/seeders/warehouseApprovalTestData.js
import mongoose from 'mongoose';
import WarehouseApproval from '../../models/WarehouseApproval.js';
import QualityControl from '../../models/QualityControl.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Warehouse from '../../models/Warehouse.js';
import Inventory from '../../models/Inventory.js';
import { faker } from '@faker-js/faker';

/**
 * Warehouse Approval Test Data Seeder
 * Creates comprehensive test data for warehouse approval scenarios including:
 * - Various approval statuses and workflows
 * - Different storage locations and configurations
 * - Multiple user roles and assignments
 * - Integration with QC records and inventory
 * - Complex approval scenarios
 */

export class WarehouseApprovalTestDataSeeder {
  constructor() {
    this.createdData = {
      users: [],
      products: [],
      warehouses: [],
      qcRecords: [],
      warehouseApprovals: [],
      inventoryRecords: []
    };
  }

  /**
   * Create test users with warehouse-specific roles
   */
  async createTestUsers() {
    const userRoles = [
      { role: 'warehouse_staff', permissions: ['read_warehouse', 'create_warehouse_approval', 'update_warehouse_approval'] },
      { role: 'warehouse_manager', permissions: ['read_warehouse', 'create_warehouse_approval', 'update_warehouse_approval', 'approve_warehouse', 'assign_warehouse'] },
      { role: 'inventory_manager', permissions: ['read_warehouse', 'read_inventory', 'create_inventory', 'update_inventory'] },
      { role: 'admin', permissions: ['*'] },
      { role: 'qc_inspector', permissions: ['read_qc', 'create_qc', 'update_qc'] }
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
          department: userRole.role.includes('warehouse') ? 'Warehouse' : 
                     userRole.role.includes('inventory') ? 'Inventory' : 
                     userRole.role.includes('qc') ? 'Quality Control' : 'Administration',
          employeeId: faker.string.alphanumeric(8).toUpperCase()
        });

        await user.save();
        this.createdData.users.push(user);
      }
    }

    console.log(`Created ${this.createdData.users.length} test users for warehouse approval`);
    return this.createdData.users;
  }

  /**
   * Create test products for warehouse approval
   */
  async createTestProducts() {
    const productCategories = [
      { category: 'Pharmaceuticals', subcategory: 'Tablets', storageTemp: 'room_temperature' },
      { category: 'Pharmaceuticals', subcategory: 'Injections', storageTemp: 'refrigerated' },
      { category: 'Medical Devices', subcategory: 'Surgical Instruments', storageTemp: 'room_temperature' },
      { category: 'Biologics', subcategory: 'Vaccines', storageTemp: 'frozen' },
      { category: 'Consumables', subcategory: 'Disposables', storageTemp: 'room_temperature' }
    ];

    for (const productCat of productCategories) {
      for (let i = 0; i < 4; i++) {
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
          storageConditions: productCat.storageTemp,
          handlingInstructions: faker.lorem.sentence(),
          hazardousClassification: faker.helpers.arrayElement(['none', 'flammable', 'toxic', 'corrosive'])
        });

        await product.save();
        this.createdData.products.push(product);
      }
    }

    console.log(`Created ${this.createdData.products.length} test products`);
    return this.createdData.products;
  }

  /**
   * Create test warehouses with different storage capabilities
   */
  async createTestWarehouses() {
    const warehouseConfigs = [
      {
        name: 'Main Distribution Center',
        code: 'MDC01',
        type: 'main',
        hasQCFacility: true,
        storageZones: [
          { zone: 'A1', capacity: 2000, temperature: 'room_temperature', type: 'general' },
          { zone: 'A2', capacity: 1500, temperature: 'room_temperature', type: 'pharmaceuticals' },
          { zone: 'B1', capacity: 1000, temperature: 'refrigerated', type: 'cold_storage' },
          { zone: 'C1', capacity: 500, temperature: 'frozen', type: 'frozen_storage' },
          { zone: 'Q1', capacity: 300, temperature: 'room_temperature', type: 'quarantine' }
        ]
      },
      {
        name: 'Regional Warehouse North',
        code: 'RWN01',
        type: 'satellite',
        hasQCFacility: false,
        storageZones: [
          { zone: 'N1', capacity: 1000, temperature: 'room_temperature', type: 'general' },
          { zone: 'N2', capacity: 800, temperature: 'room_temperature', type: 'pharmaceuticals' },
          { zone: 'N3', capacity: 400, temperature: 'refrigerated', type: 'cold_storage' }
        ]
      },
      {
        name: 'Cold Storage Facility',
        code: 'CSF01',
        type: 'cold_storage',
        hasQCFacility: true,
        storageZones: [
          { zone: 'C1', capacity: 800, temperature: 'refrigerated', type: 'vaccines' },
          { zone: 'C2', capacity: 600, temperature: 'refrigerated', type: 'biologics' },
          { zone: 'F1', capacity: 400, temperature: 'frozen', type: 'frozen_biologics' }
        ]
      },
      {
        name: 'Quarantine Warehouse',
        code: 'QW01',
        type: 'quarantine',
        hasQCFacility: true,
        storageZones: [
          { zone: 'Q1', capacity: 500, temperature: 'room_temperature', type: 'quarantine_general' },
          { zone: 'Q2', capacity: 300, temperature: 'refrigerated', type: 'quarantine_cold' },
          { zone: 'Q3', capacity: 200, temperature: 'controlled', type: 'quarantine_controlled' }
        ]
      }
    ];

    for (const config of warehouseConfigs) {
      const warehouse = new Warehouse({
        name: config.name,
        code: config.code,
        type: config.type,
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          country: 'USA'
        },
        capacity: config.storageZones.reduce((sum, zone) => sum + zone.capacity, 0),
        isActive: true,
        hasQCFacility: config.hasQCFacility,
        storageZones: config.storageZones,
        operatingHours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '15:00' },
          sunday: { closed: true }
        }
      });

      await warehouse.save();
      this.createdData.warehouses.push(warehouse);
    }

    console.log(`Created ${this.createdData.warehouses.length} test warehouses`);
    return this.createdData.warehouses;
  }

  /**
   * Create approved QC records for warehouse approval
   */
  async createApprovedQCRecords() {
    const qcInspectors = this.createdData.users.filter(u => u.role === 'qc_inspector');
    const qcManagers = this.createdData.users.filter(u => u.role === 'warehouse_manager'); // Using warehouse managers as QC approvers

    for (let i = 0; i < 30; i++) {
      const product = faker.helpers.arrayElement(this.createdData.products);
      const warehouse = faker.helpers.arrayElement(this.createdData.warehouses);
      const inspector = faker.helpers.arrayElement(qcInspectors);
      const manager = faker.helpers.arrayElement(qcManagers);

      const qcRecord = new QualityControl({
        qcType: faker.helpers.arrayElement(['incoming', 'finished_goods']),
        status: 'approved',
        priority: faker.helpers.arrayElement(['medium', 'high']),
        products: [{
          product: product._id,
          batchNumber: `QC_BATCH_${faker.string.alphanumeric(8).toUpperCase()}`,
          quantity: faker.number.int({ min: 100, max: 1000 }),
          manufacturingDate: faker.date.past({ years: 1 }),
          expiryDate: faker.date.future({ years: 2 }),
          supplier: faker.company.name(),
          items: [{
            itemId: `QC_ITEM_${faker.string.alphanumeric(6).toUpperCase()}`,
            quantity: faker.number.int({ min: 50, max: 500 }),
            status: 'approved',
            qcResult: 'pass',
            notes: 'QC inspection passed - ready for warehouse approval',
            inspectedBy: inspector._id,
            inspectionDate: faker.date.recent({ days: 7 })
          }]
        }],
        warehouse: warehouse._id,
        assignedTo: inspector._id,
        createdBy: manager._id,
        submittedAt: faker.date.recent({ days: 5 }),
        submittedBy: inspector._id,
        approvedAt: faker.date.recent({ days: 2 }),
        approvedBy: manager._id,
        qcResult: 'pass',
        overallResult: 'pass',
        dueDate: faker.date.future({ days: 30 }),
        notes: 'QC completed successfully - approved for warehouse storage',
        inspectionResults: {
          visualInspection: {
            result: 'pass',
            notes: 'Visual inspection passed',
            inspectedBy: inspector._id,
            inspectionDate: faker.date.recent({ days: 3 })
          },
          packagingIntegrity: {
            result: 'pass',
            notes: 'Packaging integrity verified',
            inspectedBy: inspector._id,
            inspectionDate: faker.date.recent({ days: 3 })
          },
          overallResult: 'pass',
          notes: 'All QC parameters within acceptable limits',
          inspectedBy: inspector._id,
          inspectionDate: faker.date.recent({ days: 2 })
        }
      });

      await qcRecord.save();
      this.createdData.qcRecords.push(qcRecord);
    }

    console.log(`Created ${this.createdData.qcRecords.length} approved QC records`);
    return this.createdData.qcRecords;
  }

  /**
   * Create warehouse approval records with various scenarios
   */
  async createWarehouseApprovalRecords() {
    const statuses = ['pending', 'in_progress', 'submitted', 'approved', 'rejected'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const storageLocations = ['general', 'pharmaceuticals', 'cold_storage', 'frozen_storage', 'quarantine'];
    
    const warehouseStaff = this.createdData.users.filter(u => u.role === 'warehouse_staff');
    const warehouseManagers = this.createdData.users.filter(u => u.role === 'warehouse_manager');

    for (let i = 0; i < 40; i++) {
      const status = faker.helpers.arrayElement(statuses);
      const priority = faker.helpers.arrayElement(priorities);
      const qcRecord = faker.helpers.arrayElement(this.createdData.qcRecords);
      const warehouse = this.createdData.warehouses.find(w => w._id.equals(qcRecord.warehouse));
      const staff = faker.helpers.arrayElement(warehouseStaff);
      const manager = faker.helpers.arrayElement(warehouseManagers);
      
      // Select appropriate storage zone based on product requirements
      const product = await Product.findById(qcRecord.products[0].product);
      const suitableZones = warehouse.storageZones.filter(zone => {
        if (product.storageConditions === 'refrigerated') return zone.temperature === 'refrigerated';
        if (product.storageConditions === 'frozen') return zone.temperature === 'frozen';
        return zone.temperature === 'room_temperature' || zone.temperature === 'controlled';
      });
      
      const selectedZone = faker.helpers.arrayElement(suitableZones);
      const storageLocation = `${warehouse.code}-${selectedZone.zone}-${faker.string.alphanumeric(4).toUpperCase()}`;

      // Create products array with warehouse-specific information
      const products = [{
        product: qcRecord.products[0].product,
        batchNumber: qcRecord.products[0].batchNumber,
        quantity: qcRecord.products[0].quantity,
        manufacturingDate: qcRecord.products[0].manufacturingDate,
        expiryDate: qcRecord.products[0].expiryDate,
        supplier: qcRecord.products[0].supplier,
        storageLocation: storageLocation,
        storageConditions: product.storageConditions,
        items: qcRecord.products[0].items.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          status: status === 'pending' ? 'pending' : 
                 status === 'approved' ? 'approved' : 
                 status === 'rejected' ? 'rejected' : 
                 faker.helpers.arrayElement(['pending', 'approved']),
          storageLocation: `${storageLocation}-${faker.string.alphanumeric(2)}`,
          notes: status !== 'pending' ? faker.lorem.sentence() : null,
          inspectedBy: status !== 'pending' ? staff._id : null,
          inspectionDate: status !== 'pending' ? faker.date.recent() : null
        }))
      }];

      const warehouseApproval = new WarehouseApproval({
        qcRecord: qcRecord._id,
        status: status,
        priority: priority,
        products: products,
        warehouse: warehouse._id,
        assignedTo: staff._id,
        createdBy: manager._id,
        dueDate: faker.date.future({ days: 15 }),
        notes: faker.lorem.paragraph(),
        
        // Add workflow fields based on status
        ...(status === 'submitted' && {
          submittedAt: faker.date.recent({ days: 2 }),
          submittedBy: staff._id,
          storageInstructions: faker.lorem.sentence(),
          handlingNotes: faker.lorem.sentence()
        }),
        
        ...(status === 'approved' && {
          submittedAt: faker.date.recent({ days: 5 }),
          submittedBy: staff._id,
          approvedAt: faker.date.recent({ days: 1 }),
          approvedBy: manager._id,
          approvalResult: 'approved',
          storageInstructions: 'Store in designated area with proper temperature control',
          handlingNotes: 'Handle with care - fragile items',
          inventoryCreated: true,
          inventoryCreatedAt: faker.date.recent()
        }),
        
        ...(status === 'rejected' && {
          submittedAt: faker.date.recent({ days: 5 }),
          submittedBy: staff._id,
          rejectedAt: faker.date.recent({ days: 1 }),
          rejectedBy: manager._id,
          rejectionReason: faker.helpers.arrayElement([
            'insufficient_storage_space',
            'incorrect_storage_conditions',
            'damaged_packaging',
            'missing_documentation',
            'storage_location_unavailable'
          ]),
          approvalResult: 'rejected'
        }),

        // Add inspection results for completed records
        ...((['approved', 'rejected'].includes(status)) && {
          inspectionResults: {
            storageConditionCheck: {
              result: status === 'approved' ? 'pass' : 'fail',
              notes: status === 'approved' ? 'Storage conditions verified' : 'Storage conditions not suitable',
              inspectedBy: staff._id,
              inspectionDate: faker.date.recent()
            },
            spaceAvailability: {
              result: status === 'approved' ? 'pass' : 'fail',
              notes: status === 'approved' ? 'Adequate space available' : 'Insufficient storage space',
              inspectedBy: staff._id,
              inspectionDate: faker.date.recent()
            },
            documentationCheck: {
              result: 'pass',
              notes: 'All required documentation present',
              inspectedBy: staff._id,
              inspectionDate: faker.date.recent()
            },
            overallResult: status === 'approved' ? 'pass' : 'fail',
            notes: status === 'approved' ? 'All warehouse requirements met' : 'Warehouse requirements not satisfied',
            inspectedBy: staff._id,
            inspectionDate: faker.date.recent()
          }
        })
      });

      await warehouseApproval.save();
      this.createdData.warehouseApprovals.push(warehouseApproval);
    }

    console.log(`Created ${this.createdData.warehouseApprovals.length} warehouse approval records`);
    return this.createdData.warehouseApprovals;
  }

  /**
   * Create scenario-based warehouse approval records
   */
  async createScenarioBasedApprovals() {
    const scenarios = [
      {
        name: 'urgent_vaccine_storage',
        priority: 'urgent',
        status: 'pending',
        storageType: 'frozen_storage',
        notes: 'Urgent vaccine batch requiring immediate frozen storage',
        dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000) // Due in 6 hours
      },
      {
        name: 'cold_chain_breach',
        priority: 'high',
        status: 'rejected',
        storageType: 'cold_storage',
        rejectionReason: 'cold_chain_breach',
        notes: 'Cold chain breach detected during transport - rejected for storage'
      },
      {
        name: 'quarantine_storage',
        priority: 'high',
        status: 'in_progress',
        storageType: 'quarantine',
        notes: 'Suspected contamination - requires quarantine storage pending investigation'
      },
      {
        name: 'bulk_pharmaceutical_storage',
        priority: 'medium',
        status: 'approved',
        storageType: 'pharmaceuticals',
        notes: 'Large pharmaceutical batch approved for general pharmaceutical storage'
      },
      {
        name: 'temperature_sensitive_biologics',
        priority: 'high',
        status: 'submitted',
        storageType: 'cold_storage',
        notes: 'Temperature-sensitive biologics requiring specialized cold storage'
      }
    ];

    const warehouseStaff = this.createdData.users.filter(u => u.role === 'warehouse_staff');
    const warehouseManagers = this.createdData.users.filter(u => u.role === 'warehouse_manager');

    for (const scenario of scenarios) {
      const qcRecord = faker.helpers.arrayElement(this.createdData.qcRecords);
      const warehouse = this.createdData.warehouses.find(w => w._id.equals(qcRecord.warehouse));
      const staff = faker.helpers.arrayElement(warehouseStaff);
      const manager = faker.helpers.arrayElement(warehouseManagers);

      // Find appropriate storage zone for scenario
      const suitableZone = warehouse.storageZones.find(zone => 
        zone.type.includes(scenario.storageType) || 
        (scenario.storageType === 'frozen_storage' && zone.temperature === 'frozen') ||
        (scenario.storageType === 'cold_storage' && zone.temperature === 'refrigerated') ||
        (scenario.storageType === 'quarantine' && zone.type.includes('quarantine'))
      ) || warehouse.storageZones[0];

      const storageLocation = `${warehouse.code}-${suitableZone.zone}-${scenario.name.toUpperCase()}`;

      const warehouseApproval = new WarehouseApproval({
        qcRecord: qcRecord._id,
        status: scenario.status,
        priority: scenario.priority,
        products: [{
          product: qcRecord.products[0].product,
          batchNumber: `${scenario.name.toUpperCase()}_BATCH`,
          quantity: faker.number.int({ min: 200, max: 800 }),
          manufacturingDate: faker.date.past({ months: 6 }),
          expiryDate: faker.date.future({ years: 2 }),
          supplier: `${scenario.name} Supplier`,
          storageLocation: storageLocation,
          storageConditions: suitableZone.temperature,
          items: [{
            itemId: `${scenario.name.toUpperCase()}_ITEM001`,
            quantity: faker.number.int({ min: 100, max: 400 }),
            status: scenario.status === 'approved' ? 'approved' : 
                   scenario.status === 'rejected' ? 'rejected' : 'pending',
            storageLocation: `${storageLocation}-01`,
            notes: scenario.notes
          }]
        }],
        warehouse: warehouse._id,
        assignedTo: staff._id,
        createdBy: manager._id,
        dueDate: scenario.dueDate || faker.date.future({ days: 7 }),
        notes: scenario.notes,
        rejectionReason: scenario.rejectionReason || null,
        
        // Add timestamps based on status
        ...(scenario.status === 'submitted' && {
          submittedAt: faker.date.recent(),
          submittedBy: staff._id,
          storageInstructions: `Special handling required for ${scenario.name}`,
          handlingNotes: 'Follow specialized storage protocols'
        }),
        
        ...(scenario.status === 'approved' && {
          submittedAt: faker.date.recent({ days: 3 }),
          submittedBy: staff._id,
          approvedAt: faker.date.recent(),
          approvedBy: manager._id,
          approvalResult: 'approved',
          inventoryCreated: true,
          inventoryCreatedAt: faker.date.recent()
        }),
        
        ...(scenario.status === 'rejected' && {
          submittedAt: faker.date.recent({ days: 3 }),
          submittedBy: staff._id,
          rejectedAt: faker.date.recent(),
          rejectedBy: manager._id,
          approvalResult: 'rejected'
        })
      });

      await warehouseApproval.save();
      this.createdData.warehouseApprovals.push(warehouseApproval);
    }

    console.log(`Created ${scenarios.length} scenario-based warehouse approval records`);
  }

  /**
   * Create inventory records for approved warehouse approvals
   */
  async createInventoryRecords() {
    const approvedApprovals = this.createdData.warehouseApprovals.filter(wa => wa.status === 'approved');
    const inventoryManagers = this.createdData.users.filter(u => u.role === 'inventory_manager');

    for (const approval of approvedApprovals) {
      const manager = faker.helpers.arrayElement(inventoryManagers);
      
      for (const product of approval.products) {
        const inventory = new Inventory({
          product: product.product,
          warehouse: approval.warehouse,
          batchNumber: product.batchNumber,
          quantity: product.quantity,
          availableQuantity: product.quantity,
          reservedQuantity: 0,
          unitCost: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
          totalValue: faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 }),
          manufacturingDate: product.manufacturingDate,
          expiryDate: product.expiryDate,
          supplier: product.supplier,
          storageLocation: product.storageLocation,
          storageConditions: product.storageConditions,
          status: 'available',
          qcRecord: approval.qcRecord,
          warehouseApproval: approval._id,
          createdBy: manager._id,
          lastUpdatedBy: manager._id,
          notes: `Inventory created from warehouse approval ${approval._id}`,
          
          // Add some transaction history
          transactions: [{
            type: 'receipt',
            quantity: product.quantity,
            reason: 'warehouse_approval',
            performedBy: manager._id,
            date: faker.date.recent(),
            notes: 'Initial inventory receipt from warehouse approval'
          }]
        });

        await inventory.save();
        this.createdData.inventoryRecords.push(inventory);
      }
    }

    console.log(`Created ${this.createdData.inventoryRecords.length} inventory records`);
    return this.createdData.inventoryRecords;
  }

  /**
   * Create complex warehouse approval scenarios
   */
  async createComplexApprovalScenarios() {
    const warehouseStaff = this.createdData.users.filter(u => u.role === 'warehouse_staff');
    const warehouseManagers = this.createdData.users.filter(u => u.role === 'warehouse_manager');

    // Multi-warehouse approval scenario
    const multiWarehouseQC = faker.helpers.arrayElement(this.createdData.qcRecords);
    const multiWarehouseApproval = new WarehouseApproval({
      qcRecord: multiWarehouseQC._id,
      status: 'in_progress',
      priority: 'high',
      products: [{
        product: multiWarehouseQC.products[0].product,
        batchNumber: 'MULTI_WH_BATCH_001',
        quantity: 1000,
        manufacturingDate: faker.date.past({ months: 3 }),
        expiryDate: faker.date.future({ years: 2 }),
        supplier: 'Multi Warehouse Supplier',
        storageLocation: 'SPLIT_STORAGE',
        storageConditions: 'room_temperature',
        items: [
          {
            itemId: 'MULTI_WH_ITEM_001',
            quantity: 500,
            status: 'approved',
            storageLocation: 'MDC01-A1-001',
            notes: 'First half approved for main warehouse'
          },
          {
            itemId: 'MULTI_WH_ITEM_002',
            quantity: 500,
            status: 'pending',
            storageLocation: 'RWN01-N1-001',
            notes: 'Second half pending approval for regional warehouse'
          }
        ]
      }],
      warehouse: this.createdData.warehouses[0]._id,
      assignedTo: warehouseStaff[0]._id,
      createdBy: warehouseManagers[0]._id,
      dueDate: faker.date.future({ days: 3 }),
      notes: 'Complex multi-warehouse storage scenario with split inventory'
    });

    await multiWarehouseApproval.save();
    this.createdData.warehouseApprovals.push(multiWarehouseApproval);

    // Temperature excursion scenario
    const tempExcursionQC = faker.helpers.arrayElement(this.createdData.qcRecords);
    const tempExcursionApproval = new WarehouseApproval({
      qcRecord: tempExcursionQC._id,
      status: 'rejected',
      priority: 'urgent',
      products: [{
        product: tempExcursionQC.products[0].product,
        batchNumber: 'TEMP_EXCURSION_BATCH',
        quantity: 300,
        manufacturingDate: faker.date.past({ months: 2 }),
        expiryDate: faker.date.future({ years: 1 }),
        supplier: 'Temperature Sensitive Supplier',
        storageLocation: 'REJECTED',
        storageConditions: 'refrigerated',
        items: [{
          itemId: 'TEMP_EXCURSION_ITEM_001',
          quantity: 300,
          status: 'rejected',
          storageLocation: 'QUARANTINE',
          notes: 'Temperature excursion detected during transport'
        }]
      }],
      warehouse: this.createdData.warehouses.find(w => w.type === 'cold_storage')._id,
      assignedTo: warehouseStaff[1]._id,
      createdBy: warehouseManagers[1]._id,
      submittedAt: faker.date.recent({ days: 2 }),
      submittedBy: warehouseStaff[1]._id,
      rejectedAt: faker.date.recent(),
      rejectedBy: warehouseManagers[1]._id,
      rejectionReason: 'temperature_excursion',
      approvalResult: 'rejected',
      dueDate: faker.date.recent(),
      notes: 'Rejected due to temperature excursion during transport - product integrity compromised'
    });

    await tempExcursionApproval.save();
    this.createdData.warehouseApprovals.push(tempExcursionApproval);

    console.log('Created complex warehouse approval scenarios');
  }

  /**
   * Seed all warehouse approval test data
   */
  async seedAll() {
    try {
      console.log('Starting warehouse approval test data seeding...');
      
      await this.createTestUsers();
      await this.createTestProducts();
      await this.createTestWarehouses();
      await this.createApprovedQCRecords();
      await this.createWarehouseApprovalRecords();
      await this.createScenarioBasedApprovals();
      await this.createInventoryRecords();
      await this.createComplexApprovalScenarios();
      
      console.log('Warehouse approval test data seeding completed successfully!');
      console.log(`Total created: ${this.createdData.users.length} users, ${this.createdData.products.length} products, ${this.createdData.warehouses.length} warehouses, ${this.createdData.qcRecords.length} QC records, ${this.createdData.warehouseApprovals.length} warehouse approvals, ${this.createdData.inventoryRecords.length} inventory records`);
      
      return this.createdData;
    } catch (error) {
      console.error('Error seeding warehouse approval test data:', error);
      throw error;
    }
  }

  /**
   * Clean up all created test data
   */
  async cleanup() {
    try {
      console.log('Cleaning up warehouse approval test data...');
      
      await Inventory.deleteMany({ _id: { $in: this.createdData.inventoryRecords.map(i => i._id) } });
      await WarehouseApproval.deleteMany({ _id: { $in: this.createdData.warehouseApprovals.map(wa => wa._id) } });
      await QualityControl.deleteMany({ _id: { $in: this.createdData.qcRecords.map(qc => qc._id) } });
      await Product.deleteMany({ _id: { $in: this.createdData.products.map(p => p._id) } });
      await Warehouse.deleteMany({ _id: { $in: this.createdData.warehouses.map(w => w._id) } });
      await User.deleteMany({ _id: { $in: this.createdData.users.map(u => u._id) } });
      
      console.log('Warehouse approval test data cleanup completed');
    } catch (error) {
      console.error('Error cleaning up warehouse approval test data:', error);
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
   * Get warehouse approvals by status
   */
  getWarehouseApprovalsByStatus(status) {
    return this.createdData.warehouseApprovals.filter(wa => wa.status === status);
  }

  /**
   * Get warehouse approvals by warehouse
   */
  getWarehouseApprovalsByWarehouse(warehouseId) {
    return this.createdData.warehouseApprovals.filter(wa => wa.warehouse.equals(warehouseId));
  }

  /**
   * Get users by role
   */
  getUsersByRole(role) {
    return this.createdData.users.filter(u => u.role === role);
  }

  /**
   * Get inventory records by warehouse
   */
  getInventoryByWarehouse(warehouseId) {
    return this.createdData.inventoryRecords.filter(i => i.warehouse.equals(warehouseId));
  }
}

// Export singleton instance
export const warehouseApprovalTestDataSeeder = new WarehouseApprovalTestDataSeeder();

// Export individual functions for direct use
export const {
  seedAll: seedWarehouseApprovalTestData,
  cleanup: cleanupWarehouseApprovalTestData,
  getTestData: getWarehouseApprovalTestData,
  getWarehouseApprovalsByStatus,
  getWarehouseApprovalsByWarehouse,
  getUsersByRole: getWarehouseApprovalUsersByRole,
  getInventoryByWarehouse
} = warehouseApprovalTestDataSeeder;