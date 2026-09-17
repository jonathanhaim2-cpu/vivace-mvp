"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncInvoiceMailboxNow } from "@/actions/invoice-mail";
import { Button } from "@/components/ui/button";

export function MailSyncButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setMessage(null);
          setError(null);
          start(async () => {
            const result = await syncInvoiceMailboxNow();
            if (!result.ok) {
              setError(result.error ?? "הסנכרון נכשל");
            } else if (result.imported > 0) {
              setMessage(`יובאו ${result.imported} קבצים לתור הסיווג`);
            } else {
              setMessage("אין הודעות חדשות לייבוא");
            }
            router.refresh();
          });
        }}
      >
        {pending ? "מסנכרן…" : "סנכרן עכשיו"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
