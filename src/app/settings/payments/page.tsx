import { createPaymentCard, linkPaymentCard } from "@/actions/payments";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PaymentsSettingsPage() {
  const session = await getAppSession();
  const [cards, suppliers, accounts] = await Promise.all([
    prisma.paymentCard.findMany({ where: { active: true }, include: { links: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { parentId: { not: null } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const supplierName = new Map(suppliers.map((row) => [row.id, row.name]));
  const accountName = new Map(accounts.map((row) => [row.id, row.name]));

  return (
    <div className="space-y-4">
      <PageHeader
        title="אמצעי תשלום"
        description="כרטיס אשראי או אמצעי אחר: שם, 4 ספרות, יום חיוב, ומה הוא משלם. יום החיוב נכנס לתזרים."
      />
      <SettingsNav permissions={session.permissions} />
      <CompactPanel title="כרטיס חדש">
        <CompactForm action={createPaymentCard}>
          <CompactField label="שם" htmlFor="card-name">
            <Input id="card-name" name="name" required placeholder="ויזה רשת" />
          </CompactField>
          <CompactField label="4 ספרות" htmlFor="card-last4">
            <Input id="card-last4" name="last4" required inputMode="numeric" maxLength={4} placeholder="1234" />
          </CompactField>
          <CompactField label="יום חיוב" htmlFor="card-day">
            <Input id="card-day" name="billingDay" type="number" min={1} max={28} defaultValue={15} />
          </CompactField>
          <CompactField label="הערה" htmlFor="card-notes">
            <Input id="card-notes" name="notes" />
          </CompactField>
          <Button type="submit">הוספה</Button>
        </CompactForm>
      </CompactPanel>
      {cards.map((card) => (
        <section key={card.id} className="rounded-2xl border bg-card p-4">
          <h2 className="font-medium">
            {card.name} ···· {card.last4}
          </h2>
          <p className="text-xs text-muted-foreground">חיוב ביום {card.billingDay}</p>
          <ul className="mt-2 text-sm">
            {card.links.map((link) => (
              <li key={link.id}>
                {link.supplierId ? supplierName.get(link.supplierId) : accountName.get(link.accountId ?? "") ?? "קישור"}
              </li>
            ))}
          </ul>
          <form action={linkPaymentCard} className="mt-3 grid gap-2 sm:grid-cols-3">
            <input type="hidden" name="cardId" value={card.id} />
            <NativeSelect name="supplierId" defaultValue="">
              <option value="">ספק</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect name="accountId" defaultValue="">
              <option value="">כרטיס הוצאה</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" size="sm" variant="outline">
              שיוך
            </Button>
          </form>
        </section>
      ))}
    </div>
  );
}
