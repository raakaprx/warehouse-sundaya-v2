require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { sequelize, AuditLog } = require('./models');
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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
socketUtil.init(server);

// Middleware
app.use(cors());
app.use(express.json());
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/used-materials', usedMaterialRoutes);
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
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Database Initialization
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // In production, use migrations. For now, we sync and seed.
    if (process.env.NODE_ENV !== 'production') {
      await seed();
    }
    
    // Start Cron Job
    cronJob.runThresholdCheck(); // Initial check
    
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

initDB();
