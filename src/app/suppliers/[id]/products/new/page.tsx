import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { listCategoryTree } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export default async function NewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supplier, tree] = await Promise.all([
    prisma.supplier.findUnique({ where: { id } }),
    listCategoryTree(),
  ]);
  if (!supplier) notFound();

  const session = await getAppSession();
  return (
    <div>
      <PageHeader title={`מוצר חדש · ${supplier.name}`} description="שם, מק״ט, מחיר לפני מע״מ, הנחה ואריזת קרטון." />
      <ProductForm
        supplierId={supplier.id}
        mixDocuments={supplier.documentType === "MIX_PER_PRODUCT"}
        categoryTree={tree}
        defaultCategoryId={supplier.defaultCategoryId}
        isNetwork={session.isNetwork}
      />
    </div>
  );
}
