const pool = require('./config/database');

async function checkAdmin() {
  try {
    const result = await pool.query("SELECT id, email, role FROM users WHERE role = 'admin'");
    console.log('Admin users:', result.rows);
    
    if (result.rows.length === 0) {
      console.log('No admin users found. Creating default admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5)',
        ['admin@example.com', hashedPassword, 'admin', 'Admin', 'User']
      );
      console.log('Default admin created: admin@example.com / admin123');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

checkAdmin();