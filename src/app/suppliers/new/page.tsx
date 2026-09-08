import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { listCategoryTree } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function NewSupplierPage() {
  const [tree, branches] = await Promise.all([
    listCategoryTree(),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="ספק חדש" description="פרטי חברה, הזמנה, כספים וזמינות לסניפים." />
      <SupplierForm categoryTree={tree} branches={branches} />
    </div>
  );
}
