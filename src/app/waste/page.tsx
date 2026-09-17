import { createWasteEntry, deleteWasteEntry } from "@/actions/waste";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ReportExportButtons } from "@/components/report-export-buttons";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel, monthRangeUtc, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { publicFileUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export default async function WastePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; branch?: string }>;
}) {
  const session = await getAppSession();
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : monthKeyFromDate();
  const branchId = params.branch?.trim() ?? "";
  const { start, end } = monthRangeUtc(month);
  const entries = await prisma.wasteEntry.findMany({
    where: {
      occurredOn: { gte: start, lt: end },
      ...(session.isNetwork
        ? branchId
          ? { branchId }
          : {}
        : { branchId: session.branchId ?? undefined }),
    },
    include: { branch: true, product: true },
    orderBy: { occurredOn: "desc" },
  });
  const products = await prisma.product.findMany({ include: { supplier: true }, orderBy: { name: "asc" } });
  const total = entries.reduce((sum, row) => sum + row.estimatedCost, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="דוח פחת" description="רישום יומי/שבועי עם הערכת עלות ממחירון. אפשר לצרף הערת קול." />
      <p className="text-sm text-muted-foreground">
        פחת יומי ומכולת נרשמים כאן (stub ללא ML) ונכנסים לחישוב תקן אחרי ספירת סוף חודש.
      </p>
      <FilterBar submitLabel="הצגה">
        <CompactField label="חודש" htmlFor="waste-month">
          <NativeSelect id="waste-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        {session.isNetwork ? (
          <CompactField label="סניף" htmlFor="waste-branch">
            <NativeSelect id="waste-branch" name="branch" defaultValue={branchId}>
              <option value="">כל הסניפים</option>
              {session.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
        ) : null}
      </FilterBar>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          סה״כ {monthLabel(month)}: {formatIls(total)} · {entries.length} רישומים
        </p>
        <ReportExportButtons report="waste" month={month} />
      </div>

      {!session.branchId && session.branches.length === 0 ? (
        <EmptyState
          title="אין סניף"
          description="פחת משויך לסניף. הוסיפו סניף בהגדרות ואז חזרו לדוח."
          action={{ href: "/settings", label: "הוספת סניף" }}
        />
      ) : (
      <CompactPanel title="רישום פחת">
          <CompactForm action={createWasteEntry}>
            {session.isNetwork ? (
              <CompactField label="סניף" htmlFor="branchId">
                <NativeSelect id="branchId" name="branchId" defaultValue={session.branchId ?? ""}>
                  {session.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </NativeSelect>
              </CompactField>
            ) : (
              <input type="hidden" name="branchId" value={session.branchId ?? ""} />
            )}
            <CompactField label="תאריך" htmlFor="occurredOn">
              <Input id="occurredOn" name="occurredOn" type="date" required />
            </CompactField>
            <CompactField label="מוצר" htmlFor="productId" grow>
              <NativeSelect id="productId" name="productId">
                <option value="">ללא — רק הערה</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.supplier.name}
                  </option>
                ))}
              </NativeSelect>
            </CompactField>
            <CompactField label="כמות" htmlFor="qty">
              <Input id="qty" name="qty" type="number" min={0} step={1} defaultValue={1} />
            </CompactField>
            <CompactField label="הערה" htmlFor="notes" grow>
              <Input id="notes" name="notes" />
            </CompactField>
            <CompactField label="הערת קול" htmlFor="voice" hint="נשמר מקומית. אין תמלול אוטומטי ב-MVP.">
              <Input id="voice" name="voice" type="file" accept="audio/*" />
            </CompactField>
            <Button type="submit">שמירת פחת</Button>
          </CompactForm>
      </CompactPanel>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין פחת בחודש זה.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>תאריך</TableHead>
              <TableHead>סניף</TableHead>
              <TableHead>פריט</TableHead>
              <TableHead>עלות</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">{formatDate(entry.occurredOn)}</TableCell>
                <TableCell>{entry.branch.name}</TableCell>
                <TableCell>
                  <p>{entry.product ? `${entry.product.name} × ${entry.qty}` : "הערה בלבד"}</p>
                  {entry.notes ? <p className="text-xs text-muted-foreground">{entry.notes}</p> : null}
                  {entry.voiceFileName ? (
                    <audio controls className="mt-1 max-w-full" src={publicFileUrl(entry.voiceFileName)} />
                  ) : null}
                </TableCell>
                <TableCell>{formatIls(entry.estimatedCost)}</TableCell>
                <TableCell className="text-end">
                  <form action={deleteWasteEntry.bind(null, entry.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      מחיקה
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
