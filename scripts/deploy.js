#!/usr/bin/env node

import { MigrationRunner } from "./migrate.js";

async function deploy() {
  console.log("🚀 Starting deployment...");

  try {
    // Run migrations
    console.log("📦 Running database migrations...");
    const runner = new MigrationRunner();
    await runner.migrate();

    console.log("✅ Deployment completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

deploy();
