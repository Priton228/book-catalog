const Order = require('../models/Order');

const createOrder = async (req, res) => {
  try {
    const { items, shipping_address, customer_notes } = req.body;
    const user_id = req.user.id;

    console.log('🛒 Создание заказа для пользователя:', user_id, 'Товары:', items);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    if (!shipping_address) {
      return res.status(400).json({ error: 'Адрес доставки обязателен' });
    }

    // Создаем заказ
    const order = await Order.create({
      user_id,
      items,
      shipping_address,
      customer_notes
    });

    console.log('✅ Заказ создан:', order.id);

    res.status(201).json({
      message: 'Заказ успешно создан',
      order: {
        id: order.id,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ error: error.message || 'Ошибка при создании заказа' });
  }
};

const getUserOrders = async (req, res) => {
  try {
    console.log('📦 Запрос заказов пользователя:', req.user.id);
    
    const orders = await Order.findByUserId(req.user.id);
    console.log('📦 Найдено заказов:', orders.length);
    
    res.json({ orders });
  } catch (error) {
    console.error('❌ Get user orders error:', error);
    res.status(500).json({ error: 'Ошибка при получении заказов' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    // Проверяем, что пользователь имеет доступ к заказу
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Ошибка при получении заказа' });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById
};
