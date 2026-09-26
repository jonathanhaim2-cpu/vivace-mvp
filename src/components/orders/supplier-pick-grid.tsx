import Link from "next/link";
import { CompactField, FilterBar } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";

export function SupplierPickGrid({
  branchId,
  suppliers,
  openSupplierIds,
  query,
  tab,
}: {
  branchId: string;
  suppliers: { id: string; name: string }[];
  openSupplierIds: string[];
  query: string;
  tab: string;
}) {
  const filtered = suppliers.filter((supplier) =>
    supplier.name.toLocaleLowerCase("he").includes(query.trim().toLocaleLowerCase("he")),
  );
  const lists = tab === "lists";

  return (
    <div className="space-y-4 lg:hidden">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1 text-sm">
        <Link
          href={`/orders/new?branch=${branchId}`}
          className={`rounded-full px-3 py-2 text-center ${lists ? "text-muted-foreground" : "bg-card shadow-sm"}`}
        >
          רשימת ספקים
        </Link>
        <Link
          href={`/orders/new?branch=${branchId}&tab=lists`}
          className={`rounded-full px-3 py-2 text-center ${lists ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          רשימות קבועות
        </Link>
      </div>
      {lists ? (
        <p className="rounded-2xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          אין רשימות קבועות עדיין.
        </p>
      ) : (
        <>
          <FilterBar>
            <CompactField label="חיפוש ספק" htmlFor="supplier-q" grow>
              <Input id="supplier-q" name="q" defaultValue={query} placeholder="חיפוש ספק" />
            </CompactField>
            <input type="hidden" name="branch" value={branchId} />
          </FilterBar>
          <ul className="grid grid-cols-2 gap-3">
            {filtered.map((supplier) => {
              const open = openSupplierIds.includes(supplier.id);
              return (
                <li key={supplier.id}>
                  <Link
                    href={`/orders/new?branch=${branchId}&supplierId=${supplier.id}`}
                    className="flex min-h-36 flex-col rounded-2xl border bg-card p-3 shadow-[var(--shadow-card)]"
                  >
                    {open ? (
                      <span className="mb-2 w-fit rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] text-brand-green">
                        הזמנה פתוחה
                      </span>
                    ) : (
                      <span className="mb-2 h-5" />
                    )}
                    <span className="flex size-16 items-center justify-center self-center rounded-xl bg-muted text-xl font-semibold text-brand-green">
                      {supplier.name.trim().slice(0, 1)}
                    </span>
                    <span className="mt-auto pt-3 text-center text-sm font-medium">{supplier.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
