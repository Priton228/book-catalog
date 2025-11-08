const Author = require('../models/Author');
const pool = require('../config/database');

const getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.findAll();
    // Возвращаем чистый массив, как ожидает клиент
    res.json(authors);
  } catch (error) {
    console.error('getAllAuthors error:', error);
    res.status(500).json({ error: 'Ошибка получения авторов' });
  }
};

module.exports = { getAllAuthors };

// Получение автора по ID
const getAuthorById = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await Author.findById(id);
    if (!author) return res.status(404).json({ error: 'Автор не найден' });
    res.json(author);
  } catch (error) {
    console.error('getAuthorById error:', error);
    res.status(500).json({ error: 'Ошибка получения автора' });
  }
};

// Создание автора
const createAuthor = async (req, res) => {
  try {
    const { name, biography } = req.body;
    if (!name) return res.status(400).json({ error: 'Требуется имя автора' });
    const created = await Author.create({ name, biography });
    res.status(201).json(created);
  } catch (error) {
    console.error('createAuthor error:', error);
    res.status(500).json({ error: 'Ошибка создания автора' });
  }
};

// Обновление автора
const updateAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, biography } = req.body;
    // Проверяем существование
    const existing = await Author.findById(id);
    if (!existing) return res.status(404).json({ error: 'Автор не найден' });
    const result = await pool.query(
      'UPDATE authors SET name = $1, biography = $2 WHERE id = $3 RETURNING *',
      [name ?? existing.name, biography ?? existing.biography, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateAuthor error:', error);
    res.status(500).json({ error: 'Ошибка обновления автора' });
  }
};

// Удаление автора
const deleteAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM authors WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('deleteAuthor error:', error);
    res.status(500).json({ error: 'Ошибка удаления автора' });
  }
};

module.exports = { getAllAuthors, getAuthorById, createAuthor, updateAuthor, deleteAuthor };
