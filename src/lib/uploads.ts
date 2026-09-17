import { createHash, randomUUID } from "node:crypto";
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
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp3",
]);

export const UPLOAD_DIR = process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "public", "uploads");

export function publicFileUrl(fileName: string) {
  return `/api/files/${encodeURIComponent(fileName)}`;
}

export function hashFileBytes(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function saveUploadBytes(input: {
  bytes: Buffer | Uint8Array;
  originalName: string;
  mimeType: string;
  maxBytes?: number;
}) {
  const buffer = Buffer.from(input.bytes);
  if (buffer.length === 0) {
    throw new Error("יש לצרף קובץ חשבונית או תעודת משלוח");
  }
  if (buffer.length > (input.maxBytes ?? MAX_UPLOAD_BYTES)) {
    throw new Error("הקובץ גדול מדי (מקסימום 8MB)");
  }
  const mime = input.mimeType || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    throw new Error("סוג קובץ לא נתמך. יש להעלות תמונה, PDF או קובץ קול");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = extensionFor(input.originalName, mime);
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

  return {
    fileName,
    originalName: input.originalName || fileName,
    mimeType: mime,
    contentHash: hashFileBytes(buffer),
  };
}

export async function saveUpload(file: File) {
  if (!file || file.size === 0) {
    throw new Error("יש לצרף קובץ חשבונית או תעודת משלוח");
  }
  const mime = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveUploadBytes({
    bytes: buffer,
    originalName: file.name || "upload",
    mimeType: mime,
  });
}

function extensionFor(name: string, mime: string) {
  const fromName = path.extname(name).toLowerCase();
  if (fromName) return fromName;
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/heic") return ".heic";
  if (mime === "image/heif") return ".heif";
  if (mime === "application/pdf") return ".pdf";
  return "";
}
