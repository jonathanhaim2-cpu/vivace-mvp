import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { prisma } from "@/lib/prisma";

export default async function NewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div>
      <PageHeader title={`מוצר חדש · ${supplier.name}`} description="מחיר מוסכם, הנחה, מלאי תקן ואריזות." />
      <ProductForm supplierId={supplier.id} mixDocuments={supplier.documentType === "MIX_PER_PRODUCT"} />
    </div>
  );
}
