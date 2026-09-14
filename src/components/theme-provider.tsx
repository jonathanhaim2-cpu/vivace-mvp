"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export const THEME_STORAGE_KEY = "vivace-theme";
export const APP_THEMES = ["light", "dark", "soft"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      themes={[...APP_THEMES]}
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}
