// server/routes/dashboard.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getDashboardStats,
  getRecentActivity,
} from '../controllers/dashboardController.js';

const router = express.Router();

// Dashboard routes - all require authentication but no specific permissions
// since the controller filters data based on user permissions
router.get('/stats', authenticate, getDashboardStats);
router.get('/activity', authenticate, getRecentActivity);

export default router;