"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { BranchSwitcherSheet } from "@/components/mobile/branch-switcher-sheet";
import { ProfileSheet } from "@/components/mobile/profile-sheet";
import { userInitials } from "@/lib/mobile-nav";
import type { AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Branch = { id: string; name: string };

export function MobileChrome({
  userName,
  appRole,
  branchId,
  branchLabel,
  branches,
  allowNetwork,
  exceptionCount,
  authEnabled,
  canSettings,
  canActivity,
  canUsers,
  canToggleSend,
  canChat,
  sendToSuppliers,
  onOpenChat,
}: {
  userName: string | null;
  appRole: AppRole | null;
  branchId: string | null;
  branchLabel: string;
  branches: Branch[];
  allowNetwork: boolean;
  exceptionCount: number;
  authEnabled: boolean;
  canSettings: boolean;
  canActivity: boolean;
  canUsers: boolean;
  canToggleSend: boolean;
  canChat: boolean;
  sendToSuppliers: boolean;
  onOpenChat: () => void;
}) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const initials = userInitials(userName);

  return (
    <div className="flex h-14 items-center gap-2 px-4 lg:hidden">
      <Link href="/" className="shrink-0" aria-label="Vivace">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo_vivace_rb.png" alt="Vivace" className="h-10 w-auto" />
      </Link>
      <button
        type="button"
        onClick={() => setBranchOpen(true)}
        className="inline-flex h-8 max-w-[46%] items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[13px] font-medium shadow-sm"
      >
        <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{branchLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      <div className="flex-1" />
      <Link
        href="/?view=ops#exceptions"
        aria-label={exceptionCount > 0 ? `חריגים, ${exceptionCount}` : "חריגים"}
        className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
      >
        <Bell className="size-[18px]" />
        {exceptionCount > 0 ? (
          <span
            className={cn(
              "absolute -top-1 -start-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground",
              exceptionCount < 10 ? "size-4" : "h-4",
            )}
          >
            {exceptionCount > 9 ? "9+" : exceptionCount}
          </span>
        ) : null}
      </Link>
      <button
        type="button"
        aria-label="פרופיל"
        onClick={() => setProfileOpen(true)}
        className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {initials}
      </button>
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userName={userName}
        appRole={appRole}
        branchLabel={branchLabel}
        initials={initials}
        authEnabled={authEnabled}
        canSettings={canSettings}
        canActivity={canActivity}
        canUsers={canUsers}
        canToggleSend={canToggleSend}
        canChat={canChat}
        sendToSuppliers={sendToSuppliers}
        pathname={pathname}
        onOpenChat={() => {
          setProfileOpen(false);
          onOpenChat();
        }}
        onOpenBranch={() => {
          setProfileOpen(false);
          setBranchOpen(true);
        }}
      />
      <BranchSwitcherSheet
        open={branchOpen}
        onOpenChange={setBranchOpen}
        branches={branches}
        branchId={branchId}
        allowNetwork={allowNetwork}
      />
    </div>
  );
}
