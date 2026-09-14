import { NextResponse } from "next/server";
import { previousMonthKey } from "@/lib/months";
import { buildReportTable, reportToXlsxBuffer, type ReportKind } from "@/lib/report-export";

export const dynamic = "force-dynamic";

const KINDS: ReportKind[] = ["monthly", "waste", "ap", "foodcost", "anomalies"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const report = url.searchParams.get("report") as ReportKind | null;
  const monthParam = url.searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : previousMonthKey();
  if (!report || !KINDS.includes(report)) {
    return NextResponse.json({ error: "סוג דוח לא חוקי" }, { status: 400 });
  }
  const table = await buildReportTable(report, month);
  const buffer = reportToXlsxBuffer(table);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${table.filename}"`,
    },
  });
}
