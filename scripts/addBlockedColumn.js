const { Client } = require('pg');
require('dotenv').config();

async function addBlockedColumn() {
    console.log('🔧 Adding blocked column to users table...');
    
    const dbClient = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        console.log('📡 Connecting to database...');
        await dbClient.connect();
        console.log('✅ Connected to database');
        
        // Check if the column already exists
        const checkColumn = await dbClient.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'blocked'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('📊 Column "blocked" already exists');
            return;
        }
        
        // Add the blocked column
        console.log('➕ Adding blocked column to users table...');
        await dbClient.query(`
            ALTER TABLE users 
            ADD COLUMN blocked BOOLEAN DEFAULT FALSE
        `);
        
        console.log('✅ Column "blocked" added successfully');
        console.log('🎉 Migration completed!');
        
    } catch (error) {
        console.error('❌ Error during migration:', error.message);
        process.exit(1);
    } finally {
        await dbClient.end();
        console.log('🔚 Database connection closed');
    }
}

addBlockedColumn();