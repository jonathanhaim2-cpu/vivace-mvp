import Link from "next/link";
import { closeChargeRequest, matchCreditNote } from "@/actions/supplier-requests";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { PHOTO_DOCUMENT_TYPE } from "@/lib/constants";
import { formatDate, formatIls } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { requestKindLabel } from "@/lib/supplier-requests";

export const dynamic = "force-dynamic";

export default async function OpenCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ history?: string }>;
}) {
  const session = await getAppSession();
  const { history } = await searchParams;
  const showHistory = history === "1";
  const branchFilter = session.isNetwork ? {} : { branchId: session.branchId ?? "__none__" };
  const [requests, creditNotes] = await Promise.all([
    prisma.supplierRequest.findMany({
      where: {
        ...branchFilter,
        ...(showHistory ? {} : { status: "OPEN" }),
      },
      include: { supplier: true, branch: true, lines: true, order: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoicePhoto.findMany({
      where: { documentType: PHOTO_DOCUMENT_TYPE.CREDIT_NOTE, isDuplicate: false },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, originalName: true, aiSupplierName: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="זיכויים פתוחים"
        description="בקשת זיכוי נשארת פתוחה עד שמצמידים אליה תעודת זיכוי. בקשות חיוב מוצגות עם תווית נפרדת."
      />
      <FilterBar>
        <CompactField label="תצוגה" htmlFor="credits-history">
          <NativeSelect id="credits-history" name="history" defaultValue={showHistory ? "1" : "0"}>
            <option value="0">פתוחים</option>
            <option value="1">כולל היסטוריה</option>
          </NativeSelect>
        </CompactField>
      </FilterBar>
      {requests.length === 0 ? (
        <EmptyState title="אין בקשות" description="פער בקליטה ייצור כאן בקשת זיכוי או חיוב." />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {requestKindLabel(request.kind)} · {request.supplier.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {request.branch.name}
                    {request.documentNumber ? ` · מסמך ${request.documentNumber}` : ""}
                    {request.orderId ? ` · הזמנה ${request.orderId.slice(-6)}` : ""}
                    {request.deliveryDate ? ` · ${formatDate(request.deliveryDate)}` : ""}
                    {request.status === "CLOSED" ? " · סגור" : " · פתוח"}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {formatIls(request.lines.reduce((sum, line) => sum + (line.amountDiff ?? 0), 0))}
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {request.lines.map((line) => (
                  <li key={line.id}>
                    {line.productName}: הוזמן {line.orderedQty} · התקבל {line.receivedQty}
                  </li>
                ))}
              </ul>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-xs">{request.previewBody}</pre>
              {request.status === "OPEN" && request.kind === "CREDIT" ? (
                <form action={matchCreditNote.bind(null, request.id)} className="mt-3 grid gap-2 sm:grid-cols-2">
                  <CompactField label="תעודת זיכוי קיימת" htmlFor={`note-${request.id}`}>
                    <NativeSelect id={`note-${request.id}`} name="creditNotePhotoId" defaultValue="">
                      <option value="">בחירה מהמסמכים</option>
                      {creditNotes.map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.originalName}
                          {note.aiSupplierName ? ` · ${note.aiSupplierName}` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                  </CompactField>
                  <CompactField label="או העלאה" htmlFor={`upload-${request.id}`}>
                    <Input id={`upload-${request.id}`} name="photo" type="file" accept="image/*,application/pdf" />
                  </CompactField>
                  <Button type="submit" size="sm">
                    שיוך וסגירה
                  </Button>
                </form>
              ) : null}
              {request.status === "OPEN" && request.kind === "CHARGE" ? (
                <form action={closeChargeRequest.bind(null, request.id)} className="mt-3">
                  <Button type="submit" size="sm" variant="outline">
                    סימון בקשת החיוב כטופלה
                  </Button>
                </form>
              ) : null}
              {request.goodsReceiptId ? (
                <Link href={`/receipts/${request.goodsReceiptId}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                  למסמך הקליטה
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
