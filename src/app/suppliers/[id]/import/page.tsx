import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductImportForm } from "@/components/products/product-import-form";
import { prisma } from "@/lib/prisma";

export default async function ImportProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader
        title={`ייבוא מחירון · ${supplier.name}`}
        description="Excel או CSV. שורות קיימות לפי מק״ט (או שם) מתעדכנות; חדשות נוצרות תחת הספק."
      />
      <ProductImportForm supplierId={supplier.id} />
    </div>
  );
}
