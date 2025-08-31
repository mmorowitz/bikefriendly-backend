-- +migrate Up
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_categories_name ON categories(name);

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE
    ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +migrate Down
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP INDEX IF EXISTS idx_categories_name;
DROP TABLE IF EXISTS categories;

