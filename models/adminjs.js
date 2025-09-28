// Initialize database connection for AdminJS
export const initAdminJSDatabase = async () => {
  // Dynamic imports for ES modules
  const AdminJS = (await import("adminjs")).default;
  const { Adapter, Database, Resource } = await import("@adminjs/sql");

  // Register the SQL adapter with AdminJS
  AdminJS.registerAdapter({ Database, Resource });

  const db = await new Adapter("postgresql", {
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    database: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.split("/").pop().split("?")[0]
      : "bikefriendly",
  }).init();

  return { db, AdminJS };
};
