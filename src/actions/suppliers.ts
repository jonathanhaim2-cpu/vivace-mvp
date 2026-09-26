"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOCUMENT_TYPES, PAYMENT_METHODS, PAYMENT_TERMS, WEEKDAYS } from "@/lib/constants";
import { ensurePriceLists } from "@/lib/catalog";
import { normalizeClockTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";

function readDays(formData: FormData, fieldName = "deliveryDay") {
  const selected = formData
    .getAll(fieldName)
    .map((value) => Number(value))
    .filter((n) => WEEKDAYS.some((d) => d.value === n));
  return JSON.stringify(selected);
}

function readBranchIds(formData: FormData) {
  return formData
    .getAll("branchId")
    .map((value) => String(value))
    .filter(Boolean);
}

function optionalInt(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function optionalFloat(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function readSupplierInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const whatsappPhone = String(formData.get("whatsappPhone") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "TAX_INVOICE");
  const orderCutoffTime = String(formData.get("orderCutoffTime") ?? "14:00");
  const reminderHoursBefore = Number(formData.get("reminderHoursBefore") ?? 2);
  const weeklyBudgetRaw = String(formData.get("weeklyBudgetIls") ?? "").trim();
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();

  if (!name) throw new Error("יש למלא שם ספק");
  if (!whatsappPhone) throw new Error("יש למלא טלפון וואטסאפ לקבלת הזמנות");
  if (!DOCUMENT_TYPES.some((t) => t.value === documentType)) {
    throw new Error("סוג מסמך לא חוקי");
  }
  if (paymentTerms && !PAYMENT_TERMS.some((t) => t.value === paymentTerms)) {
    throw new Error("תנאי תשלום לא חוקיים");
  }
  if (paymentMethod && !PAYMENT_METHODS.some((t) => t.value === paymentMethod)) {
    throw new Error("אמצעי תשלום לא חוקי");
  }

  return {
    name,
    taxId: String(formData.get("taxId") ?? "").trim() || null,
    agentName: String(formData.get("agentName") ?? "").trim() || null,
    agentPhone: String(formData.get("agentPhone") ?? "").trim() || null,
    whatsappPhone,
    driverName: String(formData.get("driverName") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    deliveryPointNumber: String(formData.get("deliveryPointNumber") ?? "").trim() || null,
    documentType,
    deliveryDays: readDays(formData, "deliveryDay"),
    orderDays: readDays(formData, "orderDay"),
    orderCutoffTime: normalizeClockTime(orderCutoffTime),
    reminderHoursBefore: Number.isFinite(reminderHoursBefore) ? reminderHoursBefore : 2,
    weeklyBudgetIls: weeklyBudgetRaw ? Number(weeklyBudgetRaw) : null,
    minimumOrderIls: optionalFloat(formData.get("minimumOrderIls")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    defaultCategoryId: String(formData.get("defaultCategoryId") ?? "").trim() || null,
    active: formData.getAll("active").some((value) => value === "on" || value === "true" || value === "1"),
    paymentTerms: paymentTerms || null,
    paymentMethod: paymentMethod || null,
    paymentChargeDay: optionalInt(formData.get("paymentChargeDay"), 1, 28),
    card1Label: String(formData.get("card1Label") ?? "").trim() || null,
    card2Label: String(formData.get("card2Label") ?? "").trim() || null,
    accountingPhone: String(formData.get("accountingPhone") ?? "").trim() || null,
    accountingEmail: String(formData.get("accountingEmail") ?? "").trim() || null,
    plantsCouncilUrl: String(formData.get("plantsCouncilUrl") ?? "").trim() || null,
    plantsCouncilDiscountPct: optionalFloat(formData.get("plantsCouncilDiscountPct")),
    plantsCouncilRelevant: formData
      .getAll("plantsCouncilRelevant")
      .some((value) => value === "on" || value === "true" || value === "1"),
    isOrderable: String(formData.get("isOrderable") ?? "true") !== "false",
    paymentCardId: String(formData.get("paymentCardId") ?? "").trim() || null,
  };
}

async function assertPaymentCard(paymentCardId: string | null) {
  if (!paymentCardId) return null;
  const card = await prisma.paymentCard.findUnique({ where: { id: paymentCardId } });
  if (!card) throw new Error("כרטיס האשראי לא נמצא");
  return card.id;
}

async function replaceBranches(supplierId: string, branchIds: string[], formData?: FormData) {
  const existing = await prisma.supplierBranch.findMany({ where: { supplierId } });
  const previous = new Map(existing.map((row) => [row.branchId, row]));
  await prisma.supplierBranch.deleteMany({
    where: { supplierId, branchId: { notIn: branchIds } },
  });
  if (branchIds.length === 0) return;
  for (const branchId of branchIds) {
    const prev = previous.get(branchId);
    const field = (name: string) => (formData ? String(formData.get(`${name}:${branchId}`) ?? "").trim() : "");
    const fromForm = field("branchWhatsapp");
    const payMethod = field("branchPay") || prev?.paymentMethod || null;
    const chargeDay = optionalInt(formData?.get(`branchChargeDay:${branchId}`) ?? null, 1, 28) ?? prev?.paymentChargeDay ?? null;
    await prisma.supplierBranch.upsert({
      where: { supplierId_branchId: { supplierId, branchId } },
      update: {
        whatsappPhone: fromForm || prev?.whatsappPhone || null,
        taxId: field("branchTaxId") || prev?.taxId || null,
        driverName: field("branchDriver") || prev?.driverName || null,
        agentName: field("branchAgent") || prev?.agentName || null,
        agentPhone: field("branchAgentPhone") || prev?.agentPhone || null,
        deliveryDays: field("branchDeliveryDays") || prev?.deliveryDays || null,
        orderDays: field("branchOrderDays") || prev?.orderDays || null,
        orderCutoffTime: field("branchCutoff") || prev?.orderCutoffTime || null,
        catalogKind: field("branchCatalog") || prev?.catalogKind || null,
        notes: field("branchNotes") || prev?.notes || null,
        paymentMethod: payMethod,
        paymentChargeDay: chargeDay,
      },
      create: {
        supplierId,
        branchId,
        whatsappPhone: fromForm || prev?.whatsappPhone || null,
        taxId: field("branchTaxId") || prev?.taxId || null,
        driverName: field("branchDriver") || prev?.driverName || null,
        agentName: field("branchAgent") || prev?.agentName || field("branchAgent"),
        agentPhone: field("branchAgentPhone") || prev?.agentPhone || null,
        accountingPhone: prev?.accountingPhone,
        accountingEmail: prev?.accountingEmail,
        address: prev?.address,
        deliveryPointNumber: prev?.deliveryPointNumber,
        deliveryDays: field("branchDeliveryDays") || prev?.deliveryDays || null,
        orderDays: field("branchOrderDays") || prev?.orderDays || null,
        orderCutoffTime: field("branchCutoff") || prev?.orderCutoffTime || null,
        catalogKind: field("branchCatalog") || prev?.catalogKind || null,
        notes: field("branchNotes") || prev?.notes || null,
        paymentMethod: payMethod,
        paymentChargeDay: chargeDay,
      },
    });
  }
}

export async function createSupplier(formData: FormData) {
  const session = await requirePermission("action.edit_suppliers");
  const data = readSupplierInput(formData);
  data.paymentCardId = await assertPaymentCard(data.paymentCardId);
  const supplier = await prisma.supplier.create({ data });
  await replaceBranches(supplier.id, readBranchIds(formData), formData);
  await ensurePriceLists(supplier.id);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.SUPPLIER_CREATE,
    entityType: "Supplier",
    entityId: supplier.id,
    summary: `נוצר ספק ${data.name}`,
    meta: { active: data.active },
  });
  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}`);
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await requirePermission("action.edit_suppliers");
  const data = readSupplierInput(formData);
  data.paymentCardId = await assertPaymentCard(data.paymentCardId);
  await prisma.supplier.update({ where: { id }, data });
  await replaceBranches(id, readBranchIds(formData), formData);
  await ensurePriceLists(id);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.SUPPLIER_UPDATE,
    entityType: "Supplier",
    entityId: id,
    summary: `עודכן ספק ${data.name}${data.active ? "" : " (לא פעיל)"}`,
    meta: { active: data.active },
  });
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}`);
}

export async function updateAnnualPurchaseTarget(supplierId: string, formData: FormData) {
  await requirePermission("action.edit_suppliers");
  const raw = String(formData.get("annualPurchaseTargetIls") ?? "").trim();
  const annualPurchaseTargetIls = raw ? Number(raw) : null;
  if (annualPurchaseTargetIls != null && !Number.isFinite(annualPurchaseTargetIls)) {
    throw new Error("יעד שנתי לא חוקי");
  }
  await prisma.supplier.update({
    where: { id: supplierId },
    data: { annualPurchaseTargetIls },
  });
  revalidatePath("/suppliers");
}

export async function updateSupplierPaymentTerms(supplierId: string, formData: FormData) {
  await requirePermission("action.edit_suppliers");
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paymentCardId = String(formData.get("paymentCardId") ?? "").trim() || null;
  if (paymentTerms && !PAYMENT_TERMS.some((term) => term.value === paymentTerms)) {
    throw new Error("תנאי תשלום לא חוקיים");
  }
  if (paymentMethod && !PAYMENT_METHODS.some((method) => method.value === paymentMethod)) {
    throw new Error("אמצעי תשלום לא חוקי");
  }
  await assertPaymentCard(paymentCardId);
  const chargeDay = optionalInt(formData.get("paymentChargeDay"), 1, 28);
  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      paymentTerms: paymentTerms || null,
      paymentMethod: paymentMethod || null,
      paymentCardId,
      paymentChargeDay: chargeDay,
    },
  });
  revalidatePath("/ap");
  revalidatePath(`/suppliers/${supplierId}`);
}

export async function deleteSupplier(id: string) {
  const session = await requirePermission("action.edit_suppliers");
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw new Error("ספק לא נמצא");
  const orders = await prisma.order.count({ where: { supplierId: id } });
  if (orders > 0) {
    throw new Error("לא ניתן למחוק ספק עם הזמנות קיימות");
  }
  await prisma.supplier.delete({ where: { id } });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.SUPPLIER_DELETE,
    entityType: "Supplier",
    entityId: id,
    summary: `נמחק ספק ${supplier.name}`,
  });
  revalidatePath("/suppliers");
  redirect("/suppliers");
}
