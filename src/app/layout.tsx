import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { DirectionProvider } from "@/components/ui/direction";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { COMPANY } from "@/lib/constants";
import { isAuthEnabled } from "@/lib/auth";
import { getAppSession } from "@/lib/session";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: `${COMPANY.name} · רכש ומלאי`,
  description: `מערכת רכש, הזמנות וקליטת סחורה ל-${COMPANY.nameHe} (עוסק מורשה ${COMPANY.taxId})`,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getAppSession();

  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <DirectionProvider direction="rtl">
          <TooltipProvider>
            <AppShell
              role={session.role}
              branchId={session.branchId}
              branches={session.branches}
              authEnabled={isAuthEnabled()}
            >
              {children}
            </AppShell>
            <Toaster />
          </TooltipProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
