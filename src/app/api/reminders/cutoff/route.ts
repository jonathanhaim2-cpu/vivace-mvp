import { NextResponse } from "next/server";
import { listDueCutoffReminders, markRemindersNotified } from "@/lib/reminders";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAppSession();
  const items = await listDueCutoffReminders({
    branchId: session.branchId,
    isNetwork: session.isNetwork,
  });
  return NextResponse.json({ items, count: items.length });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  const body = (await request.json().catch(() => null)) as
    | { items?: { supplierId: string; branchId: string; dateKey: string }[] }
    | null;
  const items = body?.items ?? [];
  const allowed = await listDueCutoffReminders({
    branchId: session.branchId,
    isNetwork: session.isNetwork,
  });
  const allow = new Set(allowed.map((row) => `${row.supplierId}:${row.branchId}:${row.dateKey}`));
  const toMark = items.filter((item) => allow.has(`${item.supplierId}:${item.branchId}:${item.dateKey}`));
  await markRemindersNotified(toMark);
  return NextResponse.json({ marked: toMark.length });
}
