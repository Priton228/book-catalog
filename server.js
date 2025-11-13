const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const authorRoutes = require('./routes/authors');
const genreRoutes = require('./routes/genres');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware - БЕЗ Helmet!
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы - РАБОЧАЯ ВЕРСИЯ
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/admin', adminRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/catalog.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'catalog.html'));
});

app.get('/orders.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'orders.html'));
});

app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/test-api.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-api.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'Электронный каталог книг работает'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Что-то пошло не так!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Главная страница: http://localhost:${PORT}`);
    console.log(`📚 Каталог книг: http://localhost:${PORT}/catalog.html`);
    console.log(`🎨 CSS работает!`);
});
