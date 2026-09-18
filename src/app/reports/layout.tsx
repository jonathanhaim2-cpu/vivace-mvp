import { ReportsNav } from "@/components/reports/reports-nav";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <ReportsNav />
      </div>
      {children}
    </div>
  );
}
