const jwt = require('jsonwebtoken');

const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    let token = '';
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
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
      const decoded = jwt.verify(token, SECRET_KEY);
      req.user = decoded;

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Anda tidak memiliki izin untuk mengakses fitur ini.' 
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' });
    }
  };
};

module.exports = authMiddleware;
