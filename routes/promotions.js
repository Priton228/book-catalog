const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, discount_type, discount_value, image_url, start_date, end_date
      FROM promotions
      WHERE is_active = true
        AND start_date <= NOW()
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения активных акций' });
  }
});

module.exports = router;

