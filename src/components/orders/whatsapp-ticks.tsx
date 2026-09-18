"use client";

import { updateWhatsAppStatus } from "@/actions/orders";
import { WHATSAPP_STATUS } from "@/lib/constants";
import { whatsappStatusLabel, whatsappTickCount, whatsappTickTone } from "@/lib/whatsapp-status";
import { cn } from "@/lib/utils";

function Ticks({ status }: { status: string }) {
  const count = whatsappTickCount(status);
  const tone = whatsappTickTone(status);
  const color =
    tone === "read" ? "text-sky-500" : tone === "sent" ? "text-muted-foreground" : "text-muted-foreground/50";
  if (count === 0) {
    return <span className={cn("text-xs", color)}>○</span>;
  }
  return (
    <span className={cn("font-mono text-sm leading-none tracking-tighter", color)} aria-hidden>
      {count === 2 ? "✓✓" : "✓"}
    </span>
  );
}

export function WhatsAppTicks({
  orderId,
  status,
  compact = false,
  canManage = true,
}: {
  orderId: string;
  status: string;
  compact?: boolean;
  canManage?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs">
        <Ticks status={status} />
        <span>{whatsappStatusLabel(status)}</span>
      </span>
      {!compact && canManage ? (
        <span className="flex flex-wrap gap-1">
          {status !== WHATSAPP_STATUS.DELIVERED ? (
            <form action={updateWhatsAppStatus.bind(null, orderId, WHATSAPP_STATUS.DELIVERED)}>
              <button type="submit" className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted">
                התקבלה
              </button>
            </form>
          ) : null}
          {status !== WHATSAPP_STATUS.READ ? (
            <form action={updateWhatsAppStatus.bind(null, orderId, WHATSAPP_STATUS.READ)}>
              <button type="submit" className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted">
                נקראה
              </button>
            </form>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
