import { logout } from "@/actions/auth";
import { createBranch } from "@/actions/branches";
import { ForecastInputForm } from "@/components/dashboard/forecast-form";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAiRuntime } from "@/lib/ai";
import { isAuthEnabled } from "@/lib/auth";
import { getForecastTurnover } from "@/lib/dashboard";
import { monthLabel } from "@/lib/months";
import { getAppSession, sessionCan } from "@/lib/session";
import { getSendToSuppliersEnabled } from "@/lib/whatsapp-routing";
import { SendToSuppliersToggle } from "@/components/orders/send-to-suppliers-toggle";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [runtime, session, forecast, sendToSuppliers] = await Promise.all([
    getAiRuntime(),
    getAppSession(),
    getForecastTurnover(),
    getSendToSuppliersEnabled(),
  ]);
  const providerLabel =
    runtime.provider === "google" ? "Google Gemini Flash" : runtime.provider === "openai" ? "OpenAI" : "אין ספק";

  return (
    <div className="space-y-6">
      <SettingsNav permissions={session.permissions} />
      <PageHeader
        title="הגדרות"
        description="משתמשים, הרשאות, סניפים והגדרות מערכת. סיסמאות נשמרות מוצפנות — אין סודות בקוד."
      />

      {runtime.reason === "no_key" ? <AiMissingBanner /> : null}

      {sessionCan(session, "action.manage_users") || sessionCan(session, "action.manage_permissions") ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sessionCan(session, "action.manage_users") ? (
            <Card>
              <CardHeader>
                <CardTitle>משתמשים</CardTitle>
                <CardDescription>יצירה, עריכה, השבתה ואיפוס סיסמה לפי תפקיד וסניף.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/users" className={cn(buttonVariants())}>
                  ניהול משתמשים
                </Link>
              </CardContent>
            </Card>
          ) : null}
          {sessionCan(session, "action.manage_permissions") ? (
            <Card>
              <CardHeader>
                <CardTitle>הרשאות</CardTitle>
                <CardDescription>טבלת שליטה: מה כל תפקיד רואה ומה מותר לו לבצע.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/permissions" className={cn(buttonVariants())}>
                  טבלת שליטה
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {sessionCan(session, "action.toggle_send_to_suppliers") ? (
      <Card>
        <CardHeader>
          <CardTitle>שליחה לספקים</CardTitle>
          <CardDescription>
            כבוי (ברירת מחדל): קישורי וואטסאפ נפתחים למספר של רועי 0526408537. דולק: כל הזמנה נשלחת למספר האמיתי של הספק מהמחירון.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SendToSuppliersToggle enabled={sendToSuppliers} />
          <p className="text-sm text-muted-foreground">
            ההגדרה נשמרת ב־AppSetting <span dir="ltr">orders.sendToSuppliers</span> ושורדת רענון. חל על הזמנות ועל בקשות זיכוי בוואטסאפ.
          </p>
        </CardContent>
      </Card>
      ) : null}

      {sessionCan(session, "action.manage_settings") ? (
        <>
      <Card>
        <CardHeader>
          <CardTitle>מחזור מכירות חזוי</CardTitle>
          <CardDescription>קלט חודשי לדשבורד מילוי קטגוריות. נשמר בהגדרה dashboard.forecastTurnoverIls.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastInputForm forecast={forecast} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>סניפים</CardTitle>
          <CardDescription>
            סניפי הרשת: בית שמש וקרית יערים. אפשר להוסיף סניף נוסף כאן.
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
                  {branch.phone ? <span className="text-muted-foreground"> · {branch.phone}</span> : null}
                  {branch.contactName ? <span className="text-muted-foreground"> · {branch.contactName}</span> : null}
                </li>
              ))}
            </ul>
          )}
          {sessionCan(session, "action.manage_settings") ? (
          <form action={createBranch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
            <Field>
              <FieldLabel htmlFor="name">שם סניף</FieldLabel>
              <Input id="name" name="name" required placeholder="למשל: בית שמש" />
            </Field>
            <Field>
              <FieldLabel htmlFor="address">כתובת</FieldLabel>
              <Input id="address" name="address" placeholder="יצחק 27" />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">טלפון</FieldLabel>
              <Input id="phone" name="phone" placeholder="0526408537" />
            </Field>
            <Field>
              <FieldLabel htmlFor="contactName">איש קשר</FieldLabel>
              <Input id="contactName" name="contactName" placeholder="רועי" />
            </Field>
            <Button type="submit" className="sm:col-span-2 lg:col-span-4">
              הוספת סניף
            </Button>
          </form>
          ) : null}
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
        </>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>סניפים</CardTitle>
        </CardHeader>
        <CardContent>
          {session.branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין סניפים עדיין.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {session.branches.map((branch) => (
                <li key={branch.id}>
                  <span className="font-medium">{branch.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>מועצת הצמחים</CardTitle>
          <CardDescription>
            אין משיכה אוטומטית של מחירון יומי ב-MVP. מסמנים «רלוונטי» אצל הספק (ברירת מחדל כבוי); המוצרים יורשים וניתן לכבות למוצר בודד.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            עריכה בכרטיס הספק, תחת «סניפים + מועצת הצמחים». השדות מופיעים רק אחרי סימון רלוונטי. ברירת מחדל לקישור:{" "}
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
          <CardTitle>כניסה למערכת</CardTitle>
          <CardDescription>
            כל משתמש נכנס עם שם משתמש וסיסמה. המשתמשים הראשונים (jonathan / roi) נוצרים אוטומטית מ־APP_PASSWORD בפריסה הראשונה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {isAuthEnabled()
              ? "שער הכניסה פעיל. אחרי ההתחברות מוצג תפקיד המשתמש, והתפריט מותאם להרשאות."
              : "שער הכניסה כבוי (אין APP_PASSWORD) — מתאים לפיתוח מקומי בלבד, עם תפקיד אדמין."}
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
