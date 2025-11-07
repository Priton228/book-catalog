const pool = require('../config/database');

class Genre {
  static async create({ name, description }) {
    const query = 'INSERT INTO genres (name, description) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [name, description]);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM genres ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM genres WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Genre;