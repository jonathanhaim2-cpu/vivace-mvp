import { notFound } from "next/navigation";
import { NarrowForm, PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { requirePagePermission } from "@/lib/access";
import { listCategoryTree } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("action.edit_prices");
  const { id } = await params;
  const [product, tree] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { supplier: true },
    }),
    listCategoryTree(),
  ]);
  const session = await getAppSession();
  if (!product) notFound();

  return (
    <div>
      <PageHeader title={`עריכת ${product.name}`} description={product.supplier.name} />
      <NarrowForm wide>
        <ProductForm
          supplierId={product.supplierId}
          mixDocuments={product.supplier.documentType === "MIX_PER_PRODUCT"}
          product={product}
          categoryTree={tree}
          isNetwork={session.isNetwork}
          supplierPlantsCouncilRelevant={product.supplier.plantsCouncilRelevant}
        />
      </NarrowForm>
    </div>
  );
}
