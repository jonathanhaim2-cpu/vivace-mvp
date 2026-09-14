"use client";

import { useEffect, useState } from "react";
import { Eye, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", label: "מצב בהיר", icon: Sun },
  { id: "dark", label: "מצב כהה", icon: Moon },
  { id: "soft", label: "מצב רך", icon: Eye },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? theme : "light";

  return (
    <div
      data-slot="theme-toggle"
      role="group"
      aria-label="בחירת ערכת צבע"
      className={cn(
        "inline-flex rounded-full border border-border bg-card/90 p-0.5 shadow-sm",
        compact ? "gap-0" : "gap-0.5",
      )}
    >
      {THEMES.map(({ id, label, icon: Icon }) => {
        const active = current === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => setTheme(id)}
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-colors",
              compact ? "size-8" : "h-8 gap-1.5 px-2.5",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {compact ? null : <span className="hidden text-xs font-medium lg:inline">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
