const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'database',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'clouddeploy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check (required for Kubernetes)
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy' });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy' });
    }
});

// Get services
app.get('/api/services', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM services ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Initialize database
async function initDB() {
    try {
        // Create table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Seed data (only if empty)
        const count = await pool.query('SELECT COUNT(*) FROM services');
        if (parseInt(count.rows[0].count) === 0) {
            await pool.query(`
        INSERT INTO services (name, description) VALUES
        ('Passport Renewal', 'Apply for or renew your passport'),
        ('NHS Registration', 'Register with a local GP surgery')
      `);
            console.log('✓ Database seeded');
        }
    } catch (error) {
        console.error('Database init error:', error);
    }
}

// Start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`);
    });
});