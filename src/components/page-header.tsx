import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className={cn(buttonVariants(), "self-start")}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Single-column create/edit forms. Lists and dashboards stay full-bleed in AppShell. */
export function NarrowForm({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  /** Multi-column supplier/product grids — still capped, not viewport-wide. */
  wide?: boolean;
}) {
  return <div className={cn(wide ? "max-w-5xl" : "max-w-3xl", className)}>{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="app-card rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? (
        <Link href={action.href} className={cn(buttonVariants(), "mt-4 inline-flex")}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
