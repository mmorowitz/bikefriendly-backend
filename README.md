# Chicago Bike-Friendly Business Map - Backend

This is the backend API for a website that displays bicycle-friendly businesses and services in and around Chicago, IL. The backend provides read-only endpoints for business data with cost protection measures.

## Architecture

- **Framework**: Node.js with Express
- **Database**: PostgreSQL  
- **Authentication**: AdminJS with HTTP Basic Auth (admin only)
- **Protection**: Rate limiting + CORS + response caching + security headers

## API Endpoints

- `GET /api/businesses` - Return all active businesses with optional filtering
- `GET /api/businesses/:id` - Return single business
- `GET /health` - Health check endpoint
- `GET /admin` - AdminJS interface (authenticated access only)

## Security

### Required Environment Variables for Production

**⚠️ CRITICAL: These environment variables MUST be set for production deployment:**

```bash
# Admin Authentication (REQUIRED)
ADMIN_EMAIL=your-secure-admin-email@domain.com
ADMIN_PASSWORD=your-very-strong-password-minimum-12-characters
ADMIN_COOKIE_SECRET=your-random-secret-key-minimum-32-characters

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database

# Optional but Recommended
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
```

### Security Features

- **Authentication**: AdminJS protected with HTTP Basic Auth
- **HTTPS Enforcement**: Admin routes require HTTPS in production
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, etc.
- **Rate Limiting**: 100 requests/hour per IP
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: SQL injection protection via parameterized queries
- **Environment Validation**: Server refuses to start with weak credentials in production

### Security Best Practices

1. **Strong Passwords**: Admin password must be 12+ characters in production
2. **Unique Secrets**: Generate unique values for `ADMIN_COOKIE_SECRET`
3. **HTTPS Only**: Always use HTTPS for admin access in production
4. **Limited Access**: Restrict admin access to trusted IPs if possible
5. **Regular Updates**: Keep dependencies updated for security patches

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ 
- Git

### Initial Setup

```bash
# Clone and setup project
git clone <your-repo-url>
cd bikefriendly-backend
npm install
```

### Database Setup

#### Option A: Using PostgreSQL directly
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database and user
createdb bikefriendly_dev
psql bikefriendly_dev -f schema.sql
```

#### Option C: Using Postgres.app (macOS)
```bash
# Start PostgreSQL server
pg_ctl -D ~/Library/Application\ Support/Postgres/var-17 start

# Stop PostgreSQL server
pg_ctl -D ~/Library/Application\ Support/Postgres/var-17 stop

# Create database
createdb bikefriendly_dev
```

#### Option B: Using Docker
```bash
# Run PostgreSQL in Docker
docker run --name bikefriendly-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=bikefriendly_dev -p 5432:5432 -d postgres:14

# Wait for container to start, then setup schema
docker exec -i bikefriendly-db psql -U postgres -d bikefriendly_dev < schema.sql
```

### Environment Configuration

Create `.env` file:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/bikefriendly_dev
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Running the Server

```bash
# Development server
npm run dev

# Production server  
npm start
```

### Data Import

```bash
# Import sample data
npm run import data/businesses-sample.csv

# Import custom CSV
node scripts/import-csv.js path/to/your/data.csv
```

Expected CSV format:
- `name` - Business name
- `latitude` - Decimal latitude 
- `longitude` - Decimal longitude
- `category` - Business category
- `phone` - Phone number (optional)
- `url` - Website URL (optional)
- `is_sponsored` - true/false for sponsored businesses

## Testing Setup

### Integration Testing

Install testing dependencies:
```bash
npm install --save-dev jest supertest
```

Add test scripts to package.json:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:integration": "NODE_ENV=test jest --testPathPattern=integration"
  }
}
```

Create test database:
```bash
# Create test database
createdb bikefriendly_test
psql bikefriendly_test -f schema.sql
```

Add `.env.test` file:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/bikefriendly_test
NODE_ENV=test
PORT=3001
```

### API Validation

Test your setup:
```bash
# Health check
curl http://localhost:3000/health

# Get businesses
curl http://localhost:3000/api/businesses

# Get specific business
curl http://localhost:3000/api/businesses/1

# Filter by category
curl "http://localhost:3000/api/businesses?category=bike_shop"

# Filter by location bounds
curl "http://localhost:3000/api/businesses?bounds=41.8,-87.7,41.9,-87.6"
```

## Database Management

```bash
# Connect to dev database
psql $DATABASE_URL

# View all businesses
psql $DATABASE_URL -c "SELECT * FROM businesses LIMIT 10;"

# Check business categories
psql $DATABASE_URL -c "SELECT DISTINCT category FROM businesses;"

# Reset database
psql $DATABASE_URL -c "DROP TABLE IF EXISTS businesses CASCADE;"
psql $DATABASE_URL -f schema.sql
```

## Database Schema

The `businesses` table contains:
- `id` (primary key)
- `name` (string)
- `latitude` (decimal)
- `longitude` (decimal)
- `category` (string)
- `phone` (string, optional)
- `url` (string, optional)
- `is_active` (boolean) - for publish/unpublish
- `is_sponsored` (boolean) - for upgraded pins
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Protection Measures

- **Rate Limiting**: 100 requests/hour per IP using express-rate-limit
- **CORS**: Domain-restricted using cors middleware
- **Caching**: 5-minute response caching (in-memory)
- **Validation**: Input sanitization for query parameters

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default 3000)
- `NODE_ENV` - Environment (production/development)
- `ALLOWED_ORIGINS` - Comma-separated domains for CORS

## Dependencies

- express - Web framework
- pg - PostgreSQL client
- cors - CORS middleware
- express-rate-limit - Rate limiting
- node-cache - Response caching
- csv-parser - CSV import functionality
- dotenv - Environment variable management