const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/admin');
const {
  // User management
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  blockUser,
  unblockUser,
  
  // Book management
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  
  // Order management
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  
  // Statistics
  getStatistics
} = require('../controllers/adminController');

// Authors management
const {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor
} = require('../controllers/authorController');

// Genres management
const {
  getAllGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre
} = require('../controllers/genreController');

// Statistics
router.get('/statistics', adminAuth, getStatistics);

// User management routes
router.get('/users', adminAuth, getAllUsers);
router.get('/users/:id', adminAuth, getUserById);
router.post('/users', adminAuth, createUser);
router.put('/users/:id', adminAuth, updateUser);
router.delete('/users/:id', adminAuth, blockUser);
router.patch('/users/:id/unblock', adminAuth, unblockUser);

// Book management routes
router.get('/books', adminAuth, getAllBooks);
router.get('/books/:id', adminAuth, getBookById);
router.post('/books', adminAuth, createBook);
router.put('/books/:id', adminAuth, updateBook);
router.delete('/books/:id', adminAuth, deleteBook);

// Order management routes
router.get('/orders', adminAuth, getAllOrders);
router.get('/orders/:id', adminAuth, getOrderById);
router.patch('/orders/:id/status', adminAuth, updateOrderStatus);
router.delete('/orders/:id', adminAuth, deleteOrder);

// Authors management routes
router.get('/authors', adminAuth, getAllAuthors);
router.get('/authors/:id', adminAuth, getAuthorById);
router.post('/authors', adminAuth, createAuthor);
router.put('/authors/:id', adminAuth, updateAuthor);
router.delete('/authors/:id', adminAuth, deleteAuthor);

// Genres management routes
router.get('/genres', adminAuth, getAllGenres);
router.get('/genres/:id', adminAuth, getGenreById);
router.post('/genres', adminAuth, createGenre);
router.put('/genres/:id', adminAuth, updateGenre);
router.delete('/genres/:id', adminAuth, deleteGenre);

module.exports = router;