import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import menuRoutes from './src/routes/menu.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import cartRoutes from './src/routes/cart.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import deliveryRoutes from './src/routes/delivery.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import waiterRoutes from './src/routes/waiter.routes.js';
import kitchenRoutes from './src/routes/kitchen.routes.js';
import inventoryRoutes from './src/routes/inventory.js';

// Import socket handler
import { initializeSocket } from './src/socket/socket.js';

// Import database
import { testConnection } from './src/db/config.js';

const app = express();
const httpServer = createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://saffyra.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel deployments and development
    if (origin && (
      origin.includes('vercel.app') ||
      origin.includes('localhost') ||
      allowedOrigins.includes(origin)
    )) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log('CORS rejected origin:', origin);
    return callback(null, true); // Temporarily allow all origins for debugging
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dum & Wok API is running!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/inventory', inventoryRoutes);

// Initialize Socket handlers
initializeSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Dum & Wok Server...');
    console.log('📊 Environment variables check:');
    console.log('- PORT:', process.env.PORT || 5000);
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'not set');
    
    // Test database connection
    console.log('🔍 Testing database connection...');
    await testConnection();
    console.log('✅ Database connection successful');
    
    // Auto-setup inventory tables in production if they don't exist
    if (process.env.NODE_ENV === 'production') {
      try {
        const { pool } = await import('./src/db/config.js');
        const result = await pool.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'inventory_items'
        `);
        
        if (result.rows.length === 0) {
          console.log('📦 Setting up inventory tables...');
          await import('./setup-production.js');
        }
      } catch (setupError) {
        console.warn('⚠️ Auto-setup failed, continuing with server start:', setupError.message);
      }
    }
    
    console.log('🌐 Starting HTTP server...');
    httpServer.listen(PORT, HOST, () => {
      console.log(`🍛 Dum & Wok Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    
    // In production, try to start anyway after logging the error
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Attempting to start server despite errors...');
      try {
        httpServer.listen(PORT, HOST, () => {
          console.log(`🍛 Dum & Wok Server running on port ${PORT} (fallback mode)`);
        });
      } catch (fallbackError) {
        console.error('❌ Fallback start also failed:', fallbackError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

startServer();
