"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { DEFAULT_EXPENSE_LEAF_ID } from "@/lib/chart-of-accounts";
import { ORDER_STATUSES, PRICE_CHANGE, RECEIPT_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { saveUpload } from "@/lib/uploads";

function pricesDiffer(a: number, b: number) {
  return Math.abs(a - b) > 0.009;
}

export async function submitGoodsReceipt(orderId: string, formData: FormData) {
  const existing = await prisma.goodsReceipt.findUnique({ where: { orderId } });
  if (existing) {
    throw new Error("כבר קיימת קליטה להזמנה זו");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: { include: { product: true } } },
  });
  if (!order) throw new Error("הזמנה לא נמצאה");

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
    const wrongPrice = pricesDiffer(invoicePrice, line.unitPrice);
    return {
      orderLineId: line.id,
      receivedQty: Number.isFinite(receivedQty) ? receivedQty : 0,
      invoicePrice: Number.isFinite(invoicePrice) ? invoicePrice : line.unitPrice,
      missing,
      wrongPrice,
      priceChangeStatus: wrongPrice ? PRICE_CHANGE.PENDING : null,
    };
  });

  const hasPricePending = lineInputs.some((l) => l.priceChangeStatus === PRICE_CHANGE.PENDING);
  const hasMissing = lineInputs.some((l) => l.missing);
  const status = hasPricePending
    ? RECEIPT_STATUSES.PENDING_PRICE_APPROVAL
    : RECEIPT_STATUSES.APPROVED;

  await prisma.goodsReceipt.create({
    data: {
      orderId,
      status,
      notes,
      accountId,
      lines: { create: lineInputs },
      photos: {
        create: {
          accountId,
          amountIls: lineInputs.reduce((sum, line) => sum + line.receivedQty * line.invoicePrice, 0),
          fileName: saved.fileName,
          originalName: saved.originalName,
          mimeType: saved.mimeType,
        },
      },
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: hasMissing ? ORDER_STATUSES.PARTIAL : ORDER_STATUSES.RECEIVED },
  });

  revalidatePath("/receipts");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { orderId },
    include: { photos: true },
  });
  if (receipt) {
    for (const item of receipt.photos) {
      await analyzeStoredPhoto(item.id);
    }
  }
  revalidatePath("/invoices");
  revalidatePath("/settings");
  redirect(`/receipts/${receipt!.id}`);
}

export async function approvePriceChange(lineId: string) {
  const session = await getAppSession();
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
  revalidatePath(`/receipts/${line.goodsReceiptId}`);
  revalidatePath("/receipts");
}

export async function rejectPriceChange(lineId: string) {
  const session = await getAppSession();
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
  await prisma.goodsReceipt.update({
    where: { id: receiptId },
    data: { forwardedToAccountant: true, forwardedAt: new Date() },
  });
  revalidatePath(`/receipts/${receiptId}`);
  revalidatePath("/receipts");
}

export async function assignReceiptCategory(receiptId: string, formData: FormData) {
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
