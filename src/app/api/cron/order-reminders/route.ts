import { NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth";
import { listDueCutoffReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/** Optional Railway/cron ping. Protected by CRON_SECRET when the app gate is on. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  const url = new URL(request.url);
  const token = header.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (isAuthEnabled() && (!secret || token !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const items = await listDueCutoffReminders({ isNetwork: true });
  return NextResponse.json({
    ok: true,
    count: items.length,
    items: items.map((item) => ({
      supplier: item.supplierName,
      branch: item.branchName,
      minutesLeft: item.minutesLeft,
      cutoffTime: item.cutoffTime,
    })),
  });
}
