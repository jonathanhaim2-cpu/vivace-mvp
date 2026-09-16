type BranchLink = {
  branchId: string;
  whatsappPhone?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  accountingPhone?: string | null;
  accountingEmail?: string | null;
  taxId?: string | null;
  address?: string | null;
  deliveryPointNumber?: string | null;
  deliveryDays?: string | null;
  orderDays?: string | null;
  orderCutoffTime?: string | null;
  notes?: string | null;
};

type SupplierLike = {
  whatsappPhone: string;
  agentName?: string | null;
  agentPhone?: string | null;
  accountingPhone?: string | null;
  accountingEmail?: string | null;
  taxId?: string | null;
  address?: string | null;
  deliveryPointNumber?: string | null;
  deliveryDays: string;
  orderDays: string;
  orderCutoffTime: string;
  notes?: string | null;
  branchLinks?: BranchLink[];
};

function pick(override: string | null | undefined, fallback: string | null | undefined) {
  const value = override?.trim();
  if (value) return value;
  return fallback ?? null;
}

export function resolveSupplierForBranch<T extends SupplierLike>(supplier: T, branchId: string | null | undefined) {
  const link = branchId ? supplier.branchLinks?.find((row) => row.branchId === branchId) : undefined;
  return {
    ...supplier,
    whatsappPhone: pick(link?.whatsappPhone, supplier.whatsappPhone) || supplier.whatsappPhone,
    agentName: pick(link?.agentName, supplier.agentName),
    agentPhone: pick(link?.agentPhone, supplier.agentPhone),
    accountingPhone: pick(link?.accountingPhone, supplier.accountingPhone),
    accountingEmail: pick(link?.accountingEmail, supplier.accountingEmail),
    taxId: pick(link?.taxId, supplier.taxId),
    address: pick(link?.address, supplier.address),
    deliveryPointNumber: pick(link?.deliveryPointNumber, supplier.deliveryPointNumber),
    deliveryDays: pick(link?.deliveryDays, supplier.deliveryDays) || supplier.deliveryDays,
    orderDays: pick(link?.orderDays, supplier.orderDays) || supplier.orderDays,
    orderCutoffTime: pick(link?.orderCutoffTime, supplier.orderCutoffTime) || supplier.orderCutoffTime,
    notes: pick(link?.notes, supplier.notes),
  };
}
