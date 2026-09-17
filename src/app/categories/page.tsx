import { createCategory, deleteCategory, renameCategory } from "@/actions/categories";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { listCategoryTree } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const tree = await listCategoryTree();

  return (
    <div className="space-y-4">
      <PageHeader
        title="קטגוריות מוצרים"
        description="שתי רמות: קטגוריה ותת־קטגוריה. השיבוץ למוצר הוא תמיד לתת־קטגוריה. האב משמש לסינון ולדוחות."
      />

      <CompactPanel title="קטגוריה חדשה" description="אב חדש, או תת־קטגוריה תחת אב קיים.">
        <CompactForm action={createCategory}>
          <CompactField label="שם" htmlFor="cat-name" grow>
            <Input id="cat-name" name="name" placeholder="שם" required className="sm:max-w-xs" />
          </CompactField>
          <CompactField label="סוג" htmlFor="cat-parent">
            <NativeSelect id="cat-parent" name="parentId">
              <option value="">קטגוריית אב</option>
              {tree.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  תת־קטגוריה תחת {parent.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <Button type="submit">הוספה</Button>
        </CompactForm>
      </CompactPanel>

      <div className="space-y-3">
        {tree.map((parent) => (
          <section key={parent.id} className="rounded-xl border border-border/80 bg-card px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium">{parent.name}</h2>
                <p className="text-xs text-muted-foreground">{parent.children.length} תתי־קטגוריות</p>
              </div>
              <form action={renameCategory.bind(null, parent.id)} className="flex gap-1.5">
                <Input name="name" defaultValue={parent.name} className="w-40" />
                <Button type="submit" size="sm" variant="outline">
                  שינוי שם
                </Button>
              </form>
            </div>
            <div className="mt-2 space-y-1">
              {parent.children.map((child) => (
                <div key={child.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-1 py-1">
                  <p className="text-sm">{child.name}</p>
                  <div className="flex gap-1.5">
                    <form action={renameCategory.bind(null, child.id)} className="flex gap-1.5">
                      <Input name="name" defaultValue={child.name} className="w-36" />
                      <Button type="submit" size="sm" variant="outline">
                        שינוי
                      </Button>
                    </form>
                    <form action={deleteCategory.bind(null, child.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        מחיקה
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
