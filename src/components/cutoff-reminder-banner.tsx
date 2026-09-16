"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { acknowledgeCutoffReminders } from "@/actions/reminders";
import { formatClockTime } from "@/lib/format";
import type { DueCutoffReminder } from "@/lib/reminders";

export function CutoffReminderBanner({ initial }: { initial: DueCutoffReminder[] }) {
  const [items, setItems] = useState(initial);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const fresh = items.filter((item) => !item.alreadyNotified);
    if (fresh.length === 0) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    for (const item of fresh) {
      const tag = `vivace-cutoff-${item.supplierId}-${item.branchId}-${item.dateKey}`;
      try {
        new Notification(`תזכורת הזמנה · ${item.supplierName}`, {
          tag,
          body: `נשארו כ־${item.minutesLeft} דקות עד סגירת ההזמנה ל${item.branchName} (עד ${item.cutoffTime}).`,
          lang: "he",
          dir: "rtl",
        });
      } catch {
        // ignore browsers that require a service worker
      }
    }
    void acknowledgeCutoffReminders(
      fresh.map((item) => ({
        supplierId: item.supplierId,
        branchId: item.branchId,
        dateKey: item.dateKey,
      })),
    );
  }, [items, permission]);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 print:hidden">
      <p className="font-medium">תזכורת: שעתיים לפני סגירת הזמנה</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={`${item.supplierId}-${item.branchId}`}>
            <Link href={`/orders/new?supplierId=${item.supplierId}`} className="underline-offset-2 hover:underline">
              {item.supplierName}
              {` · ${item.branchName} · עד ${formatClockTime(item.cutoffTime)} · נשארו ${item.minutesLeft} דק׳`}
            </Link>
          </li>
        ))}
      </ul>
      {permission === "default" ? (
        <button
          type="button"
          className="mt-2 rounded-full border border-amber-700 px-3 py-1 text-xs"
          onClick={async () => {
            const next = await Notification.requestPermission();
            setPermission(next);
          }}
        >
          הפעלת התראות בדפדפן
        </button>
      ) : null}
    </div>
  );
}
