import { logout } from "@/actions/auth";
import { createBranch } from "@/actions/branches";
import { saveAccountantExportSettings } from "@/actions/settings";
import { ForecastInputForm } from "@/components/dashboard/forecast-form";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { getAccountantExportConfig } from "@/lib/accountant-export";
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
  const [runtime, session, forecast, sendToSuppliers, accountant] = await Promise.all([
    getAiRuntime(),
    getAppSession(),
    getForecastTurnover(),
    getSendToSuppliersEnabled(),
    getAccountantExportConfig(),
  ]);
  const providerLabel =
    runtime.provider === "google" ? "Google Gemini Flash" : runtime.provider === "openai" ? "OpenAI" : "אין ספק";

  return (
    <div className="space-y-3">
      <SettingsNav permissions={session.permissions} />
      <PageHeader
        title="הגדרות"
        description="משתמשים, הרשאות, סניפים והגדרות מערכת. סיסמאות נשמרות מוצפנות — אין סודות בקוד."
      />

      {runtime.reason === "no_key" ? <AiMissingBanner /> : null}

      {sessionCan(session, "action.manage_users") ||
      sessionCan(session, "action.manage_permissions") ||
      sessionCan(session, "nav.activity") ? (
        <CompactPanel title="ניהול גישה">
          <div className="flex flex-wrap gap-2">
            {sessionCan(session, "action.manage_users") ? (
              <Link href="/settings/users" className={cn(buttonVariants({ size: "sm" }))}>
                משתמשים
              </Link>
            ) : null}
            {sessionCan(session, "action.manage_permissions") ? (
              <Link href="/settings/permissions" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                טבלת הרשאות
              </Link>
            ) : null}
            {sessionCan(session, "nav.activity") ? (
              <Link href="/settings/activity" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                לוג פעילות
              </Link>
            ) : null}
            {sessionCan(session, "action.manage_settings") ? (
              <Link href="/categories" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                קטגוריות מוצרים
              </Link>
            ) : null}
            <Link href="/ap" className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
              תשלומים להנה״ח
            </Link>
          </div>
        </CompactPanel>
      ) : null}

      {sessionCan(session, "action.toggle_send_to_suppliers") ? (
        <CompactPanel
          title="שליחה לספקים"
          description="כבוי: וואטסאפ נפתח למספר של רועי. דולק: כל הזמנה נשלחת למספר האמיתי של הספק."
        >
          <SendToSuppliersToggle enabled={sendToSuppliers} />
        </CompactPanel>
      ) : null}

      {sessionCan(session, "action.manage_settings") ? (
        <CompactPanel
          title="ייצוא להנה״ח"
          description="וואטסאפ מועדף. אם אין Business API — ZIP / מייל / תיקייה. תעודות משלוח וגילול לא נכנסים לחבילה."
        >
          <CompactForm action={saveAccountantExportSettings}>
            <CompactField label="וואטסאפ הנה״ח" htmlFor="accountantWhatsapp">
              <Input
                id="accountantWhatsapp"
                name="accountantWhatsapp"
                defaultValue={accountant.whatsappPhone}
                placeholder="0500000000"
              />
            </CompactField>
            <CompactField label="מייל הנה״ח" htmlFor="accountantEmail" grow>
              <Input
                id="accountantEmail"
                name="accountantEmail"
                type="email"
                defaultValue={accountant.email}
                placeholder="accountant@example.com"
              />
            </CompactField>
            <CompactField label="תיקייה / רמז העלאה" htmlFor="accountantFolder" grow>
              <Input
                id="accountantFolder"
                name="accountantFolder"
                defaultValue={accountant.folderHint}
                placeholder="הורדת ZIP למחשב / תיקיית הנה״ח"
              />
            </CompactField>
            <Button type="submit">שמירה</Button>
          </CompactForm>
          <p className="mt-2 text-[11px] text-muted-foreground">
            <Link href="/invoices/package" className="text-primary hover:underline">
              חבילה להנה״ח
            </Link>
            {" · "}
            <Link href="/expenses" className="text-primary hover:underline">
              הוצאות קבועות
            </Link>
          </p>
        </CompactPanel>
      ) : null}

      {sessionCan(session, "action.manage_settings") ? (
        <CompactPanel
          title="מחזור מכירות חזוי"
          description="קלט חודשי לדשבורד מילוי קטגוריות."
        >
          <ForecastInputForm forecast={forecast} />
        </CompactPanel>
      ) : null}

      <CompactPanel
        title="סניפים"
        description={
          sessionCan(session, "action.manage_settings")
            ? "סניפי הרשת: בית שמש וקרית יערים. אפשר להוסיף סניף נוסף כאן."
            : undefined
        }
      >
        {session.branches.length === 0 ? (
          <p className="mb-2 text-sm text-muted-foreground">אין סניפים עדיין.</p>
        ) : (
          <ul className="mb-2 space-y-0.5 text-sm">
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
          <CompactForm action={createBranch}>
            <CompactField label="שם סניף" htmlFor="name">
              <Input id="name" name="name" required placeholder="למשל: בית שמש" />
            </CompactField>
            <CompactField label="כתובת" htmlFor="address">
              <Input id="address" name="address" placeholder="יצחק 27" />
            </CompactField>
            <CompactField label="טלפון" htmlFor="phone">
              <Input id="phone" name="phone" placeholder="0526408537" />
            </CompactField>
            <CompactField label="איש קשר" htmlFor="contactName">
              <Input id="contactName" name="contactName" placeholder="רועי" />
            </CompactField>
            <Button type="submit">הוספת סניף</Button>
          </CompactForm>
        ) : null}
      </CompactPanel>

      <CompactPanel
        title="מועצת הצמחים"
        description="אין משיכה אוטומטית של מחירון יומי ב-MVP. מסמנים «רלוונטי» אצל הספק; המוצרים יורשים וניתן לכבות למוצר בודד."
      >
        <p className="text-sm text-muted-foreground">
          עריכה בכרטיס הספק. ברירת מחדל:{" "}
          <a href="https://www.plants.org.il/" className="text-primary hover:underline" target="_blank" rel="noreferrer">
            plants.org.il
          </a>
        </p>
      </CompactPanel>

      <CompactPanel
        title={`שימוש ב-AI · ${monthLabel(runtime.month)}`}
        description={`${providerLabel} · ${runtime.available ? "מוכן לניתוח" : runtime.reason === "budget" ? "חריגה מתקציב" : "שיוך ידני"}`}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>קריאות {runtime.calls}</span>
          <span>עלות משוערת ${runtime.estimatedUsd.toFixed(3)}</span>
          <span>
            תקרה {runtime.budgetUsd != null ? `$${runtime.budgetUsd}` : "ללא (AI_MONTHLY_BUDGET_USD)"}
          </span>
        </div>
      </CompactPanel>

      <CompactPanel
        title="כניסה למערכת"
        description="כל משתמש נכנס עם שם משתמש וסיסמה. jonathan / roi נוצרים מ־APP_PASSWORD בפריסה הראשונה."
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p className="text-muted-foreground">
            {isAuthEnabled()
              ? "שער הכניסה פעיל. התפריט מותאם להרשאות."
              : "שער הכניסה כבוי (אין APP_PASSWORD) — פיתוח מקומי, תפקיד אדמין."}
          </p>
          {isAuthEnabled() ? (
            <form action={logout}>
              <Button type="submit" size="sm" variant="outline">
                יציאה
              </Button>
            </form>
          ) : null}
        </div>
      </CompactPanel>
    </div>
  );
}
