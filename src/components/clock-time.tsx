import { formatClockTime, normalizeClockTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Renders HH:MM in isolated LTR so RTL pages do not reverse 14:00 → 00:14. */
export function ClockTime({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const normalized = normalizeClockTime(value);
  return (
    <time dir="ltr" dateTime={normalized} className={cn("inline-block tabular-nums", className)}>
      {formatClockTime(normalized)}
    </time>
  );
}
