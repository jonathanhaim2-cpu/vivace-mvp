import { APP_ROLE_LABELS, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

const TONE: Record<AppRole, string> = {
  admin: "border-primary/30 bg-primary/10 text-primary",
  accounting: "border-border bg-secondary text-secondary-foreground",
  branch_manager: "border-border bg-card text-foreground",
  edge_worker: "border-border bg-muted text-muted-foreground",
};

export function RoleChip({
  role,
  name,
  compact = false,
}: {
  role: AppRole;
  name?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE[role],
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />
      {name ? (
        <>
          <span className="truncate">{name}</span>
          {compact ? null : <span className="text-current/50">·</span>}
          {compact ? null : <span className="shrink-0">{APP_ROLE_LABELS[role]}</span>}
        </>
      ) : (
        <span>{APP_ROLE_LABELS[role]}</span>
      )}
    </span>
  );
}
