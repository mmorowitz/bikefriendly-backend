import pkg from "pg";
const { Pool } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, "../migrations");
  }

  async ensureMigrationsTable() {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } finally {
      client.release();
    }
  }

  async getAppliedMigrations() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT version FROM schema_migrations ORDER BY version",
      );
      return result.rows.map((row) => row.version);
    } finally {
      client.release();
    }
  }

  async getPendingMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const applied = await this.getAppliedMigrations();

    return files.filter((file) => {
      const version = this.getVersionFromFilename(file);
      return !applied.includes(version);
    });
  }

  getVersionFromFilename(filename) {
    return filename.split("_")[0];
  }

  async runMigration(filename, direction = "up") {
    const filepath = path.join(this.migrationsDir, filename);
    const content = fs.readFileSync(filepath, "utf8");

    // Split migration file into up and down sections
    const sections = this.parseMigrationFile(content);
    const sql = sections[direction];

    if (!sql) {
      throw new Error(`No ${direction} migration found in ${filename}`);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Execute migration SQL
      await client.query(sql);

      const version = this.getVersionFromFilename(filename);

      if (direction === "up") {
        // Record migration as applied
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
          [version],
        );
        console.log(`✓ Applied migration: ${filename}`);
      } else {
        // Remove migration record
        await client.query("DELETE FROM schema_migrations WHERE version = $1", [
          version,
        ]);
        console.log(`✓ Rolled back migration: ${filename}`);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  parseMigrationFile(content) {
    const upMatch = content.match(
      /-- \+migrate Up\s*\n([\s\S]*?)(?=-- \+migrate Down|\s*$)/,
    );
    const downMatch = content.match(/-- \+migrate Down\s*\n([\s\S]*?)$/);

    return {
      up: upMatch ? upMatch[1].trim() : null,
      down: downMatch ? downMatch[1].trim() : null,
    };
  }

  async migrate(targetVersion = null) {
    await this.ensureMigrationsTable();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log("No pending migrations");
      return;
    }

    console.log(`Found ${pending.length} pending migration(s)`);

    for (const filename of pending) {
      const version = this.getVersionFromFilename(filename);

      if (targetVersion && version > targetVersion) {
        break;
      }

      await this.runMigration(filename, "up");
    }

    console.log("Migration complete");
  }

  async rollback(steps = 1) {
    await this.ensureMigrationsTable();

    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      console.log("No migrations to rollback");
      return;
    }

    // Get the last N applied migrations in reverse order
    const toRollback = applied.slice(-steps).reverse();

    for (const version of toRollback) {
      const filename = fs
        .readdirSync(this.migrationsDir)
        .find((file) => this.getVersionFromFilename(file) === version);

      if (!filename) {
        console.warn(`Migration file not found for version: ${version}`);
        continue;
      }

      await this.runMigration(filename, "down");
    }

    console.log(`Rolled back ${toRollback.length} migration(s)`);
  }

  async status() {
    await this.ensureMigrationsTable();

    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();

    console.log("\nMigration Status:");
    console.log("================");

    if (applied.length > 0) {
      console.log("\nApplied:");
      applied.forEach((version) => console.log(`  ✓ ${version}`));
    }

    if (pending.length > 0) {
      console.log("\nPending:");
      pending.forEach((filename) => {
        const version = this.getVersionFromFilename(filename);
        console.log(`  ○ ${version} (${filename})`);
      });
    }

    if (applied.length === 0 && pending.length === 0) {
      console.log("  No migrations found");
    }

    console.log("");
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];

  try {
    switch (command) {
      case "up":
      case "migrate":
        const targetVersion = process.argv[3];
        await runner.migrate(targetVersion);
        break;

      case "down":
      case "rollback":
        const steps = parseInt(process.argv[3]) || 1;
        await runner.rollback(steps);
        break;

      case "status":
        await runner.status();
        break;

      default:
        console.log("Usage:");
        console.log(
          "  node scripts/migrate.js up [target_version]    - Run pending migrations",
        );
        console.log(
          "  node scripts/migrate.js down [steps]           - Rollback migrations",
        );
        console.log(
          "  node scripts/migrate.js status                 - Show migration status",
        );
        process.exit(1);
    }
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if this is the main module (ES module equivalent of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MigrationRunner };
