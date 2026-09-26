import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = process.cwd();

/** Boot re-runs these files. Refuse statements that drop or delete rows. */
const DESTRUCTIVE_SQL = /\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i;

export function isPostgresUrl(url) {
  const value = (url || "").trim();
  return value.startsWith("postgres://") || value.startsWith("postgresql://");
}

export function listMigrationSqlFiles(migrationsDir) {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => path.join(migrationsDir, name, "migration.sql"))
    .filter((file) => existsSync(file));
}

export function assertSafeToRerun(sql, file) {
  if (DESTRUCTIVE_SQL.test(sql)) {
    throw new Error(`${file} is not safe to re-run on boot (DROP, TRUNCATE, or DELETE FROM)`);
  }
}

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function baseSchemaExists(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const result = await client.query(`SELECT to_regclass('public."Supplier"') AS rel`);
    return Boolean(result.rows[0]?.rel);
  } finally {
    await client.end();
  }
}

export async function applySqlMigrations() {
  loadEnvFile(path.join(root, ".env"));
  const url = process.env.DATABASE_URL || "";
  if (!isPostgresUrl(url)) {
    console.log("sql migrations: skipped (DATABASE_URL is not Postgres)");
    return;
  }

  if (!(await baseSchemaExists(url))) {
    console.log("sql migrations: skipped (fresh Postgres; db push creates the schema)");
    return;
  }

  const files = listMigrationSqlFiles(path.join(root, "prisma", "migrations"));
  const bin = path.join(root, "node_modules", ".bin", "prisma");
  const schema = path.join(root, "prisma", "schema.prisma");

  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    assertSafeToRerun(sql, file);
    console.log(`sql migrations: prisma db execute --file ${path.relative(root, file)} --schema prisma/schema.prisma`);
    const result = spawnSync(
      bin,
      ["db", "execute", `--file=${file}`, `--schema=${schema}`],
      { stdio: "inherit", env: process.env },
    );
    if ((result.status ?? 1) !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  applySqlMigrations().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
