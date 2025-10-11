// tests/unit/models/Notification.test.js
import mongoose from 'mongoose';
import Notification from '../../../models/Notification.js';
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

describe('Notification Model Tests', () => {
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
    it('should create a valid notification with required fields', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'QC Record Assigned',
        message: 'A new QC record has been assigned to you',
        type: 'qc_assignment',
        relatedModel: 'QualityControl',
        relatedId: testQCRecord._id
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification._id).toBeDefined();
      expect(savedNotification.recipient.toString()).toBe(testUser._id.toString());
      expect(savedNotification.title).toBe('QC Record Assigned');
      expect(savedNotification.message).toBe('A new QC record has been assigned to you');
      expect(savedNotification.type).toBe('qc_assignment');
      expect(savedNotification.relatedModel).toBe('QualityControl');
      expect(savedNotification.relatedId.toString()).toBe(testQCRecord._id.toString());
      expect(savedNotification.createdAt).toBeDefined();
      expect(savedNotification.updatedAt).toBeDefined();
    });

    it('should require recipient field', async () => {
      const notificationData = {
        title: 'Test Notification',
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should require title field', async () => {
      const notificationData = {
        recipient: testUser._id,
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should require message field', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should require type field', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate type enum values', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'invalid_type'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate priority enum values', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system',
        priority: 'invalid_priority'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate relatedModel enum values', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system',
        relatedModel: 'InvalidModel',
        relatedId: new mongoose.Types.ObjectId()
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate channel enum values', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system',
        channels: ['invalid_channel']
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow();
    });
  });

  describe('Schema Defaults', () => {
    it('should set default read status to false', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.read).toBe(false);
    });

    it('should set default priority to medium', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.priority).toBe('medium');
    });

    it('should set default channels to in_app', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.channels).toEqual(['in_app']);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.createdAt).toBeDefined();
      expect(savedNotification.updatedAt).toBeDefined();
      expect(savedNotification.createdAt).toBeInstanceOf(Date);
      expect(savedNotification.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Schema Methods and Virtuals', () => {
    it('should populate recipient field correctly', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system',
        sender: testAdminUser._id
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      const populatedNotification = await Notification.findById(savedNotification._id)
        .populate('recipient', 'name email role')
        .populate('sender', 'name email role');

      expect(populatedNotification.recipient.name).toBe(testUser.name);
      expect(populatedNotification.recipient.email).toBe(testUser.email);
      expect(populatedNotification.sender.name).toBe(testAdminUser.name);
      expect(populatedNotification.sender.email).toBe(testAdminUser.email);
    });

    it('should handle related model references', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'QC Record Updated',
        message: 'QC record has been updated',
        type: 'qc_update',
        relatedModel: 'QualityControl',
        relatedId: testQCRecord._id
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.relatedModel).toBe('QualityControl');
      expect(savedNotification.relatedId.toString()).toBe(testQCRecord._id.toString());
    });

    it('should handle multiple channels', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'High Priority Alert',
        message: 'Urgent action required',
        type: 'alert',
        priority: 'high',
        channels: ['in_app', 'email', 'sms']
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.channels).toEqual(['in_app', 'email', 'sms']);
      expect(savedNotification.priority).toBe('high');
    });

    it('should handle delivery status tracking', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system',
        channels: ['in_app', 'email'],
        deliveryStatus: {
          in_app: { delivered: true, deliveredAt: new Date() },
          email: { delivered: false, error: 'SMTP server unavailable' }
        }
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.deliveryStatus.in_app.delivered).toBe(true);
      expect(savedNotification.deliveryStatus.in_app.deliveredAt).toBeInstanceOf(Date);
      expect(savedNotification.deliveryStatus.email.delivered).toBe(false);
      expect(savedNotification.deliveryStatus.email.error).toBe('SMTP server unavailable');
    });
  });

  describe('Notification Types and Categories', () => {
    it('should handle QC-related notifications', async () => {
      const qcNotifications = [
        {
          recipient: testUser._id,
          title: 'QC Record Assigned',
          message: 'A new QC record has been assigned to you',
          type: 'qc_assignment',
          relatedModel: 'QualityControl',
          relatedId: testQCRecord._id
        },
        {
          recipient: testUser._id,
          title: 'QC Record Approved',
          message: 'QC record has been approved',
          type: 'qc_approval',
          relatedModel: 'QualityControl',
          relatedId: testQCRecord._id
        },
        {
          recipient: testUser._id,
          title: 'QC Record Rejected',
          message: 'QC record has been rejected',
          type: 'qc_rejection',
          relatedModel: 'QualityControl',
          relatedId: testQCRecord._id,
          priority: 'high'
        }
      ];

      const savedNotifications = await Notification.insertMany(qcNotifications);

      expect(savedNotifications).toHaveLength(3);
      expect(savedNotifications[0].type).toBe('qc_assignment');
      expect(savedNotifications[1].type).toBe('qc_approval');
      expect(savedNotifications[2].type).toBe('qc_rejection');
      expect(savedNotifications[2].priority).toBe('high');
    });

    it('should handle warehouse approval notifications', async () => {
      const warehouseNotifications = [
        {
          recipient: testUser._id,
          title: 'Warehouse Approval Assigned',
          message: 'A warehouse approval task has been assigned to you',
          type: 'warehouse_assignment',
          relatedModel: 'WarehouseApproval',
          relatedId: testWarehouseApproval._id
        },
        {
          recipient: testUser._id,
          title: 'Warehouse Approval Completed',
          message: 'Warehouse approval has been completed',
          type: 'warehouse_approval',
          relatedModel: 'WarehouseApproval',
          relatedId: testWarehouseApproval._id
        }
      ];

      const savedNotifications = await Notification.insertMany(warehouseNotifications);

      expect(savedNotifications).toHaveLength(2);
      expect(savedNotifications[0].type).toBe('warehouse_assignment');
      expect(savedNotifications[1].type).toBe('warehouse_approval');
    });

    it('should handle inventory-related notifications', async () => {
      const inventoryNotifications = [
        {
          recipient: testUser._id,
          title: 'Low Stock Alert',
          message: 'Product stock is running low',
          type: 'inventory_alert',
          priority: 'high',
          metadata: {
            alertType: 'low_stock',
            productId: testProduct._id,
            currentStock: 5,
            minimumStock: 10
          }
        },
        {
          recipient: testUser._id,
          title: 'Expiry Alert',
          message: 'Products are nearing expiry',
          type: 'inventory_alert',
          priority: 'high',
          metadata: {
            alertType: 'near_expiry',
            productId: testProduct._id,
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      ];

      const savedNotifications = await Notification.insertMany(inventoryNotifications);

      expect(savedNotifications).toHaveLength(2);
      expect(savedNotifications[0].metadata.alertType).toBe('low_stock');
      expect(savedNotifications[1].metadata.alertType).toBe('near_expiry');
    });

    it('should handle system notifications', async () => {
      const systemNotifications = [
        {
          recipient: testUser._id,
          title: 'System Maintenance',
          message: 'System will be under maintenance tonight',
          type: 'system',
          priority: 'medium',
          channels: ['in_app', 'email']
        },
        {
          recipient: testUser._id,
          title: 'Security Alert',
          message: 'Unusual login activity detected',
          type: 'security',
          priority: 'high',
          channels: ['in_app', 'email', 'sms']
        }
      ];

      const savedNotifications = await Notification.insertMany(systemNotifications);

      expect(savedNotifications).toHaveLength(2);
      expect(savedNotifications[0].type).toBe('system');
      expect(savedNotifications[1].type).toBe('security');
      expect(savedNotifications[1].channels).toEqual(['in_app', 'email', 'sms']);
    });
  });

  describe('Indexing and Queries', () => {
    beforeEach(async () => {
      // Create multiple notifications for testing queries
      const notifications = [
        {
          recipient: testUser._id,
          title: 'Unread Notification 1',
          message: 'Test message 1',
          type: 'qc_assignment',
          read: false,
          priority: 'high'
        },
        {
          recipient: testUser._id,
          title: 'Read Notification 1',
          message: 'Test message 2',
          type: 'qc_approval',
          read: true,
          priority: 'medium'
        },
        {
          recipient: testAdminUser._id,
          title: 'Admin Notification',
          message: 'Admin message',
          type: 'system',
          read: false,
          priority: 'low'
        }
      ];

      await Notification.insertMany(notifications);
    });

    it('should query by recipient', async () => {
      const userNotifications = await Notification.find({ recipient: testUser._id });
      const adminNotifications = await Notification.find({ recipient: testAdminUser._id });

      expect(userNotifications).toHaveLength(2);
      expect(adminNotifications).toHaveLength(1);
    });

    it('should query by read status', async () => {
      const unreadNotifications = await Notification.find({ read: false });
      const readNotifications = await Notification.find({ read: true });

      expect(unreadNotifications).toHaveLength(2);
      expect(readNotifications).toHaveLength(1);
    });

    it('should query by type', async () => {
      const qcAssignmentNotifications = await Notification.find({ type: 'qc_assignment' });
      const qcApprovalNotifications = await Notification.find({ type: 'qc_approval' });
      const systemNotifications = await Notification.find({ type: 'system' });

      expect(qcAssignmentNotifications).toHaveLength(1);
      expect(qcApprovalNotifications).toHaveLength(1);
      expect(systemNotifications).toHaveLength(1);
    });

    it('should query by priority', async () => {
      const highPriorityNotifications = await Notification.find({ priority: 'high' });
      const mediumPriorityNotifications = await Notification.find({ priority: 'medium' });
      const lowPriorityNotifications = await Notification.find({ priority: 'low' });

      expect(highPriorityNotifications).toHaveLength(1);
      expect(mediumPriorityNotifications).toHaveLength(1);
      expect(lowPriorityNotifications).toHaveLength(1);
    });

    it('should support compound queries', async () => {
      const unreadUserNotifications = await Notification.find({
        recipient: testUser._id,
        read: false
      });

      expect(unreadUserNotifications).toHaveLength(1);
    });

    it('should support date range queries', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const recentNotifications = await Notification.find({
        createdAt: { $gte: yesterday }
      });

      expect(recentNotifications.length).toBeGreaterThan(0);
    });

    it('should query by related model and ID', async () => {
      const qcNotification = await Notification.create({
        recipient: testUser._id,
        title: 'QC Related',
        message: 'QC message',
        type: 'qc_assignment',
        relatedModel: 'QualityControl',
        relatedId: testQCRecord._id
      });

      const relatedNotifications = await Notification.find({
        relatedModel: 'QualityControl',
        relatedId: testQCRecord._id
      });

      expect(relatedNotifications).toHaveLength(1);
      expect(relatedNotifications[0]._id.toString()).toBe(qcNotification._id.toString());
    });
  });

  describe('Model Updates', () => {
    it('should update updatedAt timestamp on save', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();
      const originalUpdatedAt = savedNotification.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedNotification.read = true;
      savedNotification.readAt = new Date();
      const updatedNotification = await savedNotification.save();

      expect(updatedNotification.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      expect(updatedNotification.read).toBe(true);
      expect(updatedNotification.readAt).toBeInstanceOf(Date);
    });

    it('should handle partial updates', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system',
        read: false
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      const updatedNotification = await Notification.findByIdAndUpdate(
        savedNotification._id,
        { read: true, readAt: new Date() },
        { new: true }
      );

      expect(updatedNotification.read).toBe(true);
      expect(updatedNotification.readAt).toBeInstanceOf(Date);
    });

    it('should handle delivery status updates', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system',
        channels: ['in_app', 'email']
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      // Update delivery status
      savedNotification.deliveryStatus = {
        in_app: { delivered: true, deliveredAt: new Date() },
        email: { delivered: true, deliveredAt: new Date() }
      };

      const updatedNotification = await savedNotification.save();

      expect(updatedNotification.deliveryStatus.in_app.delivered).toBe(true);
      expect(updatedNotification.deliveryStatus.email.delivered).toBe(true);
    });
  });

  describe('Model Deletion', () => {
    it('should delete notification successfully', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'Test message',
        type: 'system'
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      await Notification.findByIdAndDelete(savedNotification._id);

      const deletedNotification = await Notification.findById(savedNotification._id);
      expect(deletedNotification).toBeNull();
    });

    it('should handle bulk deletion', async () => {
      const notifications = [
        {
          recipient: testUser._id,
          title: 'Notification 1',
          message: 'Message 1',
          type: 'system'
        },
        {
          recipient: testUser._id,
          title: 'Notification 2',
          message: 'Message 2',
          type: 'system'
        }
      ];

      const savedNotifications = await Notification.insertMany(notifications);
      const notificationIds = savedNotifications.map(notification => notification._id);

      await Notification.deleteMany({ _id: { $in: notificationIds } });

      const remainingNotifications = await Notification.find({ _id: { $in: notificationIds } });
      expect(remainingNotifications).toHaveLength(0);
    });

    it('should handle bulk read operations', async () => {
      const notifications = [
        {
          recipient: testUser._id,
          title: 'Notification 1',
          message: 'Message 1',
          type: 'system',
          read: false
        },
        {
          recipient: testUser._id,
          title: 'Notification 2',
          message: 'Message 2',
          type: 'system',
          read: false
        }
      ];

      await Notification.insertMany(notifications);

      // Mark all user notifications as read
      await Notification.updateMany(
        { recipient: testUser._id, read: false },
        { read: true, readAt: new Date() }
      );

      const unreadNotifications = await Notification.find({
        recipient: testUser._id,
        read: false
      });

      expect(unreadNotifications).toHaveLength(0);
    });
  });

  describe('Business Logic Validation', () => {
    it('should handle metadata for different notification types', async () => {
      const notificationWithMetadata = {
        recipient: testUser._id,
        title: 'Inventory Alert',
        message: 'Low stock detected',
        type: 'inventory_alert',
        metadata: {
          alertType: 'low_stock',
          productId: testProduct._id,
          warehouseId: testWarehouse._id,
          currentStock: 5,
          minimumStock: 10,
          urgencyLevel: 'high'
        }
      };

      const notification = new Notification(notificationWithMetadata);
      const savedNotification = await notification.save();

      expect(savedNotification.metadata.alertType).toBe('low_stock');
      expect(savedNotification.metadata.currentStock).toBe(5);
      expect(savedNotification.metadata.minimumStock).toBe(10);
      expect(savedNotification.metadata.urgencyLevel).toBe('high');
    });

    it('should handle action URLs and buttons', async () => {
      const notificationWithActions = {
        recipient: testUser._id,
        title: 'QC Assignment',
        message: 'New QC record requires your attention',
        type: 'qc_assignment',
        actionUrl: '/qc/records/' + testQCRecord._id,
        actionButtons: [
          { label: 'View Details', action: 'view', url: '/qc/records/' + testQCRecord._id },
          { label: 'Start QC', action: 'start', url: '/qc/records/' + testQCRecord._id + '/start' }
        ]
      };

      const notification = new Notification(notificationWithActions);
      const savedNotification = await notification.save();

      expect(savedNotification.actionUrl).toBe('/qc/records/' + testQCRecord._id);
      expect(savedNotification.actionButtons).toHaveLength(2);
      expect(savedNotification.actionButtons[0].label).toBe('View Details');
      expect(savedNotification.actionButtons[1].action).toBe('start');
    });

    it('should handle expiry dates for notifications', async () => {
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      const notificationWithExpiry = {
        recipient: testUser._id,
        title: 'Temporary Alert',
        message: 'This alert will expire in 7 days',
        type: 'alert',
        expiresAt: expiryDate
      };

      const notification = new Notification(notificationWithExpiry);
      const savedNotification = await notification.save();

      expect(savedNotification.expiresAt).toBeInstanceOf(Date);
      expect(savedNotification.expiresAt.getTime()).toBe(expiryDate.getTime());
    });
  });
});