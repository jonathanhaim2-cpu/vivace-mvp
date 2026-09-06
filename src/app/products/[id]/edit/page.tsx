import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { prisma } from "@/lib/prisma";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!product) notFound();

  return (
    <div>
      <PageHeader title={`עריכת ${product.name}`} description={product.supplier.name} />
      <ProductForm
        supplierId={product.supplierId}
        mixDocuments={product.supplier.documentType === "MIX_PER_PRODUCT"}
        product={product}
      />
    </div>
  );
}
