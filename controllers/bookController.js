const pool = require('../config/database');

const getAllBooks = async (req, res) => {
  try {
    console.log('📖 Запрос на получение книг...');
    
    const { genre_id, author_id, search } = req.query;
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

    if (genre_id) {
      conditions.push(`b.genre_id = $${paramCount}`);
      values.push(parseInt(genre_id));
      paramCount++;
    }

    if (author_id) {
      conditions.push(`b.author_id = $${paramCount}`);
      values.push(parseInt(author_id));
      paramCount++;
    }

    if (search) {
      conditions.push(`(b.title ILIKE $${paramCount} OR a.name ILIKE $${paramCount} OR b.isbn ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY b.title`;
    
    console.log('SQL Query:', query);
    console.log('Values:', values);
    
    const result = await pool.query(query, values);
    console.log(`📚 Найдено книг: ${result.rows.length}`);
    
    res.json({ books: result.rows });
  } catch (error) {
    console.error('❌ Ошибка при получении книг:', error);
    res.status(500).json({ error: 'Ошибка при получении книг' });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await pool.query(`
      SELECT 
        b.*,
        a.name as author_name,
        g.name as genre_name
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN genres g ON b.genre_id = g.id
      WHERE b.id = $1
    `, [req.params.id]);
    
    if (book.rows.length === 0) {
      return res.status(404).json({ error: 'Книга не найдена' });
    }
    
    res.json({ book: book.rows[0] });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Ошибка при получении книги' });
  }
};

module.exports = {
  getAllBooks,
  getBookById
};
