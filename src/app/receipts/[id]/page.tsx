import Link from "next/link";
import { notFound } from "next/navigation";
import { assignReceiptCategory, markForwardedToAccountant } from "@/actions/receipts";
import { CancelReceiptButton } from "@/components/receipts/cancel-receipt-button";
import { PriceActions } from "@/components/receipts/price-actions";
import { PriceChangeBadge, ReceiptStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { COMPANY, EXCEPTION_KIND, PRICE_CHANGE } from "@/lib/constants";
import { AUDIT_ACTIONS, firstAuditFor, formatActorLabel, isCancellableReceiptStatus } from "@/lib/audit";
import { ExceptionActions } from "@/components/exceptions/exception-actions";
import { billedAsLabel, exceptionKindLabel, exceptionStatusLabel } from "@/lib/credits";
import { expenseCategoryLabel, formatDateTime, formatIls, lineTotal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession, sessionCan } from "@/lib/session";
import { publicFileUrl } from "@/lib/uploads";
import { buildCreditWhatsAppText, buildWhatsAppUrl } from "@/lib/whatsapp";
import { resolveSupplierForBranch } from "@/lib/supplier-branch";
import { getSendToSuppliersEnabled, resolveOrderWhatsAppPhone } from "@/lib/whatsapp-routing";
import { cn } from "@/lib/utils";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAppSession();
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: {
      photos: true,
      order: { include: { supplier: { include: { branchLinks: true } }, branch: true } },
      lines: { include: { orderLine: { include: { product: true } } } },
      exceptionalItems: { where: { status: "OPEN" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!receipt) notFound();

  const submitLog = await firstAuditFor("GoodsReceipt", receipt.id, AUDIT_ACTIONS.RECEIPT_SUBMIT);
  const submittedBy = submitLog
    ? formatActorLabel(submitLog.actorName, submitLog.actorUsername)
    : "לא ידוע";
  const canCancel =
    sessionCan(session, "action.cancel_goods_receipt") &&
    session.isNetwork &&
    isCancellableReceiptStatus(receipt.status);

  const sendToSuppliers = await getSendToSuppliersEnabled();
  const resolvedSupplier = resolveSupplierForBranch(receipt.order.supplier, receipt.order.branchId);
  const creditWhatsAppPhone = resolveOrderWhatsAppPhone({
    sendToSuppliers,
    supplierPhone: resolvedSupplier.whatsappPhone,
  });

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
            {expenseCategoryLabel(receipt.accountId)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            הוגש ע״י {submittedBy}
            {submitLog ? ` ב־${formatDateTime(submitLog.createdAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReceiptStatusBadge status={receipt.status} />
          {canCancel ? <CancelReceiptButton receiptId={receipt.id} /> : null}
        </div>
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
          <AlertDescription>יש בקשת זיכוי פתוחה או דחיית שינוי מחיר. עד שהספק מאשר — זה מופיע במסמכים החריגים בדשבורד.</AlertDescription>
        </Alert>
      ) : null}

      {receipt.exceptionalItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>מסמכים חריגים פתוחים</CardTitle>
            <CardDescription>בקשות זיכוי, חוסר בלי זיכוי, ופריטים שסומנו כבדרך.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {receipt.exceptionalItems.map((item) => {
              const creditHref =
                item.kind === EXCEPTION_KIND.CREDIT_REQUEST
                  ? buildWhatsAppUrl(
                      creditWhatsAppPhone,
                      buildCreditWhatsAppText({
                        branch: receipt.order.branch,
                        supplierName: receipt.order.supplier.name,
                        productName: item.productName,
                        orderedQty: item.orderedQty,
                        receivedQty: item.receivedQty,
                        amountIls: item.amountIls,
                      }),
                    )
                  : null;
              return (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {exceptionKindLabel(item.kind)} · {exceptionStatusLabel(item.status)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ExceptionActions id={item.id} kind={item.kind} />
                    {creditHref ? (
                      <a href={creditHref} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
                        שליחת בקשת זיכוי בוואטסאפ
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
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
              <div
                key={line.id}
                className={
                  line.qtyMismatch ? "rounded-lg border border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/20" : "rounded-lg border p-3"
                }
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{ordered.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      הוזמן {ordered.qty} ב-{formatIls(ordered.unitPrice)} ({formatIls(orderedTotal)}) · התקבל{" "}
                      {line.receivedQty} ב-{formatIls(line.invoicePrice)} ({formatIls(invoiceTotal)})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {line.qtyMismatch ? (
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-950">
                          ? כמות שונה מההזמנה
                        </span>
                      ) : null}
                      {line.missing ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          חוסר / לא הגיע במלואו
                        </span>
                      ) : null}
                      {billedAsLabel(line.billedAs) ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{billedAsLabel(line.billedAs)}</span>
                      ) : null}
                      {line.wrongPrice ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs">מחיר שונה</span>
                      ) : null}
                      <PriceChangeBadge status={line.priceChangeStatus} />
                    </div>
                  </div>
                  {sessionCan(session, "action.edit_prices") && line.priceChangeStatus === PRICE_CHANGE.PENDING ? (
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
            <a key={photo.id} href={publicFileUrl(photo.fileName)} target="_blank" rel="noreferrer" className="block">
              {photo.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicFileUrl(photo.fileName)}
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
          <CardTitle>קטגוריה</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignReceiptCategory.bind(null, receipt.id)} className="flex flex-wrap items-end gap-2">
            <GroupedAccountSelect defaultValue={receipt.accountId} kinds={["EXPENSE"]} />
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
