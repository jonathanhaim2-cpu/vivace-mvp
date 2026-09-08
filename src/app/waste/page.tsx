import { createWasteEntry, deleteWasteEntry } from "@/actions/waste";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel, monthRangeUtc, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { publicFileUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export default async function WastePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const session = await getAppSession();
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKeyFromDate();
  const { start, end } = monthRangeUtc(month);
  const entries = await prisma.wasteEntry.findMany({
    where: {
      occurredOn: { gte: start, lt: end },
      ...(session.isNetwork ? {} : { branchId: session.branchId ?? undefined }),
    },
    include: { branch: true, product: true },
    orderBy: { occurredOn: "desc" },
  });
  const products = await prisma.product.findMany({ include: { supplier: true }, orderBy: { name: "asc" } });
  const total = entries.reduce((sum, row) => sum + row.estimatedCost, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="דוח פחת" description="רישום יומי/שבועי עם הערכת עלות ממחירון. אפשר לצרף הערת קול." />

      <Card>
        <CardHeader>
          <CardTitle>סה״כ {monthLabel(month)}</CardTitle>
          <CardDescription>{formatIls(total)} · {entries.length} רישומים</CardDescription>
        </CardHeader>
      </Card>

      <form className="flex flex-wrap gap-2">
        <select name="month" defaultValue={month} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
          {recentMonthKeys().map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          הצגה
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>רישום פחת</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createWasteEntry} className="grid gap-3 sm:grid-cols-2">
            {session.isNetwork ? (
              <Field>
                <FieldLabel htmlFor="branchId">סניף</FieldLabel>
                <select
                  id="branchId"
                  name="branchId"
                  defaultValue={session.branchId ?? ""}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {session.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <input type="hidden" name="branchId" value={session.branchId ?? ""} />
            )}
            <Field>
              <FieldLabel htmlFor="occurredOn">תאריך</FieldLabel>
              <Input id="occurredOn" name="occurredOn" type="date" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="productId">מוצר (אופציונלי)</FieldLabel>
              <select id="productId" name="productId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="">ללא — רק הערה</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.supplier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="qty">כמות</FieldLabel>
              <Input id="qty" name="qty" type="number" min={0} step={1} defaultValue={1} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="notes">הערה</FieldLabel>
              <Textarea id="notes" name="notes" rows={2} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="voice">הערת קול (אופציונלי)</FieldLabel>
              <Input id="voice" name="voice" type="file" accept="audio/*" />
              <FieldDescription>נשמר מקומית. אין תמלול אוטומטי ב-MVP.</FieldDescription>
            </Field>
            <Button type="submit">שמירת פחת</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין פחת בחודש זה.</p>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} size="sm">
              <CardContent className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p>
                    {formatDate(entry.occurredOn)} · {entry.branch.name}
                    {entry.product ? ` · ${entry.product.name} × ${entry.qty}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {formatIls(entry.estimatedCost)}
                    {entry.notes ? ` · ${entry.notes}` : ""}
                  </p>
                  {entry.voiceFileName ? (
                    <audio controls className="mt-1 max-w-full" src={publicFileUrl(entry.voiceFileName)} />
                  ) : null}
                </div>
                <form action={deleteWasteEntry.bind(null, entry.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    מחיקה
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
