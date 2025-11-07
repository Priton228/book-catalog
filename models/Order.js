const pool = require('../config/database');

class Order {
  static async create(orderData) {
    const { user_id, items, shipping_address, customer_notes } = orderData;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Рассчитываем общую сумму и проверяем наличие книг
      let total_amount = 0;
      for (const item of items) {
        const bookQuery = 'SELECT price, stock_quantity, title FROM books WHERE id = $1';
        const bookResult = await client.query(bookQuery, [item.book_id]);
        
        if (!bookResult.rows[0]) {
          throw new Error(`Книга с ID ${item.book_id} не найдена`);
        }
        
        const book = bookResult.rows[0];
        if (book.stock_quantity < item.quantity) {
          throw new Error(`Недостаточно книг "${book.title}" в наличии. Доступно: ${book.stock_quantity}`);
        }

        total_amount += book.price * item.quantity;
      }

      // Создаем заказ
      const orderQuery = `
        INSERT INTO orders (user_id, total_amount, shipping_address, customer_notes) 
        VALUES ($1, $2, $3, $4) RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [user_id, total_amount, shipping_address, customer_notes]);
      const order = orderResult.rows[0];

      // Добавляем товары в заказ и обновляем остатки
      for (const item of items) {
        const bookQuery = 'SELECT price FROM books WHERE id = $1';
        const bookResult = await client.query(bookQuery, [item.book_id]);
        const unit_price = bookResult.rows[0].price;

        const orderItemQuery = `
          INSERT INTO order_items (order_id, book_id, quantity, unit_price) 
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(orderItemQuery, [order.id, item.book_id, item.quantity, unit_price]);

        // Обновляем количество на складе
        const updateStockQuery = `
          UPDATE books 
          SET stock_quantity = stock_quantity - $1 
          WHERE id = $2
        `;
        await client.query(updateStockQuery, [item.quantity, item.book_id]);
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'book_id', oi.book_id,
            'title', b.title,
            'author_name', a.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.quantity * oi.unit_price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN books b ON oi.book_id = b.id
      LEFT JOIN authors a ON b.author_id = a.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        o.*,
        u.email as user_email,
        u.full_name as user_name,
        json_agg(
          json_build_object(
            'id', oi.id,
            'book_id', oi.book_id,
            'title', b.title,
            'author_name', a.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.quantity * oi.unit_price
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN books b ON oi.book_id = b.id
      LEFT JOIN authors a ON b.author_id = a.id
      WHERE o.id = $1
      GROUP BY o.id, u.email, u.full_name
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = Order;
