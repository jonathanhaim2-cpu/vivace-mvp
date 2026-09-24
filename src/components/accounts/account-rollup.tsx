"use client";

import { useMemo, useState } from "react";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountRollupRow } from "@/lib/accounts";
import { formatDate, formatIls } from "@/lib/format";
import { presentPnl } from "@/lib/pnl";
import { cn } from "@/lib/utils";

export type AccountRollupDocument = {
  id: string;
  accountId: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
  invoiceDate: string | null;
  supplierName: string | null;
  amountIls: number | null;
};

const EMPTY_DOCS: AccountRollupDocument[] = [];

export function AccountRollup({
  rows,
  documents = EMPTY_DOCS,
}: {
  rows: AccountRollupRow[];
  documents?: AccountRollupDocument[];
}) {
  const [openLeaf, setOpenLeaf] = useState<{ id: string; name: string } | null>(null);

  const docsByAccount = useMemo(() => {
    const map = new Map<string, AccountRollupDocument[]>();
    for (const doc of documents) {
      const list = map.get(doc.accountId);
      if (list) list.push(doc);
      else map.set(doc.accountId, [doc]);
    }
    return map;
  }, [documents]);

  const openDocs = openLeaf ? (docsByAccount.get(openLeaf.id) ?? []) : [];
  const canBrowse = documents.length > 0;

  const figures = presentPnl(rows).figures;

  return (
    <article className="pnl-sheet space-y-4">
      <header className="pnl-heading">
        <h2 className="font-heading text-lg font-semibold">דוח רווח והפסד</h2>
        <p className="text-xs text-muted-foreground">סכומים ומספר מסמכים זהים לחישוב הקיים. לחיצה על שורה פותחת את המסמכים.</p>
      </header>
      {(["EXPENSE", "INCOME"] as const).map((kind) => {
        const title = kind === "EXPENSE" ? "הוצאות" : 'הכנסות ללא מע"מ';
        const section = figures.filter((figure) => figure.kind === kind);
        if (section.length === 0) return null;
        return (
          <section key={kind}>
            <h3 className="mb-1 text-sm font-semibold">{title}</h3>
            <table className="pnl-table w-full text-sm">
              <tbody>
                {section.map((figure) => {
                  const canOpen = canBrowse && figure.depth === 1 && figure.documents > 0;
                  return (
                    <tr key={figure.id} className={figure.depth === 0 ? "pnl-parent" : "pnl-line"}>
                      <td className={cn("py-1", figure.depth === 1 && "ps-4")}>{figure.name}</td>
                      <td className="w-16 py-1 text-end tabular-nums text-muted-foreground">{figure.documents}</td>
                      <td className="w-28 py-1 text-end tabular-nums">
                        {canOpen ? (
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            onClick={() => setOpenLeaf({ id: figure.id, name: figure.name })}
                          >
                            {formatIls(figure.amount)}
                          </button>
                        ) : (
                          formatIls(figure.amount)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
      <AccountInvoicesDialog
        open={openLeaf != null}
        onOpenChange={(next) => {
          if (!next) setOpenLeaf(null);
        }}
        title={openLeaf?.name ?? ""}
        documents={openDocs}
      />
    </article>
  );
}

function AccountInvoicesDialog({
  open,
  onOpenChange,
  title,
  documents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  documents: AccountRollupDocument[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg" dir="rtl">
        <DialogHeader className="pe-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {documents.length === 1 ? "מסמך אחד ששובץ לכרטיס זה" : `${documents.length} מסמכים ששובצו לכרטיס זה`}
          </DialogDescription>
        </DialogHeader>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין מסמכים להצגה בכרטיס זה.</p>
        ) : (
          <ul className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto">
            {documents.map((doc) => (
              <li key={doc.id}>
                <InvoicePreviewRow document={doc} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoicePreviewRow({ document }: { document: AccountRollupDocument }) {
  const isImage = document.mimeType.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf" || document.originalName.toLowerCase().endsWith(".pdf");
  const dateLabel = displayDocDate(document);
  const supplier = document.supplierName?.trim() || document.originalName;
  const openLabel = isPdf ? "פתיחת PDF" : isImage ? "פתיחת תמונה" : "פתיחת קובץ";

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
      <a
        href={document.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0"
        aria-label={openLabel}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={document.fileUrl}
            alt={document.originalName}
            className="size-16 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex size-16 flex-col items-center justify-center gap-1 rounded-lg border bg-muted text-[11px] text-muted-foreground">
            <FileTextIcon className="size-5" />
            {isPdf ? "PDF" : "קובץ"}
          </div>
        )}
      </a>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-medium">{supplier}</p>
        <p className="text-xs text-muted-foreground">
          {dateLabel}
          {document.amountIls != null ? ` · ${formatIls(document.amountIls)}` : ""}
        </p>
        {document.supplierName?.trim() && document.originalName !== document.supplierName ? (
          <p className="truncate text-xs text-muted-foreground">{document.originalName}</p>
        ) : null}
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {openLabel}
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
    </div>
  );
}

function displayDocDate(document: AccountRollupDocument) {
  if (document.invoiceDate) {
    const parsed = new Date(document.invoiceDate);
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
    return document.invoiceDate;
  }
  return formatDate(document.createdAt);
}
