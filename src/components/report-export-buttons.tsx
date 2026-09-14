import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReportExportButtons({
  report,
  month,
}: {
  report: "monthly" | "waste" | "ap" | "foodcost" | "anomalies";
  month?: string;
}) {
  const qs = new URLSearchParams({ report });
  if (month) qs.set("month", month);
  const excelHref = `/api/export/xlsx?${qs.toString()}`;
  const pdfHref = `/reports/print?${qs.toString()}&autoprint=1`;
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Link href={excelHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        ייצוא Excel
      </Link>
      <Link href={pdfHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        ייצוא PDF
      </Link>
    </div>
  );
}
