import Link from "next/link";
import { notFound } from "next/navigation";
import { assignReceiptCategory, markForwardedToAccountant } from "@/actions/receipts";
import { PriceActions } from "@/components/receipts/price-actions";
import { PriceChangeBadge, ReceiptStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY, EXPENSE_CATEGORIES, PRICE_CHANGE } from "@/lib/constants";
import {
  expenseCategoryLabel,
  formatDateTime,
  formatIls,
  lineTotal,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAppSession();
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: {
      photos: true,
      order: { include: { supplier: true, branch: true } },
      lines: { include: { orderLine: { include: { product: true } } } },
    },
  });
  if (!receipt) notFound();

  const mailto = `mailto:${COMPANY.accountantEmail}?subject=${encodeURIComponent(
    `חשבוניות ${COMPANY.name} · ${receipt.order.supplier.name} · ${receipt.order.branch.name}`,
  )}&body=${encodeURIComponent(
    `קליטה ממתינה להעברה להנהלת חשבונות.\nספק: ${receipt.order.supplier.name}\nסניף: ${receipt.order.branch.name}\nסטטוס: ${receipt.status}\n`,
  )}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">קליטה · {receipt.order.supplier.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {receipt.order.branch.name} · {formatDateTime(receipt.createdAt)} ·{" "}
            {expenseCategoryLabel(receipt.expenseCategory)}
          </p>
        </div>
        <ReceiptStatusBadge status={receipt.status} />
      </div>

      {receipt.status === "PENDING_PRICE_APPROVAL" ? (
        <Alert>
          <AlertTitle>ממתין לאישור משרד הרשת</AlertTitle>
          <AlertDescription>
            לפחות מוצר אחד הגיע במחיר שונה מהמוסכם. אישור יהפוך את המחיר למחירון החדש. דחייה תסמן שנדרשת בקשת זיכוי.
          </AlertDescription>
        </Alert>
      ) : null}

      {receipt.status === "CREDIT_NEEDED" ? (
        <Alert variant="destructive">
          <AlertTitle>נדרשת בקשת זיכוי</AlertTitle>
          <AlertDescription>שינוי המחיר נדחה. יש לבקש זיכוי מהספק מחוץ למערכת ב-MVP זה.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>השוואה מול הזמנה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {receipt.lines.map((line) => {
            const ordered = line.orderLine;
            const orderedTotal = lineTotal(ordered.qty, ordered.unitPrice, ordered.discountPercent);
            const invoiceTotal = line.receivedQty * line.invoicePrice;
            return (
              <div key={line.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{ordered.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      הוזמן {ordered.qty} ב-{formatIls(ordered.unitPrice)} ({formatIls(orderedTotal)}) · התקבל{" "}
                      {line.receivedQty} ב-{formatIls(line.invoicePrice)} ({formatIls(invoiceTotal)})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {line.missing ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          חוסר / לא הגיע במלואו
                        </span>
                      ) : null}
                      {line.wrongPrice ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs">מחיר שונה</span>
                      ) : null}
                      <PriceChangeBadge status={line.priceChangeStatus} />
                    </div>
                  </div>
                  {session.isNetwork && line.priceChangeStatus === PRICE_CHANGE.PENDING ? (
                    <PriceActions lineId={line.id} />
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>צילומי מסמך</CardTitle>
          <CardDescription>{receipt.notes || "ללא הערות קליטה"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {receipt.photos.map((photo) => (
            <a key={photo.id} href={`/uploads/${photo.fileName}`} target="_blank" rel="noreferrer" className="block">
              {photo.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/uploads/${photo.fileName}`}
                  alt={photo.originalName}
                  className="h-56 w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex h-56 items-center justify-center rounded-lg border bg-muted text-sm">
                  {photo.originalName}
                </div>
              )}
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>העברה להנהלת חשבונות</CardTitle>
          <CardDescription>
            סטאב MVP: סימון כבתור + קישור מייל או הורדת ZIP. אין סנכרון תיבת דואר.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <form action={markForwardedToAccountant.bind(null, receipt.id)}>
            <Button type="submit" variant="outline">
              {receipt.forwardedToAccountant ? "סומן כבתור" : "סמן כבתור להנה״ח"}
            </Button>
          </form>
          <a href={mailto} className={cn(buttonVariants())}>
            פתיחת מייל להנה״ח
          </a>
          <a href={`/api/receipts/${receipt.id}/zip`} className={cn(buttonVariants({ variant: "secondary" }))}>
            הורדת ZIP של הצילומים
          </a>
          {receipt.forwardedAt ? (
            <p className="text-xs text-muted-foreground">סומן ב-{formatDateTime(receipt.forwardedAt)}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>קטגוריית הוצאה</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignReceiptCategory.bind(null, receipt.id)} className="flex flex-wrap items-end gap-2">
            <select
              name="expenseCategory"
              defaultValue={receipt.expenseCategory ?? "FOOD"}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              עדכון קטגוריה
            </Button>
          </form>
        </CardContent>
      </Card>

      <Link href={`/orders/${receipt.orderId}`} className={cn(buttonVariants({ variant: "ghost" }))}>
        חזרה להזמנה
      </Link>
    </div>
  );
}
