const pool = require('../config/database');

class Order {
  static async create(orderData) {
    const { user_id, items, shipping_address, customer_notes } = orderData;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Рассчитываем общую сумму и проверяем наличие книг
      let total_amount = 0;
      const genresSet = new Set();
      const authorsSet = new Set();
      let itemsCount = 0;
      for (const item of items) {
        const bookQuery = 'SELECT price, stock_quantity, title, genre_id, author_id FROM books WHERE id = $1';
        const bookResult = await client.query(bookQuery, [item.book_id]);
        
        if (!bookResult.rows[0]) {
          throw new Error(`Книга с ID ${item.book_id} не найдена`);
        }
        
        const book = bookResult.rows[0];
        if (book.stock_quantity < item.quantity) {
          throw new Error(`Недостаточно книг "${book.title}" в наличии. Доступно: ${book.stock_quantity}`);
        }
        total_amount += book.price * item.quantity;
        itemsCount += Number(item.quantity || 0);
        if (book.genre_id) genresSet.add(String(book.genre_id));
        if (book.author_id) authorsSet.add(String(book.author_id));
      }

      let bestPromoId = null;
      try {
        const promosRes = await client.query(
          `SELECT * FROM promotions WHERE is_active = true AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW())`
        );
        let bestDiscount = 0;
        for (const p of promosRes.rows || []) {
          const cond = p.conditions || {};
          const minTotal = cond.min_total_amount ? parseFloat(cond.min_total_amount) : 0;
          if (minTotal && !(total_amount >= minTotal)) continue;
          const reqGenres = Array.isArray(cond.include_genres) ? cond.include_genres.map(x => String(x)) : [];
          if (reqGenres.length > 0) {
            const ok = reqGenres.some(id => genresSet.has(String(id)));
            if (!ok) continue;
          }
          const reqAuthors = Array.isArray(cond.include_authors) ? cond.include_authors.map(x => String(x)) : [];
          if (reqAuthors.length > 0) {
            const ok = reqAuthors.some(id => authorsSet.has(String(id)));
            if (!ok) continue;
          }
          const minItems = cond.min_items ? parseInt(cond.min_items, 10) : 0;
          if (minItems && !(itemsCount >= minItems)) continue;
          let disc = 0;
          if (p.discount_type === 'percent') {
            disc = Math.max(0, Math.min(100, parseFloat(p.discount_value))) / 100 * total_amount;
          } else {
            disc = Math.max(0, parseFloat(p.discount_value));
          }
          if (disc > bestDiscount) { bestDiscount = disc; bestPromoId = p.id; }
        }
        if (bestDiscount > 0) {
          total_amount = Math.max(0, total_amount - bestDiscount);
        }
      } catch (e) {}

      // Создаем заказ
      const orderQuery = `
        INSERT INTO orders (user_id, total_amount, shipping_address, customer_notes, promotion_id, promotion_discount) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [user_id, total_amount, shipping_address, customer_notes, bestPromoId, Number(bestDiscount || 0)]);
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
        p.name AS promotion_name,
        p.image_url AS promotion_image_url,
        u.email as user_email,
        u.full_name as user_name,
        json_agg(
          json_build_object(
            'id', oi.id,
            'book_id', oi.book_id,
            'title', b.title,
            'author_name', a.name,
            'genre_id', g.id,
            'genre_name', g.name,
            'cover_image', b.cover_image,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.quantity * oi.unit_price
          )
        ) as items
      FROM orders o
      LEFT JOIN promotions p ON o.promotion_id = p.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN books b ON oi.book_id = b.id
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN genres g ON b.genre_id = g.id
      WHERE o.user_id = $1
      GROUP BY o.id, p.name, p.image_url, u.email, u.full_name
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
            'genre_id', g.id,
            'genre_name', g.name,
            'cover_image', b.cover_image,
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
      LEFT JOIN genres g ON b.genre_id = g.id
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
