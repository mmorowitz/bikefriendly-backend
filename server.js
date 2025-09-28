import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import NodeCache from "node-cache";
import pkg from "pg";
const { Pool } = pkg;
import { initAdminJSDatabase } from "./models/adminjs.js";
import componentLoader from "./component-loader.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced error logging
console.log("=== SERVER STARTUP ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", PORT);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("ALLOWED_ORIGINS:", process.env.ALLOWED_ORIGINS);

// Global error handlers
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
  process.exit(1);
});

// Initialize cache (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300 });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("=== DATABASE CONNECTION FAILED ===");
    console.error("Error acquiring client:", err.stack);
    process.exit(1);
  } else {
    console.log("=== DATABASE CONNECTED ===");
    client.query("SELECT NOW()", (err, result) => {
      release();
      if (err) {
        console.error("Database query test failed:", err.stack);
        process.exit(1);
      } else {
        console.log("Database query test successful:", result.rows[0]);
      }
    });
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  credentials: true,
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
  res.json = function (data) {
    cache.set(key, data);
    return originalJson.call(this, data);
  };

  next();
};

// Initialize AdminJS
const initAdmin = async () => {
  try {
    // Dynamic import for ES module
    const AdminJSExpress = await import("@adminjs/express");
    const { db, AdminJS } = await initAdminJSDatabase();

    // Debug: Check what properties AdminJS detects from the database
    const businessesTable = db.table("businesses");
    console.log(
      "Available business table properties:",
      Object.keys(businessesTable.properties()),
    );

    const admin = new AdminJS({
      componentLoader,
      branding: {
        companyName: "Bike Friendly",
        logo: false,
        favicon: false,
      },
      resources: [
        {
          resource: businessesTable,
          options: {
            listProperties: [
              "id",
              "name",
              "category_id",
              "is_active",
              "is_sponsored",
            ],
            showProperties: [
              "id",
              "name",
              "latitude",
              "longitude",
              "category_id",
              "street_address",
              "city",
              "state",
              "zip_code",
              "phone",
              "url",
              "is_active",
              "is_sponsored",
              "created_at",
              "updated_at",
            ],
            editProperties: [
              "name",
              "latitude",
              "longitude",
              "category_id",
              "street_address",
              "city",
              "state",
              "zip_code",
              "phone",
              "url",
              "is_active",
              "is_sponsored",
            ],
            newProperties: [
              "name",
              "latitude",
              "longitude",
              "category_id",
              "street_address",
              "city",
              "state",
              "zip_code",
              "phone",
              "url",
              "is_active",
              "is_sponsored",
            ],
            filterProperties: [
              "name",
              "category_id",
              "is_active",
              "is_sponsored",
            ],
            properties: {
              id: {
                isVisible: {
                  list: true,
                  show: true,
                  edit: false,
                  filter: false,
                  new: false,
                },
                isId: true,
              },
              category_id: {
                reference: "categories",
                type: "reference",
              },
            },
            actions: {
              new: {
                before: async (request) => {
                  // Debug: Log the request payload to see what fields are being sent
                  console.log(
                    "AdminJS new business request payload:",
                    request.payload,
                  );

                  // Remove id from payload if present
                  if (request.payload && request.payload.id) {
                    console.log("Removing id field from payload");
                    delete request.payload.id;
                  }
                  return request;
                },
              },
            },
          },
        },
        {
          resource: db.table("categories"),
          options: {
            listProperties: ["id", "name", "description"],
            showProperties: [
              "id",
              "name",
              "description",
              "created_at",
              "updated_at",
            ],
            editProperties: ["name", "description"],
            filterProperties: ["name"],
          },
        },
      ],
      rootPath: "/admin",
    });

    // Use the simpler router setup to avoid static asset issues
    const adminRouter = AdminJSExpress.default.buildAuthenticatedRouter(
      admin,
      {
        authenticate: async (email, password) => {
          const adminEmail =
            process.env.ADMIN_EMAIL || "admin@bikefriendly.com";
          const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

          if (email === adminEmail && password === adminPassword) {
            return { email: adminEmail, role: "admin" };
          }
          return null;
        },
        cookieName: "adminjs",
        cookiePassword:
          process.env.ADMIN_COOKIE_SECRET ||
          "supersecretcookiepassword123456789",
      },
      null,
      {
        resave: false,
        saveUninitialized: true,
        secret:
          process.env.ADMIN_COOKIE_SECRET ||
          "supersecretcookiepassword123456789",
      },
    );

    // Serve bundled AdminJS assets
    app.use("/admin/frontend/assets", express.static("./.adminjs"));

    console.log("About to mount AdminJS at path:", admin.options.rootPath);
    console.log("AdminJS router type:", typeof adminRouter);
    app.use(admin.options.rootPath, adminRouter);
    console.log("AdminJS router mounted successfully");

    console.log(
      `AdminJS started on http://localhost:${PORT}${admin.options.rootPath}`,
    );
  } catch (error) {
    console.error("Failed to initialize AdminJS:", error);
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Get all active businesses with optional filtering
app.get("/api/businesses", cacheMiddleware, async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius,
      bounds,
      category,
      limit = 1000,
      offset = 0,
    } = req.query;

    let query = `
      SELECT b.*, c.name as category_name
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    // Geographic filtering by bounding box (preferred for maps)
    if (bounds) {
      const [swLat, swLng, neLat, neLng] = bounds.split(",").map(Number);
      if (swLat && swLng && neLat && neLng) {
        query += ` AND b.latitude BETWEEN $${++paramCount} AND $${++paramCount}`;
        query += ` AND b.longitude BETWEEN $${++paramCount} AND $${++paramCount}`;
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
            cos(radians($${++paramCount})) * cos(radians(b.latitude)) *
            cos(radians(b.longitude) - radians($${++paramCount})) +
            sin(radians($${++paramCount})) * sin(radians(b.latitude))
          )
        ) <= $${++paramCount}`;
        params.push(latNum, lngNum, latNum, radiusNum);
      }
    }

    // Category filtering - can filter by category name or ID
    if (category) {
      // Check if category is numeric (ID) or string (name)
      if (/^\d+$/.test(category)) {
        query += ` AND b.category_id = $${++paramCount}`;
        params.push(parseInt(category));
      } else {
        query += ` AND c.name = $${++paramCount}`;
        params.push(category);
      }
    }

    // Ordering and pagination
    query += " ORDER BY b.name";

    const limitNum = Math.min(parseInt(limit) || 1000, 1000); // Cap at 1000
    const offsetNum = parseInt(offset) || 0;

    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limitNum, offsetNum);

    const result = await pool.query(query, params);

    // Include metadata for pagination
    const countQuery = query
      .replace(/SELECT b\.\*, c\.name as category_name/, "SELECT COUNT(*)")
      .replace(/ORDER BY b\.name.*$/, "");
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      businesses: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single business
app.get("/api/businesses/:id", cacheMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT b.*, c.name as category_name
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1 AND b.is_active = true
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching business:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all categories
app.get("/api/categories", cacheMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name");

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
const startServer = async () => {
  // Initialize AdminJS before starting server
  await initAdmin();

  // 404 handler for undefined routes (must be after AdminJS)
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.listen(PORT, () => {
    console.log(`=== SERVER STARTED ===`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API endpoint: http://localhost:${PORT}/api/businesses`);
    console.log("=== SERVER READY ===");
  });
};

startServer();

export default app;
