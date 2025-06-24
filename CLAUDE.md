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
- CSV import script for bulk data updates
- Direct PostgreSQL access for manual edits
- Business data should be version-controlled as CSV files

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