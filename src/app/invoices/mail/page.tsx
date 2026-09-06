import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function MailConnectionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="חיבור מייל"
        description="סנכרון תיבת הנהלת החשבונות מתוכנן לשלב הבא. כרגע הייבוא מדמה משיכה מתיקייה."
      />

      <Alert>
        <AlertTitle>TODO · OAuth / IMAP</AlertTitle>
        <AlertDescription>
          חיבור Gmail או IMAP אמיתי דורש הרשאות ארגוניות ומסך הסכמה. לא חוסמים את ה-MVP בשביל זה. בינתיים: ייבוא מרובה
          מתיקייה + חבילת ZIP להנה״ח.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>מה יקרה בחיבור האמיתי</CardTitle>
          <CardDescription>תיבת {COMPANY.accountantEmail} או תיבה ייעודית של הסניף</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-6">
          <p>1. מנהל הרשת מאשר גישה לקריאה בלבד לתיקיית «חשבוניות».</p>
          <p>2. כל קובץ מצורף (PDF / תמונה) נכנס לתור הסיווג כמו ייבוא מתיקייה.</p>
          <p>3. אחרי שיבוץ לכרטיס בן אפשר לכלול אותו בחבילת החודש לרואה החשבון.</p>
          <p className="text-muted-foreground">דגל FEATURE_IMAP לא פעיל ב-MVP הזה בכוונה — בלי מחצית מחבר.</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/invoices/import" className={cn(buttonVariants())}>
          ייבוא מתיקייה / העלאה מרובה
        </Link>
        <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
          חזרה לסיווג
        </Link>
      </div>
    </div>
  );
}
