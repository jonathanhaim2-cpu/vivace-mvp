import { NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth";
import { cronSecretMatches } from "@/lib/invoice-mail";
import { syncInvoiceMailbox, type InvoiceMailSyncResult } from "@/lib/invoice-mail-sync";
import { getAppSession, sessionCan } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

async function isAuthorized(request: Request) {
  if (cronSecretMatches(request)) return true;
  if (!isAuthEnabled()) return true;
  const session = await getAppSession();
  return sessionCan(session, "action.accounting_package");
}

function jsonResult(result: InvoiceMailSyncResult) {
  return {
    ok: result.ok !== false && result.configured,
    configured: result.configured,
    imported: result.imported,
    skipped: result.skipped,
    messages: result.messages,
    duplicates: result.duplicates,
    error: result.lastError,
    lastSyncAt: result.lastSyncAt,
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
      : undefined,
  };
}

async function run(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncInvoiceMailbox({ analyzeBudgetMs: 45_000, mode: "all", syncBudgetMs: 70_000 });
  return NextResponse.json(jsonResult(result));
}

/** Railway cron or admin session. Prefer `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
