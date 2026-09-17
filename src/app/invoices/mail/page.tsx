import Link from "next/link";
import { MailSyncButton } from "@/components/invoices/mail-sync-button";
import { NarrowForm, PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { CompactPanel } from "@/components/ui/compact-form";
import { formatDateTime } from "@/lib/format";
import { getInvoiceMailStatus, invoiceMailConnectionView } from "@/lib/invoice-mail";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MailConnectionPage() {
  const [connection, status] = await Promise.all([invoiceMailConnectionView(), getInvoiceMailStatus()]);
  const lastSync = status.lastSyncAt ? formatDateTime(status.lastSyncAt) : "עדיין לא";

  return (
    <div className="space-y-4">
      <PageHeader
        title="חיבור מייל"
        description="חשבוניות מ-PDF/תמונה בתיבת invoices נכנסות לתור הסיווג. העלאה ידנית וייבוא מתיקייה נשארים."
        action={{ href: "/invoices", label: "לתור הסיווג" }}
      />

      <NarrowForm className="space-y-4">
        {connection.configured ? (
          <Alert>
            <AlertTitle>תיבת המייל מוגדרת</AlertTitle>
            <AlertDescription>
              {connection.user} · {connection.host}:{connection.port}
              {connection.tls ? " · TLS" : ""} · תיקייה {connection.mailbox}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>חסרים משתני סביבה</AlertTitle>
            <AlertDescription>
              לא ניתן להתחבר בלי {connection.missing.join(" ו-")}. מגדירים ב-Railway בלבד — לא בקוד.
            </AlertDescription>
          </Alert>
        )}

        {status.lastError ? (
          <Alert variant="destructive">
            <AlertTitle>שגיאת סנכרון אחרונה</AlertTitle>
            <AlertDescription>{status.lastError}</AlertDescription>
          </Alert>
        ) : null}

        <CompactPanel title="סטטוס סנכרון" description="סנכרון ידני או Railway Cron על /api/cron/invoice-mail">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">סנכרון אחרון</dt>
            <dd>{lastSync}</dd>
            <dt className="text-muted-foreground">יובאו</dt>
            <dd>{status.lastSyncAt ? status.imported : "—"}</dd>
            <dt className="text-muted-foreground">דולגו</dt>
            <dd>{status.lastSyncAt ? status.skipped : "—"}</dd>
            <dt className="text-muted-foreground">הודעות שנבדקו</dt>
            <dd>{status.lastSyncAt ? status.messages : "—"}</dd>
          </dl>
          <div className="mt-3">
            <MailSyncButton disabled={!connection.configured} />
          </div>
        </CompactPanel>

        <CompactPanel title="Gmail / Google Workspace" description="IMAP עם App Password — בלי OAuth במסך הזה">
          <ol className="list-decimal space-y-1 ps-5 text-sm leading-6">
            <li>ב-Gmail: הגדרות → ראה את כל ההגדרות → העברה ו-POP/IMAP → הפעלת IMAP.</li>
            <li>אם מופעל אימות דו-שלבי, יוצרים App Password לחשבון invoices ומשתמשים בו כ-INVOICE_MAIL_PASSWORD.</li>
            <li>Google עלול לחסום סיסמת חשבון רגילה. App Password הוא המסלול הנתמך.</li>
            <li>כל PDF/תמונה מצורפת נכנסת לתור הסיווג עם מקור «מייל». הודעה שעובדה מסומנת כ-Seen.</li>
          </ol>
        </CompactPanel>

        <div className="flex flex-wrap gap-2">
          <Link href="/invoices/import" className={cn(buttonVariants({ variant: "outline" }))}>
            ייבוא מתיקייה
          </Link>
          <Link href="/invoices" className={cn(buttonVariants({ variant: "ghost" }))}>
            חזרה לסיווג
          </Link>
        </div>
      </NarrowForm>
    </div>
  );
}
