"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function MetricHint({
  label,
  hint,
}: {
  label: string;
  hint: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help border-b border-dotted border-muted-foreground/60 text-[11px] leading-tight text-muted-foreground">
        {label}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[16rem] text-start leading-snug">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
