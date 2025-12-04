const pool = require('../config/database');
let promotionsReady = false;

async function ensurePromotionsTable() {
  if (promotionsReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent','fixed')),
        discount_value DECIMAL(10,2) NOT NULL,
        conditions JSONB DEFAULT '{}'::jsonb,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date)");
    promotionsReady = true;
  } catch (_) {
    promotionsReady = false;
  }
}

const getAllPromotions = async (req, res) => {
  try {
    await ensurePromotionsTable();
    const result = await pool.query('SELECT * FROM promotions ORDER BY id ASC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения акций', message: e.message });
  }
};

const createPromotion = async (req, res) => {
  try {
    await ensurePromotionsTable();
    const {
      name,
      discount_type,
      discount_value,
      start_date,
      end_date,
      conditions,
      image_url
    } = req.body;
    if (!name || !discount_type || !discount_value || !start_date) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }
    const allowed = ['percent','fixed'];
    if (!allowed.includes(String(discount_type))) {
      return res.status(400).json({ error: 'Некорректный тип скидки' });
    }
    let dv = parseFloat(discount_value);
    if (!(dv > 0)) {
      return res.status(400).json({ error: 'Некорректное значение скидки' });
    }
    if (discount_type === 'percent') {
      dv = dv <= 1 ? dv * 100 : dv;
      dv = Math.max(0, Math.min(100, dv));
    }
    const cond = conditions && typeof conditions === 'object' ? conditions : {};
    const query = `
      INSERT INTO promotions (name, discount_type, discount_value, conditions, start_date, end_date, is_active, image_url)
      VALUES ($1,$2,$3,$4::jsonb,$5,$6,true,$7)
      RETURNING *
    `;
    const values = [name, discount_type, dv, JSON.stringify(cond), new Date(start_date), end_date ? new Date(end_date) : null, image_url || null];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка создания акции', message: e.message });
  }
};

const getPromotionById = async (req, res) => {
  try {
    await ensurePromotionsTable();
    const id = parseInt(req.params.id, 10);
    const r = await pool.query('SELECT * FROM promotions WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Акция не найдена' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения акции', message: e.message });
  }
};

const updatePromotion = async (req, res) => {
  try {
    await ensurePromotionsTable();
    const id = parseInt(req.params.id, 10);
    const {
      name,
      discount_type,
      discount_value,
      start_date,
      end_date,
      conditions,
      is_active,
      image_url
    } = req.body;
    const allowed = ['percent','fixed'];
    if (discount_type && !allowed.includes(String(discount_type))) {
      return res.status(400).json({ error: 'Некорректный тип скидки' });
    }
    const fields = [];
    const values = [];
    let i = 1;
    if (name != null) { fields.push(`name = $${i++}`); values.push(name); }
    if (discount_type != null) { fields.push(`discount_type = $${i++}`); values.push(discount_type); }
    if (discount_value != null) {
      let dv = parseFloat(discount_value);
      if (discount_type === 'percent') {
        dv = dv <= 1 ? dv * 100 : dv;
        dv = Math.max(0, Math.min(100, dv));
      }
      fields.push(`discount_value = $${i++}`);
      values.push(dv);
    }
    if (conditions != null) { fields.push(`conditions = $${i++}::jsonb`); values.push(JSON.stringify(conditions)); }
    if (start_date != null) { fields.push(`start_date = $${i++}`); values.push(new Date(start_date)); }
    if (end_date !== undefined) { fields.push(`end_date = $${i++}`); values.push(end_date ? new Date(end_date) : null); }
    if (is_active != null) { fields.push(`is_active = $${i++}`); values.push(Boolean(is_active)); }
    if (image_url !== undefined) { fields.push(`image_url = $${i++}`); values.push(image_url || null); }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    const query = `UPDATE promotions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
    values.push(id);
    const r = await pool.query(query, values);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Акция не найдена' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка обновления акции', message: e.message });
  }
};

const deletePromotion = async (req, res) => {
  try {
    await ensurePromotionsTable();
    const id = parseInt(req.params.id, 10);
    const r = await pool.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Акция не найдена' });
    res.json({ message: 'Акция удалена' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления акции', message: e.message });
  }
};

module.exports = {
  getAllPromotions,
  createPromotion,
  getPromotionById,
  updatePromotion,
  deletePromotion
};
