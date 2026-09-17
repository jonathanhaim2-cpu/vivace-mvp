"use client";

import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function AuditInfoButton({
  stamp,
  className,
}: {
  stamp: string;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-8 shrink-0 text-muted-foreground hover:text-foreground print:hidden",
              className,
            )}
            aria-label="מי ביצע ומתי"
          />
        }
        onClick={(event) => event.stopPropagation()}
      >
        <InfoIcon className="size-3.5" />
        <span className="sr-only">מי ביצע ומתי</span>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle className="sr-only">מי ביצע ומתי</PopoverTitle>
        <p className="text-sm leading-snug">{stamp}</p>
      </PopoverContent>
    </Popover>
  );
}
