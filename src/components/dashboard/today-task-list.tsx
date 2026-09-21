import Link from "next/link";
import { Check } from "lucide-react";
import { ClockTime } from "@/components/clock-time";
import { formatIls } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TodayTaskList({
  items,
}: {
  items: { id: string; href: string; title: string; meta?: string; done: boolean }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">אין משימות להיום.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm",
              item.done
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
                : "border-border bg-card hover:bg-muted/50",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {item.done ? (
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
              )}
              <span className={cn("truncate", item.done && "line-through decoration-emerald-600/60")}>{item.title}</span>
            </span>
            {item.meta ? <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TodayCutoffMeta({ value }: { value: string }) {
  return (
    <span>
      עד <ClockTime value={value} />
    </span>
  );
}

export function TodayAmountMeta({ value }: { value: number }) {
  return <span>{formatIls(value)}</span>;
}
