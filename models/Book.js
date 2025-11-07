const pool = require('../config/database');

class Book {
  static async create(bookData) {
    const { title, author_id, genre_id, isbn, publisher, publication_year, price, stock_quantity, description, cover_image } = bookData;
    const query = `
      INSERT INTO books (title, author_id, genre_id, isbn, publisher, publication_year, price, stock_quantity, description, cover_image) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
    `;
    const result = await pool.query(query, [
      title, author_id, genre_id, isbn, publisher, publication_year, price, stock_quantity, description, cover_image
    ]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        b.*,
        a.name as author_name,
        g.name as genre_name
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN genres g ON b.genre_id = g.id
      WHERE b.is_active = true
    `;
    const values = [];
    const conditions = [];
    let paramCount = 1;

    if (filters.genre_id) {
      conditions.push(`b.genre_id = $${paramCount}`);
      values.push(filters.genre_id);
      paramCount++;
    }

    if (filters.author_id) {
      conditions.push(`b.author_id = $${paramCount}`);
      values.push(filters.author_id);
      paramCount++;
    }

    if (filters.search) {
      conditions.push(`(b.title ILIKE $${paramCount} OR a.name ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY b.title`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        b.*,
        a.name as author_name,
        g.name as genre_name
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN genres g ON b.genre_id = g.id
      WHERE b.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedFields = ['title', 'author_id', 'genre_id', 'isbn', 'publisher', 'publication_year', 'price', 'stock_quantity', 'description', 'cover_image', 'is_active'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE books SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCount} RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM books WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateStock(id, quantity) {
    const query = 'UPDATE books SET stock_quantity = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [quantity, id]);
    return result.rows[0];
  }
}

module.exports = Book;