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
  // Native <img> serves the PNG as-is. next/image optimization can flatten
  // alpha to a black JPEG plate in production, which is the bug in the sidebar.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={577}
      height={337}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "block min-w-0 bg-transparent object-contain object-center",
        compact ? "h-10 w-auto max-w-full" : "h-auto w-full max-w-full",
        className,
      )}
      style={
        compact
          ? { maxWidth: "100%", height: "2.5rem", width: "auto", backgroundColor: "transparent" }
          : { width: "100%", maxWidth: "100%", minWidth: 0, height: "auto", backgroundColor: "transparent" }
      }
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
    <div className={cn("flex w-full min-w-0 max-w-full flex-col items-center overflow-hidden bg-transparent", className)}>
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
