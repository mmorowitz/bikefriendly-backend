const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function markInitialMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Creating schema_migrations table...');
    
    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Marking initial migration as applied...');
    
    // Mark the initial migration as already applied
    await client.query(`
      INSERT INTO schema_migrations (version) 
      VALUES ('001') 
      ON CONFLICT (version) DO NOTHING;
    `);
    
    console.log('✓ Initial migration marked as applied');
    console.log('✓ Ready for address fields migration');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

markInitialMigration();