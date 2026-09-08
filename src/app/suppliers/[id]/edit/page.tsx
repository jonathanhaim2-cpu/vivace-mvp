import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { listCategoryTree } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supplier, tree] = await Promise.all([
    prisma.supplier.findUnique({ where: { id } }),
    listCategoryTree(),
  ]);
  if (!supplier) notFound();

  return (
    <div>
      <PageHeader title={`עריכת ${supplier.name}`} />
      <SupplierForm supplier={supplier} categoryTree={tree} />
    </div>
  );
}
