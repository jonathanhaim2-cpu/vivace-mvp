import type { NextOrderWindow } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NextOrderNotice({
  info,
  className,
}: {
  info: NextOrderWindow;
  className?: string;
}) {
  return (
    <div className={cn("text-sm", className)}>
      <p>{info.label}</p>
      {info.warning ? <p className="mt-1 font-medium text-amber-800 dark:text-amber-300">{info.warning}</p> : null}
    </div>
  );
}
