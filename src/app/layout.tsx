import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Rubik } from "next/font/google";
import { DirectionProvider } from "@/components/ui/direction";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { COMPANY } from "@/lib/constants";
import { isAuthEnabled } from "@/lib/auth";
import { getAiRuntime } from "@/lib/ai";
import { listChatMessages } from "@/actions/chat";
import { getAppSession, sessionCan } from "@/lib/session";
import { listDueCutoffReminders } from "@/lib/reminders";
import { getSendToSuppliersEnabled } from "@/lib/whatsapp-routing";
import { requiredPermissionForPath } from "@/lib/roles";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: `${COMPANY.wordmark} · ${COMPANY.tagline} · רכש ומלאי`,
  description: `מערכת רכש ומלאי ל-${COMPANY.nameHe} (${COMPANY.tagline}, ע.מ ${COMPANY.taxId})`,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  const pathname = (await headers()).get("x-vivace-path") ?? "/";
  const authEnabled = isAuthEnabled();

  if (pathname !== "/login" && authEnabled && !session.user) {
    redirect(`/login?from=${encodeURIComponent(pathname)}`);
  }

  const needed = requiredPermissionForPath(pathname);
  if (pathname !== "/login" && needed && !sessionCan(session, needed)) {
    if (pathname !== "/forbidden") redirect("/forbidden");
  }

  const [runtime, chatMessages, dueReminders, sendToSuppliers] = await Promise.all([
    getAiRuntime(),
    sessionCan(session, "nav.chat") ? listChatMessages() : Promise.resolve([]),
    listDueCutoffReminders({
      branchId: session.branchId,
      isNetwork: session.isNetwork,
    }),
    getSendToSuppliersEnabled(),
  ]);

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <DirectionProvider direction="rtl">
            <TooltipProvider>
              <AppShell
                appRole={session.appRole}
                userName={session.user?.name ?? null}
                permissions={session.permissions}
                branchId={session.branchId}
                branches={session.branches}
                authEnabled={authEnabled}
                aiAvailable={runtime.available}
                chatMessages={chatMessages}
                dueReminders={dueReminders}
                sendToSuppliers={sendToSuppliers}
              >
                {children}
              </AppShell>
              <Toaster />
            </TooltipProvider>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
