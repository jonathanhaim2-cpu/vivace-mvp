import Link from "next/link";
import { NarrowForm, PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { CompactPanel } from "@/components/ui/compact-form";
import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function MailConnectionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="חיבור מייל"
        description="סנכרון תיבת הנהלת החשבונות מתוכנן לשלב הבא. כרגע הייבוא מדמה משיכה מתיקייה."
      />

      <NarrowForm className="space-y-6">
        <Alert>
          <AlertTitle>TODO · OAuth / IMAP</AlertTitle>
          <AlertDescription>
            חיבור Gmail או IMAP אמיתי דורש הרשאות ארגוניות ומסך הסכמה. לא חוסמים את ה-MVP בשביל זה. בינתיים: ייבוא מרובה
            מתיקייה + חבילת ZIP להנה״ח.
          </AlertDescription>
        </Alert>

        <CompactPanel title="מה יקרה בחיבור האמיתי" description={`תיבת ${COMPANY.accountantEmail} או תיבה ייעודית של הסניף`}>
          <ol className="list-decimal space-y-1 ps-5 text-sm leading-6">
            <li>מנהל הרשת מאשר גישה לקריאה בלבד לתיקיית «חשבוניות».</li>
            <li>כל קובץ מצורף (PDF / תמונה) נכנס לתור הסיווג כמו ייבוא מתיקייה.</li>
            <li>אחרי שיבוץ לקטגוריה אפשר לכלול אותו בחבילת החודש לרואה החשבון.</li>
          </ol>
          <p className="mt-2 text-sm text-muted-foreground">
            דגל FEATURE_IMAP לא פעיל ב-MVP הזה בכוונה — בלי מחצית מחבר.
          </p>
        </CompactPanel>

        <div className="flex flex-wrap gap-2">
          <Link href="/invoices/import" className={cn(buttonVariants())}>
            ייבוא מתיקייה / העלאה מרובה
          </Link>
          <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
            חזרה לסיווג
          </Link>
        </div>
      </NarrowForm>
    </div>
  );
}
