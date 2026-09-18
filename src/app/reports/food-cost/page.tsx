import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFoodCostSuppliers } from "@/lib/food-cost-drill";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function FoodCostReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKeyFromDate();
  const rows = await getFoodCostSuppliers(month);

  return (
    <div className="space-y-4">
      <PageHeader
        title="עלות רכש · מזון"
        description={`לחיצה על ספק פותחת חשבוניות והזמנה/צילום. ${monthLabel(month)}.`}
      />
      <FilterBar submitLabel="הצגה">
        <CompactField label="חודש" htmlFor="fc-month">
          <NativeSelect id="fc-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין עלויות מזון בחודש זה.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ספק</TableHead>
              <TableHead>מסמכים</TableHead>
              <TableHead>סה״כ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <Link href={`/reports/food-cost/${encodeURIComponent(row.key)}?month=${month}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>{row.documents}</TableCell>
                <TableCell>{formatIls(row.amountIls)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
