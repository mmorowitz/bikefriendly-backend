# Chicago Bike-Friendly Business Map - Backend

## Project Overview
This is the backend API for a website that displays bicycle-friendly businesses and services in and around Chicago, IL. The backend provides read-only endpoints for business data with cost protection measures.

## Architecture
- **Framework**: Node.js with Express
- **Database**: PostgreSQL (Render managed)
- **Authentication**: None (read-only public API)
- **Protection**: Rate limiting + CORS + response caching

## Database Schema
Single `businesses` table:
- `id` (primary key)
- `name` (string)
- `latitude` (decimal)
- `longitude` (decimal) 
- `category` (string)
- `street_address` (string, optional) - Street number and name
- `city` (string, optional) - City name
- `state` (string, optional) - Two-letter state code
- `zip_code` (string, optional) - ZIP or ZIP+4 format
- `phone` (string, optional)
- `url` (string, optional)
- `is_active` (boolean) - for publish/unpublish
- `is_sponsored` (boolean) - for upgraded pins
- `created_at` (timestamp)
- `updated_at` (timestamp)

## API Endpoints
- `GET /api/businesses` - Return all active businesses
- `GET /api/businesses/:id` - Return single business
- `GET /health` - Health check endpoint

## Protection Measures
- **Rate Limiting**: 100 requests/hour per IP using express-rate-limit
- **CORS**: Domain-restricted using cors middleware
- **Caching**: 5-10 minute response caching (in-memory)
- **Validation**: Input sanitization for query parameters

## Data Management
- **Migrations**: Versioned database schema changes using custom migration system
- **CSV import**: Bulk data updates via `npm run import <csv-file>`
- **Direct PostgreSQL access**: Manual edits when needed
- **Business data**: Should be version-controlled as CSV files

### Migration Commands
- `npm run migrate` - Run pending migrations
- `npm run migrate:rollback [steps]` - Rollback migrations (default: 1 step)
- `npm run migrate:status` - Show migration status
- `npm run migrate:create <name>` - Create new migration file

## Dependencies
- express
- pg (PostgreSQL client)
- cors
- express-rate-limit
- node-cache (for response caching)
- csv-parser (for import script)
- dotenv

## Environment Variables
- `DATABASE_URL` (Render PostgreSQL connection string)
- `PORT` (default 3000)
- `NODE_ENV` (production/development)
- `ALLOWED_ORIGINS` (comma-separated domains for CORS)

## Deployment Target
- Render web service
- Serves both API and static frontend files
- PostgreSQL add-on for database