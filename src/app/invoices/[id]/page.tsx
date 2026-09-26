import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, FileText, Hash, MapPin, Tag } from "lucide-react";
import { InvoiceDetailMenu, InvoiceEditSheet } from "@/components/invoices/invoice-detail-actions";
import { InvoiceDetailDocument } from "@/components/invoices/invoice-detail-document";
import { AiConfidenceTag, InvoiceStatusPill } from "@/components/invoices/invoice-status-pill";
import { expenseCategoryLabel, formatIls } from "@/lib/format";
import { deriveInvoiceListStatus, invoiceDateDisplay, invoiceDocumentNumber } from "@/lib/invoice-list-status";
import { photoDocumentTypeLabel } from "@/lib/constants";
import { invoiceBranchDisplayName } from "@/lib/invoice-branch";
import { photoDateKey, photoPeriodMonth, photoSupplierName } from "@/lib/invoice-filters";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { resolvedInvoiceBranchId } from "@/lib/purchase-fill";
import { getAppSession } from "@/lib/session";
import { publicFileUrl } from "@/lib/uploads";
import { toDateInputValue } from "@/lib/invoice-form";

export const dynamic = "force-dynamic";

function safeReturn(value: string | undefined) {
  if (!value || !value.startsWith("/invoices") || value.startsWith("//")) return "/invoices";
  return value;
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const backHref = safeReturn(query.return);
  const session = await getAppSession();
  const photo = await prisma.invoicePhoto.findUnique({
    where: { id },
    include: {
      branch: true,
      account: true,
      goodsReceipt: { include: { order: { include: { supplier: true, branch: true } } } },
    },
  });
  if (!photo) notFound();

  const branchId = resolvedInvoiceBranchId(photo);
  const supplier = photoSupplierName({
    supplierName: photo.goodsReceipt?.order.supplier.name ?? null,
    aiSupplierName: photo.aiSupplierName,
  });
  const dateKey = photoDateKey(photo);
  const amount = photo.amountIls ?? photo.aiTotalIls;
  const period = photoPeriodMonth({
    periodMonth: photo.periodMonth,
    createdAt: photo.createdAt,
    aiInvoiceDate: photo.aiInvoiceDate,
  });
  const status = deriveInvoiceListStatus({
    accountId: photo.accountId,
    branchId,
    approvalStatus: photo.approvalStatus,
    aiNetworkExpense: photo.aiNetworkExpense,
  });
  const branchName = invoiceBranchDisplayName(
    photo.branch?.name ?? photo.goodsReceipt?.order.branch.name ?? null,
    branchId,
  );
  const number = invoiceDocumentNumber(photo.originalName);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Link href={backHref} aria-label="חזרה" className="flex size-9 items-center justify-center rounded-full">
          <ArrowRight className="size-5" />
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">פרטי חשבונית</h1>
        <InvoiceDetailMenu
          photoId={photo.id}
          accountId={photo.accountId}
          canDelete={!photo.paid && !photo.sentToAccountant}
        />
      </div>

      <section className="rounded-2xl border bg-card px-4 py-5 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium">{supplier || "ללא שם ספק"}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{amount != null ? formatIls(amount) : "—"}</p>
        {photo.amountExVat != null && photo.vatAmount != null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            לפני מע״מ {formatIls(photo.amountExVat)} · מע״מ {formatIls(photo.vatAmount)}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-center gap-2">
          <InvoiceStatusPill status={status} />
          <AiConfidenceTag confidence={photo.aiConfidence} status={photo.aiStatus} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
        {(
          [
            ["סניף", status === "missing_branch" ? "חסר סניף" : branchName, MapPin],
            ["תאריך חשבונית", invoiceDateDisplay(dateKey), Calendar],
            ["מספר חשבונית", number, Hash],
            ["קטגוריה", photo.accountId ? expenseCategoryLabel(photo.accountId) : "ללא קטגוריה", Tag],
            ["סוג מסמך", photoDocumentTypeLabel(photo.documentType), FileText],
            ["חודש דיווח", monthLabel(period), Calendar],
          ] as const
        ).map(([label, value, Icon]) => (
          <div key={label} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="min-w-0 flex-1 truncate text-end text-sm font-medium">{value}</span>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
          </div>
        ))}
      </section>

      <InvoiceDetailDocument
        fileUrl={publicFileUrl(photo.fileName)}
        mimeType={photo.mimeType}
        originalName={photo.originalName}
      />

      <InvoiceEditSheet
        photoId={photo.id}
        accountId={photo.accountId}
        branchId={branchId}
        documentType={photo.documentType}
        periodMonth={period}
        classified={Boolean(photo.accountId)}
        invoiceDate={toDateInputValue(photo.aiInvoiceDate)}
        supplierName={supplier}
        amountIls={amount != null ? String(amount) : ""}
        note={photo.voiceNoteText ?? ""}
        vatIncluded={photo.vatIncluded}
        branches={session.branches.map((branch) => ({ id: branch.id, name: branch.name }))}
      />
    </div>
  );
}
