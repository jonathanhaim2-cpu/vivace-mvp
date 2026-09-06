import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "image/svg+xml",
]);

export const UPLOAD_DIR = process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "public", "uploads");

export function publicFileUrl(fileName: string) {
  return `/api/files/${encodeURIComponent(fileName)}`;
}

export async function saveUpload(file: File) {
  if (!file || file.size === 0) {
    throw new Error("יש לצרף קובץ חשבונית או תעודת משלוח");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("הקובץ גדול מדי (מקסימום 8MB)");
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    throw new Error("סוג קובץ לא נתמך. יש להעלות תמונה או PDF");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = extensionFor(file.name, mime);
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

  return {
    fileName,
    originalName: file.name || fileName,
    mimeType: mime,
  };
}

function extensionFor(name: string, mime: string) {
  const fromName = path.extname(name).toLowerCase();
  if (fromName) return fromName;
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "application/pdf") return ".pdf";
  return "";
}
