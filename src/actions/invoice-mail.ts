"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/access";
import { syncInvoiceMailbox, type InvoiceMailSyncMode, type InvoiceMailSyncResult } from "@/lib/invoice-mail-sync";

function revalidateInvoiceMailPaths() {
  revalidatePath("/invoices");
  revalidatePath("/invoices/mail");
  revalidatePath("/invoices/import");
}

function syncPayload(result: InvoiceMailSyncResult, mode: InvoiceMailSyncMode) {
  const historicalImported = result.historical?.imported ?? 0;
  const imported = mode === "historical" ? result.imported : result.imported + historicalImported;
  return {
    ok: result.ok !== false && result.configured,
    configured: result.configured,
    imported: result.imported,
    skipped: result.skipped,
    messages: result.messages,
    duplicates: result.duplicates,
    error: result.lastError,
    lastSyncAt: result.lastSyncAt,
    totalImported: imported,
    historical: result.historical
      ? {
          configured: result.historical.configured,
          imported: result.historical.imported,
          skipped: result.historical.skipped,
          messages: result.historical.messages,
          duplicates: result.historical.duplicates,
          error: result.historical.lastError,
          lastSyncAt: result.historical.lastSyncAt,
          ok: result.historical.ok,
        }
      : null,
  };
}

export async function syncInvoiceMailboxNow() {
  const session = await requirePermission("action.accounting_package");
  const result = await syncInvoiceMailbox({ session, analyzeBudgetMs: 90_000, mode: "all", syncBudgetMs: 90_000 });
  revalidateInvoiceMailPaths();
  return syncPayload(result, "all");
}

export async function syncInvoiceMailboxHistoricalNow() {
  const session = await requirePermission("action.accounting_package");
  const result = await syncInvoiceMailbox({
    session,
    analyzeBudgetMs: 45_000,
    mode: "historical",
    syncBudgetMs: 95_000,
  });
  revalidateInvoiceMailPaths();
  return syncPayload(result, "historical");
}
