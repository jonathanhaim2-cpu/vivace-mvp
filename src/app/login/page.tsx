import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { login } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_COOKIE, isAuthEnabled, isValidSessionToken } from "@/lib/auth";
import { COMPANY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const cookieStore = await cookies();
  if (isAuthEnabled() && isValidSessionToken(cookieStore.get(AUTH_COOKIE)?.value)) {
    redirect("/");
  }
  const { error, from } = await searchParams;
  const next = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] px-4">
      <div className="w-full max-w-sm space-y-6 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center space-y-2 text-center">
          <BrandLogo variant="rb" />
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            {COMPANY.nameHe} · עוסק מורשה {COMPANY.taxId}
          </p>
          <h1 className="text-2xl font-semibold">כניסה ל-{COMPANY.wordmark}</h1>
          <p className="text-sm text-muted-foreground">
            סיסמה משותפת ליונתן ולרועי. בחירת רשת/סניף נשארת אחרי הכניסה.
          </p>
        </div>
        {!isAuthEnabled() ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm">
            אין סיסמה מוגדרת (`APP_PASSWORD`). המערכת פתוחה במצב פיתוח.
          </p>
        ) : null}
        {error === "1" ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            סיסמה שגויה. נסו שוב.
          </p>
        ) : null}
        <form action={login} className="space-y-4">
          <input type="hidden" name="from" value={next} />
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required={isAuthEnabled()}
              dir="ltr"
              className="text-left"
            />
          </div>
          <Button type="submit" className="w-full">
            כניסה
          </Button>
        </form>
      </div>
    </div>
  );
}
