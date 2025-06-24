require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const businesses = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Expected CSV columns: name, latitude, longitude, category, phone, url, is_sponsored
        businesses.push({
          name: row.name?.trim(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          category: row.category?.trim(),
          phone: row.phone?.trim() || null,
          url: row.url?.trim() || null,
          is_sponsored: row.is_sponsored === 'true' || row.is_sponsored === '1'
        });
      })
      .on('end', async () => {
        try {
          console.log(`Parsed ${businesses.length} businesses from CSV`);
          
          // Clear existing data (optional - remove if you want to append)
          // await pool.query('DELETE FROM businesses');
          
          // Insert businesses
          let insertCount = 0;
          for (const business of businesses) {
            if (!business.name || isNaN(business.latitude) || isNaN(business.longitude) || !business.category) {
              console.warn(`Skipping invalid business:`, business);
              continue;
            }
            
            try {
              await pool.query(
                `INSERT INTO businesses (name, latitude, longitude, category, phone, url, is_sponsored) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [business.name, business.latitude, business.longitude, business.category, business.phone, business.url, business.is_sponsored]
              );
              insertCount++;
            } catch (error) {
              console.error(`Error inserting business ${business.name}:`, error.message);
            }
          }
          
          console.log(`Successfully imported ${insertCount} businesses`);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          await pool.end();
        }
      })
      .on('error', reject);
  });
}

// Get CSV file path from command line arguments
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('Usage: node scripts/import-csv.js <path-to-csv-file>');
  console.error('Example: node scripts/import-csv.js data/businesses.csv');
  process.exit(1);
}

importCSV(csvFilePath)
  .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });