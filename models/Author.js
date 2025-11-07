const pool = require('../config/database');

class Author {
  static async create({ name, biography }) {
    const query = 'INSERT INTO authors (name, biography) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [name, biography]);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM authors ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM authors WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Author;