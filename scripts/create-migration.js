#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function getNextMigrationNumber() {
  const migrationsDir = path.join(__dirname, "../migrations");

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return "001";
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    return "001";
  }

  const lastFile = files[files.length - 1];
  const lastNumber = parseInt(lastFile.split("_")[0]);

  return String(lastNumber + 1).padStart(3, "0");
}

function createMigration(name) {
  if (!name) {
    console.error("Usage: node scripts/create-migration.js <migration_name>");
    console.error("Example: node scripts/create-migration.js add_user_table");
    process.exit(1);
  }

  // Clean up the name
  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

  const migrationNumber = getNextMigrationNumber();
  const filename = `${migrationNumber}_${cleanName}.sql`;
  const filepath = path.join(__dirname, "../migrations", filename);

  const template = `-- +migrate Up
-- Add your up migration here


-- +migrate Down
-- Add your down migration here (to undo the up migration)

`;

  fs.writeFileSync(filepath, template);

  console.log(`Created migration: ${filename}`);
  console.log(`File location: ${filepath}`);
}

// Get migration name from command line arguments
const migrationName = process.argv[2];
createMigration(migrationName);
