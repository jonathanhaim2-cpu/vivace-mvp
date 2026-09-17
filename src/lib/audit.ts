import type { Prisma } from "@prisma/client";
import { RECEIPT_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { AppSession } from "@/lib/session";

export const AUDIT_ACTIONS = {
  ORDER_CREATE: "order.create",
  ORDER_SEND: "order.send",
  RECEIPT_SUBMIT: "receipt.submit",
  RECEIPT_CANCEL: "receipt.cancel",
  RECEIPT_PRICE_APPROVE: "receipt.price_approve",
  RECEIPT_PRICE_REJECT: "receipt.price_reject",
  INVOICE_UPLOAD: "invoice.upload",
  INVOICE_CLASSIFY: "invoice.classify",
  INVOICE_CONFIRM_AI: "invoice.confirm_ai",
  INVOICE_IMPORT: "invoice.import",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_PASSWORD_RESET: "user.password_reset",
  SUPPLIER_CREATE: "supplier.create",
  SUPPLIER_UPDATE: "supplier.update",
  SUPPLIER_DELETE: "supplier.delete",
  INVENTORY_SUBMIT: "inventory.submit",
  SETTINGS_SEND_TO_SUPPLIERS: "settings.send_to_suppliers",
  EXCEPTION_RESOLVE: "exception.resolve",
  AP_APPROVE_PAYMENT: "ap.approve_payment",
  PERMISSION_CHANGE: "permission.change",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const INVOICE_ORIGIN_ACTIONS = [AUDIT_ACTIONS.INVOICE_UPLOAD, AUDIT_ACTIONS.INVOICE_IMPORT] as const;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.ORDER_CREATE]: "יצירת הזמנה",
  [AUDIT_ACTIONS.ORDER_SEND]: "שליחת הזמנה",
  [AUDIT_ACTIONS.RECEIPT_SUBMIT]: "קליטת סחורה",
  [AUDIT_ACTIONS.RECEIPT_CANCEL]: "ביטול קליטה",
  [AUDIT_ACTIONS.RECEIPT_PRICE_APPROVE]: "אישור שינוי מחיר",
  [AUDIT_ACTIONS.RECEIPT_PRICE_REJECT]: "דחיית שינוי מחיר",
  [AUDIT_ACTIONS.INVOICE_UPLOAD]: "העלאת חשבונית",
  [AUDIT_ACTIONS.INVOICE_CLASSIFY]: "סיווג חשבונית",
  [AUDIT_ACTIONS.INVOICE_CONFIRM_AI]: "אישור הצעת AI",
  [AUDIT_ACTIONS.INVOICE_IMPORT]: "ייבוא חשבוניות",
  [AUDIT_ACTIONS.USER_CREATE]: "יצירת משתמש",
  [AUDIT_ACTIONS.USER_UPDATE]: "עדכון משתמש",
  [AUDIT_ACTIONS.USER_PASSWORD_RESET]: "איפוס סיסמה",
  [AUDIT_ACTIONS.SUPPLIER_CREATE]: "יצירת ספק",
  [AUDIT_ACTIONS.SUPPLIER_UPDATE]: "עדכון ספק",
  [AUDIT_ACTIONS.SUPPLIER_DELETE]: "מחיקת ספק",
  [AUDIT_ACTIONS.INVENTORY_SUBMIT]: "הגשת ספירת מלאי",
  [AUDIT_ACTIONS.SETTINGS_SEND_TO_SUPPLIERS]: "שליחה לספקים",
  [AUDIT_ACTIONS.EXCEPTION_RESOLVE]: "טיפול במסמך חריג",
  [AUDIT_ACTIONS.AP_APPROVE_PAYMENT]: "אישור תשלום לספק",
  [AUDIT_ACTIONS.PERMISSION_CHANGE]: "שינוי הרשאה",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  Order: "הזמנה",
  GoodsReceipt: "קליטה",
  InvoicePhoto: "חשבונית",
  User: "משתמש",
  Supplier: "ספק",
  InventoryCount: "מלאי",
  ExceptionalItem: "מסמך חריג",
  RolePermission: "הרשאה",
  AppSetting: "הגדרה",
};

export const CANCELLABLE_RECEIPT_STATUSES = [
  RECEIPT_STATUSES.APPROVED,
  RECEIPT_STATUSES.CREDIT_NEEDED,
  RECEIPT_STATUSES.PENDING_PRICE_APPROVAL,
  RECEIPT_STATUSES.SUBMITTED,
] as const;

export type WriteAuditLogInput = {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  meta?: Prisma.InputJsonValue;
};

export function actorFromSession(session: AppSession) {
  return {
    actorUserId: session.user?.id ?? null,
    actorUsername: session.user?.username?.trim() || "unknown",
    actorName: session.user?.name?.trim() || "לא ידוע",
  };
}

export function formatActorLabel(name?: string | null, username?: string | null) {
  const displayName = name?.trim();
  const handle = username?.trim();
  if (displayName && handle && displayName !== handle) return `${displayName} (${handle})`;
  if (displayName) return displayName;
  if (handle && handle !== "unknown") return handle;
  return "לא ידוע";
}

export type AuditStampSource = {
  actorName?: string | null;
  actorUsername?: string | null;
  createdAt: Date | string;
} | null | undefined;

export function formatAuditStamp(log?: AuditStampSource) {
  if (!log) return "לא ידוע";
  const actor = formatActorLabel(log.actorName, log.actorUsername);
  return `בוצע ע״י ${actor} · ${formatDateTime(log.createdAt)}`;
}

function actionWhere(action?: string | string[]) {
  if (action == null) return {};
  if (Array.isArray(action)) return action.length > 0 ? { action: { in: action } } : {};
  return { action };
}

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityLabel(entityType: string) {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}

export function isCancellableReceiptStatus(status: string) {
  return (CANCELLABLE_RECEIPT_STATUSES as readonly string[]).includes(status);
}

type AuditMeta = Record<string, unknown> | null;

export function auditEntityHref(row: {
  action: string;
  entityType: string;
  entityId: string;
  meta?: unknown;
}): string | null {
  const meta = (row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
    ? row.meta
    : null) as AuditMeta;

  switch (row.entityType) {
    case "Order":
      return `/orders/${row.entityId}`;
    case "GoodsReceipt": {
      if (row.action === AUDIT_ACTIONS.RECEIPT_CANCEL) {
        const orderId = typeof meta?.orderId === "string" ? meta.orderId : null;
        return orderId ? `/orders/${orderId}` : null;
      }
      return `/receipts/${row.entityId}`;
    }
    case "InvoicePhoto":
      return "/invoices";
    case "User":
      return "/settings/users";
    case "Supplier":
      return `/suppliers/${row.entityId}`;
    case "InventoryCount":
      return `/inventory/${row.entityId}`;
    case "ExceptionalItem":
      return "/anomalies";
    case "RolePermission":
      return "/settings/permissions";
    case "AppSetting":
      return "/settings";
    default:
      return null;
  }
}

export async function writeAuditLog(session: AppSession, input: WriteAuditLogInput) {
  const actor = actorFromSession(session);
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.actorUserId,
        actorUsername: actor.actorUsername,
        actorName: actor.actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        meta: input.meta ?? undefined,
      },
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}

export async function firstAuditFor(entityType: string, entityId: string, action?: string | string[]) {
  return prisma.auditLog.findFirst({
    where: { entityType, entityId, ...actionWhere(action) },
    orderBy: { createdAt: "asc" },
    select: {
      actorName: true,
      actorUsername: true,
      createdAt: true,
      action: true,
    },
  });
}

export async function firstAuditsFor(entityType: string, entityIds: string[], action?: string | string[]) {
  const map = new Map<
    string,
    { actorName: string; actorUsername: string; createdAt: Date; action: string }
  >();
  if (entityIds.length === 0) return map;
  const rows = await prisma.auditLog.findMany({
    where: { entityType, entityId: { in: entityIds }, ...actionWhere(action) },
    orderBy: { createdAt: "asc" },
    select: {
      entityId: true,
      actorName: true,
      actorUsername: true,
      createdAt: true,
      action: true,
    },
  });
  for (const row of rows) {
    if (!map.has(row.entityId)) {
      map.set(row.entityId, {
        actorName: row.actorName,
        actorUsername: row.actorUsername,
        createdAt: row.createdAt,
        action: row.action,
      });
    }
  }
  return map;
}
