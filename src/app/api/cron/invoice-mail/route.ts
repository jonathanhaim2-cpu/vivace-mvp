import { NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth";
import { cronSecretMatches } from "@/lib/invoice-mail";
import { syncInvoiceMailbox } from "@/lib/invoice-mail-sync";
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

async function run(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncInvoiceMailbox({ analyzeBudgetMs: 45_000 });
  return NextResponse.json({
    ok: result.ok !== false && result.configured,
    configured: result.configured,
    imported: result.imported,
    skipped: result.skipped,
    messages: result.messages,
    duplicates: result.duplicates,
    error: result.lastError,
    lastSyncAt: result.lastSyncAt,
  });
}

/** Railway cron or admin session. Prefer `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
