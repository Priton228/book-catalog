const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Требуется аутентификация' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, не заблокирован ли пользователь
    if (user.blocked) {
      return res.status(401).json({ error: 'Пользователь заблокирован' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    // Специальная обработка истечения токена
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истёк', expired: true });
    }
    res.status(401).json({ error: 'Неверный токен' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
