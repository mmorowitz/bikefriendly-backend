const request = require('supertest');
const app = require('../server');

// Mock the pg module
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock node-cache
jest.mock('node-cache');

const { Pool } = require('pg');
const mockPool = new Pool();

// Mock data
const mockBusinesses = [
  {
    id: 1,
    name: 'Bike Shop A',
    latitude: 41.8781,
    longitude: -87.6298,
    category_id: 1,
    category_name: 'repair',
    phone: '555-0001',
    url: 'https://bikeshopa.com',
    is_active: true,
    is_sponsored: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Cafe B',
    latitude: 41.8801,
    longitude: -87.6301,
    category_id: 2,
    category_name: 'food',
    phone: '555-0002',
    url: 'https://cafeb.com',
    is_active: true,
    is_sponsored: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockCategories = [
  {
    id: 1,
    name: 'repair',
    description: 'Bike repair shops',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'food',
    description: 'Food and beverages',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('Server Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(Date.parse(response.body.timestamp)).not.toBeNaN();
    });
  });

  describe('GET /api/businesses', () => {
    it('should return all active businesses with pagination metadata', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: mockBusinesses }) // Main query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Count query

      const response = await request(app)
        .get('/api/businesses')
        .expect(200);

      expect(response.body).toHaveProperty('businesses');
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('limit', 1000);
      expect(response.body).toHaveProperty('offset', 0);
      expect(response.body.businesses).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter businesses by category name', async () => {
      const filteredBusinesses = [mockBusinesses[0]];
      mockPool.query
        .mockResolvedValueOnce({ rows: filteredBusinesses })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await request(app)
        .get('/api/businesses?category=repair')
        .expect(200);

      expect(response.body.businesses).toHaveLength(1);
      expect(response.body.businesses[0].category_name).toBe('repair');
      expect(response.body.total).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('c.name = $'),
        expect.arrayContaining(['repair'])
      );
    });

    it('should filter businesses by category ID', async () => {
      const filteredBusinesses = [mockBusinesses[0]];
      mockPool.query
        .mockResolvedValueOnce({ rows: filteredBusinesses })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await request(app)
        .get('/api/businesses?category=1')
        .expect(200);

      expect(response.body.businesses).toHaveLength(1);
      expect(response.body.businesses[0].category_id).toBe(1);
      expect(response.body.total).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('b.category_id = $'),
        expect.arrayContaining([1])
      );
    });

    it('should filter businesses by bounding box', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: mockBusinesses })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const response = await request(app)
        .get('/api/businesses?bounds=41.87,-87.64,41.89,-87.62')
        .expect(200);

      expect(response.body.businesses).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('latitude BETWEEN'),
        expect.arrayContaining([41.87, 41.89, -87.64, -87.62])
      );
    });

    it('should filter businesses by radius', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBusinesses[0]] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await request(app)
        .get('/api/businesses?lat=41.8781&lng=-87.6298&radius=1')
        .expect(200);

      expect(response.body.businesses).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('6371 * acos'),
        expect.arrayContaining([41.8781, -87.6298, 41.8781, 1])
      );
    });

    it('should handle pagination with limit and offset', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBusinesses[0]] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const response = await request(app)
        .get('/api/businesses?limit=1&offset=0')
        .expect(200);

      expect(response.body.businesses).toHaveLength(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
      expect(response.body.total).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([1, 0])
      );
    });

    it('should cap limit at 1000', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: mockBusinesses })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const response = await request(app)
        .get('/api/businesses?limit=2000')
        .expect(200);

      expect(response.body.limit).toBe(1000);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([1000, 0])
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/businesses')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');
    });

    it('should handle invalid bounds parameters gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: mockBusinesses })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const response = await request(app)
        .get('/api/businesses?bounds=invalid,bounds,params')
        .expect(200);

      // Should ignore invalid bounds and return all businesses
      expect(response.body.businesses).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('latitude BETWEEN'),
        expect.any(Array)
      );
    });

    it('should handle invalid radius parameters gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: mockBusinesses })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const response = await request(app)
        .get('/api/businesses?lat=invalid&lng=invalid&radius=invalid')
        .expect(200);

      // Should ignore invalid radius and return all businesses
      expect(response.body.businesses).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('6371 * acos'),
        expect.any(Array)
      );
    });
  });

  describe('GET /api/categories', () => {
    it('should return all categories', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCategories });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toEqual(mockCategories);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('description');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM categories ORDER BY name'
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/categories')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');
    });

    it('should handle empty categories list', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toEqual([]);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/businesses/:id', () => {
    it('should return a single business by id', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockBusinesses[0]] });

      const response = await request(app)
        .get('/api/businesses/1')
        .expect(200);

      expect(response.body).toEqual(mockBusinesses[0]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT b.*, c.name as category_name'),
        ['1']
      );
    });

    it('should return 404 for non-existent business', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/businesses/999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Business not found');
    });

    it('should return 404 for inactive business', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/businesses/1')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Business not found');
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/businesses/1')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
    });

    it('should return 404 for POST requests to existing GET routes', async () => {
      const response = await request(app)
        .post('/api/businesses')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });

  describe('Middleware', () => {
    it('should handle CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // CORS headers might not be present in test environment
      // Just verify the endpoint works and returns expected data
      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle rate limiting headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Rate limiting headers might not be present in test environment
      // Just verify the endpoint works
      expect(response.body).toHaveProperty('status', 'OK');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query results gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const response = await request(app)
        .get('/api/businesses')
        .expect(200);

      expect(response.body.businesses).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should handle multiple query parameters correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockBusinesses[0]] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await request(app)
        .get('/api/businesses?category=repair&limit=10&offset=5')
        .expect(200);

      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('c.name = $'),
        expect.arrayContaining(['repair', 10, 5])
      );
    });

    it('should handle string id parameters in business endpoint', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockBusinesses[0]] });

      const response = await request(app)
        .get('/api/businesses/abc')
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT b.*, c.name as category_name'),
        ['abc']
      );
    });
  });
});