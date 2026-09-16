"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createOrder } from "@/actions/orders";
import { NextOrderNotice } from "@/components/orders/next-order-notice";
import { OrderCompanyHeader } from "@/components/orders/order-company-header";
import { ClockTime } from "@/components/clock-time";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  describePackaging,
  documentTypeLabel,
  formatDeliveryDays,
  formatIls,
  formatWeekdays,
  lineTotal,
  nextDeliveryInfo,
  nextOrderWindow,
  parseDeliveryDays,
  resolveOrderDays,
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
  orderDays: string;
  orderCutoffTime: string;
  reminderHoursBefore: number;
  weeklyBudgetIls: number | null;
  minimumOrderIls: number | null;
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

type OpenOrder = { id: string; status: string; lineCount: number } | null;

export function OrderWizard({
  suppliers,
  products,
  selectedSupplierId,
  branchId,
  branchName,
  branch,
  weeklySpent,
  openOrder = null,
}: {
  suppliers: Supplier[];
  products: Product[];
  selectedSupplierId?: string;
  branchId: string;
  branchName: string;
  branch?: { name: string; address?: string | null; phone?: string | null; contactName?: string | null } | null;
  weeklySpent: number;
  openOrder?: OpenOrder;
}) {
  const selected = suppliers.find((s) => s.id === selectedSupplierId) ?? null;
  const [qty, setQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [lateOpen, setLateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const windowInfo = selected
    ? nextDeliveryInfo(
        parseDeliveryDays(selected.deliveryDays),
        selected.orderCutoffTime,
        resolveOrderDays(selected.orderDays, selected.deliveryDays),
      )
    : null;
  const nextOrder = selected
    ? nextOrderWindow(
        resolveOrderDays(selected.orderDays, selected.deliveryDays),
        selected.orderCutoffTime,
        selected.reminderHoursBefore,
      )
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
  const belowMinimum =
    selected?.minimumOrderIls != null && selected.minimumOrderIls > 0 && total < selected.minimumOrderIls;

  function fillSuggested() {
    if (!selected) return;
    const days = parseDeliveryDays(selected.deliveryDays);
    const orderDays = resolveOrderDays(selected.orderDays, selected.deliveryDays);
    const next: Record<string, number> = {};
    for (const product of products) {
      next[product.id] = suggestOrderQty(product.stockStandard, days, selected.orderCutoffTime, orderDays);
    }
    setQty(next);
  }

  async function submitOrder(sendAnyway: boolean, mergeMode: "merge" | "separate") {
    if (!selected || lines.length === 0) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.set("supplierId", selected.id);
    formData.set("branchId", branchId);
    formData.set(
      "lines",
      JSON.stringify(lines.map((line) => ({ productId: line.product.id, qty: line.qty }))),
    );
    formData.set("notesForDriver", notes);
    formData.set("sendAnyway", sendAnyway ? "true" : "false");
    formData.set("mergeMode", mergeMode);
    await createOrder(formData);
  }

  function handleConfirmClick() {
    if (!windowInfo?.open) {
      setLateOpen(true);
      return;
    }
    if (openOrder) {
      setMergeOpen(true);
      return;
    }
    void submitOrder(false, "separate");
  }

  function confirmLate() {
    setLateOpen(false);
    if (openOrder) {
      setMergeOpen(true);
      return;
    }
    void submitOrder(true, "separate");
  }

  if (!selected) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {suppliers.map((supplier) => {
          const info = nextDeliveryInfo(
            parseDeliveryDays(supplier.deliveryDays),
            supplier.orderCutoffTime,
            resolveOrderDays(supplier.orderDays, supplier.deliveryDays),
          );
          const nextOrder = nextOrderWindow(
            resolveOrderDays(supplier.orderDays, supplier.deliveryDays),
            supplier.orderCutoffTime,
            supplier.reminderHoursBefore,
          );
          return (
            <Link key={supplier.id} href={`/orders/new?supplierId=${supplier.id}`} className="block">
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader>
                  <CardTitle>{supplier.name}</CardTitle>
                  <CardDescription>{documentTypeLabel(supplier.documentType)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>אספקה: {formatDeliveryDays(supplier.deliveryDays) || "אין ימי אספקה"}</p>
                  <p>
                    הזמנה:{" "}
                    {formatWeekdays(resolveOrderDays(supplier.orderDays, supplier.deliveryDays)) || "—"} · עד{" "}
                    <ClockTime value={supplier.orderCutoffTime} />
                  </p>
                  <p className={info.open ? "text-primary" : "text-destructive"}>{info.label}</p>
                  <NextOrderNotice info={nextOrder} className="text-xs" />
                  {supplier.driverName ? <p className="text-muted-foreground">מפיץ: {supplier.driverName}</p> : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{selected.name}</CardTitle>
          <CardDescription>
            הזמנה עבור {branchName} · וואטסאפ {selected.whatsappPhone}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className={windowInfo?.open ? "text-primary" : "text-destructive"}>{windowInfo?.label}</p>
          {nextOrder ? <NextOrderNotice info={nextOrder} /> : null}
          <p>
            ימי הזמנה: {formatWeekdays(resolveOrderDays(selected.orderDays, selected.deliveryDays)) || "—"} · סגירה{" "}
            <ClockTime value={selected.orderCutoffTime} />
          </p>
          <p>ימי אספקה: {formatDeliveryDays(selected.deliveryDays) || "—"}</p>
          <p className="text-muted-foreground">
            תזכורת למנהל הסניף {selected.reminderHoursBefore} שעות לפני{" "}
            <ClockTime value={selected.orderCutoffTime} />.
          </p>
          {selected.weeklyBudgetIls != null ? (
            <p>
              תקציב שבועי {formatIls(selected.weeklyBudgetIls)} · נוצל עד כה {formatIls(weeklySpent)} · אחרי הזמנה זו{" "}
              <span className={remainingBudget != null && remainingBudget < 0 ? "text-destructive" : ""}>
                {formatIls(remainingBudget ?? 0)}
              </span>
            </p>
          ) : null}
          {selected.minimumOrderIls != null ? (
            <p className={belowMinimum ? "text-destructive" : "text-muted-foreground"}>
              מינימום הזמנה {formatIls(selected.minimumOrderIls)}
              {belowMinimum ? " · מתחת למינימום — אפשר לשלוח כהזמנה נפרדת או למזג" : ""}
            </p>
          ) : null}
          {openOrder ? (
            <p className="text-muted-foreground">
              יש הזמנה פתוחה לספק זה ({openOrder.lineCount} שורות). אחרי אישור אפשר למזג או לפתוח תעודת משלוח נפרדת.
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
              resolveOrderDays(selected.orderDays, selected.deliveryDays),
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
                      אחרי הנחה {formatIls(lineTotal(1, product.agreedPrice, product.discountPercent))}
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
          {branch ? <OrderCompanyHeader branch={branch} /> : <p className="text-sm">הזמנה עבור {branchName}</p>}
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
              הערות למפיץ
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="למשל: להשאיר במחסן האחורי, לא לצלצל לטרקלין"
            />
          </div>
          <Button type="button" disabled={lines.length === 0 || submitting} onClick={handleConfirmClick}>
            {windowInfo?.open ? "אישור הזמנה" : "שליחה בכל זאת"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={lateOpen} onOpenChange={setLateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>חלון ההזמנה סגור</DialogTitle>
            <DialogDescription>
              עברתם את שעת הסגירה ({selected.orderCutoffTime}). לשלוח בכל זאת?
              {belowMinimum
                ? ` ההזמנה מתחת למינימום (${formatIls(selected.minimumOrderIls ?? 0)}). אפשר להמשיך.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLateOpen(false)}>
              ביטול
            </Button>
            <Button type="button" onClick={confirmLate} disabled={submitting}>
              שליחה בכל זאת
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>מיזוג להזמנה פתוחה?</DialogTitle>
            <DialogDescription>
              יש הזמנה פתוחה לאותו ספק. למזג לשורות הקיימות, או לפתוח תעודת משלוח / הזמנה נפרדת
              {belowMinimum ? " (גם מתחת למינימום)" : ""}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col sm:items-stretch">
            <Button
              type="button"
              onClick={() => void submitOrder(!windowInfo?.open, "merge")}
              disabled={submitting}
            >
              מיזוג להזמנה הפתוחה
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void submitOrder(!windowInfo?.open, "separate")}
              disabled={submitting}
            >
              הזמנה / תעודת משלוח נפרדת
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
