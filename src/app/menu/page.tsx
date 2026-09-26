import Link from "next/link";
import { ClipboardList, FileText, PackageCheck, ShoppingCart, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const TILES = [
  { href: "/orders/new", label: "הזמנה חדשה", icon: ShoppingCart },
  { href: "/orders", label: "כל ההזמנות", icon: ClipboardList },
  { href: "/receiving", label: "קליטת סחורה", icon: PackageCheck },
  { href: "/invoices", label: "מסמכים וחשבוניות", icon: FileText },
  { href: "/credits", label: "זיכויים פתוחים", icon: Undo2 },
];

export default async function MobileMenuPage() {
  const session = await getAppSession();
  const branchName = session.isNetworkOffice ? "משרד רשת" : session.branch?.name ?? "אין סניף";

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeader title="תפריט" description="פעולות הסניף במסך אחד." />
      <article className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <p className="text-xs text-muted-foreground">סניף</p>
        <p className="text-lg font-semibold">{branchName}</p>
        {session.user?.name ? <p className="text-sm text-muted-foreground">{session.user.name}</p> : null}
      </article>
      <ul className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <li key={tile.href}>
              <Link
                href={tile.href}
                className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-4 text-center shadow-[var(--shadow-card)]"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-medium">{tile.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
