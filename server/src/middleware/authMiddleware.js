/**
 * ============================================================================
 * AUTH MIDDLEWARE - JWT Verification & Role-Based Access Control (RBAC)
 * ============================================================================
 * Fungsi: Memverifikasi token JWT dan memastikan user memiliki role yang sesuai
 * untuk mengakses endpoint tertentu.
 * 
 * Alur: 1) Cek token dari header Authorization atau query
 *       2) Verify token dengan JWT_SECRET
 *       3) Cek apakah role user ada di allowedRoles
 *       4) Set req.user untuk digunakan di controller
 * 
 * Kenapa JWT bukan session: Stateless, scalable, cocok untuk SPA React,
 * tidak perlu state store di server.
 * ============================================================================
 */
const jwt = require('jsonwebtoken');

const authMiddleware = (allowedRoles = []) => {
  // ⬇️ allowedRoles adalah array role yang boleh akses endpoint ini
  // Contoh: authMiddleware(['NOC', 'GM']) = hanya NOC dan GM yang bisa akses
  return (req, res, next) => {
    let token = '';
    const authHeader = req.headers.authorization;

    // ⬇️ Cari token dari header Authorization: "Bearer <token>"
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]; // Extract token dari "Bearer xyz"
    } else if (req.query.token) {
      // ⬇️ Fallback: cari token dari query parameter (untuk download file, WebSocket)
      // ⚠️ CATATAN: Query token kurang aman, hanya untuk use case spesifik
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Otorisasi diperlukan.' });
    }

    const SECRET_KEY = process.env.JWT_SECRET;
    if (!SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'JWT secret belum dikonfigurasi' });
    }

    try {
      // ⬇️ Verify JWT: pastikan token belum kadaluarsa dan signature valid
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = decoded; // ⬅️ Set user payload ke request object

      // ⬇️ RBAC Check: pastikan role user ada di allowedRoles
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Anda tidak memiliki izin untuk mengakses fitur ini.' 
        });
      }

      next(); // ⬅️ Lanjut ke controller
    } catch (err) {
      // ⬇️ Token invalid atau expired
      return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' });
    }
  };
};

module.exports = authMiddleware;
