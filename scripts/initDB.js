﻿﻿const { Client } = require('pg');
require('dotenv').config();

async function initializeDatabase() {
    console.log('🔧 Начинаем инициализацию базы данных...');
    
    const adminClient = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: 'postgres'
    });

    try {
        console.log('📡 Подключаемся к PostgreSQL...');
        await adminClient.connect();
        console.log('✅ Подключение к PostgreSQL успешно');
        
        // Создаем базу данных если она не существует
        try {
            console.log('🗄️ Пытаемся создать базу данных...');
            await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`✅ База данных ${process.env.DB_NAME} создана`);
        } catch (error) {
            if (error.code === '42P04') {
                console.log(`📊 База данных ${process.env.DB_NAME} уже существует`);
            } else {
                console.log('❌ Ошибка при создании БД:', error.message);
                throw error;
            }
        }
        
        await adminClient.end();
    } catch (error) {
        console.error('❌ Ошибка при создании базы данных:', error.message);
        console.log('🔧 Проверьте настройки в файле .env');
        console.log('Host:', process.env.DB_HOST);
        console.log('Port:', process.env.DB_PORT); 
        console.log('User:', process.env.DB_USER);
        console.log('Password:', process.env.DB_PASSWORD ? '***' : 'не установлен');
        process.exit(1);
    }

    // Подключаемся к созданной базе данных
    const dbClient = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        console.log('📡 Подключаемся к базе данных book_catalog...');
        await dbClient.connect();
        console.log('✅ Подключение к book_catalog успешно');

        // Создаем таблицы
        console.log('🗂️ Создаем таблицы...');

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
                blocked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица users создана');

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS authors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                biography TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица authors создана');

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS genres (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица genres создана');

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author_id INTEGER REFERENCES authors(id),
                genre_id INTEGER REFERENCES genres(id),
                isbn VARCHAR(20) UNIQUE,
                publisher VARCHAR(255),
                publication_year INTEGER,
                price DECIMAL(10,2) NOT NULL,
                stock_quantity INTEGER DEFAULT 0,
                description TEXT,
                cover_image VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица books создана');

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
                shipping_address TEXT,
                customer_notes TEXT, -- Customer comments and special requests
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица orders создана');

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                book_id INTEGER REFERENCES books(id),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица order_items создана');

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS promotions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
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
        console.log('✅ Таблица promotions создана');

        // Создаем индексы
        console.log('📈 Создаем индексы...');
        
        await dbClient.query('CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)');
        await dbClient.query('CREATE INDEX IF NOT EXISTS idx_books_author ON books(author_id)');
        await dbClient.query('CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre_id)');
        await dbClient.query('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
        await dbClient.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
        await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await dbClient.query("CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active)");
        await dbClient.query("CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date)");

        console.log('🎉 База данных успешно инициализирована!');
        console.log('📊 Созданы все таблицы и индексы');

    } catch (error) {
        console.error('❌ Ошибка при инициализации базы данных:', error.message);
    } finally {
        await dbClient.end();
        console.log('🔚 Соединение закрыто');
    }
}

initializeDatabase();
