import assert from "node:assert/strict";
import test from "node:test";
import { INVOICE_SOURCE, invoiceSourceLabel } from "./constants";
import {
  collectImportedUids,
  cronSecretMatches,
  cronTokenFromRequest,
  formatInvoiceMailNote,
  getInvoiceMailConfig,
  getInvoiceMailHistoricalConfig,
  invoiceMailConnectionView,
  invoiceMailHistoricalConnectionView,
  invoiceMailLookbackSince,
  isInvoiceMailAttachment,
  mailAttachmentAlreadyImported,
  mailboxUidSkipMessageId,
  mergeInvoiceMailSearchUids,
  mimeFromInvoiceMailFilename,
  normalizeMessageId,
  parseInvoiceMailStatus,
  resolveInvoiceMailMime,
  selectInvoiceMailUidsToFetch,
  DEFAULT_INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS,
  INVOICE_MAIL_HISTORICAL_MAX_MESSAGES,
  INVOICE_MAIL_MAX_MESSAGES,
  INVOICE_MAIL_PROCESSED_HASH,
  MS_PER_DAY,
} from "./invoice-mail";

test("invoiceSourceLabel maps mail and folder import", () => {
  assert.equal(invoiceSourceLabel(INVOICE_SOURCE.EMAIL), "מייל");
  assert.equal(invoiceSourceLabel(INVOICE_SOURCE.BULK_IMPORT), "ייבוא תיקייה");
  assert.equal(invoiceSourceLabel(INVOICE_SOURCE.MANUAL), "העלאה");
});

test("mail config requires user and password and defaults Gmail IMAP", () => {
  assert.equal(getInvoiceMailConfig({}), null);
  assert.equal(getInvoiceMailConfig({ INVOICE_MAIL_USER: "invoices@vivace-pizza.com" }), null);
  const config = getInvoiceMailConfig({
    INVOICE_MAIL_USER: "invoices@vivace-pizza.com",
    INVOICE_MAIL_PASSWORD: "app-password",
  });
  assert.deepEqual(config, {
    user: "invoices@vivace-pizza.com",
    password: "app-password",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    mailbox: "INBOX",
    lookbackDays: 14,
    maxMessages: INVOICE_MAIL_MAX_MESSAGES,
    historical: false,
  });
  const custom = getInvoiceMailConfig({
    INVOICE_MAIL_USER: "invoices@vivace-pizza.com",
    INVOICE_MAIL_PASSWORD: "app-password",
    INVOICE_MAIL_HOST: "imap.example.com",
    INVOICE_MAIL_PORT: "143",
    INVOICE_MAIL_TLS: "false",
    INVOICE_MAIL_MAILBOX: "Invoices",
    INVOICE_MAIL_LOOKBACK_DAYS: "7",
  });
  assert.equal(custom?.host, "imap.example.com");
  assert.equal(custom?.port, 143);
  assert.equal(custom?.tls, false);
  assert.equal(custom?.mailbox, "Invoices");
  assert.equal(custom?.lookbackDays, 7);
  const multiYear = getInvoiceMailConfig({
    INVOICE_MAIL_USER: "invoices@vivace-pizza.com",
    INVOICE_MAIL_PASSWORD: "app-password",
    INVOICE_MAIL_LOOKBACK_DAYS: "2500",
  });
  assert.equal(multiYear?.lookbackDays, 2500);
  assert.equal(multiYear?.historical, false);
});

test("connection view lists missing env without exposing a password", () => {
  const missing = invoiceMailConnectionView({});
  assert.equal(missing.configured, false);
  assert.deepEqual(missing.missing, ["INVOICE_MAIL_USER", "INVOICE_MAIL_PASSWORD"]);
  const ready = invoiceMailConnectionView({
    INVOICE_MAIL_USER: "invoices@vivace-pizza.com",
    INVOICE_MAIL_PASSWORD: "secret-should-not-appear",
  });
  assert.equal(ready.configured, true);
  assert.equal(ready.user, "invoices@vivace-pizza.com");
  assert.equal(ready.lookbackDays, 14);
  assert.equal(JSON.stringify(ready).includes("secret-should-not-appear"), false);
});

test("historical mailbox config is separate from invoices@ and defaults to multi-year lookback", () => {
  assert.equal(getInvoiceMailHistoricalConfig({}), null);
  assert.equal(
    getInvoiceMailHistoricalConfig({ INVOICE_MAIL_HISTORICAL_USER: "office@vivace-pizza.biz" }),
    null,
  );
  const historical = getInvoiceMailHistoricalConfig({
    INVOICE_MAIL_HISTORICAL_USER: "office@vivace-pizza.biz",
    INVOICE_MAIL_HISTORICAL_PASSWORD: "historical-secret",
    INVOICE_MAIL_HOST: "imap.gmail.com",
  });
  assert.deepEqual(historical, {
    user: "office@vivace-pizza.biz",
    password: "historical-secret",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    mailbox: "INBOX",
    lookbackDays: DEFAULT_INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS,
    maxMessages: INVOICE_MAIL_HISTORICAL_MAX_MESSAGES,
    historical: true,
  });
  const custom = getInvoiceMailHistoricalConfig({
    INVOICE_MAIL_HISTORICAL_USER: "office@vivace-pizza.biz",
    INVOICE_MAIL_HISTORICAL_PASSWORD: "historical-secret",
    INVOICE_MAIL_HISTORICAL_HOST: "imap.example.com",
    INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS: "3200",
    INVOICE_MAIL_HISTORICAL_MAX_MESSAGES: "80",
  });
  assert.equal(custom?.host, "imap.example.com");
  assert.equal(custom?.lookbackDays, 3200);
  assert.equal(custom?.maxMessages, 80);
  const view = invoiceMailHistoricalConnectionView({
    INVOICE_MAIL_HISTORICAL_USER: "office@vivace-pizza.biz",
    INVOICE_MAIL_HISTORICAL_PASSWORD: "historical-secret-should-not-appear",
  });
  assert.equal(view.configured, true);
  assert.equal(view.user, "office@vivace-pizza.biz");
  assert.equal(view.lookbackDays, DEFAULT_INVOICE_MAIL_HISTORICAL_LOOKBACK_DAYS);
  assert.equal(JSON.stringify(view).includes("historical-secret-should-not-appear"), false);
});

test("lookback since date supports multi-year windows", () => {
  const now = Date.parse("2026-09-17T00:00:00.000Z");
  const since = invoiceMailLookbackSince(2000, now);
  assert.equal(since.getTime(), now - 2000 * MS_PER_DAY);
  assert.ok(now - since.getTime() > 5 * 365 * MS_PER_DAY);
});

test("UID selection skips already-imported messages before applying the max cap", () => {
  const candidates = Array.from({ length: 100 }, (_, i) => i + 1);
  const importedRows = candidates.slice(0, 40).map((uid) => ({
    uid,
    mailboxUser: "invoices@vivace-pizza.com",
    contentHash: INVOICE_MAIL_PROCESSED_HASH,
  }));
  const imported = collectImportedUids(importedRows, "invoices@vivace-pizza.com");
  assert.deepEqual(imported, candidates.slice(0, 40));
  assert.deepEqual(selectInvoiceMailUidsToFetch(candidates, [], INVOICE_MAIL_MAX_MESSAGES), candidates.slice(0, 40));
  assert.deepEqual(
    selectInvoiceMailUidsToFetch(candidates, imported, INVOICE_MAIL_MAX_MESSAGES),
    candidates.slice(40, 80),
  );
  assert.deepEqual(selectInvoiceMailUidsToFetch(candidates, candidates, INVOICE_MAIL_MAX_MESSAGES), []);
});

test("imported UID skip is scoped per mailbox and still honors legacy empty mailboxUser", () => {
  const rows = [
    { uid: 1, mailboxUser: "invoices@vivace-pizza.com", contentHash: INVOICE_MAIL_PROCESSED_HASH },
    { uid: 1, mailboxUser: "office@vivace-pizza.biz", contentHash: INVOICE_MAIL_PROCESSED_HASH },
    { uid: 2, mailboxUser: "", contentHash: INVOICE_MAIL_PROCESSED_HASH },
    { uid: 3, mailboxUser: "office@vivace-pizza.biz", contentHash: "file-hash" },
  ];
  assert.deepEqual(collectImportedUids(rows, "office@vivace-pizza.biz"), [1]);
  assert.deepEqual(
    collectImportedUids(rows, "invoices@vivace-pizza.com", { includeLegacyEmptyMailbox: true }),
    [1, 2],
  );
  assert.equal(mailboxUidSkipMessageId("Office@vivace-pizza.biz", 41), "imap-uid:office@vivace-pizza.biz:41");
});

test("unseen UIDs stay ahead of recents when merging IMAP search results", () => {
  assert.deepEqual(mergeInvoiceMailSearchUids([9, 2], [1, 2, 8, 9]), [2, 9, 1, 8]);
});

test("attachment mime comes from filename even when Gmail sends octet-stream", () => {
  assert.equal(mimeFromInvoiceMailFilename("חשבונית.PDF"), "application/pdf");
  assert.equal(resolveInvoiceMailMime("scan.HEIC", "application/octet-stream"), "image/heic");
  assert.equal(resolveInvoiceMailMime("photo.webp", "image/webp"), "image/webp");
  assert.equal(resolveInvoiceMailMime("notes.txt", "text/plain"), null);
});

test("tiny inline images are skipped; PDFs and real attachments are kept", () => {
  assert.equal(
    isInvoiceMailAttachment({
      filename: "logo.png",
      contentType: "image/png",
      contentDisposition: "inline",
      size: 1200,
    }),
    false,
  );
  assert.equal(
    isInvoiceMailAttachment({
      filename: "invoice.pdf",
      contentType: "application/pdf",
      contentDisposition: "inline",
      size: 800,
    }),
    true,
  );
  assert.equal(
    isInvoiceMailAttachment({
      filename: "scan.jpg",
      contentType: "image/jpeg",
      contentDisposition: "attachment",
      size: 50_000,
    }),
    true,
  );
});

test("message-id + hash dedup treats a processed sentinel as already imported", () => {
  const messageId = "abc@mail.gmail.com";
  const hash = "deadbeef";
  const rows = [
    { messageId, contentHash: hash },
    { messageId: "other", contentHash: hash },
  ];
  assert.equal(mailAttachmentAlreadyImported(rows, messageId, hash), true);
  assert.equal(mailAttachmentAlreadyImported(rows, messageId, "other-hash"), false);
  assert.equal(
    mailAttachmentAlreadyImported([{ messageId, contentHash: INVOICE_MAIL_PROCESSED_HASH }], messageId, hash),
    true,
  );
});

test("normalizeMessageId strips brackets", () => {
  assert.equal(normalizeMessageId("<CAFoo@mail.gmail.com>"), "cafoo@mail.gmail.com");
  assert.equal(normalizeMessageId("  "), "");
});

test("mail note is compact Hebrew metadata", () => {
  assert.equal(
    formatInvoiceMailNote({ from: "כהן <cohen@example.com>", subject: "חשבונית אוגוסט" }),
    "מייל · מ: כהן <cohen@example.com> · חשבונית אוגוסט",
  );
});

test("status JSON survives bad payloads", () => {
  assert.equal(parseInvoiceMailStatus(undefined).ok, null);
  assert.equal(parseInvoiceMailStatus("not-json").imported, 0);
  const parsed = parseInvoiceMailStatus(
    JSON.stringify({ lastSyncAt: "2026-09-17T07:00:00.000Z", imported: 3, skipped: 1, messages: 4, ok: true }),
  );
  assert.equal(parsed.imported, 3);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.lastSyncAt, "2026-09-17T07:00:00.000Z");
});

test("cron secret is read from bearer header or query", () => {
  const headerReq = new Request("https://vivace.example/api/cron/invoice-mail", {
    headers: { authorization: "Bearer cron-secret" },
  });
  assert.equal(cronTokenFromRequest(headerReq), "cron-secret");
  const queryReq = new Request("https://vivace.example/api/cron/invoice-mail?secret=query-secret");
  assert.equal(cronTokenFromRequest(queryReq), "query-secret");
  assert.equal(cronSecretMatches(headerReq, { CRON_SECRET: "cron-secret" }), true);
  assert.equal(cronSecretMatches(headerReq, { CRON_SECRET: "other" }), false);
  assert.equal(cronSecretMatches(headerReq, {}), false);
});
