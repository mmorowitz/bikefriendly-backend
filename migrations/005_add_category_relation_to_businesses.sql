-- +migrate Up
-- Add category_id foreign key column
ALTER TABLE businesses ADD COLUMN category_id INTEGER;

-- Update businesses to reference category IDs
UPDATE businesses 
SET category_id = c.id 
FROM categories c 
WHERE businesses.category = c.name;

-- Add foreign key constraint
ALTER TABLE businesses 
ADD CONSTRAINT fk_businesses_category 
FOREIGN KEY (category_id) REFERENCES categories(id);

-- Add index for better performance
CREATE INDEX idx_businesses_category_id ON businesses(category_id);

-- Remove the old category string column
ALTER TABLE businesses DROP COLUMN category;

-- Remove the old category index since we're dropping the column
DROP INDEX IF EXISTS idx_businesses_category;

-- +migrate Down
-- Recreate the category string column
ALTER TABLE businesses ADD COLUMN category VARCHAR(100);

-- Populate category column from categories table
UPDATE businesses 
SET category = c.name 
FROM categories c 
WHERE businesses.category_id = c.id;

-- Recreate the category index
CREATE INDEX idx_businesses_category ON businesses(category);

-- Drop foreign key constraint and column
DROP INDEX IF EXISTS idx_businesses_category_id;
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS fk_businesses_category;
ALTER TABLE businesses DROP COLUMN IF EXISTS category_id;

