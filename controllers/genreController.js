const Genre = require('../models/Genre');
const pool = require('../config/database');

const getAllGenres = async (req, res) => {
  try {
    const genres = await Genre.findAll();
    // Возвращаем чистый массив, как ожидает клиент
    res.json(genres);
  } catch (error) {
    console.error('getAllGenres error:', error);
    res.status(500).json({ error: 'Ошибка получения жанров' });
  }
};

module.exports = { getAllGenres };

// Получение жанра по ID
const getGenreById = async (req, res) => {
  try {
    const { id } = req.params;
    const genre = await Genre.findById(id);
    if (!genre) return res.status(404).json({ error: 'Жанр не найден' });
    res.json(genre);
  } catch (error) {
    console.error('getGenreById error:', error);
    res.status(500).json({ error: 'Ошибка получения жанра' });
  }
};

// Создание жанра
const createGenre = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Требуется название жанра' });
    const created = await Genre.create({ name, description });
    res.status(201).json(created);
  } catch (error) {
    console.error('createGenre error:', error);
    res.status(500).json({ error: 'Ошибка создания жанра' });
  }
};

// Обновление жанра
const updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const existing = await Genre.findById(id);
    if (!existing) return res.status(404).json({ error: 'Жанр не найден' });
    const result = await pool.query(
      'UPDATE genres SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name ?? existing.name, description ?? existing.description, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateGenre error:', error);
    res.status(500).json({ error: 'Ошибка обновления жанра' });
  }
};

// Удаление жанра
const deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM genres WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('deleteGenre error:', error);
    res.status(500).json({ error: 'Ошибка удаления жанра' });
  }
};

module.exports = { getAllGenres, getGenreById, createGenre, updateGenre, deleteGenre };
