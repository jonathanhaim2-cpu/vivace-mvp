import { unlink } from "node:fs/promises";
import path from "node:path";
import type { ImapFlow } from "imapflow";
import { IMPORT_ANALYZE_GAP_MS, sleep } from "@/lib/ai-throttle";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { AUDIT_ACTIONS, IMAP_AUDIT_ACTOR, actorFromSession, writeAuditLogForActor, type AuditActor } from "@/lib/audit";
import { INVOICE_SOURCE } from "@/lib/constants";
import {
  INVOICE_MAIL_HISTORICAL_STATUS_KEY,
  INVOICE_MAIL_PROCESSED_HASH,
  INVOICE_MAIL_STATUS_KEY,
  collectImportedUids,
  fallbackInvoiceMailMessageId,
  formatInvoiceMailNote,
  getInvoiceMailConfig,
  getInvoiceMailHistoricalConfig,
  invoiceMailLookbackSince,
  isInvoiceMailAttachment,
  mailboxUidSkipMessageId,
  mergeInvoiceMailSearchUids,
  resolveInvoiceMailMime,
  saveInvoiceMailHistoricalStatus,
  saveInvoiceMailStatus,
  selectInvoiceMailUidsToFetch,
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

export type InvoiceMailSyncMode = "live" | "historical" | "all";

export type InvoiceMailSyncResult = InvoiceMailStatus & {
  configured: boolean;
  processedUids: number[];
  historical?: InvoiceMailStatus & { configured: boolean };
};

const DEFAULT_ANALYZE_BUDGET_MS = 90_000;
const DEFAULT_SYNC_BUDGET_MS = 90_000;

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

function notConfiguredStatus(message: string): InvoiceMailStatus {
  return {
    lastSyncAt: new Date().toISOString(),
    lastError: message,
    imported: 0,
    skipped: 0,
    messages: 0,
    duplicates: 0,
    ok: false,
  };
}

async function alreadyImported(messageId: string, contentHash: string) {
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
  mailboxUser: string;
}) {
  await prisma.invoiceMailImport.upsert({
    where: { messageId_contentHash: { messageId: input.messageId, contentHash: input.contentHash } },
    create: input,
    update: {
      uid: input.uid,
      originalName: input.originalName,
      invoicePhotoId: input.invoicePhotoId ?? undefined,
      mailboxUser: input.mailboxUser,
    },
  });
}

async function markMessageProcessed(messageId: string, uid: number, mailboxUser: string) {
  await prisma.invoiceMailImport.upsert({
    where: { messageId_contentHash: { messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH } },
    create: { messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH, uid, originalName: "", mailboxUser },
    update: { uid, mailboxUser },
  });
}

async function markMailboxUidProcessed(mailboxUser: string, uid: number) {
  if (!mailboxUser) return;
  const messageId = mailboxUidSkipMessageId(mailboxUser, uid);
  await prisma.invoiceMailImport.upsert({
    where: { messageId_contentHash: { messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH } },
    create: { messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH, uid, originalName: "", mailboxUser },
    update: { uid, mailboxUser },
  });
}

async function loadImportedUids(mailboxUser: string, primaryMailboxUser: string | null): Promise<Set<number>> {
  const includeLegacy = Boolean(primaryMailboxUser && mailboxUser.toLowerCase() === primaryMailboxUser.toLowerCase());
  const mailboxFilter = includeLegacy
    ? { in: [mailboxUser, ""] }
    : mailboxUser;
  const rows = await prisma.invoiceMailImport.findMany({
    where: {
      contentHash: INVOICE_MAIL_PROCESSED_HASH,
      uid: { not: null },
      mailboxUser: mailboxFilter,
    },
    select: { uid: true, mailboxUser: true, contentHash: true },
  });
  return new Set(collectImportedUids(rows, mailboxUser, { includeLegacyEmptyMailbox: includeLegacy }));
}

export async function importInvoiceMailMessages(
  messages: InvoiceMailMessage[],
  options?: { analyzeBudgetMs?: number; actor?: AuditActor; mailboxUser?: string; historical?: boolean },
) {
  const actor = options?.actor ?? IMAP_AUDIT_ACTOR;
  const analyzeBudgetMs = options?.analyzeBudgetMs ?? 0;
  const mailboxUser = options?.mailboxUser?.trim() ?? "";
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  const processedUids: number[] = [];
  const toAnalyze: string[] = [];
  const errors: string[] = [];

  for (const message of messages) {
    const messageId = fallbackInvoiceMailMessageId({
      messageId: message.messageId,
      uid: message.uid,
      mailboxUser,
      historical: options?.historical,
    });
    if (await alreadyImported(messageId, INVOICE_MAIL_PROCESSED_HASH)) {
      skipped += 1;
      processedUids.push(message.uid);
      await markMailboxUidProcessed(mailboxUser, message.uid);
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
          mailboxUser,
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
            mailboxUser: mailboxUser || undefined,
            historical: Boolean(options?.historical),
          },
        });
      } catch (error) {
        failed = true;
        errors.push(imapErrorMessage(error));
        if (savedName) await unlink(path.join(UPLOAD_DIR, savedName)).catch(() => undefined);
      }
    }

    if (!failed) {
      await markMessageProcessed(messageId, message.uid, mailboxUser);
      await markMailboxUidProcessed(mailboxUser, message.uid);
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

async function listCandidateUids(client: ImapFlow, config: InvoiceMailConfig) {
  const since = invoiceMailLookbackSince(config.lookbackDays);
  const unseen = asUidList(await client.search({ seen: false }, { uid: true }));
  const recent = asUidList(await client.search({ since }, { uid: true }));
  return mergeInvoiceMailSearchUids(unseen, recent);
}

async function fetchMessagesByUid(client: ImapFlow, uids: number[]): Promise<InvoiceMailMessage[]> {
  const { simpleParser } = await import("mailparser");
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

type MailboxSyncInternals = {
  imported: number;
  skipped: number;
  duplicates: number;
  messages: number;
  processedUids: number[];
  photoIdsToAnalyze: string[];
  error: string | null;
};

async function syncConnectedMailbox(
  config: InvoiceMailConfig,
  options: {
    actor: AuditActor;
    paginate: boolean;
    untilMs: number;
    primaryMailboxUser: string | null;
  },
): Promise<{ status: InvoiceMailStatus; internals: MailboxSyncInternals }> {
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });

  const totals: MailboxSyncInternals = {
    imported: 0,
    skipped: 0,
    duplicates: 0,
    messages: 0,
    processedUids: [],
    photoIdsToAnalyze: [],
    error: null,
  };

  await client.connect();
  try {
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      const importedUids = await loadImportedUids(config.user, options.primaryMailboxUser);
      const candidates = await listCandidateUids(client, config);

      while (Date.now() < options.untilMs) {
        const uids = selectInvoiceMailUidsToFetch(candidates, importedUids, config.maxMessages);
        if (uids.length === 0) break;

        const messages = await fetchMessagesByUid(client, uids);
        const fetchedUids = new Set(messages.map((item) => item.uid));
        for (const uid of uids) {
          if (!fetchedUids.has(uid)) importedUids.add(uid);
        }

        totals.messages += messages.length;
        const imported = await importInvoiceMailMessages(messages, {
          analyzeBudgetMs: 0,
          actor: options.actor,
          mailboxUser: config.user,
          historical: config.historical,
        });
        totals.imported += imported.imported;
        totals.skipped += imported.skipped;
        totals.duplicates += imported.duplicates;
        totals.processedUids.push(...imported.processedUids);
        totals.photoIdsToAnalyze.push(...imported.photoIdsToAnalyze);
        if (imported.error && !totals.error) totals.error = imported.error;

        for (const uid of imported.processedUids) importedUids.add(uid);
        if (imported.processedUids.length > 0) {
          await client.messageFlagsAdd(imported.processedUids, ["\\Seen"], { uid: true });
        }

        if (!options.paginate) break;
        if (imported.processedUids.length === 0) break;
        if (uids.length < config.maxMessages) break;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }

  const status: InvoiceMailStatus = {
    lastSyncAt: new Date().toISOString(),
    lastError: totals.error,
    imported: totals.imported,
    skipped: totals.skipped,
    messages: totals.messages,
    duplicates: totals.duplicates,
    ok: !totals.error,
  };
  return { status, internals: totals };
}

async function persistMailboxStatus(config: InvoiceMailConfig, status: InvoiceMailStatus, actor: AuditActor) {
  if (config.historical) await saveInvoiceMailHistoricalStatus(status);
  else await saveInvoiceMailStatus(status);
  await writeAuditLogForActor(actor, {
    action: AUDIT_ACTIONS.INVOICE_IMPORT,
    entityType: "AppSetting",
    entityId: config.historical ? INVOICE_MAIL_HISTORICAL_STATUS_KEY : INVOICE_MAIL_STATUS_KEY,
    summary:
      status.imported > 0
        ? `סנכרון מייל · יובאו ${status.imported} קבצים`
        : "סנכרון מייל · אין קבצים חדשים",
    meta: {
      imported: status.imported,
      skipped: status.skipped,
      messages: status.messages,
      duplicates: status.duplicates,
      mailboxUser: config.user,
      historical: config.historical,
      lookbackDays: config.lookbackDays,
    },
  });
}

async function runInvoiceMailboxSync(options?: {
  session?: AppSession | null;
  analyzeBudgetMs?: number;
  mode?: InvoiceMailSyncMode;
  syncBudgetMs?: number;
}): Promise<InvoiceMailSyncResult> {
  const actor = options?.session ? actorFromSession(options.session) : IMAP_AUDIT_ACTOR;
  const analyzeBudgetMs = options?.analyzeBudgetMs ?? DEFAULT_ANALYZE_BUDGET_MS;
  const mode = options?.mode ?? "all";
  const untilMs = Date.now() + (options?.syncBudgetMs ?? DEFAULT_SYNC_BUDGET_MS);
  const liveConfig = getInvoiceMailConfig();
  const historicalConfig = getInvoiceMailHistoricalConfig();
  const runLive = mode === "live" || mode === "all";
  const sameMailbox =
    Boolean(liveConfig && historicalConfig) &&
    liveConfig!.user.toLowerCase() === historicalConfig!.user.toLowerCase();
  const runHistorical = (mode === "historical" || mode === "all") && Boolean(historicalConfig) && !sameMailbox;

  if (mode === "historical" && !historicalConfig) {
    const status = notConfiguredStatus("חסרים INVOICE_MAIL_HISTORICAL_USER או INVOICE_MAIL_HISTORICAL_PASSWORD");
    await saveInvoiceMailHistoricalStatus(status);
    return { ...status, configured: false, processedUids: [], historical: { ...status, configured: false } };
  }

  if (runLive && !liveConfig && !runHistorical) {
    const status = notConfiguredStatus("חסרים INVOICE_MAIL_USER או INVOICE_MAIL_PASSWORD");
    await saveInvoiceMailStatus(status);
    return { ...status, configured: false, processedUids: [] };
  }

  const photoIds: string[] = [];
  let liveResult: InvoiceMailSyncResult | null = null;
  let historicalResult: (InvoiceMailStatus & { configured: boolean; processedUids: number[] }) | null = null;

  async function runOneMailbox(config: InvoiceMailConfig, paginate: boolean) {
    try {
      const synced = await syncConnectedMailbox(config, {
        actor,
        paginate,
        untilMs,
        primaryMailboxUser: liveConfig?.user ?? (config.historical ? null : config.user),
      });
      await persistMailboxStatus(config, synced.status, actor);
      photoIds.push(...synced.internals.photoIdsToAnalyze);
      return {
        ...synced.status,
        configured: true as const,
        processedUids: synced.internals.processedUids,
      };
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
      await persistMailboxStatus(config, status, actor);
      return { ...status, configured: true as const, processedUids: [] };
    }
  }

  if (runLive && liveConfig) {
    liveResult = await runOneMailbox(liveConfig, false);
  } else if (runLive && !liveConfig) {
    const status = notConfiguredStatus("חסרים INVOICE_MAIL_USER או INVOICE_MAIL_PASSWORD");
    await saveInvoiceMailStatus(status);
    liveResult = { ...status, configured: false, processedUids: [] };
  }

  if (runHistorical && historicalConfig && Date.now() < untilMs) {
    historicalResult = await runOneMailbox(historicalConfig, true);
  }

  await analyzeImportedPhotos(photoIds, analyzeBudgetMs);

  if (mode === "historical") {
    const historical = historicalResult ?? {
      ...notConfiguredStatus("חסרים INVOICE_MAIL_HISTORICAL_USER או INVOICE_MAIL_HISTORICAL_PASSWORD"),
      configured: false,
      processedUids: [],
    };
    return { ...historical, historical: { ...historical, configured: historical.configured } };
  }

  const live = liveResult ?? {
    ...notConfiguredStatus("חסרים INVOICE_MAIL_USER או INVOICE_MAIL_PASSWORD"),
    configured: false,
    processedUids: [],
  };
  return {
    ...live,
    historical: historicalResult ? { ...historicalResult, configured: historicalResult.configured } : undefined,
  };
}

export function syncInvoiceMailbox(options?: {
  session?: AppSession | null;
  analyzeBudgetMs?: number;
  mode?: InvoiceMailSyncMode;
  syncBudgetMs?: number;
}): Promise<InvoiceMailSyncResult> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runInvoiceMailboxSync(options).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}
