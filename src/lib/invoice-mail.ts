import { prisma } from "@/lib/prisma";

export const INVOICE_MAIL_STATUS_KEY = "invoiceMail.sync";
export const INVOICE_MAIL_PROCESSED_HASH = "__processed__";
export const INVOICE_MAIL_MAX_MESSAGES = 40;
export const INVOICE_MAIL_MIN_INLINE_BYTES = 20_000;

const DEFAULT_HOST = "imap.gmail.com";
const DEFAULT_PORT = 993;
const DEFAULT_MAILBOX = "INBOX";
const DEFAULT_LOOKBACK_DAYS = 14;

const MAIL_MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

const MAIL_MIMES = new Set(Object.values(MAIL_MIME_BY_EXT));

export type InvoiceMailConfig = {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  mailbox: string;
  lookbackDays: number;
};

export type InvoiceMailStatus = {
  lastSyncAt: string | null;
  lastError: string | null;
  imported: number;
  skipped: number;
  messages: number;
  duplicates: number;
  ok: boolean | null;
};

export type InvoiceMailConnectionView = {
  configured: boolean;
  user: string | null;
  host: string;
  port: number;
  tls: boolean;
  mailbox: string;
  missing: string[];
};

function envFlag(raw: string | undefined, defaultValue: boolean) {
  if (raw == null || raw.trim() === "") return defaultValue;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return defaultValue;
}

function envInt(raw: string | undefined, fallback: number) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

type EnvMap = Record<string, string | undefined>;

export function getInvoiceMailConfig(env: EnvMap = process.env): InvoiceMailConfig | null {
  const user = env.INVOICE_MAIL_USER?.trim() ?? "";
  const password = env.INVOICE_MAIL_PASSWORD ?? "";
  if (!user || !password) return null;
  return {
    user,
    password,
    host: env.INVOICE_MAIL_HOST?.trim() || DEFAULT_HOST,
    port: envInt(env.INVOICE_MAIL_PORT, DEFAULT_PORT),
    tls: envFlag(env.INVOICE_MAIL_TLS, true),
    mailbox: env.INVOICE_MAIL_MAILBOX?.trim() || DEFAULT_MAILBOX,
    lookbackDays: envInt(env.INVOICE_MAIL_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS),
  };
}

export function invoiceMailConnectionView(env: EnvMap = process.env): InvoiceMailConnectionView {
  const user = env.INVOICE_MAIL_USER?.trim() || null;
  const password = env.INVOICE_MAIL_PASSWORD;
  const missing: string[] = [];
  if (!user) missing.push("INVOICE_MAIL_USER");
  if (!password) missing.push("INVOICE_MAIL_PASSWORD");
  return {
    configured: missing.length === 0,
    user,
    host: env.INVOICE_MAIL_HOST?.trim() || DEFAULT_HOST,
    port: envInt(env.INVOICE_MAIL_PORT, DEFAULT_PORT),
    tls: envFlag(env.INVOICE_MAIL_TLS, true),
    mailbox: env.INVOICE_MAIL_MAILBOX?.trim() || DEFAULT_MAILBOX,
    missing,
  };
}

export function emptyInvoiceMailStatus(): InvoiceMailStatus {
  return {
    lastSyncAt: null,
    lastError: null,
    imported: 0,
    skipped: 0,
    messages: 0,
    duplicates: 0,
    ok: null,
  };
}

export function parseInvoiceMailStatus(raw: string | null | undefined): InvoiceMailStatus {
  const fallback = emptyInvoiceMailStatus();
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<InvoiceMailStatus>;
    return {
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
      lastError: typeof parsed.lastError === "string" ? parsed.lastError : null,
      imported: Number.isFinite(parsed.imported) ? Number(parsed.imported) : 0,
      skipped: Number.isFinite(parsed.skipped) ? Number(parsed.skipped) : 0,
      messages: Number.isFinite(parsed.messages) ? Number(parsed.messages) : 0,
      duplicates: Number.isFinite(parsed.duplicates) ? Number(parsed.duplicates) : 0,
      ok: typeof parsed.ok === "boolean" ? parsed.ok : null,
    };
  } catch {
    return fallback;
  }
}

export async function getInvoiceMailStatus(): Promise<InvoiceMailStatus> {
  const row = await prisma.appSetting.findUnique({ where: { key: INVOICE_MAIL_STATUS_KEY } });
  return parseInvoiceMailStatus(row?.value);
}

export async function saveInvoiceMailStatus(status: InvoiceMailStatus) {
  await prisma.appSetting.upsert({
    where: { key: INVOICE_MAIL_STATUS_KEY },
    update: { value: JSON.stringify(status) },
    create: { key: INVOICE_MAIL_STATUS_KEY, value: JSON.stringify(status) },
  });
}

export function extensionOf(filename: string) {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot).toLowerCase();
}

export function mimeFromInvoiceMailFilename(filename: string) {
  return MAIL_MIME_BY_EXT[extensionOf(filename)] ?? null;
}

export function resolveInvoiceMailMime(filename?: string | null, contentType?: string | null) {
  const fromName = filename ? mimeFromInvoiceMailFilename(filename) : null;
  if (fromName) return fromName;
  const raw = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (MAIL_MIMES.has(raw)) return raw;
  return null;
}

export function isInvoiceMailAttachment(input: {
  filename?: string | null;
  contentType?: string | null;
  contentDisposition?: string | null;
  size: number;
}) {
  const mime = resolveInvoiceMailMime(input.filename, input.contentType);
  if (!mime) return false;
  const disposition = (input.contentDisposition ?? "").toLowerCase();
  const inline = disposition.includes("inline");
  if (inline && mime !== "application/pdf" && input.size < INVOICE_MAIL_MIN_INLINE_BYTES) {
    return false;
  }
  return true;
}

export function normalizeMessageId(raw?: string | null) {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return value.replace(/^<|>$/g, "").trim().toLowerCase();
}

export function formatInvoiceMailNote(input: { from?: string | null; subject?: string | null }) {
  const from = input.from?.trim();
  const subject = input.subject?.trim();
  const parts = ["מייל"];
  if (from) parts.push(`מ: ${from}`);
  if (subject) parts.push(subject.length > 100 ? `${subject.slice(0, 97)}…` : subject);
  return parts.join(" · ");
}

/** True if this attachment was already ingested — including after the InvoicePhoto was discarded. */
export function mailAttachmentAlreadyImported(
  rows: Iterable<{ messageId: string; contentHash: string }>,
  messageId: string,
  contentHash: string,
) {
  for (const row of rows) {
    if (row.messageId !== messageId) continue;
    if (row.contentHash === contentHash || row.contentHash === INVOICE_MAIL_PROCESSED_HASH) {
      return true;
    }
  }
  return false;
}

export function cronTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const url = new URL(request.url);
  return header.replace(/^Bearer\s+/i, "").trim() || url.searchParams.get("secret")?.trim() || "";
}

export function cronSecretMatches(request: Request, env: EnvMap = process.env) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return false;
  return cronTokenFromRequest(request) === secret;
}
