import { logout } from "@/actions/auth";
import { createBranch } from "@/actions/branches";
import { PageHeader } from "@/components/page-header";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAiRuntime } from "@/lib/ai";
import { isAuthEnabled } from "@/lib/auth";
import { monthLabel } from "@/lib/months";
import { getAppSession } from "@/lib/session";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [runtime, session] = await Promise.all([getAiRuntime(), getAppSession()]);
  const providerLabel =
    runtime.provider === "google" ? "Google Gemini Flash" : runtime.provider === "openai" ? "OpenAI" : "אין ספק";

  return (
    <div className="space-y-6">
      <PageHeader
        title="הגדרות"
        description="מפתחות AI וסיסמת כניסה מגיעים רק ממשתני סביבה. אין סודות בקוד."
      />

      {runtime.reason === "no_key" ? <AiMissingBanner /> : null}

      <Card>
        <CardHeader>
          <CardTitle>סניפים</CardTitle>
          <CardDescription>
            ה-seed לא יוצר סניפי דמו. הוסיפו כאן סניף אמיתי לפני הזמנות, מלאי ופחת.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין סניפים עדיין.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {session.branches.map((branch) => (
                <li key={branch.id}>
                  <span className="font-medium">{branch.name}</span>
                  {branch.address ? <span className="text-muted-foreground"> · {branch.address}</span> : null}
                </li>
              ))}
            </ul>
          )}
          <form action={createBranch} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="name">שם סניף</FieldLabel>
              <Input id="name" name="name" required placeholder="למשל: הרצליה" />
            </Field>
            <Field>
              <FieldLabel htmlFor="address">כתובת (אופציונלי)</FieldLabel>
              <Input id="address" name="address" placeholder="רחוב, עיר" />
            </Field>
            <Button type="submit">הוספת סניף</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>קטגוריות מוצרים</CardTitle>
          <CardDescription>אב ותת־קטגוריה לשיבוץ במחירון. לא מעמיסים את התפריט הראשי.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/categories" className={cn(buttonVariants())}>
            ניהול קטגוריות
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מועצת הצמחים</CardTitle>
          <CardDescription>
            אין משיכה אוטומטית של מחירון יומי ב-MVP. אצל ספק תוצרת שומרים קישור ידני ואחוז קבוע מתחת לרשימה.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            עריכה בכרטיס הספק, תחת «סניפים + מועצת הצמחים». ברירת מחדל לקישור:{" "}
            <a href="https://www.plants.org.il/" className="text-primary hover:underline" target="_blank" rel="noreferrer">
              plants.org.il
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תשלומים להנה״ח</CardTitle>
          <CardDescription>כרטסת לספקים, אישור לתשלום, וצ׳קליסט הוצאות לא מרכש.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/ap" className={cn(buttonVariants())}>
            לוח AP
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>שימוש ב-AI</CardTitle>
          <CardDescription>
            ספירה גסה של קריאות ניתוח חשבוניות בחודש {monthLabel(runtime.month)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Stat label="ספק פעיל" value={providerLabel} />
          <Stat label="סטטוס" value={runtime.available ? "מוכן לניתוח" : runtime.reason === "budget" ? "חריגה מתקציב" : "שיוך ידני"} />
          <Stat label="קריאות החודש" value={String(runtime.calls)} />
          <Stat label="עלות משוערת" value={`$${runtime.estimatedUsd.toFixed(3)}`} />
          <Stat
            label="תקרה חודשית"
            value={runtime.budgetUsd != null ? `$${runtime.budgetUsd}` : "ללא (AI_MONTHLY_BUDGET_USD)"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>כניסה מרוחקת</CardTitle>
          <CardDescription>סיסמה משותפת דרך APP_PASSWORD. רשת/סניף נשמרים אחרי הכניסה.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {isAuthEnabled()
              ? "שער הסיסמה פעיל. רק מי שמחובר יכול לראות הזמנות וחשבוניות."
              : "שער הסיסמה כבוי (אין APP_PASSWORD) — מתאים לפיתוח מקומי בלבד."}
          </p>
          {isAuthEnabled() ? (
            <form action={logout}>
              <Button type="submit" variant="outline">
                יציאה
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
