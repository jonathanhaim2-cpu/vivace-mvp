import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default function NewSupplierPage() {
  return (
    <div>
      <PageHeader title="ספק חדש" description="פרטי חברה, סוכן, וואטסאפ לימי הזמנה, נהג וימי חלוקה." />
      <SupplierForm />
    </div>
  );
}
