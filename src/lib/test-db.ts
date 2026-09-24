import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Push the app schema onto a temp database. Committed schema is Postgres; tests stay on SQLite. */
export function pushAppSchema(databaseUrl: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "vivace-schema-"));
  const schema = path.join(dir, "schema.prisma");
  const source = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const provider = databaseUrl.startsWith("postgres") ? "postgresql" : "sqlite";
  writeFileSync(schema, source.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${provider}"`));
  try {
    execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss", "--schema", schema], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
