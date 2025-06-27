-- +migrate Up
ALTER TABLE businesses 
ADD COLUMN street_address VARCHAR(255),
ADD COLUMN city VARCHAR(100),
ADD COLUMN state VARCHAR(2),
ADD COLUMN zip_code VARCHAR(10);

-- +migrate Down
ALTER TABLE businesses 
DROP COLUMN IF EXISTS zip_code,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS street_address;