import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function BrandLogo({
  variant,
  compact = false,
  className,
}: {
  variant: "rb" | "wb";
  compact?: boolean;
  className?: string;
}) {
  const src = variant === "wb" ? "/brand/logo_vivace_wb.png" : "/brand/logo_vivace_rb.png";

  return (
    <div className={cn("flex flex-col items-start", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${COMPANY.name} ${COMPANY.tagline}`}
        className={cn("w-auto object-contain object-right", compact ? "h-10" : "h-14")}
      />
      <p
        className={cn(
          "mt-1 text-[11px] tracking-wide",
          variant === "wb" ? "text-sidebar-foreground/70" : "text-muted-foreground",
        )}
      >
        {COMPANY.tagline} · רכש ומלאי
      </p>
    </div>
  );
}
