import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { INVOICE_DUPLICATE_STATUS } from "./constants";
import {
  filenamesLookSimilar,
  findDuplicateOriginal,
  hashFileBytes,
  isAiDuplicateMatch,
  normalizeInvoiceDate,
  normalizeInvoiceFileName,
  scanExistingInvoiceDuplicates,
  suppliersMatch,
  totalsMatch,
} from "./invoice-duplicates";

test("sha256 is stable for the same bytes", () => {
  const a = hashFileBytes(Buffer.from("invoice-bytes"));
  const b = hashFileBytes(Buffer.from("invoice-bytes"));
  const c = hashFileBytes(Buffer.from("invoice-bytes-2"));
  assert.equal(a, b);
  assert.equal(a.length, 64);
  assert.notEqual(a, c);
});

test("filename similarity strips copy suffixes and numbering", () => {
  assert.equal(normalizeInvoiceFileName("חשבונית-תנובה (1).pdf"), normalizeInvoiceFileName("חשבונית-תנובה.pdf"));
  assert.equal(filenamesLookSimilar("invoice copy.pdf", "invoice.pdf"), true);
  assert.equal(filenamesLookSimilar("Copy of invoice.pdf", "invoice.pdf"), true);
  assert.equal(filenamesLookSimilar("חשבונית עותק.pdf", "חשבונית.pdf"), true);
  assert.equal(filenamesLookSimilar("tnuva-aug.pdf", "tnuva-sep.pdf"), false);
});

test("AI match needs supplier + date + total + similar filename", () => {
  const original = {
    id: "a",
    originalName: "tnuva.pdf",
    aiSupplierName: 'תנובה בע"מ',
    aiInvoiceDate: "15/08/2026",
    aiTotalIls: 2140,
  };
  const copy = {
    id: "b",
    originalName: "tnuva (1).pdf",
    aiSupplierName: "תנובה",
    aiInvoiceDate: "2026-08-15",
    aiTotalIls: 2140.0,
  };
  assert.equal(suppliersMatch(original.aiSupplierName, copy.aiSupplierName), true);
  assert.equal(normalizeInvoiceDate(original.aiInvoiceDate), "2026-08-15");
  assert.equal(totalsMatch(original.aiTotalIls, copy.aiTotalIls), true);
  assert.equal(isAiDuplicateMatch(copy, original), true);
  assert.equal(isAiDuplicateMatch({ ...copy, aiTotalIls: 50 }, original), false);
  assert.equal(isAiDuplicateMatch({ ...copy, originalName: "other.pdf" }, original), false);
  assert.equal(isAiDuplicateMatch({ ...copy, aiSupplierName: "כהן" }, original), false);
});

test("hash match wins even when AI fields differ, and confirmed-unique is not reflagged", () => {
  const original = {
    id: "orig",
    contentHash: "abc",
    originalName: "a.pdf",
    createdAt: new Date("2026-08-01"),
    isDuplicate: false,
  };
  const later = {
    id: "copy",
    contentHash: "abc",
    originalName: "b.pdf",
    aiSupplierName: "אחר",
    createdAt: new Date("2026-08-02"),
    isDuplicate: false,
  };
  assert.equal(findDuplicateOriginal(later, [original])?.id, "orig");
  assert.equal(
    findDuplicateOriginal(
      { ...later, duplicateStatus: INVOICE_DUPLICATE_STATUS.CONFIRMED_UNIQUE },
      [original],
    ),
    null,
  );
});

test("scan marks later same-hash and AI-matching photos without counting them twice", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "invoice-dup-"));
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
      const first = await client.invoicePhoto.create({
        data: {
          fileName: "a.bin",
          originalName: "tnuva.pdf",
          mimeType: "application/pdf",
          contentHash: "same-hash",
          accountId: null,
          amountIls: 100,
          aiSupplierName: "תנובה",
          aiInvoiceDate: "2026-08-15",
          aiTotalIls: 100,
          periodMonth: "2026-08",
        },
      });
      const hashedCopy = await client.invoicePhoto.create({
        data: {
          fileName: "b.bin",
          originalName: "tnuva (1).pdf",
          mimeType: "application/pdf",
          contentHash: "same-hash",
          amountIls: 100,
          periodMonth: "2026-08",
        },
      });
      const aiCopy = await client.invoicePhoto.create({
        data: {
          fileName: "c.bin",
          originalName: "tnuva copy.pdf",
          mimeType: "application/pdf",
          contentHash: "other-hash",
          amountIls: 100,
          aiSupplierName: 'תנובה בע"מ',
          aiInvoiceDate: "15/08/2026",
          aiTotalIls: 100,
          periodMonth: "2026-08",
        },
      });
      const unique = await client.invoicePhoto.create({
        data: {
          fileName: "d.bin",
          originalName: "cohen.pdf",
          mimeType: "application/pdf",
          contentHash: "cohen-hash",
          amountIls: 80,
          aiSupplierName: "כהן",
          aiInvoiceDate: "2026-08-15",
          aiTotalIls: 80,
          periodMonth: "2026-08",
        },
      });

      const marked = await scanExistingInvoiceDuplicates(client);
      assert.equal(marked, 2);

      const hashed = await client.invoicePhoto.findUnique({ where: { id: hashedCopy.id } });
      const ai = await client.invoicePhoto.findUnique({ where: { id: aiCopy.id } });
      const kept = await client.invoicePhoto.findUnique({ where: { id: first.id } });
      const other = await client.invoicePhoto.findUnique({ where: { id: unique.id } });

      assert.equal(hashed?.isDuplicate, true);
      assert.equal(hashed?.duplicateOfId, first.id);
      assert.equal(hashed?.duplicateStatus, INVOICE_DUPLICATE_STATUS.DUPLICATE);
      assert.equal(ai?.isDuplicate, true);
      assert.equal(ai?.duplicateOfId, first.id);
      assert.equal(kept?.isDuplicate, false);
      assert.equal(other?.isDuplicate, false);

      const counted = await client.invoicePhoto.findMany({ where: { isDuplicate: false } });
      const total = counted.reduce((sum, photo) => sum + (photo.amountIls ?? 0), 0);
      assert.equal(counted.length, 2);
      assert.equal(total, 180);

      const markedAgain = await scanExistingInvoiceDuplicates(client);
      assert.equal(markedAgain, 0);
    } finally {
      await client.$disconnect();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
