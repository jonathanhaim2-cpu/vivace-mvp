import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  assertSafeToRerun,
  isPostgresUrl,
  listMigrationSqlFiles,
} from "../../scripts/apply-sql-migrations.mjs";

test("postgres urls are detected and sqlite is not", () => {
  assert.equal(isPostgresUrl("postgresql://localhost/vivace"), true);
  assert.equal(isPostgresUrl("postgres://localhost/vivace"), true);
  assert.equal(isPostgresUrl("file:./dev.db"), false);
  assert.equal(isPostgresUrl(""), false);
});

test("boot lists migration sql files in directory order", () => {
  const files = listMigrationSqlFiles(path.join(process.cwd(), "prisma", "migrations"));
  assert.ok(files.some((file) => file.endsWith(`${path.sep}20260926183000_roy_feedback_round2${path.sep}migration.sql`)));
  assert.deepEqual(files, [...files].sort());
});

test("round-2 sql is safe to re-run and backfills isOrderable only when the column is new", () => {
  const file = path.join(
    process.cwd(),
    "prisma/migrations/20260926183000_roy_feedback_round2/migration.sql",
  );
  const sql = readFileSync(file, "utf8");
  assertSafeToRerun(sql, file);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS "Dish_systemKey_key"/);
  assert.match(sql, /column_name = 'isOrderable'/);
  assert.doesNotMatch(sql, /ADD COLUMN IF NOT EXISTS "isOrderable"/);
  const guardAt = sql.indexOf("column_name = 'isOrderable'");
  const updateAt = sql.indexOf('SET "isOrderable" = true');
  assert.ok(guardAt !== -1 && updateAt > guardAt);
  assertSafeToRerun(
    'ALTER TABLE "Dish" ADD CONSTRAINT "Dish_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
    "fk.sql",
  );
});

test("destructive sql is refused on boot", () => {
  assert.throws(() => assertSafeToRerun('DROP TABLE "Dish";', "bad.sql"));
  assert.throws(() => assertSafeToRerun('DELETE FROM "Dish";', "bad.sql"));
  assert.throws(() => assertSafeToRerun('TRUNCATE "Dish";', "bad.sql"));
});
