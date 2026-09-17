"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CredentialsPayload } from "@/actions/users";

export function CredentialsCard({
  credentials,
  onDismiss,
}: {
  credentials: CredentialsPayload;
  onDismiss?: () => void;
}) {
  const created = credentials.mode === "created";

  return (
    <Card size="sm" className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>{created ? "משתמש נוצר" : "סיסמה זמנית חדשה"}</CardTitle>
        <CardDescription>
          העתיקו עכשיו — לא תוצג שוב. אין מייל, מוסרים ידנית.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">
          <span className="text-muted-foreground">שם: </span>
          {credentials.name}
        </p>
        <CopyRow label="שם משתמש" value={credentials.username} />
        <CopyRow label="סיסמה זמנית" value={credentials.password} secret />
        {onDismiss ? (
          <Button type="button" variant="outline" onClick={onDismiss}>
            הבנתי, המשך
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm" dir="ltr">
          {value}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={copy} aria-label={`העתקת ${label}`}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "הועתק" : secret ? "העתקת סיסמה" : "העתקה"}
      </Button>
    </div>
  );
}
