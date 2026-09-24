import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "prisma", "schema.prisma");
const runtimePath = path.join(root, "prisma", "schema.runtime.prisma");

function providerFor(url) {
  const value = (url || "").trim();
  if (value.startsWith("postgres://") || value.startsWith("postgresql://")) return "postgresql";
  return "sqlite";
}

const provider = providerFor(process.env.DATABASE_URL);
const source = readFileSync(sourcePath, "utf8");
const runtime = source.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${provider}"`);
writeFileSync(runtimePath, runtime);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`prisma schema provider: ${provider}`);
  process.exit(0);
}

const bin = path.join(root, "node_modules", ".bin", "prisma");
const result = spawnSync(bin, [...args, `--schema=${runtimePath}`], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
