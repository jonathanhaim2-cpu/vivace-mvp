import { updateInvoiceCategory } from "@/actions/invoices";
import { AuditInfoButton } from "@/components/audit-info-button";
import { BranchSelect, type BranchOption } from "@/components/branches/branch-select";
import { DiscardInvoiceButton } from "@/components/invoices/discard-invoice-button";
import { InvoicePreviewButton } from "@/components/invoices/invoice-preview-button";
import { DocumentTypeBadge, DocumentTypeSelect } from "@/components/invoices/document-type-control";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isLowConfidence } from "@/lib/ai";
import { expenseCategoryLabel, formatDate, formatIls } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { publicFileUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export type ClassifiedInvoiceRow = {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  createdAt: Date;
  periodMonth: string | null;
  accountId: string;
  amountIls: number | null;
  aiTotalIls: number | null;
  aiConfidence: number | null;
  aiStatus: string | null;
  supplierName: string | null;
  auditStamp: string;
  branchId: string | null;
  branchName: string | null;
  documentType: string;
  paid: boolean;
  sentToAccountant: boolean;
};

export function ClassifiedInvoiceTable({
  rows,
  branches,
  emptyTitle,
  emptyDescription,
}: {
  rows: ClassifiedInvoiceRow[];
  branches: BranchOption[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>תאריך</TableHead>
          <TableHead>קובץ</TableHead>
          <TableHead>סוג</TableHead>
          <TableHead>קטגוריה</TableHead>
          <TableHead>סניף</TableHead>
          <TableHead>סכום</TableHead>
          <TableHead>AI</TableHead>
          <TableHead>פעולות</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const amount = row.amountIls ?? row.aiTotalIls;
          return (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span>{formatDate(row.createdAt)}</span>
                  {row.periodMonth ? (
                    <span className="text-xs text-muted-foreground">{monthLabel(row.periodMonth)}</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="max-w-[14rem]">
                <div className="flex items-start gap-0.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={row.originalName}>
                      {row.originalName}
                    </p>
                    {row.supplierName ? (
                      <p className="truncate text-xs text-muted-foreground" title={row.supplierName}>
                        {row.supplierName}
                      </p>
                    ) : null}
                  </div>
                  <AuditInfoButton stamp={row.auditStamp} />
                </div>
              </TableCell>
              <TableCell>
                <DocumentTypeBadge value={row.documentType} />
              </TableCell>
              <TableCell className="max-w-[12rem] whitespace-normal">
                <p className="font-medium">{expenseCategoryLabel(row.accountId)}</p>
              </TableCell>
              <TableCell className={row.branchName ? "" : "text-amber-800"}>
                {row.branchName ?? "ללא סניף"}
              </TableCell>
              <TableCell>{amount != null ? formatIls(amount) : "—"}</TableCell>
              <TableCell>
                <AiConfidenceBadge confidence={row.aiConfidence} status={row.aiStatus} />
              </TableCell>
              <TableCell className="min-w-[16rem] whitespace-normal">
                <div className="flex flex-wrap items-center gap-2">
                  <InvoicePreviewButton
                    fileUrl={publicFileUrl(row.fileName)}
                    originalName={row.originalName}
                    mimeType={row.mimeType}
                  />
                  <form action={updateInvoiceCategory.bind(null, row.id)} className="flex min-w-[12rem] flex-1 flex-wrap items-center gap-2">
                    <GroupedAccountSelect defaultValue={row.accountId} />
                    <DocumentTypeSelect defaultValue={row.documentType} className="w-[10rem]" />
                    <BranchSelect
                      branches={branches}
                      defaultValue={row.branchId}
                      required={!row.branchId}
                      allowEmpty={Boolean(row.branchId)}
                      emptyLabel="סניף"
                    />
                    {row.periodMonth ? <input type="hidden" name="periodMonth" value={row.periodMonth} /> : null}
                    <Button type="submit" size="sm" variant="outline">
                      שינוי
                    </Button>
                  </form>
                  {!row.paid && !row.sentToAccountant ? (
                    <DiscardInvoiceButton photoId={row.id} accountId={row.accountId} />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function AiConfidenceBadge({ confidence, status }: { confidence: number | null; status: string | null }) {
  if (confidence == null && status !== "CONFIRMED") return <span className="text-muted-foreground">—</span>;
  const low = isLowConfidence(confidence);
  const percent = confidence != null ? `${Math.round(confidence * 100)}%` : null;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium",
        low
          ? "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100"
          : "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100",
      )}
    >
      {status === "CONFIRMED" ? "אושר AI" : "AI"}
      {percent ? ` · ${percent}` : ""}
    </span>
  );
}
