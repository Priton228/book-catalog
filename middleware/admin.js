const { authenticate, authorize } = require('./auth');

// Admin-only authentication middleware
const adminAuth = [authenticate, authorize('admin')];

// Middleware to check if user is admin (for views)
const checkAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется аутентификация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Неверный токен' });
  }
};

module.exports = { adminAuth, checkAdmin };