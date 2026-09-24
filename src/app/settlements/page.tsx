import { approveTransfer, createTransfer, rejectTransfer, saveRoyaltyPercent } from "@/actions/transfers";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { monthSettlement } from "@/lib/settlement";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const session = await getAppSession();
  const month = monthKeyFromDate();
  const [branches, products, transfers, royaltyRow, sales] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" }, take: 400, select: { id: true, name: true } }),
    prisma.interBranchTransfer.findMany({ where: { periodMonth: month }, orderBy: { createdAt: "desc" } }),
    prisma.appSetting.findUnique({ where: { key: "settlement.royaltyPercent" } }),
    prisma.invoicePhoto.aggregate({
      where: { periodMonth: month, account: { kind: "INCOME" } },
      _sum: { amountIls: true },
    }),
  ]);
  const royaltyPercent = Number(royaltyRow?.value ?? 0) || 0;
  const branchName = new Map(branches.map((branch) => [branch.id, branch.name]));
  const settlement = monthSettlement({
    transfers: transfers.map((row) => ({ amountIls: row.amountIls, status: row.status })),
    royaltyBase: sales._sum.amountIls ?? 0,
    royaltyPercent,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="התחשבנות סניפים"
        description="סניף שלוקח סחורה מסניף אחר רושם רכש או מכירה. הצד השני מאשר. אחרי אישור הדדי החיוב נכנס לסיכום החודש יחד עם תמלוגים. המחיר הוא מחירון הזכיין."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">העברות מאושרות · {monthLabel(month)}</p>
          <p className="text-xl font-semibold tabular-nums">{formatIls(settlement.transfers)}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">תמלוגים ({royaltyPercent}%)</p>
          <p className="text-xl font-semibold tabular-nums">{formatIls(settlement.royalty)}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">סה״כ לחודש</p>
          <p className="text-xl font-semibold tabular-nums">{formatIls(settlement.total)}</p>
        </article>
      </div>

      {session.isNetwork ? (
        <CompactPanel title="אחוז תמלוגים" description="נשמר בהגדרות. אין אחוז מובנה — מזינים את מה שסוכם.">
          <CompactForm action={saveRoyaltyPercent}>
            <CompactField label="אחוז" htmlFor="royalty">
              <Input id="royalty" name="royaltyPercent" type="number" min={0} step="0.1" defaultValue={royaltyPercent} />
            </CompactField>
            <Button type="submit" size="sm">
              שמירה
            </Button>
          </CompactForm>
        </CompactPanel>
      ) : null}

      <CompactPanel title="תנועה חדשה" description="הצד שמתחיל מאשר את עצמו. הצד השני מאשר אחר כך.">
        <form action={createTransfer} className="grid gap-3 sm:grid-cols-2">
          <CompactField label="מסניף" htmlFor="from">
            <NativeSelect id="from" name="fromBranchId" required>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="אל סניף" htmlFor="to">
            <NativeSelect id="to" name="toBranchId" required>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="מוצר" htmlFor="product">
            <NativeSelect id="product" name="productId">
              <option value="">בלי מוצר — מחיר ידני</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="אני רושם" htmlFor="side">
            <NativeSelect id="side" name="side" defaultValue="TO">
              <option value="TO">רכש (הסניף המקבל)</option>
              <option value="FROM">מכירה (הסניף המוסר)</option>
            </NativeSelect>
          </CompactField>
          <CompactField label="תיאור" htmlFor="title">
            <Input id="title" name="title" required placeholder="מה עבר" />
          </CompactField>
          <CompactField label="כמות" htmlFor="qty">
            <Input id="qty" name="qty" type="number" min={0} step="0.01" required />
          </CompactField>
          <CompactField label="מחיר ידני" htmlFor="unitPrice">
            <Input id="unitPrice" name="unitPrice" type="number" min={0} step="0.01" placeholder="אם אין מוצר" />
          </CompactField>
          <div className="sm:col-span-2">
            <Button type="submit">רישום</Button>
          </div>
        </form>
      </CompactPanel>

      <ul className="space-y-2">
        {transfers.map((row) => (
          <li key={row.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{row.title}</p>
              <p className="tabular-nums">{formatIls(row.amountIls)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {branchName.get(row.fromBranchId)} → {branchName.get(row.toBranchId)} · {row.qty} × {formatIls(row.unitPrice)} · {row.status}
            </p>
            {row.status === "PENDING" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {!row.fromApprovedAt ? (
                  <form action={approveTransfer.bind(null, row.id)}>
                    <input type="hidden" name="side" value="FROM" />
                    <Button type="submit" size="sm" variant="outline">
                      אישור המוסר
                    </Button>
                  </form>
                ) : null}
                {!row.toApprovedAt ? (
                  <form action={approveTransfer.bind(null, row.id)}>
                    <input type="hidden" name="side" value="TO" />
                    <Button type="submit" size="sm" variant="outline">
                      אישור המקבל
                    </Button>
                  </form>
                ) : null}
                <form action={rejectTransfer.bind(null, row.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    דחייה
                  </Button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
