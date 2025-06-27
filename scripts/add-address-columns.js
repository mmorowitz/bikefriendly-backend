const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const addAddressColumns = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Adding address columns to businesses table...');
    
    // Add address columns
    await client.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS street_address VARCHAR(255),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(2),
      ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
    `);
    
    console.log('Address columns added successfully!');
    
  } catch (error) {
    console.error('Error adding address columns:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

addAddressColumns();