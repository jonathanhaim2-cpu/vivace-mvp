"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeQuoteDocument } from "@/lib/ai";
import { annualAveragePrice, lastPurchasePrice, type PurchasePoint } from "@/lib/price-stats";
import { compareQuoteBasket, matchQuoteName, type QuoteInputLine } from "@/lib/quote-compare";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import { readStoredFile, saveUpload } from "@/lib/uploads";

export async function analyzeSupplierQuote(formData: FormData) {
  const session = await requirePermission("nav.reports");
  if (!session.isNetwork) throw new Error("השוואת הצעות מחיר היא של משרד הרשת");
  const supplierName = String(formData.get("supplierName") ?? "").trim() || "ספק";
  const file = formData.get("file");
  let extracted: { name: string; unitPrice: number }[] = [];
  let fileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file);
    fileName = saved.fileName;
    const bytes = await readStoredFile(saved.fileName);
    if (bytes) {
      const lines = await analyzeQuoteDocument({ buffer: bytes, mimeType: saved.mimeType, fileName: saved.originalName });
      extracted = lines ?? [];
    }
  }
  const manual = String(formData.get("lines") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of manual) {
    const [name, price] = line.split(/[,;\t]/);
    const unitPrice = Number(price);
    if (name?.trim() && Number.isFinite(unitPrice)) extracted.push({ name: name.trim(), unitPrice });
  }
  if (extracted.length === 0) throw new Error("לא נמצאו שורות. העלו סריקה או הדביקו שם,מחיר");

  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const year = Number(monthKeyFromDate().slice(0, 4));
  const since = new Date(`${year}-01-01T00:00:00.000Z`);
  const monthStart = new Date(`${monthKeyFromDate()}-01T00:00:00.000Z`);
  const comparedInput: (QuoteInputLine & { productId: string | null })[] = [];
  for (const line of extracted) {
    const productId = matchQuoteName(line.name, products);
    let monthAvg: number | null = null;
    let yearAvg: number | null = null;
    let monthlyQty = 1;
    if (productId) {
      const rows = await prisma.goodsReceiptLine.findMany({
        where: { orderLine: { productId }, invoicePrice: { gt: 0 }, receivedQty: { gt: 0 } },
        include: { goodsReceipt: true },
      });
      const points: PurchasePoint[] = rows.map((row) => ({
        at: row.goodsReceipt.createdAt.toISOString().slice(0, 10),
        qty: row.receivedQty,
        unitPrice: row.invoicePrice,
      }));
      yearAvg = annualAveragePrice(points, year);
      const monthPoints = points.filter((point) => point.at >= monthStart.toISOString().slice(0, 10));
      monthAvg = monthPoints.length
        ? monthPoints.reduce((sum, point) => sum + point.unitPrice * point.qty, 0) /
          monthPoints.reduce((sum, point) => sum + point.qty, 0)
        : lastPurchasePrice(points);
      const yearQty = points.filter((point) => point.at >= since.toISOString().slice(0, 10)).reduce((sum, point) => sum + point.qty, 0);
      monthlyQty = yearQty > 0 ? yearQty / 12 : 1;
    }
    comparedInput.push({ name: line.name, offered: line.unitPrice, monthlyQty, monthAvg, yearAvg, productId });
  }
  const basket = compareQuoteBasket(comparedInput);
  const quote = await prisma.supplierQuote.create({
    data: {
      supplierName,
      fileName,
      lines: {
        create: basket.lines.map((line) => ({
          name: line.name,
          offered: line.offered,
          monthlyQty: line.monthlyQty,
          monthAvg: line.monthAvg,
          yearAvg: line.yearAvg,
          productId: comparedInput.find((row) => row.name === line.name)?.productId ?? null,
        })),
      },
    },
  });
  revalidatePath("/office/quotes");
  redirect(`/office/quotes?id=${quote.id}`);
}
