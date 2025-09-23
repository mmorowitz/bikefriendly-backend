require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importCategories(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const categories = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        categories.push({
          name: row.name?.trim(),
          description: row.description?.trim() || null
        });
      })
      .on('end', async () => {
        try {
          console.log(`Parsed ${categories.length} categories from CSV`);

          let insertCount = 0;
          let updateCount = 0;

          for (const category of categories) {
            if (!category.name) {
              console.warn(`Skipping invalid category:`, category);
              continue;
            }

            try {
              const result = await pool.query(
                `INSERT INTO categories (name, description)
                 VALUES ($1, $2)
                 ON CONFLICT (name) DO UPDATE
                 SET description = EXCLUDED.description,
                     updated_at = CURRENT_TIMESTAMP
                 RETURNING (xmax = 0) AS inserted`,
                [category.name, category.description]
              );

              if (result.rows[0].inserted) {
                insertCount++;
              } else {
                updateCount++;
              }
            } catch (error) {
              console.error(`Error importing category ${category.name}:`, error.message);
            }
          }

          console.log(`Successfully imported ${insertCount} new categories`);
          console.log(`Updated ${updateCount} existing categories`);
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

const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('Usage: node scripts/import-categories.js <path-to-csv-file>');
  console.error('Example: node scripts/import-categories.js data/categories.csv');
  console.error('\nExpected CSV columns: name, description');
  process.exit(1);
}

importCategories(csvFilePath)
  .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
