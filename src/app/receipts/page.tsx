import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AUDIT_ACTIONS, firstAuditsFor, formatActorLabel } from "@/lib/audit";
import { RECEIPT_STATUSES } from "@/lib/constants";
import { formatDateTime, receiptStatusLabel } from "@/lib/format";
import { monthLabel, monthRangeUtc, parseMonthParam, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { getAppSession, sessionCan } from "@/lib/session";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; q?: string; branch?: string }>;
}) {
  const session = await getAppSession();
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const status = params.status?.trim() ?? "";
  const q = params.q?.trim() ?? "";
  const branchId = params.branch?.trim() ?? "";
  const range = month ? monthRangeUtc(month) : null;

  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      ...(session.isNetwork
        ? branchId
          ? { order: { branchId } }
          : {}
        : { order: { branchId: session.branchId ?? undefined } }),
      ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
      ...(status ? { status } : {}),
      ...(q ? { order: { supplier: { name: { contains: q } } } } : {}),
    },
    include: {
      order: { include: { supplier: true, branch: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const actors = await firstAuditsFor(
    "GoodsReceipt",
    receipts.map((receipt) => receipt.id),
    AUDIT_ACTIONS.RECEIPT_SUBMIT,
  );

  return (
    <div>
      <PageHeader
        title="קליטת סחורה"
        description="השוואה מול הזמנה, סימון חוסרים וסטיות מחיר, ואישור משרד הרשת למחירון חדש."
        action={
          sessionCan(session, "nav.activity")
            ? { href: "/settings/activity", label: "לוג פעילות" }
            : undefined
        }
      />
      <FilterBar>
        <CompactField label="חודש" htmlFor="receipts-month">
          <NativeSelect id="receipts-month" name="month" defaultValue={month ?? "all"}>
            <option value="all">כל החודשים</option>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="סטטוס" htmlFor="receipts-status">
          <NativeSelect id="receipts-status" name="status" defaultValue={status}>
            <option value="">הכל</option>
            {Object.values(RECEIPT_STATUSES).map((value) => (
              <option key={value} value={value}>
                {receiptStatusLabel(value)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        {session.isNetwork ? (
          <CompactField label="סניף" htmlFor="receipts-branch">
            <NativeSelect id="receipts-branch" name="branch" defaultValue={branchId}>
              <option value="">כל הסניפים</option>
              {session.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
        ) : null}
        <CompactField label="חיפוש" htmlFor="receipts-q" grow>
          <Input id="receipts-q" name="q" defaultValue={q} placeholder="שם ספק" />
        </CompactField>
      </FilterBar>
      {receipts.length === 0 ? (
        <EmptyState
          title="אין קליטות"
          description={month ? `אין קליטות ב־${monthLabel(month)} לפי הסינון.` : "פתחו הזמנה שנשלחה וקלטו מולה את הסחורה."}
          action={{ href: "/orders", label: "אל ההזמנות" }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ספק</TableHead>
              <TableHead>סניף</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>הוגש ע״י</TableHead>
              <TableHead>שורות</TableHead>
              <TableHead>סטטוס</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => {
              const actor = actors.get(receipt.id);
              return (
                <TableRow key={receipt.id}>
                  <TableCell>
                    <Link href={`/receipts/${receipt.id}`} className="font-medium hover:underline">
                      {receipt.order.supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{receipt.order.branch.name}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(receipt.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {actor ? formatActorLabel(actor.actorName, actor.actorUsername) : "לא ידוע"}
                  </TableCell>
                  <TableCell>{receipt.lines.length}</TableCell>
                  <TableCell>
                    <ReceiptStatusBadge status={receipt.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
