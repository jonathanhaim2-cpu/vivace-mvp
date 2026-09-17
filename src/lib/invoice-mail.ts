import { PHOTO_DOCUMENT_TYPE, type PhotoDocumentType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const INVOICE_MAIL_STATUS_KEY = "invoiceMail.sync";
export const INVOICE_MAIL_HISTORICAL_STATUS_KEY = "invoiceMail.historical.sync";
export const INVOICE_MAIL_PROCESSED_HASH = "__processed__";
export const INVOICE_MAIL_MAX_MESSAGES = 40;
export const INVOICE_MAIL_HISTORICAL_MAX_MESSAGES = 200;
export const INVOICE_MAIL_MIN_INLINE_BYTES = 20_000;
export const DEFAULT_INVOICE_MAIL_LOOKBACK_DAYS = 14;
export const DEFAULT_INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS = 2000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_HOST = "imap.gmail.com";
const DEFAULT_PORT = 993;
const DEFAULT_MAILBOX = "INBOX";

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

/** Subject/body tokens that mean the message is an invoice (HE + EN). */
export const INVOICE_MAIL_INVOICE_KEYWORDS = [
  "חשבונית",
  "חשבוניות",
  "invoice",
  "invoices",
  "invoicing",
  "tax invoice",
] as const;

/** Subject/body tokens that mean the message is a receipt / קבלה (HE + EN). */
export const INVOICE_MAIL_RECEIPT_KEYWORDS = ["קבלה", "קבלות", "receipt", "receipts"] as const;

/** Subject/body tokens that mean the message is a credit note / חשבונית זיכוי (HE + EN). */
export const INVOICE_MAIL_CREDIT_KEYWORDS = [
  "חשבונית זיכוי",
  "זיכוי",
  "credit note",
  "credit notes",
  "credit invoice",
  "credit invoices",
] as const;

/** Subject/body tokens that mean the message is an invoice, credit note, or receipt (HE + EN). */
export const INVOICE_MAIL_KEYWORDS = [
  ...INVOICE_MAIL_INVOICE_KEYWORDS,
  ...INVOICE_MAIL_RECEIPT_KEYWORDS,
  ...INVOICE_MAIL_CREDIT_KEYWORDS,
] as const;

export type InvoiceMailConfig = {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  mailbox: string;
  lookbackDays: number;
  maxMessages: number;
  historical: boolean;
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
  lookbackDays: number;
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
    lookbackDays: envInt(env.INVOICE_MAIL_LOOKBACK_DAYS, DEFAULT_INVOICE_MAIL_LOOKBACK_DAYS),
    maxMessages: envInt(env.INVOICE_MAIL_MAX_MESSAGES, INVOICE_MAIL_MAX_MESSAGES),
    historical: false,
  };
}

export function getInvoiceMailHistoricalConfig(env: EnvMap = process.env): InvoiceMailConfig | null {
  const user = env.INVOICE_MAIL_HISTORICAL_USER?.trim() ?? "";
  const password = env.INVOICE_MAIL_HISTORICAL_PASSWORD ?? "";
  if (!user || !password) return null;
  return {
    user,
    password,
    host:
      env.INVOICE_MAIL_HISTORICAL_HOST?.trim() ||
      env.INVOICE_MAIL_HOST?.trim() ||
      DEFAULT_HOST,
    port: envInt(env.INVOICE_MAIL_HISTORICAL_PORT, envInt(env.INVOICE_MAIL_PORT, DEFAULT_PORT)),
    tls: envFlag(env.INVOICE_MAIL_HISTORICAL_TLS, envFlag(env.INVOICE_MAIL_TLS, true)),
    mailbox: env.INVOICE_MAIL_HISTORICAL_MAILBOX?.trim() || DEFAULT_MAILBOX,
    lookbackDays: envInt(
      env.INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS,
      DEFAULT_INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS,
    ),
    maxMessages: envInt(env.INVOICE_MAIL_HISTORICAL_MAX_MESSAGES, INVOICE_MAIL_HISTORICAL_MAX_MESSAGES),
    historical: true,
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
    lookbackDays: envInt(env.INVOICE_MAIL_LOOKBACK_DAYS, DEFAULT_INVOICE_MAIL_LOOKBACK_DAYS),
    missing,
  };
}

export function invoiceMailHistoricalConnectionView(env: EnvMap = process.env): InvoiceMailConnectionView {
  const user = env.INVOICE_MAIL_HISTORICAL_USER?.trim() || null;
  const password = env.INVOICE_MAIL_HISTORICAL_PASSWORD;
  const missing: string[] = [];
  if (!user) missing.push("INVOICE_MAIL_HISTORICAL_USER");
  if (!password) missing.push("INVOICE_MAIL_HISTORICAL_PASSWORD");
  return {
    configured: missing.length === 0,
    user,
    host:
      env.INVOICE_MAIL_HISTORICAL_HOST?.trim() ||
      env.INVOICE_MAIL_HOST?.trim() ||
      DEFAULT_HOST,
    port: envInt(env.INVOICE_MAIL_HISTORICAL_PORT, envInt(env.INVOICE_MAIL_PORT, DEFAULT_PORT)),
    tls: envFlag(env.INVOICE_MAIL_HISTORICAL_TLS, envFlag(env.INVOICE_MAIL_TLS, true)),
    mailbox: env.INVOICE_MAIL_HISTORICAL_MAILBOX?.trim() || DEFAULT_MAILBOX,
    lookbackDays: envInt(
      env.INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS,
      DEFAULT_INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS,
    ),
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

export async function getInvoiceMailHistoricalStatus(): Promise<InvoiceMailStatus> {
  const row = await prisma.appSetting.findUnique({ where: { key: INVOICE_MAIL_HISTORICAL_STATUS_KEY } });
  return parseInvoiceMailStatus(row?.value);
}

export async function saveInvoiceMailStatus(status: InvoiceMailStatus) {
  await prisma.appSetting.upsert({
    where: { key: INVOICE_MAIL_STATUS_KEY },
    update: { value: JSON.stringify(status) },
    create: { key: INVOICE_MAIL_STATUS_KEY, value: JSON.stringify(status) },
  });
}

export async function saveInvoiceMailHistoricalStatus(status: InvoiceMailStatus) {
  await prisma.appSetting.upsert({
    where: { key: INVOICE_MAIL_HISTORICAL_STATUS_KEY },
    update: { value: JSON.stringify(status) },
    create: { key: INVOICE_MAIL_HISTORICAL_STATUS_KEY, value: JSON.stringify(status) },
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

function mailKeywordHaystack(subject?: string | null, text?: string | null) {
  return `${subject ?? ""}\n${text ?? ""}`.toLowerCase();
}

function haystackHasKeyword(haystack: string, keywords: readonly string[]) {
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export function emailLooksLikeInvoice(subject?: string | null, text?: string | null) {
  const haystack = mailKeywordHaystack(subject, text);
  if (!haystack.trim()) return false;
  return haystackHasKeyword(haystack, INVOICE_MAIL_KEYWORDS);
}

/** Prefill a type only when subject/body clearly says one family. Credit keywords dominate invoice words (חשבונית זיכוי). */
export function inferDocumentTypeFromMail(
  subject?: string | null,
  text?: string | null,
): PhotoDocumentType {
  const haystack = mailKeywordHaystack(subject, text);
  if (!haystack.trim()) return PHOTO_DOCUMENT_TYPE.UNKNOWN;
  const credit = haystackHasKeyword(haystack, INVOICE_MAIL_CREDIT_KEYWORDS);
  const invoice = haystackHasKeyword(haystack, INVOICE_MAIL_INVOICE_KEYWORDS);
  const receipt = haystackHasKeyword(haystack, INVOICE_MAIL_RECEIPT_KEYWORDS);
  if (credit && !receipt) return PHOTO_DOCUMENT_TYPE.CREDIT_NOTE;
  if (invoice && !receipt && !credit) return PHOTO_DOCUMENT_TYPE.INVOICE;
  if (receipt && !invoice && !credit) return PHOTO_DOCUMENT_TYPE.RECEIPT;
  return PHOTO_DOCUMENT_TYPE.UNKNOWN;
}

export function shouldImportMailAttachment(input: {
  mime?: string | null;
  filename?: string | null;
  contentType?: string | null;
  subject?: string | null;
  text?: string | null;
}) {
  const explicit = (input.mime ?? "").split(";")[0].trim().toLowerCase();
  const mime = MAIL_MIMES.has(explicit)
    ? explicit
    : resolveInvoiceMailMime(input.filename, input.contentType ?? input.mime);
  if (!mime) return false;
  return emailLooksLikeInvoice(input.subject, input.text);
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

export function invoiceMailLookbackSince(lookbackDays: number, now = Date.now()): Date {
  const days =
    Number.isFinite(lookbackDays) && lookbackDays > 0
      ? Math.floor(lookbackDays)
      : DEFAULT_INVOICE_MAIL_LOOKBACK_DAYS;
  return new Date(now - days * MS_PER_DAY);
}

export function mergeInvoiceMailSearchUids(unseen: number[], recent: number[]): number[] {
  const unseenUnique = [...new Set(unseen.filter((uid) => Number.isFinite(uid)))].sort((a, b) => a - b);
  const unseenSet = new Set(unseenUnique);
  const recentRest = [...new Set(recent.filter((uid) => Number.isFinite(uid) && !unseenSet.has(uid)))].sort(
    (a, b) => a - b,
  );
  return [...unseenUnique, ...recentRest];
}

export function selectInvoiceMailUidsToFetch(
  candidateUids: number[],
  importedUids: Iterable<number>,
  maxMessages: number,
): number[] {
  const imported = new Set(
    [...importedUids].filter((uid) => typeof uid === "number" && Number.isFinite(uid)),
  );
  const pending = candidateUids.filter((uid) => Number.isFinite(uid) && !imported.has(uid));
  if (!(maxMessages > 0)) return pending;
  return pending.slice(0, maxMessages);
}

export function mailboxUidSkipMessageId(mailboxUser: string, uid: number) {
  return `imap-uid:${mailboxUser.trim().toLowerCase()}:${uid}`;
}

export function fallbackInvoiceMailMessageId(input: {
  messageId?: string | null;
  uid: number;
  mailboxUser?: string | null;
  historical?: boolean;
}) {
  const normalized = normalizeMessageId(input.messageId);
  if (normalized) return normalized;
  const mailboxUser = input.mailboxUser?.trim().toLowerCase() ?? "";
  if (input.historical && mailboxUser) return `uid:${mailboxUser}:${input.uid}`;
  return `uid:${input.uid}`;
}

export function collectImportedUids(
  rows: Iterable<{ uid: number | null; mailboxUser?: string | null; contentHash: string }>,
  mailboxUser: string,
  options?: { includeLegacyEmptyMailbox?: boolean },
): number[] {
  const wanted = new Set<string>([mailboxUser.trim().toLowerCase()]);
  if (options?.includeLegacyEmptyMailbox) wanted.add("");
  const uids = new Set<number>();
  for (const row of rows) {
    if (row.contentHash !== INVOICE_MAIL_PROCESSED_HASH) continue;
    if (row.uid == null || !Number.isFinite(row.uid)) continue;
    const owner = (row.mailboxUser ?? "").trim().toLowerCase();
    if (!wanted.has(owner)) continue;
    uids.add(row.uid);
  }
  return [...uids].sort((a, b) => a - b);
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
