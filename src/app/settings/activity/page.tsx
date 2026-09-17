import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePagePermission } from "@/lib/access";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  auditActionLabel,
  auditEntityHref,
  auditEntityLabel,
  formatActorLabel,
} from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { monthLabel, monthRangeUtc, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function readMonth(raw: string | undefined) {
  if (raw === "all") return "all";
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return "all";
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; action?: string; user?: string; entity?: string; q?: string }>;
}) {
  const session = await requirePagePermission("nav.activity");
  const params = await searchParams;
  const month = readMonth(params.month);
  const action = String(params.action ?? "").trim();
  const user = String(params.user ?? "").trim();
  const entity = String(params.entity ?? "").trim();
  const q = String(params.q ?? "").trim();

  const createdAt =
    month !== "all"
      ? { gte: monthRangeUtc(month).start, lt: monthRangeUtc(month).end }
      : undefined;

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(createdAt ? { createdAt } : {}),
      ...(action ? { action } : {}),
      ...(entity ? { entityType: entity } : {}),
      ...(user
        ? {
            OR: [
              { actorUsername: { contains: user } },
              { actorName: { contains: user } },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q } },
              { actorName: { contains: q } },
              { actorUsername: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const knownUsers = await prisma.auditLog.findMany({
    distinct: ["actorUsername"],
    orderBy: { actorUsername: "asc" },
    select: { actorUsername: true, actorName: true },
    take: 80,
  });

  return (
    <div className="space-y-5">
      <SettingsNav permissions={session.permissions} />
      <PageHeader
        title="פעילות"
        description="מי ביצע פעולות קריטיות — הזמנות, קליטות, חשבוניות, משתמשים והגדרות. רשומות ישנות בלי שחקן מוצגות כ«לא ידוע»."
      />

      <form className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">חודש</span>
          <select
            name="month"
            defaultValue={month}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="all">הכל</option>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">פעולה</span>
          <select
            name="action"
            defaultValue={action}
            className="h-8 max-w-[12rem] rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">הכל</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">משתמש</span>
          <select
            name="user"
            defaultValue={user}
            className="h-8 max-w-[11rem] rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">הכל</option>
            {knownUsers.map((item) => (
              <option key={item.actorUsername} value={item.actorUsername}>
                {formatActorLabel(item.actorName, item.actorUsername)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">ישות</span>
          <select
            name="entity"
            defaultValue={entity}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">הכל</option>
            {Object.entries(AUDIT_ENTITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[10rem] flex-1 text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">חיפוש</span>
          <Input name="q" defaultValue={q} placeholder="שם / תקציר" className="h-8" />
        </label>
        <Button type="submit" size="sm" variant="outline">
          סינון
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="אין רשומות פעילות"
          description="פעולות קריטיות (הזמנה, קליטה, ביטול קליטה, חשבונית, משתמש) יופיעו כאן אחרי הביצוע."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-start font-medium">מתי</th>
                <th className="px-3 py-2 text-start font-medium">מי</th>
                <th className="px-3 py-2 text-start font-medium">פעולה</th>
                <th className="px-3 py-2 text-start font-medium">תקציר</th>
                <th className="px-3 py-2 text-start font-medium">ישות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = auditEntityHref(row);
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatActorLabel(row.actorName, row.actorUsername)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{auditActionLabel(row.action)}</td>
                    <td className="px-3 py-2">
                      {href ? (
                        <Link href={href} className="hover:text-primary hover:underline">
                          {row.summary}
                        </Link>
                      ) : (
                        row.summary
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {auditEntityLabel(row.entityType)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        מוצגות עד 200 רשומות אחרונות.{" "}
        <Link href="/receipts" className={cn(buttonVariants({ variant: "link", size: "xs" }), "h-auto px-0")}>
          חזרה לקליטות
        </Link>
      </p>
    </div>
  );
}
