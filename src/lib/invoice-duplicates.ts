import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { INVOICE_DUPLICATE_STATUS } from "@/lib/constants";
import { INVOICE_APPROVAL } from "@/lib/invoice-approval";
import { prisma } from "@/lib/prisma";
import { normalizeSupplierName } from "@/lib/supplier-merge";
import { hashFileBytes, UPLOAD_DIR } from "@/lib/uploads";

export const INVOICE_IN_TOTALS_WHERE = {
  isDuplicate: false,
  approvalStatus: { notIn: [INVOICE_APPROVAL.PENDING, INVOICE_APPROVAL.REJECTED] },
};

export type DuplicateSignals = {
  id?: string;
  contentHash?: string | null;
  originalName?: string | null;
  aiSupplierName?: string | null;
  aiInvoiceDate?: string | null;
  aiTotalIls?: number | null;
  isDuplicate?: boolean;
  duplicateStatus?: string | null;
  createdAt?: Date | string | null;
};

let defaultScanInFlight: Promise<number> | null = null;

export { hashFileBytes };

export function normalizeInvoiceFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? name;
  const noExt = base.replace(/\.[^.]+$/, "");
  return noExt
    .normalize("NFKC")
    .replace(/[\u05F4\u05F3\u201C\u201D\u2018\u2019"']/g, "")
    .replace(/^(copy of|עותק של)\s+/i, "")
    .replace(/\s*\(\s*\d+\s*\)\s*$/g, "")
    .replace(/[\s._-]*(copy|עותק|כפיל|duplicate|dup)\d*$/gi, "")
    .replace(/[\s._-]+\d+$/g, "")
    .replace(/[.\-_/]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function filenamesLookSimilar(a: string, b: string): boolean {
  const left = normalizeInvoiceFileName(a);
  const right = normalizeInvoiceFileName(b);
  return Boolean(left && right && left === right);
}

export function normalizeInvoiceDate(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return raw;
}

export function totalsMatch(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < 0.05;
}

export function invoiceSupplierKey(name: string | null | undefined): string {
  return normalizeSupplierName(name ?? "")
    .replace(/\s+(בעמ|ltd|inc|llc|gmbh)\s*$/i, "")
    .trim();
}

export function suppliersMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = invoiceSupplierKey(a);
  const right = invoiceSupplierKey(b);
  return Boolean(left && right && left === right);
}

export function isConfirmedUnique(status: string | null | undefined): boolean {
  return status === INVOICE_DUPLICATE_STATUS.CONFIRMED_UNIQUE;
}

export function isHashDuplicate(incoming: DuplicateSignals, existing: DuplicateSignals): boolean {
  return Boolean(incoming.contentHash && existing.contentHash && incoming.contentHash === existing.contentHash);
}

export function isAiDuplicateMatch(incoming: DuplicateSignals, existing: DuplicateSignals): boolean {
  return (
    suppliersMatch(incoming.aiSupplierName, existing.aiSupplierName) &&
    Boolean(
      normalizeInvoiceDate(incoming.aiInvoiceDate) &&
        normalizeInvoiceDate(incoming.aiInvoiceDate) === normalizeInvoiceDate(existing.aiInvoiceDate),
    ) &&
    totalsMatch(incoming.aiTotalIls, existing.aiTotalIls) &&
    filenamesLookSimilar(incoming.originalName ?? "", existing.originalName ?? "")
  );
}

function createdAtMs(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function preferOriginal(left: DuplicateSignals, right: DuplicateSignals): DuplicateSignals {
  if (Boolean(left.isDuplicate) !== Boolean(right.isDuplicate)) {
    return left.isDuplicate ? right : left;
  }
  const byTime = createdAtMs(left.createdAt) - createdAtMs(right.createdAt);
  if (byTime !== 0) return byTime < 0 ? left : right;
  return (left.id ?? "") <= (right.id ?? "") ? left : right;
}

/** Oldest non-duplicate with the same hash or a clear AI match; CONFIRMED_UNIQUE can still be the original. */
export function findDuplicateOriginal(
  incoming: DuplicateSignals,
  existing: DuplicateSignals[],
): DuplicateSignals | null {
  if (isConfirmedUnique(incoming.duplicateStatus)) return null;
  const pool = existing.filter((item) => item.id && item.id !== incoming.id);
  const hashHits = pool.filter((item) => isHashDuplicate(incoming, item));
  if (hashHits.length > 0) {
    return hashHits.reduce(preferOriginal);
  }
  const aiHits = pool.filter((item) => isAiDuplicateMatch(incoming, item));
  if (aiHits.length === 0) return null;
  return aiHits.reduce(preferOriginal);
}

export async function applyDuplicateFlag(
  photoId: string,
  originalId: string,
  client: PrismaClient = prisma,
) {
  if (photoId === originalId) return;
  const photo = await client.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo || isConfirmedUnique(photo.duplicateStatus)) return;
  await client.invoicePhoto.update({
    where: { id: photoId },
    data: {
      isDuplicate: true,
      duplicateOfId: originalId,
      duplicateStatus: INVOICE_DUPLICATE_STATUS.DUPLICATE,
    },
  });
}

export async function findExistingDuplicateOriginal(
  incoming: DuplicateSignals,
  client: PrismaClient = prisma,
) {
  if (incoming.contentHash) {
    const byHash = await client.invoicePhoto.findMany({
      where: {
        contentHash: incoming.contentHash,
        ...(incoming.id ? { id: { not: incoming.id } } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    const original = findDuplicateOriginal(incoming, byHash);
    if (original?.id) return original;
  }

  const hasAi =
    Boolean(incoming.aiSupplierName?.trim()) &&
    Boolean(incoming.aiInvoiceDate?.trim()) &&
    incoming.aiTotalIls != null &&
    Boolean(incoming.originalName?.trim());
  if (!hasAi) return null;

  const candidates = await client.invoicePhoto.findMany({
    where: {
      aiSupplierName: { not: null },
      aiInvoiceDate: { not: null },
      aiTotalIls: { not: null },
      ...(incoming.id ? { id: { not: incoming.id } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  return findDuplicateOriginal(incoming, candidates);
}

async function backfillMissingHashes(client: PrismaClient) {
  const missing = await client.invoicePhoto.findMany({
    where: { contentHash: null },
    select: { id: true, fileName: true },
  });
  for (const photo of missing) {
    try {
      const buffer = await readFile(path.join(UPLOAD_DIR, photo.fileName));
      await client.invoicePhoto.update({
        where: { id: photo.id },
        data: { contentHash: hashFileBytes(buffer) },
      });
    } catch {
      // File may be missing in older rows; AI signals can still match.
    }
  }
}

async function scanDuplicates(client: PrismaClient): Promise<number> {
  await backfillMissingHashes(client);
  const photos = await client.invoicePhoto.findMany({ orderBy: { createdAt: "asc" } });
  let marked = 0;
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    if (photo.isDuplicate || isConfirmedUnique(photo.duplicateStatus)) continue;
    const original = findDuplicateOriginal(photo, photos.slice(0, index));
    if (!original?.id) continue;
    await applyDuplicateFlag(photo.id, original.id, client);
    photo.isDuplicate = true;
    photo.duplicateOfId = original.id;
    photo.duplicateStatus = INVOICE_DUPLICATE_STATUS.DUPLICATE;
    marked += 1;
  }
  return marked;
}

/** Flags existing accidental copies. Safe to call from listing and rollup; coalesces overlapping default-client runs. */
export async function scanExistingInvoiceDuplicates(client: PrismaClient = prisma): Promise<number> {
  if (client === prisma) {
    if (!defaultScanInFlight) {
      defaultScanInFlight = scanDuplicates(client).finally(() => {
        defaultScanInFlight = null;
      });
    }
    return defaultScanInFlight;
  }
  return scanDuplicates(client);
}

export async function markPhotoIfDuplicate(
  photoId: string,
  client: PrismaClient = prisma,
): Promise<boolean> {
  const photo = await client.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.isDuplicate || isConfirmedUnique(photo.duplicateStatus)) {
    return Boolean(photo?.isDuplicate);
  }
  const original = await findExistingDuplicateOriginal(photo, client);
  if (!original?.id) return false;
  await applyDuplicateFlag(photo.id, original.id, client);
  return true;
}

export const duplicateInvoiceData = (originalId: string) => ({
  isDuplicate: true,
  duplicateOfId: originalId,
  duplicateStatus: INVOICE_DUPLICATE_STATUS.DUPLICATE,
});
