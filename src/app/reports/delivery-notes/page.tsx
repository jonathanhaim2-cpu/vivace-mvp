import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { getDeliveryNoteReconcile } from "@/lib/delivery-notes";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function DeliveryNotesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKeyFromDate();
  const rows = await getDeliveryNoteReconcile(month);

  return (
    <div className="space-y-4">
      <PageHeader
        title="התאמת תעודות משלוח"
        description={`in-house בלבד — לא נשלח להנה״ח. סוף חודש מול חשבונית מרכזת / גילול. ${monthLabel(month)}.`}
      />
      <FilterBar submitLabel="הצגה">
        <CompactField label="חודש" htmlFor="dn-month">
          <NativeSelect id="dn-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין תעודות משלוח או זיכויי חוסר בחודש זה.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <section key={`${row.supplierName}-${row.branchName}`} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium">
                  {row.supplierName}
                  {row.branchName ? ` · ${row.branchName}` : ""}
                </h2>
                <p className={row.matched ? "text-xs text-emerald-700" : "text-xs text-amber-800"}>
                  {row.matched ? "התאמה" : "לא מותאם"} · משלוח {formatIls(row.deliveryTotal)} · חשבוניות{" "}
                  {formatIls(row.invoiceTotal)} · זיכויי חוסר {formatIls(row.creditTotal)}
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {row.deliveryNotes.map((note) => (
                  <li key={note.id}>
                    תעודת משלוח · {note.originalName} · {formatIls(note.amountIls)}
                  </li>
                ))}
                {row.invoices.map((invoice) => (
                  <li key={invoice.id}>
                    חשבונית · {invoice.originalName} · {formatIls(invoice.amountIls)}
                  </li>
                ))}
                {row.credits.map((credit) => (
                  <li key={credit.id}>
                    זיכוי חסר · {credit.title} · {formatIls(credit.amountIls)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        גילול/כרטסת מנוהלים ב<a className="text-primary hover:underline" href="/ap">תשלומים</a> — לא כקטגוריית חשבונית.
      </p>
    </div>
  );
}
