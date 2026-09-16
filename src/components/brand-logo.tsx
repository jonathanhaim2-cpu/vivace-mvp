import Image from "next/image";

import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LIGHT_SRC = "/vivace-logo.png";
const DARK_SRC = "/vivace-logo-dark.png";

function LogoMark({
  src,
  alt,
  compact,
  priority,
  className,
}: {
  src: string;
  alt: string;
  compact: boolean;
  priority: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={577}
      height={337}
      sizes={compact ? "160px" : "(min-width: 1024px) 14rem, 20rem"}
      priority={priority}
      className={cn(
        "h-auto max-w-full bg-transparent object-contain object-center",
        compact ? "max-h-10 w-auto" : "w-full",
        className,
      )}
    />
  );
}

export function BrandLogo({
  variant = "auto",
  compact = false,
  showTagline = false,
  className,
}: {
  variant?: "rb" | "wb" | "auto";
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  const alt = `${COMPANY.wordmark} ${COMPANY.tagline}`;

  return (
    <div className={cn("flex w-full min-w-0 max-w-full flex-col items-center", className)}>
      {variant === "wb" ? (
        <LogoMark src={DARK_SRC} alt={alt} compact={compact} priority={!compact} />
      ) : variant === "rb" ? (
        <LogoMark src={LIGHT_SRC} alt={alt} compact={compact} priority={!compact} />
      ) : (
        <>
          <LogoMark src={LIGHT_SRC} alt={alt} compact={compact} priority={!compact} className="dark:hidden" />
          <LogoMark src={DARK_SRC} alt={alt} compact={compact} priority={!compact} className="hidden dark:block" />
        </>
      )}
      {showTagline ? (
        <p
          className={cn(
            "mt-1 text-[11px] tracking-wide",
            variant === "wb" ? "text-sidebar-foreground/70" : "text-muted-foreground",
          )}
        >
          {COMPANY.tagline} · רכש ומלאי
        </p>
      ) : null}
    </div>
  );
}
