"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/access";
import { syncInvoiceMailbox } from "@/lib/invoice-mail-sync";

export async function syncInvoiceMailboxNow() {
  const session = await requirePermission("action.accounting_package");
  const result = await syncInvoiceMailbox({ session, analyzeBudgetMs: 90_000 });
  revalidatePath("/invoices");
  revalidatePath("/invoices/mail");
  revalidatePath("/invoices/import");
  return {
    ok: result.ok !== false && result.configured,
    configured: result.configured,
    imported: result.imported,
    skipped: result.skipped,
    messages: result.messages,
    duplicates: result.duplicates,
    error: result.lastError,
    lastSyncAt: result.lastSyncAt,
  };
}
