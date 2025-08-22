// server/server.js - Updated with principal routes
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import stateRoutes from './routes/states.js';
import userRoutes from './routes/users.js';
import permissionRoutes from './routes/permissions.js';
import hospitalRoutes from './routes/hospitals.js';
import doctorRoutes from './routes/doctors.js';
import portfolioRoutes from './routes/portfolios.js';
import principalRoutes from './routes/principals.js'; // New principal routes
// Add imports
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import dashboardRoutes from './routes/dashboard.js';
import fileRoutes from './routes/files.js';
// server/server.js - Add these routes
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import invoiceReceivingRoutes from './routes/invoiceReceiving.js';
import workflowRoutes from './routes/workflow.js';
// Branch and Warehouse routes
import branchRoutes from './routes/branches.js';
import warehouseRoutes from './routes/warehouses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://69.62.73.201:5173', // Development
    'http://69.62.73.201',      // Production
    'http://localhost:5173'      // Local development
  ],
  credentials: true,
}));

// Rate limiting - More relaxed for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100000 : 1000, // 1000 for dev, 100 for production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// More relaxed rate limiting for auth routes in development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 50 for dev, 5 for production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/principals', principalRoutes); // New principal routes
// Add routes (after other routes)
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
// Add after other routes
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/invoice-receiving', invoiceReceivingRoutes);
app.use('/api/workflow', workflowRoutes);
// Branch and Warehouse routes
app.use('/api/branches', branchRoutes);
app.use('/api/warehouses', warehouseRoutes);
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field.' });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Auth rate limit: ${process.env.NODE_ENV === 'production' ? '5' : '50'} requests per 15 minutes`);
  console.log(`File uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log('Modules loaded: auth, states, users, permissions, hospitals, doctors, portfolios, principals, categories, products');
  
});