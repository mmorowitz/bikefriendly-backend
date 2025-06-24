-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    category VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_sponsored BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);

-- Create index for active businesses
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE
    ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();