import Link from "next/link";
import { PrintOnLoad } from "@/components/print-on-load";
import { buttonVariants } from "@/components/ui/button";
import { previousMonthKey } from "@/lib/months";
import { buildReportTable, formatReportCell, type ReportKind } from "@/lib/report-export";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KINDS: ReportKind[] = ["monthly", "waste", "ap", "foodcost", "anomalies"];

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; month?: string; autoprint?: string }>;
}) {
  const { report: rawReport, month: monthParam, autoprint } = await searchParams;
  const report = KINDS.includes(rawReport as ReportKind) ? (rawReport as ReportKind) : "monthly";
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : previousMonthKey();
  const table = await buildReportTable(report, month);

  return (
    <div className="space-y-6">
      <PrintOnLoad enabled={autoprint === "1"} />
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{table.title}</h1>
          <p className="text-sm text-muted-foreground">הדפסה / שמירה כ-PDF דרך הדיאלוג של הדפדפן.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/export/xlsx?report=${report}&month=${month}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Excel
          </Link>
          <Link href="/reports" className={cn(buttonVariants({ variant: "ghost" }))}>
            חזרה לדוחות
          </Link>
        </div>
      </div>

      {table.sheets.map((item) => (
        <section key={item.name} className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">{item.name}</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {(item.rows[0] ?? []).map((cell) => (
                    <th key={String(cell)} className="px-3 py-2 text-start font-medium">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.rows.slice(1).map((row, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={`${item.name}-${index}-${cellIndex}`} className="px-3 py-2">
                        {typeof cell === "number" && cellIndex > 0 ? formatReportCell(cell) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
