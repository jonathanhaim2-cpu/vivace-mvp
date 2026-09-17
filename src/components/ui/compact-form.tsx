import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared native <select> / compact control chrome — matches Input height. */
export const nativeControlClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50";

export const accentCheckboxClassName = "size-4 shrink-0 accent-[var(--brand-red)]";

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(nativeControlClassName, className)} {...props} />;
}

/** Tight card chrome for a create/edit toolbar — not a marketing card. */
export function CompactPanel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "app-card rounded-xl border border-border/80 bg-card px-3 py-2.5",
        className,
      )}
    >
      {title ? (
        <header className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", children ? "mb-2" : "")}>
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {description ? <p className="text-xs leading-snug text-muted-foreground">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** RTL-aware wrapping row: fields inline, primary action last in DOM (end side). */
export function CompactForm({ className, ...props }: ComponentProps<"form">) {
  return <form className={cn("flex flex-wrap items-end gap-x-2 gap-y-2", className)} {...props} />;
}

export function CompactField({
  label,
  htmlFor,
  hint,
  className,
  grow,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  grow?: boolean;
  children: ReactNode;
}) {
  const hintId = htmlFor && hint ? `${htmlFor}-hint` : undefined;
  return (
    <div
      role="group"
      aria-labelledby={htmlFor ? `${htmlFor}-label` : undefined}
      aria-describedby={hintId}
      className={cn("flex min-w-[8.5rem] flex-col gap-1", grow && "min-w-[11rem] flex-1", className)}
    >
      <label
        id={htmlFor ? `${htmlFor}-label` : undefined}
        htmlFor={htmlFor}
        title={hint}
        className="text-[11px] font-medium leading-none text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function CompactCheck({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("inline-flex h-8 items-center gap-1.5 text-sm whitespace-nowrap", className)}
      {...props}
    />
  );
}

/** Full-width wrap row for secondary details (branches, long hints). */
export function CompactRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex w-full basis-full flex-wrap items-center gap-x-3 gap-y-1", className)}
      {...props}
    />
  );
}

/** GET filter toolbar for list pages — month, status, branch, search. */
export function FilterBar({
  children,
  className,
  submitLabel = "סינון",
}: {
  children: ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  return (
    <form
      method="get"
      className={cn(
        "mb-3 flex w-fit max-w-full flex-wrap items-end gap-2 rounded-xl border border-border/80 bg-card px-3 py-2",
        className,
      )}
    >
      {children}
      <Button type="submit" size="sm" variant="outline">
        {submitLabel}
      </Button>
    </form>
  );
}
