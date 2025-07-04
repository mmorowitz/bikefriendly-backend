require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300 });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());

// Cache middleware
const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  
  if (cachedResponse) {
    return res.json(cachedResponse);
  }
  
  // Store original res.json
  const originalJson = res.json;
  res.json = function(data) {
    cache.set(key, data);
    return originalJson.call(this, data);
  };
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all active businesses with optional filtering
app.get('/api/businesses', cacheMiddleware, async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      radius, 
      bounds, 
      category, 
      limit = 1000,
      offset = 0 
    } = req.query;

    let query = 'SELECT * FROM businesses WHERE is_active = true';
    const params = [];
    let paramCount = 0;

    // Geographic filtering by bounding box (preferred for maps)
    if (bounds) {
      const [swLat, swLng, neLat, neLng] = bounds.split(',').map(Number);
      if (swLat && swLng && neLat && neLng) {
        query += ` AND latitude BETWEEN $${++paramCount} AND $${++paramCount}`;
        query += ` AND longitude BETWEEN $${++paramCount} AND $${++paramCount}`;
        params.push(swLat, neLat, swLng, neLng);
      }
    }
    // Geographic filtering by radius (alternative)
    else if (lat && lng && radius) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusNum = parseFloat(radius);
      
      if (!isNaN(latNum) && !isNaN(lngNum) && !isNaN(radiusNum)) {
        // Using Haversine formula approximation for radius filtering
        query += ` AND (
          6371 * acos(
            cos(radians($${++paramCount})) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($${++paramCount})) + 
            sin(radians($${++paramCount})) * sin(radians(latitude))
          )
        ) <= $${++paramCount}`;
        params.push(latNum, lngNum, latNum, radiusNum);
      }
    }

    // Category filtering
    if (category) {
      query += ` AND category = $${++paramCount}`;
      params.push(category);
    }

    // Ordering and pagination
    query += ' ORDER BY name';
    
    const limitNum = Math.min(parseInt(limit) || 1000, 1000); // Cap at 1000
    const offsetNum = parseInt(offset) || 0;
    
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limitNum, offsetNum);

    const result = await pool.query(query, params);
    
    // Include metadata for pagination
    const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*)')
                           .replace(/ORDER BY name.*$/, '');
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    res.json({
      businesses: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single business
app.get('/api/businesses/:id', cacheMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM businesses WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;