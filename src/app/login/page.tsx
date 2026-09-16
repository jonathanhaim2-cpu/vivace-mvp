import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { login } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_COOKIE, isAuthEnabled, parseSessionToken } from "@/lib/auth";
import { COMPANY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  if (isAuthEnabled()) {
    const cookieStore = await cookies();
    const parsed = parseSessionToken(cookieStore.get(AUTH_COOKIE)?.value);
    if (parsed) {
      const user = await prisma.user.findUnique({
        where: { id: parsed.userId },
        select: { active: true },
      });
      if (user?.active) redirect("/");
    }
  }

  const { error, from } = await searchParams;
  const next = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute top-4 end-4">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card-lg)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <BrandLogo variant="auto" showTagline />
          <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground">
            {COMPANY.nameHe} · ע.מ {COMPANY.taxId}
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">כניסה למערכת</h1>
          <p className="mt-2 text-sm text-muted-foreground">שם משתמש וסיסמה אישיים — לא סיסמה משותפת.</p>
        </div>
        {error === "1" ? (
          <p className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            שם משתמש או סיסמה שגויים. נסו שוב.
          </p>
        ) : null}
        {error === "inactive" ? (
          <p className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            המשתמש אינו פעיל. פנו לאדמין.
          </p>
        ) : null}
        <form action={login} className="mt-8 space-y-5">
          <input type="hidden" name="from" value={next} />
          <div className="space-y-2 text-start">
            <Label htmlFor="username">שם משתמש</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required={isAuthEnabled()}
              dir="ltr"
              className="h-11 rounded-xl bg-background text-left shadow-sm"
              placeholder="jonathan"
            />
          </div>
          <div className="space-y-2 text-start">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required={isAuthEnabled()}
              dir="ltr"
              className="h-11 rounded-xl bg-background text-left shadow-sm"
            />
          </div>
          <Button type="submit" className="h-11 w-full text-base">
            כניסה
          </Button>
        </form>
      </div>
    </div>
  );
}
