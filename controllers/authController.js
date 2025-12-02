const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    console.log('📝 Регистрация пользователя:', email);

    // Валидация
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    // Проверяем, существует ли пользователь
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Создаем пользователя
    const user = await User.create({ 
      email, 
      password, 
      full_name
    });
    
    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    console.log('✅ Пользователь зарегистрирован:', user.email);

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Попытка входа:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Находим пользователя
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ Пользователь не найден:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем, не заблокирован ли пользователь
    if (user.blocked) {
      console.log('❌ Пользователь заблокирован:', email);
      return res.status(401).json({ error: 'Пользователь заблокирован' });
    }

    // Проверяем пароль
    const isPasswordValid = await User.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('❌ Неверный пароль для:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    console.log('✅ Успешный вход:', user.email);

    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
};

// Проверка email и ФИО для восстановления пароля
const verifyReset = async (req, res) => {
  try {
    const { email, full_name } = req.body;

    console.log('🔍 Проверка данных для восстановления:', email);

    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email и ФИО обязательны' });
    }

    // Находим пользователя
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ Пользователь не найден:', email);
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    // Проверяем ФИО
    if (user.full_name.trim().toLowerCase() !== full_name.trim().toLowerCase()) {
      console.log('❌ ФИО не совпадает для:', email);
      return res.status(400).json({ error: 'ФИО не совпадает с указанным при регистрации' });
    }

    console.log('✅ Данные подтверждены для:', email);

    res.json({ message: 'Данные подтверждены' });
  } catch (error) {
    console.error('❌ Verify reset error:', error);
    res.status(500).json({ error: 'Ошибка при проверке данных' });
  }
};

// Сброс пароля
const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔑 Сброс пароля для:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Находим пользователя
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ Пользователь не найден:', email);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Обновляем пароль
    await User.updatePassword(user.id, password);

    console.log('✅ Пароль успешно обновлён для:', email);

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ error: 'Ошибка при сбросе пароля' });
  }
};

module.exports = { register, login, getProfile, verifyReset, resetPassword };
