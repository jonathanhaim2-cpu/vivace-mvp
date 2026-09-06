import { notFound } from "next/navigation";
import { saveInventoryCount, submitInventoryCount } from "@/actions/inventory";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
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
        description={`${formatDate(count.countedOn)} · ${open ? "פתוחה לעריכה" : "נסגרה"}`}
      />

      <form action={saveInventoryCount.bind(null, count.id)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="countedOn">תאריך</FieldLabel>
            <Input id="countedOn" name="countedOn" type="date" defaultValue={dateValue} disabled={!open} />
          </Field>
          <Field>
            <FieldLabel htmlFor="notes">הערות</FieldLabel>
            <Textarea id="notes" name="notes" defaultValue={count.notes ?? ""} disabled={!open} />
          </Field>
        </div>
        <div className="space-y-2">
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
        {open ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit">שמירת כמויות</Button>
          </div>
        ) : null}
      </form>
      {open ? (
        <form action={submitInventoryCount.bind(null, count.id)}>
          <Button type="submit" variant="outline">
            סגירת ספירה
          </Button>
        </form>
      ) : null}
    </div>
  );
}
