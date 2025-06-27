const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const createSchema = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Creating businesses table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        category VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_sponsored BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);
    `);
    
    console.log('Schema created successfully!');
    
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

createSchema();