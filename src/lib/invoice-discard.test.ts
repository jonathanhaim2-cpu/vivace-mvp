import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { INVOICE_MAIL_PROCESSED_HASH, mailAttachmentAlreadyImported } from "./invoice-mail";
import {
  canDiscardInvoicePhoto,
  invoiceDiscardAuditSummary,
  invoiceDiscardBlockedReason,
  invoiceDiscardConfirmMessage,
  isAiNotInvoiceSuggestion,
  KEEP_MAIL_IMPORT_ON_DISCARD,
} from "./invoice-discard";
import { discardInvoicePhotoRecord } from "./invoice-discard-db";

test("keep-mail-import is the documented discard policy", () => {
  assert.equal(KEEP_MAIL_IMPORT_ON_DISCARD, true);
});

test("pending and classified unpaid photos can be discarded; paid / sent-to-accountant cannot", () => {
  assert.equal(canDiscardInvoicePhoto({ paid: false, sentToAccountant: false }), true);
  assert.equal(invoiceDiscardBlockedReason({ paid: true, sentToAccountant: false }), "לא ניתן למחוק חשבונית שסומנה כשולמה");
  assert.equal(
    invoiceDiscardBlockedReason({ paid: false, sentToAccountant: true }),
    "לא ניתן למחוק חשבונית שנשלחה להנה״ח",
  );
  assert.equal(invoiceDiscardBlockedReason(null), "חשבונית לא נמצאה");
});

test("AI not-invoice detection matches ID annex copy and empty low-confidence extracts", () => {
  assert.equal(
    isAiNotInvoiceSuggestion({
      aiAccountId: null,
      aiConfidence: 0.1,
      aiReason: "המסמך כולל צילום של ספח תעודת זהות ואינו חשבונית או קבלה לספק.",
      aiStatus: "SUGGESTED",
      aiSupplierName: null,
      aiTotalIls: null,
    }),
    true,
  );
  assert.equal(
    isAiNotInvoiceSuggestion({
      aiAccountId: null,
      aiConfidence: 0.2,
      aiReason: "לא זוהו שדות חשבונית במסמך.",
      aiStatus: "SUGGESTED",
      aiSupplierName: null,
      aiTotalIls: null,
    }),
    true,
  );
  assert.equal(
    isAiNotInvoiceSuggestion({
      aiAccountId: "acc_food_produce",
      aiConfidence: 0.4,
      aiReason: "חשבונית ירקות — ביטחון נמוך בסכום.",
      aiStatus: "SUGGESTED",
      aiSupplierName: "ירקות השרון",
      aiTotalIls: 245,
    }),
    false,
  );
  assert.equal(
    isAiNotInvoiceSuggestion({
      aiAccountId: null,
      aiConfidence: 0.9,
      aiReason: "",
      aiStatus: "SUGGESTED",
      aiSupplierName: "תנובה",
      aiTotalIls: 100,
    }),
    false,
  );
});

test("discard audit and confirm copy are Hebrew", () => {
  assert.equal(
    invoiceDiscardAuditSummary({ originalName: "id-annex.pdf", isDuplicate: false, accountId: null }),
    "נמחק מסמך לא רלוונטי מהתור · id-annex.pdf",
  );
  assert.equal(
    invoiceDiscardAuditSummary({ originalName: "copy.pdf", isDuplicate: true, accountId: null }),
    "נמחקה חשבונית כפולה · copy.pdf",
  );
  assert.equal(
    invoiceDiscardAuditSummary({ originalName: "tnuva.pdf", isDuplicate: false, accountId: "acc_food" }),
    "נמחקה חשבונית משובצת · tnuva.pdf",
  );
  assert.match(invoiceDiscardConfirmMessage({ notInvoice: true }), /אינו חשבונית/);
  assert.match(invoiceDiscardConfirmMessage({ isDuplicate: true }), /הכפיל/);
});

test("discard deletes the photo and keeps the IMAP import marker so the same attachment is not re-pulled", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "invoice-discard-"));
  const dbPath = path.join(dir, "test.db");
  const url = `file:${dbPath}`;
  try {
    execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
    const client = new PrismaClient({ datasourceUrl: url });
    try {
      const photo = await client.invoicePhoto.create({
        data: {
          fileName: "id-annex.bin",
          originalName: "ספח תעודת זהות.pdf",
          mimeType: "application/pdf",
          contentHash: "annex-hash",
          source: "EMAIL",
          aiConfidence: 0.1,
          aiReason: "אינו חשבונית",
          aiStatus: "SUGGESTED",
        },
      });
      const messageId = "annex@mail.gmail.com";
      await client.invoiceMailImport.create({
        data: {
          messageId,
          contentHash: "annex-hash",
          uid: 17,
          originalName: photo.originalName,
          invoicePhotoId: photo.id,
        },
      });
      await client.invoiceMailImport.create({
        data: {
          messageId,
          contentHash: INVOICE_MAIL_PROCESSED_HASH,
          uid: 17,
          originalName: "",
        },
      });

      await discardInvoicePhotoRecord(client, photo.id);

      assert.equal(await client.invoicePhoto.findUnique({ where: { id: photo.id } }), null);
      const markers = await client.invoiceMailImport.findMany({ where: { messageId } });
      assert.equal(markers.length, 2);
      assert.equal(
        markers.find((row) => row.contentHash === "annex-hash")?.invoicePhotoId,
        null,
      );
      assert.equal(
        mailAttachmentAlreadyImported(markers, messageId, "annex-hash"),
        true,
      );

      const paid = await client.invoicePhoto.create({
        data: {
          fileName: "paid.bin",
          originalName: "paid.pdf",
          mimeType: "application/pdf",
          paid: true,
        },
      });
      await assert.rejects(() => discardInvoicePhotoRecord(client, paid.id), /שולמה/);
      assert.ok(await client.invoicePhoto.findUnique({ where: { id: paid.id } }));
    } finally {
      await client.$disconnect();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
