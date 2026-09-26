"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  LogOut,
  MapPin,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { SendToSuppliersToggle } from "@/components/orders/send-to-suppliers-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { appRoleLabel, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

function SheetRow({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-sm font-medium",
        active && "border-primary/40 bg-primary/5",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronLeft className="size-4 text-muted-foreground" />
    </Link>
  );
}

export function ProfileSheet({
  open,
  onOpenChange,
  userName,
  appRole,
  branchLabel,
  initials,
  authEnabled,
  canSettings,
  canActivity,
  canUsers,
  canToggleSend,
  canChat,
  sendToSuppliers,
  pathname,
  onOpenChat,
  onOpenBranch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string | null;
  appRole: AppRole | null;
  branchLabel: string;
  initials: string;
  authEnabled: boolean;
  canSettings: boolean;
  canActivity: boolean;
  canUsers: boolean;
  canToggleSend: boolean;
  canChat: boolean;
  sendToSuppliers: boolean;
  pathname: string;
  onOpenChat: () => void;
  onOpenBranch: () => void;
}) {
  const close = () => onOpenChange(false);
  const roleLine = [appRole ? appRoleLabel(appRole) : null, branchLabel].filter(Boolean).join(" · ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[88vh] gap-3 overflow-y-auto rounded-t-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <SheetTitle className="truncate text-base font-bold">{userName || "משתמש"}</SheetTitle>
            <p className="truncate text-xs text-muted-foreground">{roleLine}</p>
          </div>
          <SheetClose className="ms-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-label="סגירה">
            <X className="size-5" />
          </SheetClose>
        </div>

        <div className="flex flex-col gap-2">
          {canChat ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-start text-sm font-medium"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <span className="flex-1">עוזר Vivace</span>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenBranch}
            className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-start text-sm font-medium"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-4" />
            </span>
            <span className="flex-1">מעבר סניף</span>
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
          {canSettings ? (
            <SheetRow
              href="/settings"
              label="הגדרות"
              icon={<Settings className="size-4" />}
              active={pathname.startsWith("/settings") && !pathname.startsWith("/settings/activity")}
              onNavigate={close}
            />
          ) : null}
          {canActivity ? (
            <SheetRow
              href="/settings/activity"
              label="פעילות"
              icon={<Clock className="size-4" />}
              active={pathname.startsWith("/settings/activity")}
              onNavigate={close}
            />
          ) : null}
          {canUsers ? (
            <SheetRow
              href="/settings/users"
              label="ניהול משתמשים"
              icon={<Users className="size-4" />}
              active={pathname.startsWith("/settings/users")}
              onNavigate={close}
            />
          ) : null}
        </div>

        {canToggleSend ? (
          <div className="rounded-2xl border bg-card px-3 py-3">
            <SendToSuppliersToggle enabled={sendToSuppliers} label="שליחה אוטומטית לספקים" bare />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-3 py-3">
          <span className="text-sm font-medium">תצוגה</span>
          <ThemeToggle />
        </div>

        {authEnabled ? (
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card px-3 py-3 text-sm font-semibold text-destructive"
            >
              <LogOut className="size-4" />
              התנתקות
            </button>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
