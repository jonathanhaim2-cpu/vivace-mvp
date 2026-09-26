import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { visibleAppNav } from "@/lib/app-nav";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MobileMenuPage() {
  const session = await getAppSession();
  const branchName = session.isNetworkOffice ? "משרד רשת" : session.branch?.name ?? "אין סניף";
  const items = visibleAppNav(session.permissions);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeader title="תפריט" description="אותם סעיפים כמו בתפריט הצד." />
      <article className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <p className="text-xs text-muted-foreground">סניף</p>
        <p className="text-lg font-semibold">{branchName}</p>
        {session.user?.name ? <p className="text-sm text-muted-foreground">{session.user.name}</p> : null}
      </article>
      <div className="space-y-4">
        {items.map((item) =>
          item.children ? (
            <section key={item.id}>
              <h2 className="mb-2 px-1 text-sm font-bold">{item.label}</h2>
              <ul className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
                {item.children.map((child) => (
                  <li key={`${item.id}-${child.href}`} className="border-b border-border last:border-b-0">
                    <Link href={child.href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                      <span>{child.label}</span>
                      <ChevronLeft className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-sm font-semibold shadow-[var(--shadow-card)]"
            >
              <span>{item.label}</span>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
