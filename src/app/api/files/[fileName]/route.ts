import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_DIR } from "@/lib/uploads";

export async function GET(_request: Request, context: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await context.params;
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return NextResponse.json({ error: "שם קובץ לא חוקי" }, { status: 400 });
  }
  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, fileName));
    const ext = path.extname(fileName).toLowerCase();
    const type =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".svg"
              ? "image/svg+xml"
              : ext === ".webm"
                ? "audio/webm"
                : ext === ".mp3"
                  ? "audio/mpeg"
                  : ext === ".wav"
                    ? "audio/wav"
                    : ext === ".ogg"
                      ? "audio/ogg"
                      : ext === ".m4a"
                        ? "audio/mp4"
                        : "image/jpeg";
    return new NextResponse(bytes, {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "הקובץ לא נמצא" }, { status: 404 });
  }
}
