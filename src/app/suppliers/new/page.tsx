import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { listCategoryTree } from "@/lib/categories";

export default async function NewSupplierPage() {
  const tree = await listCategoryTree();
  return (
    <div>
      <PageHeader title="ספק חדש" description="פרטי חברה, סוכן, וואטסאפ לימי הזמנה, נהג וימי חלוקה." />
      <SupplierForm categoryTree={tree} />
    </div>
  );
}
