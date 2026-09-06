import { logout } from "@/actions/auth";
import { PageHeader } from "@/components/page-header";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiRuntime } from "@/lib/ai";
import { isAuthEnabled } from "@/lib/auth";
import { monthLabel } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const runtime = await getAiRuntime();
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
