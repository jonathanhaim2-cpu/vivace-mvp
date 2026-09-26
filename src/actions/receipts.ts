"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { DEFAULT_EXPENSE_LEAF_ID } from "@/lib/chart-of-accounts";
import {
  BILLED_AS,
  EXCEPTION_KIND,
  EXCEPTION_STATUS,
  ORDER_STATUSES,
  PRICE_CHANGE,
  RECEIPT_STATUSES,
  parsePhotoDocumentType,
} from "@/lib/constants";
import {
  creditAmountIls,
  exceptionTitle,
  isShortage,
  parseBilledAs,
  parseMismatchAction,
  qtyDiffers,
} from "@/lib/credits";
import { AUDIT_ACTIONS, isCancellableReceiptStatus, writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireBranchAccess, requirePermission } from "@/lib/access";
import { markPhotoIfDuplicate } from "@/lib/invoice-duplicates";
import { saveUpload } from "@/lib/uploads";
import { formatDate } from "@/lib/format";
import { buildSupplierRequests, renderRequestPreview } from "@/lib/supplier-requests";

function pricesDiffer(a: number, b: number) {
  return Math.abs(a - b) > 0.009;
}

export async function submitGoodsReceipt(orderId: string, formData: FormData) {
  const session = await requirePermission("action.goods_intake");
  const existing = await prisma.goodsReceipt.findUnique({ where: { orderId } });
  if (existing) {
    throw new Error("כבר קיימת קליטה להזמנה זו");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: { include: { product: true } }, supplier: true, branch: true },
  });
  if (!order) throw new Error("הזמנה לא נמצאה");
  await requireBranchAccess(order.branchId, session);

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("חובה לצלם או להעלות את החשבונית / תעודת המשלוח");
  }
  const saved = await saveUpload(photo);

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const accountId = String(formData.get("accountId") ?? DEFAULT_EXPENSE_LEAF_ID);
  await assertLeafAccount(accountId);

  const lineInputs = order.lines.map((line) => {
    const receivedQty = Number(formData.get(`receivedQty:${line.id}`) ?? line.qty);
    const invoicePrice = Number(formData.get(`invoicePrice:${line.id}`) ?? line.unitPrice);
    const missing =
      formData.get(`missing:${line.id}`) === "on" ||
      formData.get(`missing:${line.id}`) === "true" ||
      receivedQty <= 0;
    const qty = Number.isFinite(receivedQty) ? Math.round(receivedQty) : 0;
    const price = Number.isFinite(invoicePrice) ? invoicePrice : line.unitPrice;
    const mismatch = qtyDiffers(line.qty, qty) || missing;
    const shortage = isShortage(line.qty, qty, missing);
    const billedAs = shortage
      ? parseBilledAs(String(formData.get(`billedAs:${line.id}`) ?? "")) ?? BILLED_AS.FULL_ORDERED
      : null;
    const mismatchAction = shortage
      ? parseMismatchAction(String(formData.get(`mismatchAction:${line.id}`) ?? "")) ??
        EXCEPTION_KIND.MISSING_NO_CREDIT
      : null;
    const wrongPrice = pricesDiffer(price, line.unitPrice);
    return {
      orderLineId: line.id,
      productName: line.product.name,
      orderedQty: line.qty,
      receivedQty: qty,
      invoicePrice: price,
      missing,
      wrongPrice,
      qtyMismatch: mismatch,
      billedAs,
      mismatchAction,
      priceChangeStatus: wrongPrice ? PRICE_CHANGE.PENDING : null,
    };
  });

  const hasPricePending = lineInputs.some((l) => l.priceChangeStatus === PRICE_CHANGE.PENDING);
  const hasMissing = lineInputs.some((l) => l.missing);
  const hasCreditRequest = lineInputs.some((l) => l.mismatchAction === EXCEPTION_KIND.CREDIT_REQUEST);
  const status = hasPricePending
    ? RECEIPT_STATUSES.PENDING_PRICE_APPROVAL
    : hasCreditRequest
      ? RECEIPT_STATUSES.CREDIT_NEEDED
      : RECEIPT_STATUSES.APPROVED;

  const receipt = await prisma.goodsReceipt.create({
    data: {
      orderId,
      status,
      notes,
      accountId,
      lines: {
        create: lineInputs.map((line) => ({
          orderLineId: line.orderLineId,
          receivedQty: line.receivedQty,
          invoicePrice: line.invoicePrice,
          missing: line.missing,
          wrongPrice: line.wrongPrice,
          qtyMismatch: line.qtyMismatch,
          billedAs: line.billedAs,
          priceChangeStatus: line.priceChangeStatus,
        })),
      },
      photos: {
        create: {
          accountId,
          branchId: order.branchId,
          amountIls: lineInputs.reduce((sum, line) => {
            const billedQty =
              line.billedAs === BILLED_AS.FULL_ORDERED ? line.orderedQty : line.receivedQty;
            return sum + billedQty * line.invoicePrice;
          }, 0),
          fileName: saved.fileName,
          originalName: saved.originalName,
          mimeType: saved.mimeType,
          contentHash: saved.contentHash,
        },
      },
    },
    include: { lines: true },
  });

  for (const input of lineInputs) {
    if (!input.mismatchAction) continue;
    const receiptLine = receipt.lines.find((row) => row.orderLineId === input.orderLineId);
    const amount = creditAmountIls(input.orderedQty, input.receivedQty, input.invoicePrice, input.billedAs);
    await prisma.exceptionalItem.create({
      data: {
        kind: input.mismatchAction,
        status: EXCEPTION_STATUS.OPEN,
        title: exceptionTitle(input.mismatchAction, input.productName, amount),
        amountIls: input.mismatchAction === EXCEPTION_KIND.CREDIT_REQUEST ? amount : 0,
        orderedQty: input.orderedQty,
        receivedQty: input.receivedQty,
        productName: input.productName,
        goodsReceiptId: receipt.id,
        goodsReceiptLineId: receiptLine?.id ?? null,
        orderId,
        supplierId: order.supplierId,
        branchId: order.branchId,
      },
    });
  }

  const documentNumber = String(formData.get("documentNumber") ?? "").trim() || null;
  const deliveryRaw = String(formData.get("deliveryDate") ?? "").trim();
  const deliveryDate = /^\d{4}-\d{2}-\d{2}$/.test(deliveryRaw) ? new Date(`${deliveryRaw}T12:00:00.000Z`) : new Date();
  const drafts = buildSupplierRequests(
    lineInputs.map((line) => ({
      productName: line.productName,
      orderedQty: line.orderedQty,
      receivedQty: line.receivedQty,
      unitPrice: line.invoicePrice,
      missing: line.missing,
      mark: String(formData.get(`arrival:${line.orderLineId}`) ?? ""),
    })),
  );
  for (const draft of drafts) {
    const previewBody = renderRequestPreview({
      kind: draft.kind,
      supplierName: order.supplier.name,
      documentNumber,
      orderNumber: order.id,
      deliveryDateLabel: formatDate(deliveryDate),
      branchName: order.branch.name,
      lines: draft.lines,
    });
    await prisma.supplierRequest.create({
      data: {
        kind: draft.kind,
        status: "OPEN",
        supplierId: order.supplierId,
        branchId: order.branchId,
        orderId,
        goodsReceiptId: receipt.id,
        documentNumber,
        deliveryDate,
        previewBody,
        lines: {
          create: draft.lines.map((line) => ({
            productName: line.productName,
            orderedQty: line.orderedQty,
            receivedQty: line.receivedQty,
            unitPrice: line.unitPrice,
            amountDiff: line.amountDiff,
            mark: line.mark,
          })),
        },
      },
    });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: hasMissing ? ORDER_STATUSES.PARTIAL : ORDER_STATUSES.RECEIVED },
  });

  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.RECEIPT_SUBMIT,
    entityType: "GoodsReceipt",
    entityId: receipt.id,
    summary: `קליטת סחורה · ${order.supplier.name} / ${order.branch.name} · ${lineInputs.length} שורות`,
    meta: {
      orderId,
      status,
      lineCount: lineInputs.length,
      hasPricePending,
      hasCreditRequest,
      supplierName: order.supplier.name,
      branchName: order.branch.name,
    },
  });

  revalidatePath("/receipts");
  revalidatePath("/orders");
  revalidatePath("/receiving");
  revalidatePath("/credits");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidatePath("/anomalies");
  const stored = await prisma.goodsReceipt.findUnique({
    where: { orderId },
    include: { photos: true },
  });
  if (stored) {
    for (const item of stored.photos) {
      const duplicate = await markPhotoIfDuplicate(item.id);
      if (!duplicate) {
        await analyzeStoredPhoto(item.id);
      }
    }
  }
  revalidatePath("/invoices");
  revalidatePath("/settings");
  redirect(drafts.length > 0 ? `/credits/preview/${receipt.id}` : `/receipts/${stored!.id}`);
}

export async function approvePriceChange(lineId: string) {
  const session = await requirePermission("action.edit_prices");
  if (!session.isNetwork) {
    throw new Error("רק משרד הרשת יכול לאשר שינוי מחיר");
  }

  const line = await prisma.goodsReceiptLine.findUnique({
    where: { id: lineId },
    include: { orderLine: true, goodsReceipt: true },
  });
  if (!line) throw new Error("שורה לא נמצאה");

  await prisma.product.update({
    where: { id: line.orderLine.productId },
    data: { agreedPrice: line.invoicePrice },
  });
  await prisma.goodsReceiptLine.update({
    where: { id: lineId },
    data: { priceChangeStatus: PRICE_CHANGE.APPROVED },
  });

  await refreshReceiptStatus(line.goodsReceiptId);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.RECEIPT_PRICE_APPROVE,
    entityType: "GoodsReceipt",
    entityId: line.goodsReceiptId,
    summary: `אושר שינוי מחיר בשורת קליטה`,
    meta: { lineId, invoicePrice: line.invoicePrice, productId: line.orderLine.productId },
  });
  revalidatePath(`/receipts/${line.goodsReceiptId}`);
  revalidatePath("/receipts");
}

export async function rejectPriceChange(lineId: string) {
  const session = await requirePermission("action.edit_prices");
  if (!session.isNetwork) {
    throw new Error("רק משרד הרשת יכול לדחות שינוי מחיר");
  }

  const line = await prisma.goodsReceiptLine.findUnique({
    where: { id: lineId },
  });
  if (!line) throw new Error("שורה לא נמצאה");

  await prisma.goodsReceiptLine.update({
    where: { id: lineId },
    data: { priceChangeStatus: PRICE_CHANGE.REJECTED },
  });

  await refreshReceiptStatus(line.goodsReceiptId);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.RECEIPT_PRICE_REJECT,
    entityType: "GoodsReceipt",
    entityId: line.goodsReceiptId,
    summary: "נדחה שינוי מחיר בשורת קליטה · נדרשת בקשת זיכוי",
    meta: { lineId },
  });
  revalidatePath(`/receipts/${line.goodsReceiptId}`);
  revalidatePath("/receipts");
}

async function refreshReceiptStatus(receiptId: string) {
  const lines = await prisma.goodsReceiptLine.findMany({ where: { goodsReceiptId: receiptId } });
  const pending = lines.some((l) => l.priceChangeStatus === PRICE_CHANGE.PENDING);
  const rejected = lines.some((l) => l.priceChangeStatus === PRICE_CHANGE.REJECTED);

  const status = pending
    ? RECEIPT_STATUSES.PENDING_PRICE_APPROVAL
    : rejected
      ? RECEIPT_STATUSES.CREDIT_NEEDED
      : RECEIPT_STATUSES.APPROVED;

  await prisma.goodsReceipt.update({
    where: { id: receiptId },
    data: { status },
  });
}

export async function markForwardedToAccountant(receiptId: string) {
  await requirePermission("action.accounting_package");
  await prisma.goodsReceipt.update({
    where: { id: receiptId },
    data: { forwardedToAccountant: true, forwardedAt: new Date() },
  });
  revalidatePath(`/receipts/${receiptId}`);
  revalidatePath("/receipts");
}

export async function attachReceiptPhoto(receiptId: string, formData: FormData) {
  const session = await requirePermission("action.goods_intake");
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId },
    include: { order: true, lines: true },
  });
  if (!receipt) throw new Error("קליטה לא נמצאה");
  await requireBranchAccess(receipt.order.branchId, session);
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("חובה לצלם או לבחור קובץ");
  }
  const saved = await saveUpload(photo);
  const documentType = parsePhotoDocumentType(formData.get("documentType"));
  const amount = receipt.lines.reduce((sum, line) => sum + line.receivedQty * line.invoicePrice, 0);
  const created = await prisma.invoicePhoto.create({
    data: {
      goodsReceiptId: receipt.id,
      accountId: receipt.accountId,
      branchId: receipt.order.branchId,
      amountIls: amount,
      originalAmountIls: amount,
      fileName: saved.fileName,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      contentHash: saved.contentHash,
      source: "RECEIPT",
      documentType,
    },
  });
  const duplicate = await markPhotoIfDuplicate(created.id);
  if (!duplicate) await analyzeStoredPhoto(created.id);
  revalidatePath(`/receipts/${receiptId}`);
  revalidatePath("/invoices");
}

export async function assignReceiptCategory(receiptId: string, formData: FormData) {
  await requirePermission("nav.invoices");
  const accountId = String(formData.get("accountId") ?? "");
  await assertLeafAccount(accountId);
  await prisma.goodsReceipt.update({
    where: { id: receiptId },
    data: { accountId },
  });
  await prisma.invoicePhoto.updateMany({
    where: { goodsReceiptId: receiptId },
    data: { accountId },
  });
  revalidatePath(`/receipts/${receiptId}`);
  revalidatePath("/invoices");
}

/**
 * Admin/network-only undo for a submitted receipt.
 * Allowed statuses: APPROVED, CREDIT_NEEDED, PENDING_PRICE_APPROVAL, SUBMITTED.
 * Deletes the receipt + lines, removes exceptional items, unlinks invoice photos
 * (files stay in the invoice queue), and sets the order back to SENT so a new
 * receipt can be submitted.
 */
export async function cancelGoodsReceipt(receiptId: string) {
  const session = await requirePermission("action.cancel_goods_receipt");
  if (!session.isNetwork) {
    throw new Error("רק משרד הרשת יכול לבטל קליטה");
  }

  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId },
    include: {
      order: { include: { supplier: true, branch: true } },
      photos: { select: { id: true } },
    },
  });
  if (!receipt) throw new Error("קליטה לא נמצאה");
  await requireBranchAccess(receipt.order.branchId, session);

  if (!isCancellableReceiptStatus(receipt.status)) {
    throw new Error("לא ניתן לבטל קליטה במצב זה");
  }

  const orderId = receipt.orderId;
  const previousOrderStatus = receipt.order.status;
  const revertOrder =
    previousOrderStatus === ORDER_STATUSES.RECEIVED || previousOrderStatus === ORDER_STATUSES.PARTIAL;

  await prisma.$transaction(async (tx) => {
    await tx.invoicePhoto.updateMany({
      where: { goodsReceiptId: receiptId },
      data: { goodsReceiptId: null },
    });
    await tx.exceptionalItem.deleteMany({ where: { goodsReceiptId: receiptId } });
    await tx.goodsReceipt.delete({ where: { id: receiptId } });
    if (revertOrder) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: ORDER_STATUSES.SENT },
      });
    }
  });

  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.RECEIPT_CANCEL,
    entityType: "GoodsReceipt",
    entityId: receiptId,
    summary: `ביטול קליטה · ${receipt.order.supplier.name} / ${receipt.order.branch.name}`,
    meta: {
      orderId,
      previousReceiptStatus: receipt.status,
      previousOrderStatus,
      photoCount: receipt.photos.length,
      supplierName: receipt.order.supplier.name,
      branchName: receipt.order.branch.name,
    },
  });

  revalidatePath("/receipts");
  revalidatePath(`/receipts/${receiptId}`);
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
  revalidatePath("/anomalies");
  revalidatePath("/invoices");
  redirect(`/orders/${orderId}`);
}
