// tests/api/middleware/auth.test.js
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole, requirePermission } from '../../../middleware/auth.js';
import {
  createTestUser,
  generateJWTToken,
  cleanupTestData
} from '../../helpers/testHelpers.js';

// Create test app
const createTestApp = (middleware) => {
  const app = express();
  app.use(express.json());
  
  if (Array.isArray(middleware)) {
    middleware.forEach(mw => app.use(mw));
  } else {
    app.use(middleware);
  }
  
  app.get('/test', (req, res) => {
    res.json({ 
      success: true, 
      user: req.user,
      message: 'Access granted' 
    });
  });
  
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });
  
  return app;
};

describe('Authentication Middleware Tests', () => {
  let testUser, testAdminUser, testQCUser, testWarehouseUser;
  let userToken, adminToken, qcToken, warehouseToken;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test users with different roles
    testUser = await createTestUser();
    testAdminUser = await createTestUser({ role: 'admin' });
    testQCUser = await createTestUser({ role: 'qc_manager' });
    testWarehouseUser = await createTestUser({ role: 'warehouse_manager' });
    
    // Generate tokens
    userToken = generateJWTToken(testUser);
    adminToken = generateJWTToken(testAdminUser);
    qcToken = generateJWTToken(testQCUser);
    warehouseToken = generateJWTToken(testWarehouseUser);
  });

  describe('authenticateToken Middleware', () => {
    let app;

    beforeEach(() => {
      app = createTestApp(authenticateToken);
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(testUser._id.toString());
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    it('should reject request with token for non-existent user', async () => {
      const nonExistentUserToken = jwt.sign(
        { id: '507f1f77bcf86cd799439011', email: 'nonexistent@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${nonExistentUserToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    it('should handle token without Bearer prefix', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', userToken)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    it('should extract user information correctly from token', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.user.id).toBe(testAdminUser._id.toString());
      expect(response.body.user.email).toBe(testAdminUser.email);
      expect(response.body.user.role).toBe(testAdminUser.role);
    });
  });

  describe('requireRole Middleware', () => {
    it('should allow access for users with required role', async () => {
      const app = createTestApp([authenticateToken, requireRole('admin')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access for users without required role', async () => {
      const app = createTestApp([authenticateToken, requireRole('admin')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should allow access for multiple valid roles', async () => {
      const app = createTestApp([authenticateToken, requireRole(['admin', 'qc_manager'])]);

      // Test admin access
      const adminResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body.success).toBe(true);

      // Test QC manager access
      const qcResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);

      expect(qcResponse.body.success).toBe(true);
    });

    it('should deny access for users not in any of the required roles', async () => {
      const app = createTestApp([authenticateToken, requireRole(['admin', 'qc_manager'])]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should handle single role as string', async () => {
      const app = createTestApp([authenticateToken, requireRole('qc_manager')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication before role check', async () => {
      const app = createTestApp([authenticateToken, requireRole('admin')]);

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });
  });

  describe('requirePermission Middleware', () => {
    beforeEach(async () => {
      // Update test users with specific permissions
      testUser.permissions = ['read_inventory', 'update_inventory'];
      testAdminUser.permissions = ['*']; // All permissions
      testQCUser.permissions = ['read_qc', 'create_qc', 'update_qc', 'approve_qc'];
      testWarehouseUser.permissions = ['read_warehouse', 'create_warehouse_approval', 'update_warehouse_approval'];
      
      await testUser.save();
      await testAdminUser.save();
      await testQCUser.save();
      await testWarehouseUser.save();
      
      // Regenerate tokens with updated user data
      userToken = generateJWTToken(testUser);
      adminToken = generateJWTToken(testAdminUser);
      qcToken = generateJWTToken(testQCUser);
      warehouseToken = generateJWTToken(testWarehouseUser);
    });

    it('should allow access for users with required permission', async () => {
      const app = createTestApp([authenticateToken, requirePermission('read_qc')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access for users without required permission', async () => {
      const app = createTestApp([authenticateToken, requirePermission('approve_qc')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should allow access for admin users with wildcard permission', async () => {
      const app = createTestApp([authenticateToken, requirePermission('any_permission')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow access for multiple valid permissions', async () => {
      const app = createTestApp([authenticateToken, requirePermission(['read_qc', 'read_warehouse'])]);

      // Test QC user access
      const qcResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);

      expect(qcResponse.body.success).toBe(true);

      // Test warehouse user access
      const warehouseResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);

      expect(warehouseResponse.body.success).toBe(true);
    });

    it('should deny access for users not having any of the required permissions', async () => {
      const app = createTestApp([authenticateToken, requirePermission(['approve_qc', 'delete_warehouse'])]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should handle single permission as string', async () => {
      const app = createTestApp([authenticateToken, requirePermission('update_inventory')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication before permission check', async () => {
      const app = createTestApp([authenticateToken, requirePermission('read_qc')]);

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    it('should handle users without permissions array', async () => {
      // Create user without permissions
      const userWithoutPermissions = await createTestUser({ permissions: undefined });
      const tokenWithoutPermissions = generateJWTToken(userWithoutPermissions);

      const app = createTestApp([authenticateToken, requirePermission('read_qc')]);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${tokenWithoutPermissions}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('Combined Middleware Tests', () => {
    it('should work with authentication, role, and permission checks combined', async () => {
      const app = createTestApp([
        authenticateToken,
        requireRole(['admin', 'qc_manager']),
        requirePermission('approve_qc')
      ]);

      // Should work for QC manager with approve_qc permission
      const qcResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${qcToken}`)
        .expect(200);

      expect(qcResponse.body.success).toBe(true);

      // Should work for admin (wildcard permissions)
      const adminResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body.success).toBe(true);

      // Should fail for warehouse manager (wrong role)
      const warehouseResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);

      expect(warehouseResponse.body.success).toBe(false);
    });

    it('should fail at first middleware that denies access', async () => {
      const app = createTestApp([
        authenticateToken,
        requireRole('admin'),
        requirePermission('approve_qc')
      ]);

      // Should fail at role check, not reach permission check
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should handle middleware order correctly', async () => {
      // Authentication should be checked first
      const app = createTestApp([
        requireRole('admin'), // This should not be reached without authentication
        authenticateToken
      ]);

      const response = await request(app)
        .get('/test')
        .expect(500); // Should error because req.user is undefined

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT verification errors gracefully', async () => {
      const app = createTestApp(authenticateToken);

      // Test with malformed JWT
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer malformed.jwt.token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should handle database errors during user lookup', async () => {
      const app = createTestApp(authenticateToken);

      // Create token with invalid user ID format
      const invalidToken = jwt.sign(
        { id: 'invalid_id', email: 'test@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing JWT secret', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const app = createTestApp(authenticateToken);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Restore JWT secret
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive user information in token', async () => {
      const app = createTestApp(authenticateToken);

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should not expose password or other sensitive fields
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.resetPasswordToken).toBeUndefined();
    });

    it('should handle concurrent requests with same token', async () => {
      const app = createTestApp(authenticateToken);

      const requests = Array(5).fill().map(() =>
        request(app)
          .get('/test')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should validate token signature', async () => {
      const app = createTestApp(authenticateToken);

      // Create token with wrong signature
      const tokenParts = userToken.split('.');
      const tamperedToken = tokenParts[0] + '.' + tokenParts[1] + '.tampered_signature';

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });
  });
});