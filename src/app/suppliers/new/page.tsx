import { NarrowForm, PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { requirePagePermission } from "@/lib/access";
import { listCategoryTree } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function NewSupplierPage() {
  await requirePagePermission("action.edit_suppliers");
  const [tree, branches, paymentCards] = await Promise.all([
    listCategoryTree(),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.paymentCard.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="ספק חדש" description="פרטי חברה, הזמנה, כספים וזמינות לסניפים." />
      <NarrowForm wide>
        <SupplierForm categoryTree={tree} branches={branches} paymentCards={paymentCards} />
      </NarrowForm>
    </div>
  );
}
