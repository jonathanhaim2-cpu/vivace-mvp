import { unlink } from "node:fs/promises";
import path from "node:path";
import type { ImapFlow } from "imapflow";
import { IMPORT_ANALYZE_GAP_MS, sleep } from "@/lib/ai-throttle";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { AUDIT_ACTIONS, IMAP_AUDIT_ACTOR, actorFromSession, writeAuditLogForActor, type AuditActor } from "@/lib/audit";
import { INVOICE_SOURCE } from "@/lib/constants";
import {
  INVOICE_MAIL_MAX_MESSAGES,
  INVOICE_MAIL_PROCESSED_HASH,
  INVOICE_MAIL_STATUS_KEY,
  formatInvoiceMailNote,
  getInvoiceMailConfig,
  isInvoiceMailAttachment,
  normalizeMessageId,
  resolveInvoiceMailMime,
  saveInvoiceMailStatus,
  type InvoiceMailConfig,
  type InvoiceMailStatus,
} from "@/lib/invoice-mail";
import { createUploadedInvoicePhoto } from "@/lib/invoice-photos";
import { prisma } from "@/lib/prisma";
import type { AppSession } from "@/lib/session";
import { hashFileBytes, saveUploadBytes, UPLOAD_DIR } from "@/lib/uploads";

export type InvoiceMailAttachment = {
  filename?: string | null;
  contentType?: string | null;
  contentDisposition?: string | null;
  content: Buffer;
};

export type InvoiceMailMessage = {
  uid: number;
  messageId: string;
  from: string;
  subject: string;
  attachments: InvoiceMailAttachment[];
};

export type InvoiceMailSyncResult = InvoiceMailStatus & {
  configured: boolean;
  processedUids: number[];
};

const DEFAULT_ANALYZE_BUDGET_MS = 90_000;

let syncInFlight: Promise<InvoiceMailSyncResult> | null = null;

function asUidList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function imapErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (/authentication|invalid credentials|login failed|auth/i.test(raw)) {
    return "התחברות לתיבת המייל נכשלה. אם מופעל 2FA צריך App Password, ולוודא ש-IMAP פעיל ב-Gmail.";
  }
  if (/timeout|timed out|enotfound|econnrefused|certificate/i.test(raw)) {
    return `חיבור IMAP נכשל: ${raw}`;
  }
  return raw || "סנכרון המייל נכשל";
}

async function alreadyImported(messageId: string, contentHash: string) {
  // InvoiceMailImport rows are kept when a photo is discarded, so the same
  // Message-ID + attachment hash is not re-imported as a new queue item.
  const row = await prisma.invoiceMailImport.findUnique({
    where: { messageId_contentHash: { messageId, contentHash } },
  });
  if (row) return true;
  if (contentHash === INVOICE_MAIL_PROCESSED_HASH) return false;
  const processed = await prisma.invoiceMailImport.findUnique({
    where: { messageId_contentHash: { messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH } },
  });
  return Boolean(processed);
}

async function markAttachmentImported(input: {
  messageId: string;
  contentHash: string;
  uid: number;
  originalName: string;
  invoicePhotoId?: string | null;
}) {
  await prisma.invoiceMailImport.upsert({
    where: { messageId_contentHash: { messageId: input.messageId, contentHash: input.contentHash } },
    create: input,
    update: {
      uid: input.uid,
      originalName: input.originalName,
      invoicePhotoId: input.invoicePhotoId ?? undefined,
    },
  });
}

async function markMessageProcessed(messageId: string, uid: number) {
  await prisma.invoiceMailImport.upsert({
    where: { messageId_contentHash: { messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH } },
    create: { messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH, uid, originalName: "" },
    update: { uid },
  });
}

export async function importInvoiceMailMessages(
  messages: InvoiceMailMessage[],
  options?: { analyzeBudgetMs?: number; actor?: AuditActor },
) {
  const actor = options?.actor ?? IMAP_AUDIT_ACTOR;
  const analyzeBudgetMs = options?.analyzeBudgetMs ?? 0;
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  const processedUids: number[] = [];
  const toAnalyze: string[] = [];
  const errors: string[] = [];

  for (const message of messages) {
    const messageId = normalizeMessageId(message.messageId) || `uid:${message.uid}`;
    if (await alreadyImported(messageId, INVOICE_MAIL_PROCESSED_HASH)) {
      skipped += 1;
      processedUids.push(message.uid);
      continue;
    }

    const note = formatInvoiceMailNote({ from: message.from, subject: message.subject });
    const attachments = message.attachments.filter((item) =>
      isInvoiceMailAttachment({
        filename: item.filename,
        contentType: item.contentType,
        contentDisposition: item.contentDisposition,
        size: item.content.length,
      }),
    );

    let failed = false;
    for (const [index, attachment] of attachments.entries()) {
      const mime = resolveInvoiceMailMime(attachment.filename, attachment.contentType);
      if (!mime) {
        skipped += 1;
        continue;
      }
      const contentHash = hashFileBytes(attachment.content);
      if (await alreadyImported(messageId, contentHash)) {
        skipped += 1;
        continue;
      }
      const originalName = attachment.filename?.trim() || `invoice-${message.uid}-${index + 1}`;
      let savedName: string | null = null;
      try {
        const saved = await saveUploadBytes({
          bytes: attachment.content,
          originalName,
          mimeType: mime,
        });
        savedName = saved.fileName;
        const created = await createUploadedInvoicePhoto({
          saved,
          accountId: null,
          periodMonth: null,
          source: INVOICE_SOURCE.EMAIL,
          voiceNoteText: note,
        });
        await markAttachmentImported({
          messageId,
          contentHash: saved.contentHash,
          uid: message.uid,
          originalName: saved.originalName,
          invoicePhotoId: created.id,
        });
        imported += 1;
        if (created.isDuplicate) duplicates += 1;
        else toAnalyze.push(created.id);
        await writeAuditLogForActor(actor, {
          action: AUDIT_ACTIONS.INVOICE_IMPORT,
          entityType: "InvoicePhoto",
          entityId: created.id,
          summary: created.isDuplicate
            ? `יובאה חשבונית כפולה מהמייל · ${saved.originalName}`
            : `יובאה חשבונית מהמייל · ${saved.originalName}`,
          meta: {
            source: INVOICE_SOURCE.EMAIL,
            messageId,
            from: message.from,
            subject: message.subject,
            isDuplicate: created.isDuplicate,
          },
        });
      } catch (error) {
        failed = true;
        errors.push(imapErrorMessage(error));
        if (savedName) await unlink(path.join(UPLOAD_DIR, savedName)).catch(() => undefined);
      }
    }

    if (!failed) {
      await markMessageProcessed(messageId, message.uid);
      processedUids.push(message.uid);
      if (attachments.length === 0) skipped += 1;
    }
  }

  if (analyzeBudgetMs > 0) {
    await analyzeImportedPhotos(toAnalyze, analyzeBudgetMs);
  }

  return {
    imported,
    skipped,
    duplicates,
    processedUids,
    photoIdsToAnalyze: toAnalyze,
    error: errors[0] ?? null,
  };
}

async function analyzeImportedPhotos(photoIds: string[], analyzeBudgetMs: number) {
  const analyzeUntil = Date.now() + analyzeBudgetMs;
  for (const [index, photoId] of photoIds.entries()) {
    if (Date.now() > analyzeUntil) break;
    if (index > 0) await sleep(IMPORT_ANALYZE_GAP_MS);
    await analyzeStoredPhoto(photoId);
  }
}

async function downloadMailboxMessages(client: ImapFlow, config: InvoiceMailConfig) {
  const { simpleParser } = await import("mailparser");
  const since = new Date(Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000);
      const unseen = asUidList(await client.search({ seen: false }, { uid: true }));
  const recent = asUidList(await client.search({ since }, { uid: true }));
  const unseenSet = new Set(unseen);
  const uids = [
    ...unseen.sort((a, b) => a - b),
    ...recent.filter((uid) => !unseenSet.has(uid)).sort((a, b) => a - b),
  ].slice(0, INVOICE_MAIL_MAX_MESSAGES);

  const messages: InvoiceMailMessage[] = [];
  if (uids.length === 0) return messages;

  const seenUids = new Set<number>();
  for await (const item of client.fetch(uids, { uid: true, source: true, envelope: true }, { uid: true })) {
    if (!item.source || seenUids.has(item.uid)) continue;
    seenUids.add(item.uid);
    const parsed = await simpleParser(item.source);
    const envelopeFrom = item.envelope?.from?.[0];
    const fromText =
      parsed.from?.text?.trim() ||
      (envelopeFrom?.name && envelopeFrom.address
        ? `${envelopeFrom.name} <${envelopeFrom.address}>`
        : envelopeFrom?.address || envelopeFrom?.name || "");
    messages.push({
      uid: item.uid,
      messageId: parsed.messageId || item.envelope?.messageId || `uid:${item.uid}`,
      from: fromText,
      subject: parsed.subject?.trim() || item.envelope?.subject || "",
      attachments: (parsed.attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        contentDisposition: attachment.contentDisposition,
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content
          : Buffer.from(attachment.content ?? []),
      })),
    });
  }
  return messages;
}

async function runInvoiceMailboxSync(options?: {
  session?: AppSession | null;
  analyzeBudgetMs?: number;
}): Promise<InvoiceMailSyncResult> {
  const config = getInvoiceMailConfig();
  const actor = options?.session ? actorFromSession(options.session) : IMAP_AUDIT_ACTOR;
  const analyzeBudgetMs = options?.analyzeBudgetMs ?? DEFAULT_ANALYZE_BUDGET_MS;
  if (!config) {
    const status: InvoiceMailStatus = {
      lastSyncAt: new Date().toISOString(),
      lastError: "חסרים INVOICE_MAIL_USER או INVOICE_MAIL_PASSWORD",
      imported: 0,
      skipped: 0,
      messages: 0,
      duplicates: 0,
      ok: false,
    };
    await saveInvoiceMailStatus(status);
    return { ...status, configured: false, processedUids: [] };
  }

  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.tls,
      auth: { user: config.user, pass: config.password },
      logger: false,
    });

    let imported: Awaited<ReturnType<typeof importInvoiceMailMessages>>;
    let messageCount = 0;
    await client.connect();
    try {
      const lock = await client.getMailboxLock(config.mailbox);
      let messages: InvoiceMailMessage[] = [];
      try {
        messages = await downloadMailboxMessages(client, config);
      } finally {
        lock.release();
      }
      messageCount = messages.length;
      imported = await importInvoiceMailMessages(messages, { analyzeBudgetMs: 0, actor });
      if (imported.processedUids.length > 0) {
        await client.messageFlagsAdd(imported.processedUids, ["\\Seen"], { uid: true });
      }
    } finally {
      await client.logout().catch(() => undefined);
    }

    await analyzeImportedPhotos(imported.photoIdsToAnalyze, analyzeBudgetMs);

    const status: InvoiceMailStatus = {
      lastSyncAt: new Date().toISOString(),
      lastError: imported.error,
      imported: imported.imported,
      skipped: imported.skipped,
      messages: messageCount,
      duplicates: imported.duplicates,
      ok: !imported.error,
    };
    await saveInvoiceMailStatus(status);
    await writeAuditLogForActor(actor, {
      action: AUDIT_ACTIONS.INVOICE_IMPORT,
      entityType: "AppSetting",
      entityId: INVOICE_MAIL_STATUS_KEY,
      summary:
        imported.imported > 0
          ? `סנכרון מייל · יובאו ${imported.imported} קבצים`
          : "סנכרון מייל · אין קבצים חדשים",
      meta: {
        imported: imported.imported,
        skipped: imported.skipped,
        messages: messageCount,
        duplicates: imported.duplicates,
      },
    });
    return { ...status, configured: true, processedUids: imported.processedUids };
  } catch (error) {
    const status: InvoiceMailStatus = {
      lastSyncAt: new Date().toISOString(),
      lastError: imapErrorMessage(error),
      imported: 0,
      skipped: 0,
      messages: 0,
      duplicates: 0,
      ok: false,
    };
    await saveInvoiceMailStatus(status);
    return { ...status, configured: true, processedUids: [] };
  }
}

export function syncInvoiceMailbox(options?: {
  session?: AppSession | null;
  analyzeBudgetMs?: number;
}): Promise<InvoiceMailSyncResult> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runInvoiceMailboxSync(options).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}
