const { Client } = require('pg');
require('dotenv').config();

async function clearOrders() {
    console.log('🔧 Clearing all orders from database...');
    
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        console.log('📡 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');
        
        // Delete all order items first (due to foreign key constraints)
        console.log('🗑️ Deleting all order items...');
        await client.query('DELETE FROM order_items');
        console.log('✅ All order items deleted');
        
        // Delete all orders
        console.log('🗑️ Deleting all orders...');
        await client.query('DELETE FROM orders');
        console.log('✅ All orders deleted');
        
        // Reset the order_items ID sequence
        console.log('🔄 Resetting order_items ID sequence...');
        await client.query('ALTER SEQUENCE order_items_id_seq RESTART WITH 1');
        console.log('✅ order_items ID sequence reset');
        
        // Reset the orders ID sequence
        console.log('🔄 Resetting orders ID sequence...');
        await client.query('ALTER SEQUENCE orders_id_seq RESTART WITH 1');
        console.log('✅ orders ID sequence reset');
        
        console.log('🎉 All orders cleared successfully!');
        
    } catch (error) {
        console.error('❌ Error clearing orders:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔚 Database connection closed');
    }
}

clearOrders();