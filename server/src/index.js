/**
 * ============================================================================
 * WAREHOUSE SUNDAYA - BACKEND SERVER ENTRY POINT
 * ============================================================================
 * Fungsi: Inisialisasi Express server, setup CORS, register semua routes,
 * init database, Socket.IO, dan cron job untuk monitoring stok otomatis.
 * 
 * Alur: 1) Load env → 2) Setup Express + Socket → 3) Register middleware
 *       4) Register routes → 5) Init DB & seed → 6) Start cron monitoring
 * ============================================================================
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { sequelize, AuditLog, User } = require('./models');
const seed = require('./utils/seed');
const socketUtil = require('./utils/socket');
const cronJob = require('./utils/cron');

// ⬇️ Import semua routes (route mapping ke controller)
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const requestRoutes = require('./routes/requestRoutes');
const reportRoutes = require('./routes/reportRoutes');
const usedMaterialRoutes = require('./routes/usedMaterialRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const inventoryUsageRoutes = require('./routes/inventoryUsageRoutes');

const app = express();
const server = http.createServer(app); // ⬅️ HTTP server wrapper untuk Socket.IO
const PORT = process.env.PORT || 5000;

// ⬇️ Inisialisasi Socket.IO (untuk real-time event: request, alert, notification)
socketUtil.init(server);

// ============================================================================
// MIDDLEWARE: CORS Configuration (Must be BEFORE other middleware!)
// Alasan: Middleware urutan penting. CORS harus pertama agar preflight OPTIONS
// request diproccess sebelum route handler lainnya.
// ============================================================================
app.use(cors({
    origin: true, // ✅ Accept request dari semua origin (client di http://localhost:3000)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
// ⬇️ Tangani OPTIONS request sebelum routing (browser kirim OPTIONS dulu sebelum POST/PUT)
app.options('*', cors({
    origin: true,
    credentials: true
}));

app.use(express.json()); // ⬇️ Parse request body sebagai JSON
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // ⬇️ Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// PERFORMANCE MONITORING: Catat request yang lambat (>3s) ke audit log
// Tujuan: Monitoring performance, debug bottleneck

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 3000) { // ⬅️ Jika > 3 detik, catat ke database
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

// ROUTE REGISTRATION: Pemetaan endpoint ke route handler
// Setiap route file import controller dan define endpoint

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/used-materials', usedMaterialRoutes);
app.use('/api/inventory-usage', inventoryUsageRoutes);
app.use('/api/notifications', notificationRoutes);

// HEALTH CHECK ENDPOINTS
app.get('/', (req, res) => {
  res.send('PT Sundaya Indonesia Warehouse API is running with Robust Ecosystem');
});

app.get('/health', (req, res) => {
  // ⬇️ Endpoint untuk check apakah server masih hidup (gunakan docker healthcheck)
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/docs', (req, res) => {
  // ⬇️ Serve OpenAPI documentation (Swagger)
  const docPath = path.join(__dirname, '../docs/openapi.yaml');
  if (!require('fs').existsSync(docPath)) {
    return res.status(404).json({ success: false, message: 'Dokumentasi belum tersedia' });
  }
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(docPath);
});

// ============================================================================
// ERROR HANDLING: Catch semua error dari routes/controllers
// Alasan: Centralized error response untuk consistency
// ============================================================================
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ============================================================================
// DATABASE INITIALIZATION & SERVER START
// ============================================================================
const initDB = async () => {
  try {
    // ⬇️ 1) Test koneksi database
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // ⬇️ 2) Sync schema dengan database (auto-migrate)
    // ⚠️  CATATAN: di production, gunakan migration formal bukan alter!
    await sequelize.sync({ alter: true });
    console.log("✅ Database Synced");  
    
    // ⬇️ 3) Auto-seed sample data jika database kosong dan SEED_DB=true
    if (process.env.NODE_ENV !== 'production' && process.env.SEED_DB === 'true') {
      let shouldSeed = true;
      try {
        const userCount = await User.count();
        shouldSeed = userCount === 0; // ⬅️ Hanya seed jika belum ada user
      } catch (error) {
        shouldSeed = true;
      }
      if (shouldSeed) {
        await seed();
      }
    }
    
    // ⬇️ 4) Start background job untuk monitoring stok (cek threshold setiap menit)
    // Tujuan: Otomatis deteksi stok rendah dan generate alert tanpa user input
    cronJob.runThresholdCheck();
    
    // ⬇️ 5) Start server listening pada PORT
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ CORS enabled for http://localhost:3000`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

initDB();