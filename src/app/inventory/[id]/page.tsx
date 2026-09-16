import { notFound } from "next/navigation";
import { saveInventoryCount, submitInventoryCount } from "@/actions/inventory";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { INVENTORY_KIND } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { inventoryKindLabel } from "@/lib/order-standards";
import { prisma } from "@/lib/prisma";

export default async function InventoryCountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: {
      branch: true,
      lines: { include: { product: { include: { supplier: true } } }, orderBy: { product: { name: "asc" } } },
    },
  });
  if (!count) notFound();
  const dateValue = count.countedOn.toISOString().slice(0, 10);
  const open = count.status === "OPEN";

  return (
    <div className="space-y-5">
      <PageHeader
        title={`ספירה · ${count.branch.name}`}
        description={`${formatDate(count.countedOn)} · ${inventoryKindLabel(count.kind)} · ${open ? "פתוחה לעריכה" : "נסגרה"}`}
      />

      <CompactForm action={saveInventoryCount.bind(null, count.id)}>
        <CompactField label="תאריך" htmlFor="countedOn">
          <Input id="countedOn" name="countedOn" type="date" defaultValue={dateValue} disabled={!open} />
        </CompactField>
        <CompactField label="סוג ספירה" htmlFor="kind">
          <NativeSelect id="kind" name="kind" defaultValue={count.kind} disabled={!open}>
            <option value={INVENTORY_KIND.START}>תחילת חודש</option>
            <option value={INVENTORY_KIND.END}>סוף חודש</option>
            <option value={INVENTORY_KIND.SPOT}>ספירה נקודתית</option>
          </NativeSelect>
        </CompactField>
        <CompactField label="חודש תקן" htmlFor="periodMonth">
          <Input
            id="periodMonth"
            name="periodMonth"
            type="month"
            dir="ltr"
            defaultValue={count.periodMonth ?? ""}
            disabled={!open}
          />
        </CompactField>
        <CompactField label="הערות" htmlFor="notes" grow>
          <Input id="notes" name="notes" defaultValue={count.notes ?? ""} disabled={!open} />
        </CompactField>
        {open ? <Button type="submit">שמירת כמויות</Button> : null}
        <div className="w-full basis-full space-y-1.5 pt-1">
          {count.lines.map((line) => (
            <div
              key={line.id}
              className="grid items-center gap-2 rounded-lg border bg-card px-3 py-2 sm:grid-cols-[1fr_8rem]"
            >
              <div>
                <p className="text-sm font-medium">{line.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {line.product.supplier.name}
                  {line.product.sku ? ` · ${line.product.sku}` : ""} · מלאי תקן {line.product.stockStandard}
                </p>
              </div>
              <Input
                name={`qty:${line.productId}`}
                type="number"
                min={0}
                step="0.01"
                defaultValue={line.countedQty}
                disabled={!open}
              />
            </div>
          ))}
        </div>
      </CompactForm>
      {open ? (
        <form action={submitInventoryCount.bind(null, count.id)}>
          <Button type="submit" variant="outline">
            {count.kind === INVENTORY_KIND.END ? "סגירה והצעת תקנים" : "סגירת ספירה"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
