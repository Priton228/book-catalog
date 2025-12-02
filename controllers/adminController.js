const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const Order = require('../models/Order');

// User Management
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, full_name, role = 'customer' } = req.body;
    
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }
    
    // Проверяем, существует ли пользователь
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    const user = await User.create({ email, password, full_name, role });
    res.status(201).json({ message: 'Пользователь успешно создан', user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Ошибка при создании пользователя' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role } = req.body;
    
    const updates = {};
    if (email) updates.email = email;
    if (full_name) updates.full_name = full_name;
    if (role) updates.role = role;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    const query = `
      UPDATE users SET ${Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${Object.keys(updates).length + 1} 
      RETURNING id, email, full_name, role, created_at, updated_at
    `;
    
    const result = await pool.query(query, [...Object.values(updates), id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({ message: 'Пользователь успешно обновлен', user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
};

const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем, не пытается ли админ заблокировать самого себя
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя заблокировать собственный аккаунт' });
    }
    
    const query = 'UPDATE users SET blocked = true WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({ message: 'Пользователь успешно заблокирован' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Ошибка при блокировке пользователя' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'UPDATE users SET blocked = false WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({ message: 'Пользователь успешно разблокирован' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Ошибка при разблокировке пользователя' });
  }
};

// Book Management
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.findAll({});
    res.json(books);
  } catch (error) {
    console.error('Get all books error:', error);
    res.status(500).json({ error: 'Ошибка при получении книг' });
  }
};

const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    
    if (!book) {
      return res.status(404).json({ error: 'Книга не найдена' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Get book by id error:', error);
    res.status(500).json({ error: 'Ошибка при получении книги' });
  }
};

const createBook = async (req, res) => {
  try {
    const { title, author_id, genre_id, isbn, publisher, publication_year, price, stock_quantity, description, cover_image } = req.body;
    
    if (!title || !author_id || !genre_id || !price || stock_quantity === undefined) {
      return res.status(400).json({ error: 'Обязательные поля: title, author_id, genre_id, price, stock_quantity' });
    }
    
    const book = await Book.create({
      title, author_id, genre_id, isbn, publisher, publication_year, price, stock_quantity, description, cover_image
    });
    
    res.status(201).json({ message: 'Книга успешно создана', book });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({ error: 'Ошибка при создании книги' });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const book = await Book.update(id, updates);
    
    if (!book) {
      return res.status(404).json({ error: 'Книга не найдена' });
    }
    
    res.json({ message: 'Книга успешно обновлена', book });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении книги' });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.delete(id);
    
    if (!book) {
      return res.status(404).json({ error: 'Книга не найдена' });
    }
    
    res.json({ message: 'Книга успешно удалена' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Ошибка при удалении книги' });
  }
};

// Order Management
const getAllOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*,
        u.email as user_email,
        u.full_name as user_name,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, u.email, u.full_name
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Ошибка при получении заказов' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order by id error:', error);
    res.status(500).json({ error: 'Ошибка при получении заказа' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус заказа' });
    }
    
    const order = await Order.updateStatus(id, status);
    
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    res.json({ message: 'Статус заказа успешно обновлен', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса заказа' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Удаляем связанные элементы заказа
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    
    // Удаляем сам заказ
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    res.json({ message: 'Заказ успешно удален' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Ошибка при удалении заказа' });
  }
};

// Statistics
const getStatistics = async (req, res) => {
  try {
    const stats = {};
    
    // Общая статистика
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const booksCount = await pool.query('SELECT COUNT(*) FROM books WHERE is_active = true');
    const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
    const totalRevenue = await pool.query('SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != \'cancelled\'');
    
    stats.users = parseInt(usersCount.rows[0].count);
    stats.books = parseInt(booksCount.rows[0].count);
    stats.orders = parseInt(ordersCount.rows[0].count);
    stats.totalRevenue = parseFloat(totalRevenue.rows[0].coalesce);
    
    // Статистика по заказам за последние 30 дней
    const ordersByDay = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    stats.ordersByDay = ordersByDay.rows;
    
    // Топ-5 популярных книг
    const popularBooks = await pool.query(`
      SELECT 
        b.title,
        a.name as author_name,
        SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN books b ON oi.book_id = b.id
      JOIN authors a ON b.author_id = a.id
      GROUP BY b.id, b.title, a.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);
    
    stats.popularBooks = popularBooks.rows;

    // Распределение заказов по статусам
    const ordersByStatus = await pool.query(`
      SELECT status, COUNT(*)::int as count
      FROM orders
      GROUP BY status
    `);
    stats.ordersByStatus = ordersByStatus.rows;

    // Выручка по жанрам (топ-8)
    const revenueByGenre = await pool.query(`
      SELECT 
        g.name as genre_name,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)::float as revenue
      FROM order_items oi
      JOIN books b ON oi.book_id = b.id
      JOIN genres g ON b.genre_id = g.id
      GROUP BY g.id, g.name
      ORDER BY revenue DESC
      LIMIT 8
    `);
    stats.revenueByGenre = revenueByGenre.rows;

    // Топ авторы по количеству проданных экземпляров (топ-8)
    const topAuthors = await pool.query(`
      SELECT 
        a.name as author_name,
        COALESCE(SUM(oi.quantity), 0)::int as total_sold
      FROM order_items oi
      JOIN books b ON oi.book_id = b.id
      JOIN authors a ON b.author_id = a.id
      GROUP BY a.id, a.name
      ORDER BY total_sold DESC
      LIMIT 8
    `);
    stats.topAuthors = topAuthors.rows;

    // Средний и медианный чек (исключая отмененные)
    const avgOrder = await pool.query(`
      SELECT AVG(total_amount)::float as avg_value FROM orders WHERE status != 'cancelled'
    `);
    const medianOrder = await pool.query(`
      SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY total_amount)::float as median_value
      FROM orders WHERE status != 'cancelled'
    `);
    stats.avgOrderValue = parseFloat(avgOrder.rows[0].avg_value || 0);
    stats.medianOrderValue = parseFloat(medianOrder.rows[0].median_value || 0);

    // Возвращающиеся клиенты
    const returning = await pool.query(`
      SELECT COUNT(*)::int AS count FROM (
        SELECT user_id FROM orders GROUP BY user_id HAVING COUNT(*) > 1
      ) t
    `);
    const customersWithOrders = await pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS count FROM orders
    `);
    const ret = returning.rows[0].count || 0;
    const cust = customersWithOrders.rows[0].count || 0;
    stats.returningCustomers = ret;
    stats.returningRate = cust > 0 ? Math.round((ret / cust) * 100) : 0;

    // Новые пользователи за 30 дней
    const newUsers30d = await pool.query(`
      SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    stats.newUsers30d = newUsers30d.rows[0].count || 0;

    // Низкие остатки на складе (меньше 5)
    const lowStock = await pool.query(`
      SELECT COUNT(*)::int AS count FROM books WHERE stock_quantity < 5 AND is_active = true
    `);
    stats.lowStockCount = lowStock.rows[0].count || 0;

    res.json(stats);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
};

module.exports = {
  // User management
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  blockUser,
  unblockUser,
  
  // Book management
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  
  // Order management
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  
  // Statistics
  getStatistics
};
