// tests/unit/models/AuditLog.test.js
import mongoose from 'mongoose';
import AuditLog from '../../../models/AuditLog.js';
import {
  createTestUser,
  createTestPrincipal,
  createTestWarehouse,
  createTestProduct,
  createTestPurchaseOrder,
  createTestInvoiceReceiving,
  createTestQCRecord,
  createTestWarehouseApproval,
  cleanupTestData
} from '../../helpers/testHelpers.js';

describe('AuditLog Model Tests', () => {
  let testUser, testAdminUser, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving, testQCRecord, testWarehouseApproval;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test data
    testUser = await createTestUser();
    testAdminUser = await createTestUser({ role: 'admin' });
    testPrincipal = await createTestPrincipal();
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    testPO = await createTestPurchaseOrder(testPrincipal, [testProduct]);
    testInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
    testQCRecord = await createTestQCRecord(testInvoiceReceiving, testUser);
    testWarehouseApproval = await createTestWarehouseApproval(testQCRecord, testWarehouse, testUser);
  });

  describe('Schema Validation', () => {
    it('should create a valid audit log with required fields', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'QC record created successfully'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      expect(savedLog._id).toBeDefined();
      expect(savedLog.user.toString()).toBe(testUser._id.toString());
      expect(savedLog.action).toBe('create');
      expect(savedLog.resource).toBe('QualityControl');
      expect(savedLog.resourceId.toString()).toBe(testQCRecord._id.toString());
      expect(savedLog.details).toBe('QC record created successfully');
      expect(savedLog.timestamp).toBeDefined();
      expect(savedLog.timestamp).toBeInstanceOf(Date);
    });

    it('should require user field', async () => {
      const auditData = {
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      
      await expect(auditLog.save()).rejects.toThrow();
    });

    it('should require action field', async () => {
      const auditData = {
        user: testUser._id,
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      
      await expect(auditLog.save()).rejects.toThrow();
    });

    it('should require resource field', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      
      await expect(auditLog.save()).rejects.toThrow();
    });

    it('should validate action enum values', async () => {
      const auditData = {
        user: testUser._id,
        action: 'invalid_action',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      
      await expect(auditLog.save()).rejects.toThrow();
    });

    it('should validate resource enum values', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'InvalidResource',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      
      await expect(auditLog.save()).rejects.toThrow();
    });

    it('should validate severity enum values', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test action',
        severity: 'invalid_severity'
      };

      const auditLog = new AuditLog(auditData);
      
      await expect(auditLog.save()).rejects.toThrow();
    });
  });

  describe('Schema Defaults', () => {
    it('should set default timestamp to current date', async () => {
      const beforeCreate = new Date();
      
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      const afterCreate = new Date();

      expect(savedLog.timestamp).toBeInstanceOf(Date);
      expect(savedLog.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(savedLog.timestamp.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should set default severity to info', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      expect(savedLog.severity).toBe('info');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test action'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      expect(savedLog.createdAt).toBeDefined();
      expect(savedLog.updatedAt).toBeDefined();
      expect(savedLog.createdAt).toBeInstanceOf(Date);
      expect(savedLog.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Schema Methods and Virtuals', () => {
    it('should populate user field correctly', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'QC record created'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      const populatedLog = await AuditLog.findById(savedLog._id)
        .populate('user', 'name email role');

      expect(populatedLog.user.name).toBe(testUser.name);
      expect(populatedLog.user.email).toBe(testUser.email);
      expect(populatedLog.user.role).toBe(testUser.role);
    });

    it('should handle metadata and changes tracking', async () => {
      const auditData = {
        user: testUser._id,
        action: 'update',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'QC record status updated',
        changes: {
          before: { status: 'pending', assignedTo: null },
          after: { status: 'in_progress', assignedTo: testUser._id }
        },
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionId: 'session_123456',
          requestId: 'req_789012'
        }
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      expect(savedLog.changes.before.status).toBe('pending');
      expect(savedLog.changes.after.status).toBe('in_progress');
      expect(savedLog.metadata.ipAddress).toBe('192.168.1.100');
      expect(savedLog.metadata.sessionId).toBe('session_123456');
    });

    it('should handle different action types', async () => {
      const actions = ['create', 'read', 'update', 'delete', 'approve', 'reject', 'assign', 'submit'];
      const auditLogs = [];

      for (const action of actions) {
        const auditData = {
          user: testUser._id,
          action: action,
          resource: 'QualityControl',
          resourceId: testQCRecord._id,
          details: `QC record ${action} operation`
        };

        auditLogs.push(auditData);
      }

      const savedLogs = await AuditLog.insertMany(auditLogs);

      expect(savedLogs).toHaveLength(actions.length);
      savedLogs.forEach((log, index) => {
        expect(log.action).toBe(actions[index]);
      });
    });

    it('should handle different resource types', async () => {
      const resources = [
        { resource: 'QualityControl', resourceId: testQCRecord._id },
        { resource: 'WarehouseApproval', resourceId: testWarehouseApproval._id },
        { resource: 'Inventory', resourceId: new mongoose.Types.ObjectId() },
        { resource: 'User', resourceId: testUser._id },
        { resource: 'Product', resourceId: testProduct._id }
      ];

      const auditLogs = resources.map(({ resource, resourceId }) => ({
        user: testUser._id,
        action: 'create',
        resource: resource,
        resourceId: resourceId,
        details: `${resource} operation performed`
      }));

      const savedLogs = await AuditLog.insertMany(auditLogs);

      expect(savedLogs).toHaveLength(resources.length);
      savedLogs.forEach((log, index) => {
        expect(log.resource).toBe(resources[index].resource);
        expect(log.resourceId.toString()).toBe(resources[index].resourceId.toString());
      });
    });
  });

  describe('Severity Levels and Error Handling', () => {
    it('should handle different severity levels', async () => {
      const severityLevels = ['low', 'info', 'warning', 'error', 'critical'];
      const auditLogs = [];

      for (const severity of severityLevels) {
        const auditData = {
          user: testUser._id,
          action: 'update',
          resource: 'QualityControl',
          resourceId: testQCRecord._id,
          details: `Operation with ${severity} severity`,
          severity: severity
        };

        auditLogs.push(auditData);
      }

      const savedLogs = await AuditLog.insertMany(auditLogs);

      expect(savedLogs).toHaveLength(severityLevels.length);
      savedLogs.forEach((log, index) => {
        expect(log.severity).toBe(severityLevels[index]);
      });
    });

    it('should handle error logging with stack traces', async () => {
      const auditData = {
        user: testUser._id,
        action: 'update',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Operation failed with error',
        severity: 'error',
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          stack: 'Error: Validation failed\n    at validateQC (/app/controllers/qc.js:45:15)'
        }
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      expect(savedLog.error.message).toBe('Validation failed');
      expect(savedLog.error.code).toBe('VALIDATION_ERROR');
      expect(savedLog.error.stack).toContain('validateQC');
    });

    it('should handle security-related audit logs', async () => {
      const securityAuditData = {
        user: testUser._id,
        action: 'login',
        resource: 'User',
        resourceId: testUser._id,
        details: 'User login attempt',
        severity: 'info',
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          loginSuccess: true,
          mfaUsed: false,
          location: 'New York, US'
        }
      };

      const auditLog = new AuditLog(securityAuditData);
      const savedLog = await auditLog.save();

      expect(savedLog.metadata.loginSuccess).toBe(true);
      expect(savedLog.metadata.mfaUsed).toBe(false);
      expect(savedLog.metadata.location).toBe('New York, US');
    });
  });

  describe('Indexing and Queries', () => {
    beforeEach(async () => {
      // Create multiple audit logs for testing queries
      const auditLogs = [
        {
          user: testUser._id,
          action: 'create',
          resource: 'QualityControl',
          resourceId: testQCRecord._id,
          details: 'QC record created',
          severity: 'info'
        },
        {
          user: testUser._id,
          action: 'update',
          resource: 'QualityControl',
          resourceId: testQCRecord._id,
          details: 'QC record updated',
          severity: 'info'
        },
        {
          user: testAdminUser._id,
          action: 'approve',
          resource: 'QualityControl',
          resourceId: testQCRecord._id,
          details: 'QC record approved',
          severity: 'info'
        },
        {
          user: testUser._id,
          action: 'create',
          resource: 'WarehouseApproval',
          resourceId: testWarehouseApproval._id,
          details: 'Warehouse approval created',
          severity: 'info'
        },
        {
          user: testUser._id,
          action: 'delete',
          resource: 'Product',
          resourceId: testProduct._id,
          details: 'Product deletion failed',
          severity: 'error'
        }
      ];

      await AuditLog.insertMany(auditLogs);
    });

    it('should query by user', async () => {
      const userLogs = await AuditLog.find({ user: testUser._id });
      const adminLogs = await AuditLog.find({ user: testAdminUser._id });

      expect(userLogs).toHaveLength(4);
      expect(adminLogs).toHaveLength(1);
    });

    it('should query by action', async () => {
      const createLogs = await AuditLog.find({ action: 'create' });
      const updateLogs = await AuditLog.find({ action: 'update' });
      const approveLogs = await AuditLog.find({ action: 'approve' });
      const deleteLogs = await AuditLog.find({ action: 'delete' });

      expect(createLogs).toHaveLength(2);
      expect(updateLogs).toHaveLength(1);
      expect(approveLogs).toHaveLength(1);
      expect(deleteLogs).toHaveLength(1);
    });

    it('should query by resource', async () => {
      const qcLogs = await AuditLog.find({ resource: 'QualityControl' });
      const warehouseLogs = await AuditLog.find({ resource: 'WarehouseApproval' });
      const productLogs = await AuditLog.find({ resource: 'Product' });

      expect(qcLogs).toHaveLength(3);
      expect(warehouseLogs).toHaveLength(1);
      expect(productLogs).toHaveLength(1);
    });

    it('should query by resource ID', async () => {
      const qcRecordLogs = await AuditLog.find({ resourceId: testQCRecord._id });
      const warehouseApprovalLogs = await AuditLog.find({ resourceId: testWarehouseApproval._id });

      expect(qcRecordLogs).toHaveLength(3);
      expect(warehouseApprovalLogs).toHaveLength(1);
    });

    it('should query by severity', async () => {
      const infoLogs = await AuditLog.find({ severity: 'info' });
      const errorLogs = await AuditLog.find({ severity: 'error' });

      expect(infoLogs).toHaveLength(4);
      expect(errorLogs).toHaveLength(1);
    });

    it('should support compound queries', async () => {
      const userQCLogs = await AuditLog.find({
        user: testUser._id,
        resource: 'QualityControl'
      });

      const userCreateLogs = await AuditLog.find({
        user: testUser._id,
        action: 'create'
      });

      expect(userQCLogs).toHaveLength(2);
      expect(userCreateLogs).toHaveLength(2);
    });

    it('should support date range queries', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const todayLogs = await AuditLog.find({
        timestamp: {
          $gte: yesterday,
          $lte: tomorrow
        }
      });

      expect(todayLogs.length).toBeGreaterThan(0);
    });

    it('should support sorting and pagination', async () => {
      const recentLogs = await AuditLog.find({})
        .sort({ timestamp: -1 })
        .limit(3);

      const oldestLogs = await AuditLog.find({})
        .sort({ timestamp: 1 })
        .limit(2);

      expect(recentLogs).toHaveLength(3);
      expect(oldestLogs).toHaveLength(2);
      expect(recentLogs[0].timestamp.getTime()).toBeGreaterThanOrEqual(recentLogs[1].timestamp.getTime());
    });
  });

  describe('Model Updates and Immutability', () => {
    it('should update updatedAt timestamp on save', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'QC record created'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();
      const originalUpdatedAt = savedLog.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Audit logs are typically immutable, but we can add additional metadata
      savedLog.metadata = { processed: true };
      const updatedLog = await savedLog.save();

      expect(updatedLog.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should preserve audit trail integrity', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'QC record created',
        timestamp: new Date()
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      // Core audit fields should remain unchanged
      expect(savedLog.user.toString()).toBe(testUser._id.toString());
      expect(savedLog.action).toBe('create');
      expect(savedLog.resource).toBe('QualityControl');
      expect(savedLog.resourceId.toString()).toBe(testQCRecord._id.toString());
      expect(savedLog.details).toBe('QC record created');
    });
  });

  describe('Model Deletion and Retention', () => {
    it('should delete audit log successfully (for testing purposes)', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Test audit log'
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      await AuditLog.findByIdAndDelete(savedLog._id);

      const deletedLog = await AuditLog.findById(savedLog._id);
      expect(deletedLog).toBeNull();
    });

    it('should handle bulk operations for audit log cleanup', async () => {
      const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      
      const oldAuditLogs = [
        {
          user: testUser._id,
          action: 'create',
          resource: 'QualityControl',
          resourceId: testQCRecord._id,
          details: 'Old audit log 1',
          timestamp: oldDate
        },
        {
          user: testUser._id,
          action: 'update',
          resource: 'QualityControl',
          resourceId: testQCRecord._id,
          details: 'Old audit log 2',
          timestamp: oldDate
        }
      ];

      const savedLogs = await AuditLog.insertMany(oldAuditLogs);
      const logIds = savedLogs.map(log => log._id);

      // Simulate cleanup of old audit logs
      await AuditLog.deleteMany({
        timestamp: { $lt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } // Older than 6 months
      });

      const remainingLogs = await AuditLog.find({ _id: { $in: logIds } });
      expect(remainingLogs).toHaveLength(0);
    });

    it('should support archiving old audit logs', async () => {
      const auditData = {
        user: testUser._id,
        action: 'create',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'Audit log to be archived',
        metadata: { archived: false }
      };

      const auditLog = new AuditLog(auditData);
      const savedLog = await auditLog.save();

      // Mark as archived
      const archivedLog = await AuditLog.findByIdAndUpdate(
        savedLog._id,
        { 'metadata.archived': true, 'metadata.archivedAt': new Date() },
        { new: true }
      );

      expect(archivedLog.metadata.archived).toBe(true);
      expect(archivedLog.metadata.archivedAt).toBeInstanceOf(Date);
    });
  });

  describe('Business Logic and Compliance', () => {
    it('should handle compliance-related audit logs', async () => {
      const complianceAuditData = {
        user: testUser._id,
        action: 'approve',
        resource: 'QualityControl',
        resourceId: testQCRecord._id,
        details: 'QC record approved for regulatory compliance',
        severity: 'info',
        metadata: {
          complianceStandard: 'FDA 21 CFR Part 820',
          regulatoryRequirement: true,
          approvalAuthority: 'Quality Manager',
          documentationRequired: true
        }
      };

      const auditLog = new AuditLog(complianceAuditData);
      const savedLog = await auditLog.save();

      expect(savedLog.metadata.complianceStandard).toBe('FDA 21 CFR Part 820');
      expect(savedLog.metadata.regulatoryRequirement).toBe(true);
      expect(savedLog.metadata.approvalAuthority).toBe('Quality Manager');
    });

    it('should handle data privacy audit logs', async () => {
      const privacyAuditData = {
        user: testUser._id,
        action: 'read',
        resource: 'User',
        resourceId: testUser._id,
        details: 'Personal data accessed',
        severity: 'info',
        metadata: {
          dataType: 'PII',
          accessReason: 'User profile update',
          consentGiven: true,
          dataRetentionPeriod: '7 years'
        }
      };

      const auditLog = new AuditLog(privacyAuditData);
      const savedLog = await auditLog.save();

      expect(savedLog.metadata.dataType).toBe('PII');
      expect(savedLog.metadata.consentGiven).toBe(true);
      expect(savedLog.metadata.dataRetentionPeriod).toBe('7 years');
    });

    it('should handle system integration audit logs', async () => {
      const integrationAuditData = {
        user: testUser._id,
        action: 'sync',
        resource: 'Inventory',
        resourceId: new mongoose.Types.ObjectId(),
        details: 'Inventory data synchronized with external ERP system',
        severity: 'info',
        metadata: {
          externalSystem: 'SAP ERP',
          syncDirection: 'bidirectional',
          recordsProcessed: 150,
          syncDuration: '2.5 seconds',
          syncStatus: 'success'
        }
      };

      const auditLog = new AuditLog(integrationAuditData);
      const savedLog = await auditLog.save();

      expect(savedLog.metadata.externalSystem).toBe('SAP ERP');
      expect(savedLog.metadata.recordsProcessed).toBe(150);
      expect(savedLog.metadata.syncStatus).toBe('success');
    });
  });
});