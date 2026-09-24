import { reassignInvoiceBranch } from "@/actions/invoices";
import { reassignOrderBranch } from "@/actions/orders";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/compact-form";
import { branchConflict, chooseIngestBranch } from "@/lib/branch-assignment";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BranchReviewPage() {
  const session = await getAppSession();
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const [photos, orders] = await Promise.all([
    prisma.invoicePhoto.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        originalName: true,
        voiceNoteText: true,
        aiReason: true,
        aiSupplierName: true,
        aiBranchId: true,
        branchId: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { supplier: true, branch: true },
    }),
  ]);

  const photoRows = photos.flatMap((photo) => {
    const choice = chooseIngestBranch({
      documentText: [photo.originalName, photo.voiceNoteText, photo.aiReason, photo.aiSupplierName].filter(Boolean).join("\n"),
      branches,
      aiHint: photo.aiSupplierName,
    });
    if (!branchConflict(photo.branchId, choice)) return [];
    return [{ photo, choice }];
  });

  const orderRows = orders.flatMap((order) => {
    const choice = chooseIngestBranch({
      documentText: [order.supplier.name, order.notesForDriver].filter(Boolean).join("\n"),
      branches,
    });
    if (!branchConflict(order.branchId, choice)) return [];
    return [{ order, choice }];
  });

  const name = new Map(branches.map((branch) => [branch.id, branch.name]));

  return (
    <div className="space-y-4">
      <PageHeader
        title="בדיקת שיוך סניף"
        description="רשומות שהראיה במסמך מצביעה על סניף אחר מהשמור. השיוך מחדש לא מוחק מסמכים."
      />
      <SettingsNav permissions={session.permissions} />
      <h2 className="text-sm font-medium">חשבוניות ({photoRows.length})</h2>
      <ul className="space-y-2">
        {photoRows.map(({ photo, choice }) => (
          <li key={photo.id} className="rounded-2xl border bg-card p-3 text-sm">
            <p className="font-medium">{photo.originalName}</p>
            <p className="text-xs text-muted-foreground">
              שמור: {name.get(photo.branchId ?? "") ?? "ללא"} · ראיה: {name.get(choice.branchId ?? "")} ({choice.source})
            </p>
            <form action={reassignInvoiceBranch.bind(null, photo.id)} className="mt-2 flex flex-wrap gap-2">
              <NativeSelect name="branchId" defaultValue={choice.branchId ?? ""}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="sm">
                שיוך מחדש
              </Button>
            </form>
          </li>
        ))}
      </ul>
      {photoRows.length === 0 ? <p className="text-sm text-muted-foreground">אין חשבוניות עם סתירה ברורה.</p> : null}

      <h2 className="text-sm font-medium">הזמנות ({orderRows.length})</h2>
      <ul className="space-y-2">
        {orderRows.map(({ order, choice }) => (
          <li key={order.id} className="rounded-2xl border bg-card p-3 text-sm">
            <p className="font-medium">{order.supplier.name}</p>
            <p className="text-xs text-muted-foreground">
              שמור: {order.branch.name} · ראיה: {name.get(choice.branchId ?? "")} ({choice.source})
            </p>
            <form action={reassignOrderBranch.bind(null, order.id)} className="mt-2 flex flex-wrap gap-2">
              <NativeSelect name="branchId" defaultValue={choice.branchId ?? ""}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="sm">
                שיוך מחדש
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
