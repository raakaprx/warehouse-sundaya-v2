require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { sequelize, AuditLog, User } = require('./models');
const seed = require('./utils/seed');
const socketUtil = require('./utils/socket');
const cronJob = require('./utils/cron');

// Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const requestRoutes = require('./routes/requestRoutes');
const reportRoutes = require('./routes/reportRoutes');
const usedMaterialRoutes = require('./routes/usedMaterialRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const inventoryUsageRoutes = require('./routes/inventoryUsageRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
socketUtil.init(server);

// ✅ CORS FIX - MUST BE BEFORE OTHER MIDDLEWARE
app.use(cors({
    origin: true, // Dinamis sesuai origin request
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 3000) {
      AuditLog.create({
        userId: req.user?.id || null,
        action: 'SLOW_REQUEST',
        module: 'PERF',
        details: `${req.method} ${req.originalUrl} - ${duration}ms`
      }).catch(() => {});
    }
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/used-materials', usedMaterialRoutes);
app.use('/api/inventory-usage', inventoryUsageRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('PT Sundaya Indonesia Warehouse API is running with Robust Ecosystem');
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/docs', (req, res) => {
  const docPath = path.join(__dirname, '../docs/openapi.yaml');
  if (!require('fs').existsSync(docPath)) {
    return res.status(404).json({ success: false, message: 'Dokumentasi belum tersedia' });
  }
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(docPath);
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Database Initialization
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    if (process.env.NODE_ENV !== 'production' && process.env.SEED_DB === 'true') {
      let shouldSeed = true;
      try {
        const userCount = await User.count();
        shouldSeed = userCount === 0;
      } catch (error) {
        shouldSeed = true;
      }
      if (shouldSeed) {
        await seed();
      }
    }
    
    cronJob.runThresholdCheck();
    
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ CORS enabled for http://localhost:3000`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

initDB();