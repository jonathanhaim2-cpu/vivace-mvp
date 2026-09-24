/**
 * Copy existing upload files into the S3-compatible bucket.
 * Does not delete local files.
 *
 *   UPLOAD_DIR=/data/uploads npx tsx scripts/migrate-uploads-to-bucket.ts --dry-run
 *   npx tsx scripts/migrate-uploads-to-bucket.ts
 *   npx tsx scripts/migrate-uploads-to-bucket.ts --verify
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getStoredObject, objectStorageConfig, putStoredObject, storedObjectExists } from "../src/lib/object-storage";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const verify = args.has("--verify");
const dir = process.env.UPLOAD_DIR?.trim() || "/data/uploads";

async function listFiles() {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && !entry.name.startsWith(".")).map((entry) => entry.name);
}

async function main() {
  const config = objectStorageConfig();
  const files = await listFiles().catch(() => [] as string[]);
  console.log(`Local ${dir}: ${files.length} files`);
  if (!config) {
    throw new Error("Bucket env is missing (S3_BUCKET / AWS_S3_BUCKET_NAME plus access key and secret). Local files were not changed.");
  }
  if (dryRun) {
    for (const name of files) console.log(`  ${name}`);
    console.log("Dry run only. Nothing was uploaded or deleted.");
    return;
  }
  if (!verify) {
    for (const name of files) {
      if (await storedObjectExists(config, name)) {
        console.log(`  exists ${name}`);
        continue;
      }
      const bytes = await readFile(path.join(dir, name));
      await putStoredObject(config, name, bytes, "application/octet-stream");
      console.log(`  uploaded ${name}`);
    }
  }
  let missing = 0;
  for (const name of files) {
    const remote = await getStoredObject(config, name);
    if (!remote) {
      missing += 1;
      console.log(`  MISSING in bucket: ${name}`);
    }
  }
  if (missing > 0) throw new Error(`${missing} local file(s) are not in the bucket. Local files were kept.`);
  console.log(`Verify passed. ${files.length} local files are in the bucket. Local copies were kept.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
