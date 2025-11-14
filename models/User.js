﻿﻿﻿const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, full_name, role = 'customer' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, password_hash, full_name, role) 
      VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, blocked, created_at
    `;
    const result = await pool.query(query, [email, hashedPassword, full_name, role]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, email, full_name, role, blocked, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT id, email, full_name, role, blocked, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password_hash = $1 WHERE id = $2';
    await pool.query(query, [hashedPassword, userId]);
  }
}

module.exports = User;
