-- +migrate Up
-- Extract unique categories from businesses table and insert into categories table
INSERT INTO categories (name, description)
SELECT DISTINCT 
    category,
    'Imported from existing business data'
FROM businesses 
WHERE category IS NOT NULL AND category != ''
ORDER BY category;

-- +migrate Down
-- Remove all categories that were imported from business data
DELETE FROM categories WHERE description = 'Imported from existing business data';

