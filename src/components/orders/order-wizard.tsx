"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createOrder } from "@/actions/orders";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  describePackaging,
  documentTypeLabel,
  formatDeliveryDays,
  formatIls,
  lineTotal,
  nextDeliveryInfo,
  parseDeliveryDays,
  suggestOrderQty,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  whatsappPhone: string;
  driverName: string | null;
  documentType: string;
  deliveryDays: string;
  orderCutoffTime: string;
  reminderHoursBefore: number;
  weeklyBudgetIls: number | null;
  notes: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  notes: string | null;
  stockStandard: number;
  agreedPrice: number;
  discountPercent: number;
  vatIncluded: boolean;
  cartonToBags: number | null;
  bagsToUnits: number | null;
  packagingNotes: string | null;
};

export function OrderWizard({
  suppliers,
  products,
  selectedSupplierId,
  branchId,
  branchName,
  weeklySpent,
}: {
  suppliers: Supplier[];
  products: Product[];
  selectedSupplierId?: string;
  branchId: string;
  branchName: string;
  weeklySpent: number;
}) {
  const selected = suppliers.find((s) => s.id === selectedSupplierId) ?? null;
  const [qty, setQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const windowInfo = selected
    ? nextDeliveryInfo(parseDeliveryDays(selected.deliveryDays), selected.orderCutoffTime)
    : null;

  const lines = useMemo(
    () =>
      products
        .map((product) => ({ product, qty: qty[product.id] ?? 0 }))
        .filter((line) => line.qty > 0),
    [products, qty],
  );

  const total = lines.reduce(
    (sum, line) => sum + lineTotal(line.qty, line.product.agreedPrice, line.product.discountPercent),
    0,
  );
  const remainingBudget =
    selected?.weeklyBudgetIls != null ? selected.weeklyBudgetIls - weeklySpent - total : null;

  function fillSuggested() {
    if (!selected) return;
    const days = parseDeliveryDays(selected.deliveryDays);
    const next: Record<string, number> = {};
    for (const product of products) {
      next[product.id] = suggestOrderQty(product.stockStandard, days, selected.orderCutoffTime);
    }
    setQty(next);
  }

  if (!selected) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {suppliers.map((supplier) => {
          const info = nextDeliveryInfo(parseDeliveryDays(supplier.deliveryDays), supplier.orderCutoffTime);
          return (
            <Link key={supplier.id} href={`/orders/new?supplierId=${supplier.id}`} className="block">
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader>
                  <CardTitle>{supplier.name}</CardTitle>
                  <CardDescription>{documentTypeLabel(supplier.documentType)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{formatDeliveryDays(supplier.deliveryDays) || "אין ימי אספקה"}</p>
                  <p className={info.open ? "text-primary" : "text-destructive"}>{info.label}</p>
                  {supplier.driverName ? <p className="text-muted-foreground">נהג: {supplier.driverName}</p> : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <form action={createOrder} className="space-y-6">
      <input type="hidden" name="supplierId" value={selected.id} />
      <input type="hidden" name="branchId" value={branchId} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(lines.map((line) => ({ productId: line.product.id, qty: line.qty })))}
      />
      <input type="hidden" name="notesForDriver" value={notes} />

      <Card>
        <CardHeader>
          <CardTitle>{selected.name}</CardTitle>
          <CardDescription>
            הזמנה עבור {branchName} · וואטסאפ {selected.whatsappPhone}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className={windowInfo?.open ? "text-primary" : "text-destructive"}>{windowInfo?.label}</p>
          <p className="text-muted-foreground">
            תזכורת למנהל הסניף {selected.reminderHoursBefore} שעות לפני {selected.orderCutoffTime} (תצוגה בלבד ב-MVP).
          </p>
          {selected.weeklyBudgetIls != null ? (
            <p>
              תקציב שבועי {formatIls(selected.weeklyBudgetIls)} · נוצל עד כה {formatIls(weeklySpent)} · אחרי הזמנה זו{" "}
              <span className={remainingBudget != null && remainingBudget < 0 ? "text-destructive" : ""}>
                {formatIls(remainingBudget ?? 0)}
              </span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" onClick={fillSuggested}>
              מילוי לפי מלאי תקן
            </Button>
            <Link href="/orders/new" className={cn(buttonVariants({ variant: "ghost" }))}>
              החלפת ספק
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">לספק זה אין מוצרים. הוסיפו מוצרים תחילה.</p>
        ) : (
          products.map((product) => {
            const suggested = suggestOrderQty(
              product.stockStandard,
              parseDeliveryDays(selected.deliveryDays),
              selected.orderCutoffTime,
            );
            const value = qty[product.id] ?? 0;
            const pack = describePackaging(value || suggested, product.cartonToBags, product.bagsToUnits);
            return (
              <Card key={product.id} size="sm">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku ? `${product.sku} · ` : ""}
                      {formatIls(product.agreedPrice)}
                      {product.discountPercent ? ` · הנחה ${product.discountPercent}%` : ""}
                      {product.vatIncluded ? " · כולל מע״מ" : " · לפני מע״מ"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      מלאי תקן {product.stockStandard} · הצעה {suggested}
                      {pack ? ` · ${pack}` : ""}
                    </p>
                    {product.packagingNotes ? (
                      <p className="text-xs text-muted-foreground">{product.packagingNotes}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQty((current) => ({
                          ...current,
                          [product.id]: Math.max(0, (current[product.id] ?? 0) - 1),
                        }))
                      }
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      className="w-20 text-center"
                      value={value}
                      onChange={(event) =>
                        setQty((current) => ({
                          ...current,
                          [product.id]: Number(event.target.value) || 0,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQty((current) => ({
                          ...current,
                          [product.id]: (current[product.id] ?? 0) + 1,
                        }))
                      }
                    >
                      +
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>סיכום הזמנה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">עדיין לא נבחרו מוצרים.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {lines.map((line) => (
                <li key={line.product.id} className="flex justify-between gap-4">
                  <span>
                    {line.product.name} × {line.qty}
                  </span>
                  <span>{formatIls(lineTotal(line.qty, line.product.agreedPrice, line.product.discountPercent))}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-base font-medium">סה״כ משוער: {formatIls(total)}</p>
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              הערות לנהג / מפיץ
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="למשל: להשאיר במחסן האחורי, לא לצלצל לטרקלין"
            />
          </div>
          <Button type="submit" disabled={lines.length === 0}>
            אישור הזמנה
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
