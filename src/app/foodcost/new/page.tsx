import { DishCreateForm } from "@/components/foodcost/dish-create-form";
import { PageHeader } from "@/components/page-header";

export default function NewDishPage() {
  return (
    <div>
      <PageHeader title="מנה חדשה" description="מנה למכירה או מנת ביניים (בצק, רוטב) בלי מחיר מכירה." />
      <DishCreateForm />
    </div>
  );
}
