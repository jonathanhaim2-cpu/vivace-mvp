import {
  PHOTO_DOCUMENT_TYPE,
  PHOTO_DOCUMENT_TYPES,
  parsePhotoDocumentType,
  photoDocumentTypeLabel,
  type PhotoDocumentType,
} from "@/lib/constants";
import { monthKeyFromDate, resolvedPeriodMonth } from "@/lib/months";

export const INVOICE_STATUS_FILTERS = [
  { value: "all", label: "הכול" },
  { value: "classified", label: "משובצים" },
  { value: "pending", label: "ממתינות לסיווג" },
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
  const status: InvoiceStatusFilter =
    statusRaw === "classified" || statusRaw === "pending" || statusRaw === "all" ? statusRaw : "all";
  const documentTypeRaw = params.documentType?.trim() ?? "";
  const documentType: InvoiceDocumentTypeFilter =
    documentTypeRaw === "all" ||
    documentTypeRaw === PHOTO_DOCUMENT_TYPE.INVOICE ||
    documentTypeRaw === PHOTO_DOCUMENT_TYPE.RECEIPT ||
    documentTypeRaw === PHOTO_DOCUMENT_TYPE.UNKNOWN
      ? documentTypeRaw
      : "all";
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

function matchesSharedFilters(photo: InvoiceFilterPhoto, filters: InvoiceListFilters) {
  if (filters.month !== "all" && photoPeriodMonth(photo) !== filters.month) return false;
  if (filters.supplier && photoSupplierName(photo) !== filters.supplier) return false;
  if (filters.branch && photo.branchId !== filters.branch) return false;
  if (!matchesDocumentTypeFilter(photo, filters.documentType)) return false;
  return matchesDateRange(photo, filters) && matchesSearch(photo, filters.q);
}

export function matchesClassifiedFilters(photo: InvoiceFilterPhoto, filters: InvoiceListFilters) {
  if (!photo.accountId) return false;
  if (filters.status === "pending") return false;
  if (filters.category && photo.accountId !== filters.category) return false;
  return matchesSharedFilters(photo, filters);
}

export function matchesPendingFilters(photo: InvoiceFilterPhoto, filters: InvoiceListFilters) {
  if (photo.accountId) return false;
  if (filters.status === "classified") return false;
  if (filters.category) return false;
  return matchesSharedFilters(photo, filters);
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
