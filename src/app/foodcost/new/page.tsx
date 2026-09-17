import { CompactPanel } from "@/components/ui/compact-form";
import { DishCreateForm } from "@/components/foodcost/dish-create-form";
import { NarrowForm, PageHeader } from "@/components/page-header";

export default function NewDishPage() {
  return (
    <div>
      <PageHeader title="מנה חדשה" description="מנה למכירה או מנת ביניים (בצק, רוטב) בלי מחיר מכירה." />
      <NarrowForm>
        <CompactPanel title="מנה חדשה">
          <DishCreateForm />
        </CompactPanel>
      </NarrowForm>
    </div>
  );
}
