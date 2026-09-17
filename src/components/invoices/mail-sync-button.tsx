"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncInvoiceMailboxHistoricalNow, syncInvoiceMailboxNow } from "@/actions/invoice-mail";
import { Button } from "@/components/ui/button";

type MailSyncMode = "all" | "historical";

export function MailSyncButton({
  disabled,
  mode = "all",
}: {
  disabled?: boolean;
  mode?: MailSyncMode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const historical = mode === "historical";

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Button
        type="button"
        variant={historical ? "outline" : "default"}
        disabled={disabled || pending}
        onClick={() => {
          setMessage(null);
          setError(null);
          start(async () => {
            const result = historical ? await syncInvoiceMailboxHistoricalNow() : await syncInvoiceMailboxNow();
            if (!result.ok) {
              setError(result.error ?? "הסנכרון נכשל");
            } else if (result.totalImported > 0) {
              setMessage(`יובאו ${result.totalImported} קבצים לתור הסיווג`);
            } else {
              setMessage(historical ? "אין הודעות ארכיון חדשות לייבוא" : "אין הודעות חדשות לייבוא");
            }
            router.refresh();
          });
        }}
      >
        {pending ? "מסנכרן…" : historical ? "סנכרן ארכיון" : "סנכרן עכשיו"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
