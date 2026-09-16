import type { Metadata } from "next";
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
import { getAppSession } from "@/lib/session";
import { listDueCutoffReminders } from "@/lib/reminders";
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
  const [runtime, chatMessages, dueReminders] = await Promise.all([
    getAiRuntime(),
    listChatMessages(),
    listDueCutoffReminders({
      branchId: session.branchId,
      isNetwork: session.isNetwork,
    }),
  ]);

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <DirectionProvider direction="rtl">
            <TooltipProvider>
              <AppShell
                role={session.role}
                branchId={session.branchId}
                branches={session.branches}
                authEnabled={isAuthEnabled()}
                aiAvailable={runtime.available}
                chatMessages={chatMessages}
                dueReminders={dueReminders}
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
