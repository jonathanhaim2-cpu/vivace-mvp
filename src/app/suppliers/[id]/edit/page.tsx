import { notFound } from "next/navigation";
import { NarrowForm, PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { requirePagePermission } from "@/lib/access";
import { listCategoryTree } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("action.edit_suppliers");
  const { id } = await params;
  const [supplier, tree, branches] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id },
      include: { branchLinks: true },
    }),
    listCategoryTree(),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!supplier) notFound();

  return (
    <div>
      <PageHeader title={`עריכת ${supplier.name}`} />
      <NarrowForm wide>
        <SupplierForm supplier={supplier} categoryTree={tree} branches={branches} />
      </NarrowForm>
    </div>
  );
}
