/**
 * One-time copy of the live SQLite file into Postgres.
 * Idempotent (upsert by primary key). Never deletes SQLite rows or truncates Postgres.
 *
 *   SQLITE_PATH=/data/dev.db TARGET_DATABASE_URL=postgres://... \
 *     npx tsx scripts/migrate-sqlite-to-postgres.ts --dry-run
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts --verify
 */
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const verify = args.has("--verify");

function sqlitePath() {
  const explicit = process.env.SQLITE_PATH?.trim();
  if (explicit) return explicit;
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (url.startsWith("file:")) return url.slice("file:".length);
  return "/data/dev.db";
}

function targetUrl() {
  return (
    process.env.TARGET_DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    (process.env.DATABASE_URL?.startsWith("postgres") ? process.env.DATABASE_URL.trim() : "")
  );
}

type SqliteColumn = { name: string; pk: number };
type PgColumn = { column_name: string; data_type: string };

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

function coerce(value: unknown, dataType: string) {
  if (value == null) return null;
  if (dataType === "boolean") return value === true || value === 1 || value === "1" || value === "true";
  if (dataType === "json" || dataType === "jsonb") {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (dataType.includes("timestamp") || dataType === "date") {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number" && Number.isFinite(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const asNum = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
    if (Number.isFinite(asNum)) {
      const date = new Date(asNum);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return value;
}

async function main() {
  const sourcePath = sqlitePath();
  const sqlite = new DatabaseSync(sourcePath, { readOnly: true });
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];

  const sourceCounts = new Map<string, number>();
  for (const table of tables) {
    const row = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${quoteIdent(table.name)}`).get() as { c: number };
    sourceCounts.set(table.name, Number(row.c));
  }

  console.log(`SQLite ${sourcePath}`);
  for (const [name, count] of sourceCounts) console.log(`  ${name}: ${count}`);

  if (dryRun) {
    console.log("Dry run only. No rows were written.");
    sqlite.close();
    return;
  }

  const url = targetUrl();
  if (!url) {
    throw new Error("Set TARGET_DATABASE_URL (or POSTGRES_URL) to the Postgres database. SQLite was not modified.");
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (!verify) {
      await client.query("SET session_replication_role = 'replica'");
      for (const table of tables) {
        const exists = await client.query(
          "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
          [table.name],
        );
        if (exists.rowCount === 0) {
          console.log(`  skip ${table.name} (not in Postgres — run prisma db push on the target first)`);
          continue;
        }
        const sqliteColumns = sqlite.prepare(`PRAGMA table_info(${quoteIdent(table.name)})`).all() as SqliteColumn[];
        const pgColumns = (
          await client.query<PgColumn>(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
            [table.name],
          )
        ).rows;
        const pgByName = new Map(pgColumns.map((column) => [column.column_name, column.data_type]));
        const columns = sqliteColumns.filter((column) => pgByName.has(column.name));
        const pk = columns.filter((column) => column.pk > 0).sort((a, b) => a.pk - b.pk);
        if (pk.length === 0 || columns.length === 0) continue;
        const rows = sqlite.prepare(`SELECT * FROM ${quoteIdent(table.name)}`).all() as Record<string, unknown>[];
        const colSql = columns.map((column) => quoteIdent(column.name)).join(", ");
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
        const updates = columns
          .filter((column) => !pk.some((key) => key.name === column.name))
          .map((column) => `${quoteIdent(column.name)} = EXCLUDED.${quoteIdent(column.name)}`)
          .join(", ");
        const conflict = pk.map((column) => quoteIdent(column.name)).join(", ");
        const sql = updates
          ? `INSERT INTO ${quoteIdent(table.name)} (${colSql}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`
          : `INSERT INTO ${quoteIdent(table.name)} (${colSql}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO NOTHING`;
        for (const row of rows) {
          const values = columns.map((column) => coerce(row[column.name], pgByName.get(column.name) ?? "text"));
          await client.query(sql, values);
        }
        console.log(`  copied ${table.name}: ${rows.length}`);
      }
      await client.query("SET session_replication_role = 'origin'");
    }

    let mismatch = 0;
    console.log("Verify row counts");
    for (const [name, sourceCount] of sourceCounts) {
      const exists = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
        [name],
      );
      if (exists.rowCount === 0) {
        if (sourceCount > 0) {
          mismatch += 1;
          console.log(`  ${name}: sqlite ${sourceCount}, postgres MISSING`);
        }
        continue;
      }
      const target = await client.query(`SELECT COUNT(*)::int AS c FROM ${quoteIdent(name)}`);
      const targetCount = Number(target.rows[0]?.c ?? 0);
      const ok = targetCount === sourceCount;
      if (!ok) mismatch += 1;
      console.log(`  ${name}: sqlite ${sourceCount}, postgres ${targetCount}${ok ? "" : " MISMATCH"}`);
    }
    if (mismatch > 0) {
      throw new Error(`${mismatch} table(s) did not match. SQLite was not modified and Postgres rows were not deleted.`);
    }
    console.log(verify ? "Verify passed." : "Copy finished and counts match. SQLite file was left in place.");
  } finally {
    await client.end();
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
