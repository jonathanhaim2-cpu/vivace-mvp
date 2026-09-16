"use client";

import { useMemo, useState } from "react";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountRollupRow } from "@/lib/accounts";
import { formatDate, formatIls } from "@/lib/format";
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
const OPEN_HINT = "לחיצה כפולה לפתיחה";

export function AccountRollup({
  rows,
  documents = EMPTY_DOCS,
}: {
  rows: AccountRollupRow[];
  documents?: AccountRollupDocument[];
}) {
  const expenses = rows.filter((row) => row.kind === "EXPENSE");
  const income = rows.filter((row) => row.kind === "INCOME");
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

  return (
    <div className="space-y-6">
      <RollupSection
        title="הוצאות"
        description="קטגוריות + סיכום לקטגוריית האב, לפי סדר כרטיסי הנה״ח"
        rows={expenses}
        canBrowse={canBrowse}
        onOpenLeaf={setOpenLeaf}
      />
      <RollupSection
        title='הכנסות ללא מע"מ'
        description="מדידה לכל כרטיס ולסיכום האב"
        rows={income}
        canBrowse={canBrowse}
        onOpenLeaf={setOpenLeaf}
      />
      <AccountInvoicesDialog
        open={openLeaf != null}
        onOpenChange={(next) => {
          if (!next) setOpenLeaf(null);
        }}
        title={openLeaf?.name ?? ""}
        documents={openDocs}
      />
    </div>
  );
}

function RollupSection({
  title,
  description,
  rows,
  canBrowse,
  onOpenLeaf,
}: {
  title: string;
  description: string;
  rows: AccountRollupRow[];
  canBrowse: boolean;
  onOpenLeaf: (leaf: { id: string; name: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.map((parent) => (
        <Card key={parent.id}>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{parent.name}</CardTitle>
                <CardDescription>סיכום {parent.children.length} כרטיסים</CardDescription>
              </div>
              <div className="text-end text-sm">
                <p className="font-medium">{formatIls(parent.amount)}</p>
                <p className="text-muted-foreground">{parent.documents} מסמכים</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {parent.children.map((child) => {
              const canOpen = canBrowse && child.documents > 0;
              return (
                <div
                  key={child.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
                    canOpen && "cursor-pointer select-none hover:bg-muted/50",
                  )}
                  onDoubleClick={() => {
                    if (canOpen) onOpenLeaf({ id: child.id, name: child.name });
                  }}
                  title={canOpen ? OPEN_HINT : undefined}
                >
                  <span>{child.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <DocumentCountBadge count={child.documents} canOpen={canOpen} />
                    <span className="text-muted-foreground">{formatIls(child.amount)}</span>
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DocumentCountBadge({ count, canOpen }: { count: number; canOpen: boolean }) {
  if (count <= 0) {
    return <span className="text-muted-foreground">{count}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
        canOpen
          ? "cursor-pointer bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
      title={canOpen ? OPEN_HINT : undefined}
      aria-label={canOpen ? `${count} מסמכים, ${OPEN_HINT}` : `${count} מסמכים`}
    >
      {count}
    </span>
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
