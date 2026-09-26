import {
  PHOTO_DOCUMENT_TYPES,
  isPhotoDocumentType,
  parsePhotoDocumentType,
  photoDocumentTypeLabel,
  type PhotoDocumentType,
} from "@/lib/constants";
import { monthKeyFromDate, resolvedPeriodMonth } from "@/lib/months";
import { matchesInvoiceBranchFilter } from "@/lib/invoice-branch";
import { isMissingInvoiceBranch } from "@/lib/invoice-list-status";

export const INVOICE_STATUS_FILTERS = [
  { value: "all", label: "הכל" },
  { value: "awaiting_approval", label: "ממתין לאישור" },
  { value: "pending", label: "ממתין לסיווג" },
  { value: "classified", label: "משובץ" },
  { value: "missing_branch", label: "חסר סניף" },
] as const;

export type InvoiceStatusFilter = (typeof INVOICE_STATUS_FILTERS)[number]["value"];

export const INVOICE_DOCUMENT_TYPE_FILTERS = [
  { value: "all", label: "הכול" },
  ...PHOTO_DOCUMENT_TYPES,
] as const;

export type InvoiceDocumentTypeFilter = (typeof INVOICE_DOCUMENT_TYPE_FILTERS)[number]["value"];

export type InvoiceListFilters = {
  month: string;
  from: string;
  to: string;
  category: string;
  supplier: string;
  branch: string;
  status: InvoiceStatusFilter;
  documentType: InvoiceDocumentTypeFilter;
  q: string;
};

export type InvoiceFilterPhoto = {
  accountId: string | null;
  originalName: string;
  fileName: string;
  periodMonth: string | null;
  createdAt: Date;
  amountIls: number | null;
  aiTotalIls: number | null;
  aiInvoiceDate: string | null;
  aiSupplierName: string | null;
  supplierName: string | null;
  branchId: string | null;
  documentType: string | null;
  approvalStatus?: string | null;
  aiNetworkExpense?: boolean | null;
};

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseInvoiceFilters(params: {
  month?: string;
  from?: string;
  to?: string;
  category?: string;
  supplier?: string;
  branch?: string;
  status?: string;
  documentType?: string;
  q?: string;
}): InvoiceListFilters {
  const monthRaw = params.month?.trim() ?? "";
  const statusRaw = params.status?.trim() ?? "";
  const status: InvoiceStatusFilter = INVOICE_STATUS_FILTERS.some((item) => item.value === statusRaw)
    ? (statusRaw as InvoiceStatusFilter)
    : "all";
  const documentTypeRaw = params.documentType?.trim() ?? "";
  const documentType: InvoiceDocumentTypeFilter =
    documentTypeRaw === "all" || isPhotoDocumentType(documentTypeRaw) ? documentTypeRaw : "all";
  const from = DATE_RE.test(params.from?.trim() ?? "") ? params.from!.trim() : "";
  const to = DATE_RE.test(params.to?.trim() ?? "") ? params.to!.trim() : "";

  return {
    month: monthRaw === "all" ? "all" : MONTH_RE.test(monthRaw) ? monthRaw : monthKeyFromDate(),
    from,
    to,
    category: params.category?.trim() ?? "",
    supplier: params.supplier?.trim() ?? "",
    branch: params.branch?.trim() ?? "",
    status,
    documentType,
    q: params.q?.trim() ?? "",
  };
}

export function photoPeriodMonth(
  photo: Pick<InvoiceFilterPhoto, "periodMonth" | "createdAt" | "aiInvoiceDate">,
) {
  return resolvedPeriodMonth(photo.periodMonth, photo.aiInvoiceDate) ?? monthKeyFromDate(photo.createdAt);
}

export function photoDateKey(photo: Pick<InvoiceFilterPhoto, "createdAt" | "aiInvoiceDate">) {
  const invoiceDate = photo.aiInvoiceDate?.trim() ?? "";
  if (DATE_RE.test(invoiceDate)) return invoiceDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(photo.createdAt);
}

export function photoSupplierName(photo: Pick<InvoiceFilterPhoto, "supplierName" | "aiSupplierName">) {
  return (photo.supplierName || photo.aiSupplierName || "").trim();
}

export function uniqueSupplierNames(photos: InvoiceFilterPhoto[]) {
  const names = new Set<string>();
  for (const photo of photos) {
    const name = photoSupplierName(photo);
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "he"));
}

export function uniquePeriodMonths(photos: InvoiceFilterPhoto[], recentKeys: string[]) {
  const keys = new Set(recentKeys);
  for (const photo of photos) {
    keys.add(photoPeriodMonth(photo));
  }
  return [...keys].sort((a, b) => b.localeCompare(a));
}

export function matchesSearch(photo: InvoiceFilterPhoto, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const amount = photo.amountIls ?? photo.aiTotalIls;
  const haystack = [
    photo.originalName,
    photo.fileName,
    photoSupplierName(photo),
    photo.aiInvoiceDate ?? "",
    photoDocumentTypeLabel(photo.documentType),
    parsePhotoDocumentType(photo.documentType),
    amount != null ? String(amount) : "",
    amount != null ? amount.toFixed(2) : "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesDateRange(photo: InvoiceFilterPhoto, filters: Pick<InvoiceListFilters, "from" | "to">) {
  const key = photoDateKey(photo);
  if (filters.from && key < filters.from) return false;
  if (filters.to && key > filters.to) return false;
  return true;
}

export function photoDocumentType(photo: Pick<InvoiceFilterPhoto, "documentType">): PhotoDocumentType {
  return parsePhotoDocumentType(photo.documentType);
}

export function matchesDocumentTypeFilter(
  photo: Pick<InvoiceFilterPhoto, "documentType">,
  documentType: InvoiceDocumentTypeFilter,
) {
  if (documentType === "all") return true;
  return photoDocumentType(photo) === documentType;
}

function matchesSharedFilters(
  photo: InvoiceFilterPhoto,
  filters: InvoiceListFilters,
  options: { ignoreMonth?: boolean } = {},
) {
  if (!options.ignoreMonth && filters.month !== "all" && photoPeriodMonth(photo) !== filters.month) {
    return false;
  }
  if (filters.supplier && photoSupplierName(photo) !== filters.supplier) return false;
  if (!matchesInvoiceBranchFilter(photo.branchId, filters.branch)) return false;
  if (!matchesDocumentTypeFilter(photo, filters.documentType)) return false;
  return matchesDateRange(photo, filters) && matchesSearch(photo, filters.q);
}

function matchesExtendedStatus(photo: InvoiceFilterPhoto, status: InvoiceStatusFilter) {
  if (status === "awaiting_approval") return photo.approvalStatus === "PENDING";
  if (status === "missing_branch") return isMissingInvoiceBranch(photo);
  return true;
}

export function matchesClassifiedFilters(photo: InvoiceFilterPhoto, filters: InvoiceListFilters) {
  if (!photo.accountId) return false;
  if (filters.status === "pending") return false;
  if (!matchesExtendedStatus(photo, filters.status)) return false;
  if (filters.category && photo.accountId !== filters.category) return false;
  return matchesSharedFilters(photo, filters);
}

export function matchesPendingFilters(photo: InvoiceFilterPhoto, filters: InvoiceListFilters) {
  if (photo.accountId) return false;
  if (filters.status === "classified") return false;
  if (!matchesExtendedStatus(photo, filters.status)) return false;
  if (filters.category) return false;
  // Month filter applies to classified docs only. Analyzing an older invoice must not
  // yank it out of «ממתינות לסיווג» just because AI filled a date in another month.
  return matchesSharedFilters(photo, filters, { ignoreMonth: true });
}

/** Safe `/invoices?...` redirect that keeps current filters and sets `dup`. */
export function invoicesDupRedirect(returnTo: unknown, dupValue = "1") {
  const fallback = `/invoices?dup=${dupValue}`;
  const raw = typeof returnTo === "string" ? returnTo.trim() : "";
  if (!raw.startsWith("/invoices")) return fallback;
  try {
    const url = new URL(raw, "https://vivace.local");
    if (url.pathname !== "/invoices") return fallback;
    url.searchParams.delete("imported");
    url.searchParams.set("dup", dupValue);
    const qs = url.searchParams.toString();
    return qs ? `/invoices?${qs}` : fallback;
  } catch {
    return fallback;
  }
}

/** Sheet filters only. Month chips and the search field are outside the sheet. */
export function activeInvoiceSheetFilterCount(filters: InvoiceListFilters) {
  let count = 0;
  if (filters.status !== "all") count += 1;
  if (filters.supplier) count += 1;
  if (filters.branch) count += 1;
  if (filters.category) count += 1;
  if (filters.documentType !== "all") count += 1;
  if (filters.from) count += 1;
  if (filters.to) count += 1;
  return count;
}

export function matchesInvoiceList(photo: InvoiceFilterPhoto, filters: InvoiceListFilters) {
  return photo.accountId ? matchesClassifiedFilters(photo, filters) : matchesPendingFilters(photo, filters);
}

export function invoicesFilterQuery(filters: Partial<InvoiceListFilters>) {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  if (filters.supplier) params.set("supplier", filters.supplier);
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.documentType && filters.documentType !== "all") params.set("documentType", filters.documentType);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
}
